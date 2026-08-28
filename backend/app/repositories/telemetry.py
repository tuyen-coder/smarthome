from datetime import UTC, datetime

from sqlalchemy import desc, select

from app.models import Telemetry, Device, Area
from app.repositories.base import Repository


class TelemetryRepository(Repository[Telemetry]):
    async def list(
        self,
        *,
        device_id: int | None = None,
        metric: str | None = None,
        limit: int = 100,
    ) -> list[Telemetry]:
        statement = select(Telemetry).order_by(desc(Telemetry.recorded_at)).limit(limit)
        if device_id is not None:
            statement = statement.where(Telemetry.device_id == device_id)
        if metric is not None:
            statement = statement.where(Telemetry.metric == metric)
        result = await self.session.scalars(statement)
        return list(result)

    async def latest_metric(self, metric: str, home_id: int) -> Telemetry | None:
        return await self.session.scalar(
            select(Telemetry)
            .join(Device, Telemetry.device_id == Device.id)
            .join(Area, Device.area_id == Area.id)
            .where(Telemetry.metric == metric, Area.home_id == home_id)
            .order_by(desc(Telemetry.recorded_at))
            .limit(1)
        )

    async def create(
        self, *, device_id: int, metric: str, value: float, unit: str
    ) -> Telemetry:
        telemetry = Telemetry(
            device_id=device_id,
            metric=metric,
            value=value,
            unit=unit,
            recorded_at=datetime.now(UTC),
        )
        self.session.add(telemetry)
        return await self.commit(telemetry)
