from sqlalchemy import select

from app.models import Automation
from app.repositories.base import Repository


class AutomationRepository(Repository[Automation]):
    async def list(self) -> list[Automation]:
        result = await self.session.scalars(
            select(Automation).order_by(Automation.name)
        )
        return list(result)

    async def get(self, automation_id: int) -> Automation | None:
        return await self.session.get(Automation, automation_id)

    async def create(
        self,
        *,
        name: str,
        enabled: bool,
        trigger: dict[str, object],
        action: dict[str, object],
    ) -> Automation:
        automation = Automation(
            name=name,
            enabled=enabled,
            trigger=trigger,
            action=action,
        )
        self.session.add(automation)
        return await self.commit(automation)

    async def set_enabled(self, automation: Automation, enabled: bool) -> Automation:
        automation.enabled = enabled
        return await self.commit(automation)
