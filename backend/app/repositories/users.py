from sqlalchemy import select

from app.models import User, UserRole
from app.repositories.base import Repository


class UserRepository(Repository[User]):
    async def list(self) -> list[User]:
        result = await self.session.scalars(select(User).order_by(User.name))
        return list(result)

    async def get(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await self.session.scalar(
            select(User).where(User.email == email.lower())
        )

    async def create(
        self, *, name: str, email: str, password_hash: str, role: UserRole
    ) -> User:
        user = User(
            name=name, email=email.lower(), password_hash=password_hash, role=role
        )
        self.session.add(user)
        return await self.commit(user)
