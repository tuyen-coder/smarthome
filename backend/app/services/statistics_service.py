from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.alerts import AlertRepository
from app.repositories.devices import DeviceRepository
from app.repositories.telemetry import TelemetryRepository
from app.schemas import DashboardSummary, TelemetryCreate


class StatisticsService:
    def __init__(self, session: AsyncSession) -> None:
        self.telemetry = TelemetryRepository(session)
        self.devices = DeviceRepository(session)
        self.alerts = AlertRepository(session)

    async def dashboard(self) -> DashboardSummary:
        temperature = await self.telemetry.latest_metric("temperature")
        humidity = await self.telemetry.latest_metric("humidity")
        online, active = await self.devices.counts()
        return DashboardSummary(
            temperature=temperature.value if temperature else None,
            humidity=humidity.value if humidity else None,
            online_devices=online,
            active_devices=active,
            unresolved_alerts=await self.alerts.unresolved_count(),
        )

    async def history(
        self, device_id: int | None, metric: str | None, limit: int
    ) -> list:
        return await self.telemetry.list(
            device_id=device_id, metric=metric, limit=limit
        )

    async def record(self, payload: TelemetryCreate):
        return await self.telemetry.create(**payload.model_dump())
