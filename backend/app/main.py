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
from app.core.redis import get_redis
from app.realtime.manager import manager

async def redis_subscriber():
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe("channel:websocket_broadcast")
    print("Subscribed to channel:websocket_broadcast")
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
                print(f"Error broadcasting message: {e}")

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # 1. Khởi tạo Database
    await init_db()
    
    # 2. Start Redis subscriber
    subscriber_task = asyncio.create_task(redis_subscriber())
    
    if settings.mqtt_enabled:
        print("Starting Adafruit MQTT Service...")
        mqtt_client.start()  
    
    yield  
    
    subscriber_task.cancel()
    
    if settings.mqtt_enabled:
        print("Stopping Adafruit MQTT Service...")
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