from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models import Automation
from app.repositories.automations import AutomationRepository
from app.schemas import AutomationCreate


class AutomationService:
    def __init__(self, session: AsyncSession) -> None:
        self.automations = AutomationRepository(session)

    async def list(self, home_id: int) -> list[Automation]:
        return await self.automations.list(home_id=home_id)

    async def create(self, payload: AutomationCreate) -> Automation:
        return await self.automations.create(**payload.model_dump())

    async def toggle(self, automation_id: int, enabled: bool) -> Automation:
        automation = await self.automations.get(automation_id)
        if automation is None:
            raise EntityNotFoundError("Không tìm thấy tự động hóa")
        return await self.automations.set_enabled(automation, enabled)
