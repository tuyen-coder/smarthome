from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    AIUnavailableError,
    AuthenticationError,
    ConflictError,
    EntityNotFoundError,
    PermissionDeniedError,
    SmartHomeError,
)
from app.db.init_db import init_db
from app.integrations.mqtt.client import mqtt_client
from app.realtime.router import router as realtime_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await init_db()
    if settings.mqtt_enabled:
        await mqtt_client.connect()
    yield


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
    elif isinstance(exc, AIUnavailableError):
        code = status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=code, content={"detail": str(exc)})


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}
