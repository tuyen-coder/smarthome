from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    EntityNotFoundError,
    PermissionDeniedError,
    SmartHomeError,
)
from app.db.init_db import init_db

# Import instance mqtt_client từ file client.py
from app.integrations.mqtt.client import mqtt_client 
from app.realtime.router import router as realtime_router


import asyncio
import json
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.redis import get_redis
from app.realtime.manager import manager

logger = logging.getLogger(__name__)

async def time_automation_worker():
    logger.info("Started background task: time_automation_worker")
    try:
        from zoneinfo import ZoneInfo
        tz = ZoneInfo("Asia/Ho_Chi_Minh")
    except Exception:
        from datetime import timezone, timedelta
        tz = timezone(timedelta(hours=7))
    last_processed_time = None
    while True:
        try:
            now = datetime.now(tz)
            # Calculate seconds to next minute
            sleep_seconds = 60 - now.second
            with open("time_worker.log", "a") as f: f.write(f"Sleeping {sleep_seconds}s at {now}\n")
            await asyncio.sleep(sleep_seconds)
            
            # Fetch current HH:MM
            current_time = datetime.now(tz).strftime("%H:%M")
            with open("time_worker.log", "a") as f: f.write(f"Woke up at {datetime.now(tz)}, current_time={current_time}, last={last_processed_time}\n")
            if current_time == last_processed_time:
                continue
            last_processed_time = current_time
            # Dọn dẹp log rác: bỏ câu lệnh print mỗi phút
            
            from app.db.session import SessionLocal
            from app.services.automation_service import AutomationService
            async with SessionLocal() as session:
                auto_service = AutomationService(session)
                await auto_service.evaluate_time_automations(current_time)
                
        except asyncio.CancelledError:
            with open("time_worker.log", "a") as f: f.write("cancelled\n")
            logger.info("time_automation_worker cancelled.")
            break
        except Exception as e:
            with open("time_worker.log", "a") as f: f.write(f"Error: {e}\n")
            logger.error(f"Error in time_automation_worker: {e}")
            await asyncio.sleep(60)

async def redis_subscriber():
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe("channel:websocket_broadcast")
    logger.info("Subscribed to channel:websocket_broadcast")
    async for message in pubsub.listen():
        if message["type"] == "message":
            try:
                data = json.loads(message["data"])
                if isinstance(data, dict) and data.get("home_id") is not None:
                    await manager.broadcast_to_home(data["home_id"], data)
                elif isinstance(data, dict) and data.get("user_id") is not None:
                    await manager.send_personal_message(data["user_id"], data)
                else:
                    await manager.broadcast(data)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # 1. Khởi tạo Database
    await init_db()
    
    # 2. Start Redis subscriber
    subscriber_task = asyncio.create_task(redis_subscriber())
    
    # 3. Start Time Automation Worker
    time_task = asyncio.create_task(time_automation_worker())
    
    if settings.mqtt_enabled:
        logger.info("Starting Adafruit MQTT Service...")
        mqtt_client.start()  
    
    yield  
    
    subscriber_task.cancel()
    time_task.cancel()
    
    if settings.mqtt_enabled:
        logger.info("Stopping Adafruit MQTT Service...")
        mqtt_client.stop()   


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials="*" not in settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(realtime_router)


@app.exception_handler(SmartHomeError)
async def smart_home_error_handler(_: Request, exc: SmartHomeError) -> JSONResponse:
    code = status.HTTP_400_BAD_REQUEST
    if isinstance(exc, AuthenticationError):
        code = status.HTTP_401_UNAUTHORIZED
    elif isinstance(exc, PermissionDeniedError):
        code = status.HTTP_403_FORBIDDEN
    elif isinstance(exc, EntityNotFoundError):
        code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, ConflictError):
        code = status.HTTP_409_CONFLICT
    return JSONResponse(status_code=code, content={"detail": str(exc)})


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}