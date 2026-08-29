from sqlalchemy import select

from app.models import Automation
from app.repositories.base import Repository


class AutomationRepository(Repository[Automation]):
    async def list(self, home_id: int) -> list[Automation]:
        result = await self.session.scalars(
            select(Automation).where(Automation.home_id == home_id).order_by(Automation.name)
        )
        return list(result)

    async def list_all_enabled(self) -> list[Automation]:
        result = await self.session.scalars(
            select(Automation).where(Automation.enabled == True)
        )
        return list(result)

    async def get(self, automation_id: int) -> Automation | None:
        return await self.session.get(Automation, automation_id)

    async def create(
        self,
        *,
        home_id: int,
        name: str,
        enabled: bool,
        trigger: dict[str, object],
        action: dict[str, object],
    ) -> Automation:
        automation = Automation(
            home_id=home_id,
            name=name,
            enabled=enabled,
            trigger=trigger,
            action=action,
        )
        self.session.add(automation)
        return await self.commit(automation)

    async def update(
        self,
        automation: Automation,
        *,
        name: str | None = None,
        enabled: bool | None = None,
        trigger: dict[str, object] | None = None,
        action: dict[str, object] | None = None,
        **kwargs
    ) -> Automation:
        if name is not None:
            automation.name = name
        if enabled is not None:
            automation.enabled = enabled
        if trigger is not None:
            automation.trigger = trigger
        if action is not None:
            automation.action = action
            
        return await self.commit(automation)

    async def set_enabled(self, automation: Automation, enabled: bool) -> Automation:
        automation.enabled = enabled
        return await self.commit(automation)

    async def delete(self, automation: Automation) -> None:
        await self.session.delete(automation)
        await self.session.commit()
