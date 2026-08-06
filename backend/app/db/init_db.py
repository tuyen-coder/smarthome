from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import (
    Alert,
    AlertSeverity,
    Area,
    Automation,
    Device,
    DeviceType,
    Telemetry,
    User,
    UserRole,
)


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        user_count = await session.scalar(select(func.count(User.id)))
        if user_count:
            return

        admin = User(
            name="Nguyễn Thiên Ân",
            email="admin@yolohome.vn",
            password_hash=hash_password("admin123"),
            role=UserRole.ADMIN,
        )
        living_room = Area(name="Phòng Khách", description="Không gian sinh hoạt chung")
        bedroom = Area(name="Phòng Ngủ", description="Không gian nghỉ ngơi")
        kitchen = Area(name="Nhà Bếp", description="Khu vực bếp")
        entrance = Area(name="Cửa Chính", description="Khu vực an ninh")
        session.add_all([admin, living_room, bedroom, kitchen, entrance])
        await session.flush()

        light = Device(
            name="Đèn Trần",
            type=DeviceType.LIGHT,
            area_id=living_room.id,
            feed_key="bbc-led",
            is_on=True,
            state={"brightness": 64},
        )
        climate = Device(
            name="Điều Hòa",
            type=DeviceType.CLIMATE,
            area_id=living_room.id,
            feed_key="bbc-pump",
            is_on=True,
            state={"temperature": 22},
        )
        purifier = Device(
            name="Máy Lọc Không Khí",
            type=DeviceType.CLIMATE,
            area_id=bedroom.id,
            is_on=True,
            state={"air_quality": "Tốt", "power_watts": 12},
        )
        door = Device(
            name="Khóa Cửa Chính",
            type=DeviceType.SECURITY,
            area_id=entrance.id,
            is_on=True,
            state={"locked": True},
        )
        session.add_all([light, climate, purifier, door])
        await session.flush()

        session.add_all(
            [
                Telemetry(
                    device_id=climate.id, metric="temperature", value=28, unit="°C"
                ),
                Telemetry(device_id=purifier.id, metric="humidity", value=65, unit="%"),
                Automation(
                    name="Tắt đèn khi rời nhà",
                    trigger={"type": "presence", "value": "away"},
                    action={"device_id": light.id, "is_on": False},
                ),
                Alert(
                    device_id=door.id,
                    title="An ninh",
                    message="Cửa chính đã khóa",
                    severity=AlertSeverity.INFO,
                ),
            ]
        )
        await session.commit()
