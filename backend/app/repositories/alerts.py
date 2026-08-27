from sqlalchemy import func, select

from app.models import Alert, AlertSeverity
from app.repositories.base import Repository


class AlertRepository(Repository[Alert]):
    async def list(self, unresolved_only: bool = False) -> list[Alert]:
        statement = select(Alert).order_by(Alert.created_at.desc())
        if unresolved_only:
            statement = statement.where(Alert.is_resolved.is_(False))
        result = await self.session.scalars(statement)
        return list(result)

    async def get(self, alert_id: int) -> Alert | None:
        return await self.session.get(Alert, alert_id)

    async def create(
        self,
        *,
        device_id: int | None,
        title: str,
        message: str,
        severity: AlertSeverity,
    ) -> Alert:
        alert = Alert(
            device_id=device_id,
            title=title,
            message=message,
            severity=severity,
        )
        self.session.add(alert)
        return await self.commit(alert)

    async def update_status(
        self,
        alert: Alert,
        *,
        is_read: bool | None = None,
        is_acknowledged: bool | None = None,
        is_resolved: bool | None = None,
    ) -> Alert:
        if is_read is not None:
            alert.is_read = is_read
        if is_acknowledged is not None:
            alert.is_acknowledged = is_acknowledged
        if is_resolved is not None:
            alert.is_resolved = is_resolved
        return await self.commit(alert)

    async def mark_all_read(self) -> None:
        from sqlalchemy import update
        statement = update(Alert).where(Alert.is_read.is_(False)).values(is_read=True)
        await self.session.execute(statement)
        await self.session.commit()

    async def unresolved_count(self) -> int:
        count = await self.session.scalar(
            select(func.count(Alert.id)).where(Alert.is_resolved.is_(False))
        )
        return int(count or 0)
