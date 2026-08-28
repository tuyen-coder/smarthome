from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.models import Area, AreaPermission, HomeRole, User, UserRole
from app.repositories.areas import AreaRepository
from app.repositories.permissions import PermissionRepository
from app.services.home_service import HomeService


class PermissionService:
    def __init__(self, session: AsyncSession) -> None:
        self.permissions = PermissionRepository(session)
        self.areas = AreaRepository(session)
        self.home_service = HomeService(session)
        self.session = session

    async def can_access(self, user: User, area_id: int, control: bool = False) -> bool:
        if user.role == UserRole.ADMIN:
            return True
        area = await self.areas.get(area_id)
        if not area:
            return False
            
        try:
            home = await self.home_service.get_home(user, area.home_id)
            if home.owner_id == user.id:
                return True
                
            member = await self.home_service.members.get(area.home_id, user.id)
            if not member:
                return False
                
            if member.role in [HomeRole.OWNER, HomeRole.ADMIN]:
                return True
                
            if member.role == HomeRole.GUEST:
                # Khách không được quyền điều khiển
                if control:
                    return False
                perm = await self.permissions.get(user.id, area_id)
                return perm.can_view if perm is not None else True
                
            if member.role == HomeRole.MEMBER:
                perm = await self.permissions.get(user.id, area_id)
                if perm is not None:
                    return perm.can_control if control else perm.can_view
                return True
        except Exception:
            return False
        return False

    async def list_areas(self, user: User, home_id: int) -> list[Area]:
        await self.home_service.get_home(user, home_id)
        
        areas = await self.areas.list(home_id=home_id)
        if user.role == UserRole.ADMIN:
            return areas
        visible: list[Area] = []
        for area in areas:
            if await self.can_access(user, area.id, control=False):
                visible.append(area)
        return visible

    async def list_user_permissions(self, user: User, target_user_id: int, home_id: int) -> list[AreaPermission]:
        await self.home_service.get_home(user, home_id)
        areas = await self.areas.list(home_id=home_id)
        area_ids = {area.id for area in areas}
        
        all_perms = await self.permissions.list_for_user(target_user_id)
        return [p for p in all_perms if p.area_id in area_ids]

    async def create_area(self, user: User, home_id: int, name: str, description: str | None) -> Area:
        home = await self.home_service.get_home(user, home_id)
        member = await self.home_service.members.get(home_id, user.id)
        if (not member or member.role not in [HomeRole.OWNER, HomeRole.ADMIN]) and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà hoặc quản trị viên mới có quyền tạo khu vực")
        return await self.areas.create(name=name, description=description, home_id=home.id)

    async def delete_area(self, user: User, area_id: int) -> None:
        area = await self.areas.get(area_id)
        if area is None:
            raise EntityNotFoundError("Không tìm thấy khu vực")
        member = await self.home_service.members.get(area.home_id, user.id)
        if (not member or member.role not in [HomeRole.OWNER, HomeRole.ADMIN]) and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà hoặc quản trị viên mới có quyền xóa khu vực")
        await self.areas.delete(area)

    async def grant(
        self,
        current_user: User,
        *,
        user_id: int,
        area_id: int,
        can_view: bool,
        can_control: bool,
    ) -> AreaPermission:
        area = await self.areas.get(area_id)
        if area is None:
            raise EntityNotFoundError("Không tìm thấy khu vực")
            
        member = await self.home_service.members.get(area.home_id, current_user.id)
        if (not member or member.role not in [HomeRole.OWNER, HomeRole.ADMIN]) and current_user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà hoặc quản trị viên mới có quyền cấp quyền")
            
        return await self.permissions.upsert(
            user_id=user_id,
            area_id=area_id,
            can_view=can_view,
            can_control=can_control,
        )
