from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import EntityNotFoundError, PermissionDeniedError
from app.models import Home, HomeMember, HomeRole, User, UserRole
from app.repositories.homes import HomeRepository, HomeMemberRepository
from app.repositories.users import UserRepository

class HomeService:
    def __init__(self, session: AsyncSession) -> None:
        self.homes = HomeRepository(session)
        self.members = HomeMemberRepository(session)
        self.users = UserRepository(session)
        self.session = session

    async def list_homes(self, user: User) -> list[Home]:
        if user.role == UserRole.ADMIN:
            # For system admin, list all? Or just homes they are member of?
            # Let's keep it simple: admin still needs to be member of home, or you can fetch all
            pass
        return await self.homes.list_by_user(user.id)

    async def get_home(self, user: User, home_id: int) -> Home:
        home = await self.homes.get(home_id)
        if not home:
            raise EntityNotFoundError("Không tìm thấy nhà")
        
        member = await self.members.get(home_id, user.id)
        if not member and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Bạn không có quyền truy cập nhà này")
            
        return home

    async def create_home(self, user: User, name: str, address: str | None) -> Home:
        home = await self.homes.create(name=name, address=address, owner_id=user.id)
        # Add creator as owner member
        await self.members.add_member(home.id, user.id, HomeRole.OWNER)
        await self.session.commit()
        await self.session.refresh(home)
        return home

    async def update_home(self, user: User, home_id: int, name: str | None, address: str | None) -> Home:
        home = await self.get_home(user, home_id)
        
        member = await self.members.get(home_id, user.id)
        if (not member or member.role not in [HomeRole.OWNER, HomeRole.ADMIN]) and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ có chủ nhà hoặc quản trị viên mới được cập nhật")
            
        if name is not None:
            home.name = name
        if address is not None:
            home.address = address
            
        await self.homes.commit(home)
        return home

    async def delete_home(self, user: User, home_id: int) -> None:
        home = await self.get_home(user, home_id)
        
        member = await self.members.get(home_id, user.id)
        if (not member or member.role != HomeRole.OWNER) and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà mới có quyền xóa nhà")
            
        await self.homes.delete(home)
        await self.session.commit()

    async def list_members(self, user: User, home_id: int) -> list[HomeMember]:
        await self.get_home(user, home_id) # check access
        return await self.members.list_by_home(home_id)

    async def add_member(self, user: User, home_id: int, email: str, role: HomeRole) -> HomeMember:
        home = await self.get_home(user, home_id)
        
        member = await self.members.get(home_id, user.id)
        if (not member or member.role not in [HomeRole.OWNER, HomeRole.ADMIN]) and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà hoặc quản trị viên mới có quyền thêm thành viên")
            
        target_user = await self.users.get_by_email(email)
        if not target_user:
            raise EntityNotFoundError("Không tìm thấy người dùng với email này")
            
        existing_member = await self.members.get(home_id, target_user.id)
        if existing_member:
            raise PermissionDeniedError("Người dùng đã là thành viên của nhà này")
            
        new_member = await self.members.add_member(home_id, target_user.id, role)
        await self.session.commit()
        await self.session.refresh(new_member)
        return new_member

    async def update_member(self, user: User, home_id: int, target_user_id: int, role: HomeRole) -> HomeMember:
        await self.get_home(user, home_id) # Check access
        
        member = await self.members.get(home_id, user.id)
        if (not member or member.role not in [HomeRole.OWNER, HomeRole.ADMIN]) and user.role != UserRole.ADMIN:
            raise PermissionDeniedError("Chỉ chủ nhà hoặc quản trị viên mới có quyền cập nhật thành viên")
            
        target_member = await self.members.get(home_id, target_user_id)
        if not target_member:
            raise EntityNotFoundError("Không tìm thấy thành viên trong nhà")
            
        if target_member.role == HomeRole.OWNER and role != HomeRole.OWNER:
            raise PermissionDeniedError("Không thể thay đổi quyền của chủ nhà")
            
        target_member.role = role
        await self.session.commit()
        await self.session.refresh(target_member)
        return target_member

    async def remove_member(self, user: User, home_id: int, target_user_id: int) -> None:
        home = await self.get_home(user, home_id)
        
        member = await self.members.get(home_id, user.id)
        target_member = await self.members.get(home_id, target_user_id)
        
        if not target_member:
            raise EntityNotFoundError("Không tìm thấy thành viên trong nhà")
            
        if target_member.role == HomeRole.OWNER:
            raise PermissionDeniedError("Không thể xóa chủ nhà")
            
        # You can remove yourself, OR you need to be OWNER/ADMIN to remove others
        if user.id != target_user_id:
            if (not member or member.role not in [HomeRole.OWNER, HomeRole.ADMIN]) and user.role != UserRole.ADMIN:
                raise PermissionDeniedError("Bạn không có quyền xóa thành viên này")
                
        await self.members.delete(target_member)
        await self.session.commit()
