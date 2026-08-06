from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models import Area, AreaPermission, User, UserRole
from app.repositories.areas import AreaRepository
from app.repositories.permissions import PermissionRepository


class PermissionService:
    def __init__(self, session: AsyncSession) -> None:
        self.permissions = PermissionRepository(session)
        self.areas = AreaRepository(session)

    async def can_access(self, user: User, area_id: int, control: bool = False) -> bool:
        if user.role == UserRole.ADMIN:
            return True
        permission = await self.permissions.get(user.id, area_id)
        if permission is None or not permission.can_view:
            return False
        return permission.can_control if control else True

    async def list_areas(self, user: User) -> list[Area]:
        areas = await self.areas.list()
        if user.role == UserRole.ADMIN:
            return areas
        visible: list[Area] = []
        for area in areas:
            if await self.can_access(user, area.id):
                visible.append(area)
        return visible

    async def create_area(self, name: str, description: str | None) -> Area:
        return await self.areas.create(name=name, description=description)

    async def delete_area(self, area_id: int) -> None:
        area = await self.areas.get(area_id)
        if area is None:
            raise EntityNotFoundError("Không tìm thấy khu vực")
        await self.areas.delete(area)

    async def grant(
        self,
        *,
        user_id: int,
        area_id: int,
        can_view: bool,
        can_control: bool,
    ) -> AreaPermission:
        if await self.areas.get(area_id) is None:
            raise EntityNotFoundError("Không tìm thấy khu vực")
        return await self.permissions.upsert(
            user_id=user_id,
            area_id=area_id,
            can_view=can_view,
            can_control=can_control,
        )
