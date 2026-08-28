from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.repositories.users import UserRepository
from app.schemas import LoginRequest, UserCreate


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.users = UserRepository(session)

    async def authenticate(self, credentials: LoginRequest) -> tuple[User, str]:
        user = await self.users.get_by_email(credentials.email)
        if user is None or not verify_password(
            credentials.password, user.password_hash
        ):
            raise AuthenticationError("Email hoặc mật khẩu không đúng")
        if not user.is_active:
            raise AuthenticationError("Tài khoản đã bị vô hiệu hóa")
        token = create_access_token(user.id, role=user.role.value)
        return user, token

    async def register(self, payload: UserCreate) -> User:
        if await self.users.get_by_email(payload.email):
            raise ConflictError("Email đã được sử dụng")
        return await self.users.create(
            name=payload.name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=payload.role,
        )

    async def list_users(self) -> list[User]:
        return await self.users.list()

    async def change_password(self, user_id: int, old_password: str, new_password: str) -> None:
        user = await self.users.get(user_id)
        if not user:
            raise AuthenticationError("User not found")
        if not verify_password(old_password, user.password_hash):
            raise AuthenticationError("Mật khẩu cũ không chính xác")
        
        user.password_hash = hash_password(new_password)
        self.users.session.add(user)
        await self.users.session.commit()
