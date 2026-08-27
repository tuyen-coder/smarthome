from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Device
from app.repositories.telemetry import TelemetryRepository

import logging
logger = logging.getLogger(__name__)

METRIC_UNITS = {
    "temperature": "°C",
    "humidity": "%",
    "light": "lux",
    "soil_moisture": "%",
}


class SensorService:

    def __init__(self, session: AsyncSession) -> None:
        self.telemetry_repo = TelemetryRepository(session)

    def _get_metric_and_unit(self, feed_key: str | None) -> tuple[str, str] | None:
        """Kiểm tra và ánh xạ feed_key sang (metric, unit).
        """
        
        if not feed_key:
            return None

        key = feed_key.lower()

        if "temp" in key or "temperature" in key:
            return "temperature", "°C"
        if "humi" in key or "humidity" in key:
            return "humidity", "%"
        if "distance" in key:
            return "distance", "cm"

        return None

    async def record_telemetry(self, device: Device, payload: str) -> None:
        """Parse payload cảm biến và lưu thông số vào bảng Telemetry."""
        # 1. Kiểm tra feed_key có hợp lệ không
        metric_info = self._get_metric_and_unit(device.feed_key)
        if not metric_info:
            logger.warning(
                f"[SensorService Rejected] Device #{device.id} ({device.name}) "
                f"có feed_key không hợp lệ hoặc thiếu: '{device.feed_key}'"
            )
            return

        metric_name, unit = metric_info

        # 2. Kiểm tra payload giá trị đo lường
        try:
            val = float(payload)
        except (ValueError, TypeError):
            logger.error(
                f"[SensorService Error] Payload không hợp lệ cho Device #{device.id}: {payload}"
            )
            return

        # 3. Lưu dữ liệu vào DB
        await self.telemetry_repo.create(
            device_id=device.id,
            metric=metric_name,
            value=val,
            unit=unit,
        )
        logger.info(
            f"[DB Saved] Telemetry | Device #{device.id} ({device.name}) -> {metric_name}: {val}{unit}"
        )