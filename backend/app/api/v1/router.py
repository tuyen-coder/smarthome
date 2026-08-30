from fastapi import APIRouter

from app.api.v1.endpoints import (
    alerts,
    areas,
    auth,
    automations,
    devices,
    faces,
    telemetry,
    users,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(areas.router, prefix="/areas", tags=["areas"])
api_router.include_router(devices.router, prefix="/devices", tags=["devices"])
api_router.include_router(faces.router, prefix="/faces", tags=["faces"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(
    automations.router, prefix="/automations", tags=["automations"]
)
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
