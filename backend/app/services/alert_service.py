from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models import Alert
from app.repositories.alerts import AlertRepository
from app.schemas import AlertCreate


class AlertService:
    def __init__(self, session: AsyncSession) -> None:
        self.alerts = AlertRepository(session)

    async def list(self, home_id: int, unresolved_only: bool = False) -> list[Alert]:
        return await self.alerts.list(home_id, unresolved_only)

    async def create(self, payload: AlertCreate) -> Alert:
        return await self.alerts.create(
            home_id=payload.home_id,
            device_id=payload.device_id,
            user_id=payload.user_id,
            user_name=payload.user_name,
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

    async def mark_all_read(self, home_id: int) -> None:
        await self.alerts.mark_all_read(home_id)
