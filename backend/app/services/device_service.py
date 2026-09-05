import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.core.redis import redis_client
from app.integrations.mqtt.client import mqtt_client
from app.models import Device, DeviceCategory, DeviceType, User, Area, HomeRole, UserRole
from app.realtime.manager import manager
from app.repositories.areas import AreaRepository
from app.repositories.devices import DeviceRepository
from app.schemas import DeviceCommand, DeviceCreate, DeviceUpdate
from app.services.permission_service import PermissionService


class DeviceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.devices = DeviceRepository(session)
        self.areas = AreaRepository(session)
        self.permissions = PermissionService(session)

    async def list(self, user: User, home_id: int, area_id: int | None = None) -> list[Device]:
        await self.permissions.home_service.get_home(user, home_id)
        devices = await self.devices.list(area_id=area_id, home_id=home_id)
        visible: list[Device] = []
        for dev in devices:
            if await self.permissions.can_access(user, dev.area_id, control=False):
                visible.append(dev)
        return visible

    async def get(self, user: User, device_id: int) -> Device:
        device = await self.devices.get(device_id)
        if device is None:
            raise EntityNotFoundError("Không tìm thấy thiết bị")
        if not await self.permissions.can_access(user, device.area_id, control=False):
            raise PermissionDeniedError("Bạn không có quyền xem thiết bị này")
        return device

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

    async def update(self, user: User, device_id: int, payload: DeviceUpdate) -> Device:
        device = await self.devices.get(device_id)
        if device is None:
            raise EntityNotFoundError("Không tìm thấy thiết bị")

        area = await self.areas.get(device.area_id)
        if not area:
            raise EntityNotFoundError("Không tìm thấy khu vực của thiết bị")

        home = await self.permissions.home_service.homes.get(area.home_id)
        member = await self.permissions.home_service.members.get(area.home_id, user.id)
        is_owner = home and home.owner_id == user.id
        is_admin = member and member.role in [HomeRole.OWNER, HomeRole.ADMIN]

        if not is_owner and not is_admin and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà hoặc quản trị viên mới có quyền chỉnh sửa thiết bị")

        if payload.area_id is not None and payload.area_id != device.area_id:
            target_area = await self.areas.get(payload.area_id)
            if not target_area or target_area.home_id != area.home_id:
                raise EntityNotFoundError("Khu vực mới không hợp lệ hoặc không thuộc ngôi nhà này")

        updated_device = await self.devices.update(
            device,
            name=payload.name,
            category=payload.category,
            device_type=payload.type,
            area_id=payload.area_id,
            feed_key=payload.feed_key,
        )
        
        await manager.broadcast_to_home(area.home_id, {
            "type": "device.updated", 
            "home_id": area.home_id,
            "device_id": updated_device.id,
            "is_on": updated_device.is_on,
            "state": updated_device.state
        })
        
        return updated_device

    async def delete(self, user: User, device_id: int) -> None:
        device = await self.devices.get(device_id)
        if device is None:
            raise EntityNotFoundError("Không tìm thấy thiết bị")

        area = await self.areas.get(device.area_id)
        if not area:
            raise EntityNotFoundError("Không tìm thấy khu vực của thiết bị")

        home = await self.permissions.home_service.homes.get(area.home_id)
        member = await self.permissions.home_service.members.get(area.home_id, user.id)
        is_owner = home and home.owner_id == user.id
        is_admin = member and member.role in [HomeRole.OWNER, HomeRole.ADMIN]

        if not is_owner and not is_admin and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà hoặc quản trị viên mới có quyền xóa thiết bị")

        await self.devices.delete(device)

    async def command(
        self, user: User | None, device_id: int, payload: DeviceCommand
    ) -> Device:
        device = await self.devices.get(device_id)
        if device is None:
            raise EntityNotFoundError("Không tìm thấy thiết bị")
            
        if user is not None:
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

        # Lấy home_id từ Area
        area = await self.session.get(Area, device.area_id)
        
        # Phát thông báo WebSocket thời gian thực cho các user đang mở ngôi nhà này
        if area:
            await manager.broadcast_to_home(area.home_id, {
                "type": "device.updated", 
                "home_id": area.home_id,
                "device_id": device.id,
                "is_on": device.is_on,
                "state": device.state
            })
        else:
            await manager.broadcast({
                "type": "device.updated", 
                "device_id": device.id,
                "is_on": device.is_on,
                "state": device.state
            })
        
        # --- Đẩy sự kiện vào Redis (Worker xử lý Alert) ---
        activity_event = {
            "device_id": device.id,
            "name": device.name,
            "category": str(device.category),
            "is_on": device.is_on,
            "state": device.state,
            "user_id": user.id if user else None,
            "user_name": user.name if user else "Hệ thống tự động",
            "home_id": area.home_id if area else None,
        }
        await redis_client.lpush("queue:device_activity", json.dumps(activity_event))
        
        return device
