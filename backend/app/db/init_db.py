from sqlalchemy import func, select
from datetime import datetime

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import (
    Alert,
    AlertSeverity,
    Area,
    Automation,
    Device,
    DeviceCategory,
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

        # 1. Tạo User Admin
        admin = User(
            name="Nguyễn Thiên Ân",
            email="admin@yolohome.vn",
            password_hash=hash_password("admin123"),
            role=UserRole.ADMIN,
        )

        # 2. Tạo các Khu vực (Areas)
        living_room = Area(
            name="Phòng Khách", description="Khu vực hệ thống đèn RGB & Máy bơm"
        )
        bedroom = Area(
            name="Phòng Ngủ", description="Khu vực nghỉ ngơi & chiếu sáng nhẹ"
        )
        kitchen = Area(
            name="Phòng Bếp", description="Khu vực nấu nướng & giám sát an toàn"
        )
        garden = Area(
            name="Sân Vườn / Ban Công", description="Khu vực tưới cây & cảm biến"
        )

        session.add_all([admin, living_room, bedroom, kitchen, garden])
        await session.flush()

        # 3. Tạo Các Thiết Bị (Devices)
        # --- Phòng Khách ---
        led1 = Device(
            name="Đèn LED 1 (RGB)",
            category=DeviceCategory.ACTUATOR,
            type=DeviceType.LIGHT,
            area_id=living_room.id,
            feed_key="bbc-led1",
            is_on=False,
            state={"color": "#FFFFFF", "mode": "manual"},
        )
        led2 = Device(
            name="Đèn LED 2 (RGB)",
            category=DeviceCategory.ACTUATOR,
            type=DeviceType.LIGHT,
            area_id=living_room.id,
            feed_key="bbc-led2",
            is_on=False,
            state={"color": "#FFFFFF", "mode": "manual"},
        )
        temp_sensor = Device(
            name="Cảm Biến Nhiệt Độ (DHT20)",
            category=DeviceCategory.SENSOR,
            type=DeviceType.CLIMATE,
            area_id=living_room.id,
            feed_key="bbc-temp",
            is_on=True,
            state={"sensor_model": "DHT20"},
        )
        humi_sensor = Device(
            name="Cảm Biến Độ Ẩm (DHT20)",
            category=DeviceCategory.SENSOR,
            type=DeviceType.CLIMATE,
            area_id=living_room.id,
            feed_key="bbc-humi",
            is_on=True,
            state={"sensor_model": "DHT20"},
        )

        # --- Phòng Ngủ ---
        led3 = Device(
            name="Đèn LED 3 (Phòng Ngủ)",
            category=DeviceCategory.ACTUATOR,
            type=DeviceType.LIGHT,
            area_id=bedroom.id,
            feed_key="bbc-led3",
            is_on=False,
            state={"color": "#FFC0CB", "mode": "manual"},
        )

        # --- Phòng Bếp ---
        led4 = Device(
            name="Đèn cảm biến LED 4",
            category=DeviceCategory.HYBRID,
            type=DeviceType.LIGHT,
            area_id=kitchen.id,
            feed_key="bbc-led4",
            is_on=False,
            state={
                "auto_distance_mode": True,
                "description": "1: Bật cố định | 0: Tự động theo khoảng cách",
            },
        )

        # --- Sân Vườn ---
        pump = Device(
            name="Máy Bơm Nước",
            category=DeviceCategory.ACTUATOR,
            type=DeviceType.PUMP,
            area_id=garden.id,
            feed_key="bbc-pump",
            is_on=False,
            state={"flow_rate": "normal"},
        )

        session.add_all([led1, led2, led3, led4, pump, temp_sensor, humi_sensor])
        await session.flush()

        # 4. Tạo 20 mẫu Telemetry cho thiết bị 6 (nhiệt độ) và 7 (độ ẩm) cùng Automations & Alerts
        session.add_all(
            [
                # Cảm biến Nhiệt độ
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=29.6, unit="°C", recorded_at=datetime(2026, 8, 27, 22, 55, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=29.8, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 0, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=30.1, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 5, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=30.0, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 10, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=29.7, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 15, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=29.5, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 20, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=29.4, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 25, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=29.2, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 30, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=29.1, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 35, 0)),
                Telemetry(device_id=temp_sensor.id, metric="temperature", value=28.9, unit="°C", recorded_at=datetime(2026, 8, 27, 23, 40, 0)),

                # Cảm biến Độ ẩm
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=71.0, unit="%", recorded_at=datetime(2026, 8, 27, 22, 55, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=69.5, unit="%", recorded_at=datetime(2026, 8, 27, 23, 0, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=68.0, unit="%", recorded_at=datetime(2026, 8, 27, 23, 5, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=67.5, unit="%", recorded_at=datetime(2026, 8, 27, 23, 10, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=68.0, unit="%", recorded_at=datetime(2026, 8, 27, 23, 15, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=68.5, unit="%", recorded_at=datetime(2026, 8, 27, 23, 20, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=69.0, unit="%", recorded_at=datetime(2026, 8, 27, 23, 25, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=69.2, unit="%", recorded_at=datetime(2026, 8, 27, 23, 30, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=70.1, unit="%", recorded_at=datetime(2026, 8, 27, 23, 35, 0)),
                Telemetry(device_id=humi_sensor.id, metric="humidity", value=70.5, unit="%", recorded_at=datetime(2026, 8, 27, 23, 40, 0)),

                Automation(
                    name="Tự động bật Đèn 4 khi có người lại gần",
                    enabled=True,
                    trigger={"type": "distance", "operator": "<", "value_cm": 20},
                    action={"device_id": led4.id, "mode": "auto_trigger"},
                ),
                Automation(
                    name="Bật máy bơm khi nhiệt độ cao",
                    enabled=False,
                    trigger={"type": "temperature", "operator": ">", "value": 35},
                    action={"device_id": pump.id, "is_on": True},
                ),
                Alert(
                    device_id=temp_sensor.id,
                    title="Nhiệt độ phòng",
                    message="Nhiệt độ hiện tại 29.5°C đang ở mức ổn định",
                    severity=AlertSeverity.INFO,
                ),
            ]
        )
        await session.commit()