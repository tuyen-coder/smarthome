from sqlalchemy import select

from app.models import AreaPermission
from app.repositories.base import Repository


class PermissionRepository(Repository[AreaPermission]):
    async def list_for_user(self, user_id: int) -> list[AreaPermission]:
        result = await self.session.scalars(
            select(AreaPermission)
            .where(AreaPermission.user_id == user_id)
            .order_by(AreaPermission.area_id)
        )
        return list(result)

    async def get(self, user_id: int, area_id: int) -> AreaPermission | None:
        return await self.session.scalar(
            select(AreaPermission).where(
                AreaPermission.user_id == user_id,
                AreaPermission.area_id == area_id,
            )
        )

    async def upsert(
        self,
        *,
        user_id: int,
        area_id: int,
        can_view: bool,
        can_control: bool,
    ) -> AreaPermission:
        permission = await self.get(user_id, area_id)
        if permission is None:
            permission = AreaPermission(user_id=user_id, area_id=area_id)
            self.session.add(permission)
        permission.can_view = can_view
        permission.can_control = can_control
        return await self.commit(permission)
