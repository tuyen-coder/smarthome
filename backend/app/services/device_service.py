import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.core.redis import redis_client
from app.integrations.mqtt.client import mqtt_client
from app.models import Device, DeviceCategory, User, Area
from app.realtime.manager import manager
from app.repositories.areas import AreaRepository
from app.repositories.devices import DeviceRepository
from app.schemas import DeviceCommand, DeviceCreate
from app.services.permission_service import PermissionService


class DeviceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.devices = DeviceRepository(session)
        self.areas = AreaRepository(session)
        self.permissions = PermissionService(session)

    async def list(self, user: User, home_id: int, area_id: int | None = None) -> list[Device]:
        # User needs to be in home_id
        await self.permissions.home_service.get_home(user, home_id)
        # Note: if area_id is provided, we should probably check if area_id belongs to home_id,
        # but the repository query joins with Area.home_id == home_id so it's safe.
        devices = await self.devices.list(area_id=area_id, home_id=home_id)
        return devices

    async def create(self, payload: DeviceCreate) -> Device:
        if await self.areas.get(payload.area_id) is None:
            raise EntityNotFoundError("Không tìm thấy khu vực")
        return await self.devices.create(
            name=payload.name,
            device_category=payload.category,
            device_type=payload.type,
            area_id=payload.area_id,
            feed_key=payload.feed_key,
            state=payload.state,
        )

    async def command(
        self, user: User, device_id: int, payload: DeviceCommand
    ) -> Device:
        device = await self.devices.get(device_id)
        if device is None:
            raise EntityNotFoundError("Không tìm thấy thiết bị")
            
        if not await self.permissions.can_access(user, device.area_id, control=True):
            raise PermissionDeniedError("Bạn không có quyền điều khiển thiết bị này")
            
        device = await self.devices.update_state(
            device,
            is_on=payload.is_on,
            state=payload.state,
        )
        
        # Gửi MQTT đến Adafruit Feed nếu có cấu hình feed_key
        if device.feed_key:
            # Ví dụ: Gửi "1" khi bật, "0" khi tắt (hoặc lấy trực tiếp từ payload/state)
            mqtt_payload = "1" if device.is_on else "0"
            
            # Gọi phương thức publish đồng bộ an toàn
            mqtt_client.publish(device.feed_key, mqtt_payload)

        # Phát thông báo WebSocket thời gian thực cho App
        await manager.broadcast({
            "type": "device.updated", 
            "device_id": device.id,
            "is_on": device.is_on,
            "state": device.state
        })
        
        # Lấy home_id từ Area để truyền cho Worker
        area = await self.session.get(Area, device.area_id)
        
        # --- Đẩy sự kiện vào Redis (Worker xử lý Alert) ---
        activity_event = {
            "device_id": device.id,
            "name": device.name,
            "category": str(device.category),
            "is_on": device.is_on,
            "state": device.state,
            "user_id": user.id,
            "user_name": user.name,
            "home_id": area.home_id if area else None,
        }
        await redis_client.lpush("queue:device_activity", json.dumps(activity_event))
        
        return device
