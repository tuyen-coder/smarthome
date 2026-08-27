from sqlalchemy import func, select

from app.models import Device, DeviceType, DeviceCategory
from app.repositories.base import Repository


class DeviceRepository(Repository[Device]):
    async def list(self, area_id: int | None = None) -> list[Device]:
        statement = select(Device).order_by(Device.area_id, Device.name)
        if area_id is not None:
            statement = statement.where(Device.area_id == area_id)
        result = await self.session.scalars(statement)
        return list(result)

    async def get(self, device_id: int) -> Device | None:
        return await self.session.get(Device, device_id)

    async def create(
        self,
        *,
        name: str,
        device_category: DeviceCategory,
        device_type: DeviceType,
        area_id: int,
        feed_key: str | None,
        state: dict[str, object],
    ) -> Device:
        device = Device(
            name=name,
            category=device_category,
            type=device_type,
            area_id=area_id,
            feed_key=feed_key,
            state=state,
        )
        self.session.add(device)
        return await self.commit(device)

    async def update_state(
        self, device: Device, *, is_on: bool | None, state: dict[str, object]
    ) -> Device:
        if is_on is not None:
            device.is_on = is_on
        device.state = {**device.state, **state}
        return await self.commit(device)

    async def counts(self) -> tuple[int, int]:
        online = await self.session.scalar(
            select(func.count(Device.id)).where(Device.is_online.is_(True))
        )
        active = await self.session.scalar(
            select(func.count(Device.id)).where(Device.is_on.is_(True))
        )
        return int(online or 0), int(active or 0)

    async def get_by_feed_key(self, feed_key: str) -> Device | None:
        statement = select(Device).where(Device.feed_key == feed_key)
        result = await self.session.scalars(statement)
        return result.first()
