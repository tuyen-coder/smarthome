from fastapi import APIRouter, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.schemas import DeviceCommand, DeviceCreate, DeviceRead
from app.services.device_service import DeviceService

router = APIRouter()


@router.get("", response_model=list[DeviceRead])
async def list_devices(
    user: CurrentUser,
    session: DatabaseSession,
    home_id: int,
    area_id: int | None = None,
) -> list:
    return await DeviceService(session).list(user, home_id, area_id)


@router.post("", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
async def create_device(payload: DeviceCreate, _: AdminUser, session: DatabaseSession):
    return await DeviceService(session).create(payload)


@router.post("/{device_id}/command", response_model=DeviceRead)
async def command_device(
    device_id: int,
    payload: DeviceCommand,
    user: CurrentUser,
    session: DatabaseSession,
):
    return await DeviceService(session).command(user, device_id, payload)
