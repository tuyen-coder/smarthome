from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models import Alert
from app.repositories.alerts import AlertRepository
from app.schemas import AlertCreate


class AlertService:
    def __init__(self, session: AsyncSession) -> None:
        self.alerts = AlertRepository(session)

    async def list(self, unresolved_only: bool = False) -> list[Alert]:
        return await self.alerts.list(unresolved_only)

    async def create(self, payload: AlertCreate) -> Alert:
        return await self.alerts.create(
            device_id=payload.device_id,
            title=payload.title,
            message=payload.message,
            severity=payload.severity,
        )

    async def mark(self, alert_id: int, action: str) -> Alert:
        alert = await self.alerts.get(alert_id)
        if alert is None:
            raise EntityNotFoundError("Không tìm thấy cảnh báo")
        changes = {
            "read": {"is_read": True},
            "acknowledge": {"is_read": True, "is_acknowledged": True},
            "resolve": {"is_read": True, "is_acknowledged": True, "is_resolved": True},
        }
        return await self.alerts.update_status(alert, **changes[action])
