from sqlalchemy import select
from app.models import Home, HomeMember, HomeRole
from app.repositories.base import Repository

class HomeRepository(Repository[Home]):
    async def get(self, home_id: int) -> Home | None:
        return await self.session.scalar(select(Home).where(Home.id == home_id))

    async def list_by_user(self, user_id: int) -> list[Home]:
        # Get all homes where the user is a member
        stmt = (
            select(Home)
            .join(HomeMember, Home.id == HomeMember.home_id)
            .where(HomeMember.user_id == user_id)
            .order_by(Home.id)
        )
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def create(self, name: str, address: str | None, owner_id: int) -> Home:
        home = Home(name=name, address=address, owner_id=owner_id)
        self.session.add(home)
        await self.session.flush()
        return home

    async def delete(self, home: Home) -> None:
        await self.session.delete(home)
        await self.session.flush()

class HomeMemberRepository(Repository[HomeMember]):
    async def get(self, home_id: int, user_id: int) -> HomeMember | None:
        return await self.session.scalar(
            select(HomeMember).where(
                HomeMember.home_id == home_id,
                HomeMember.user_id == user_id
            )
        )

    async def list_by_home(self, home_id: int) -> list[HomeMember]:
        stmt = select(HomeMember).where(HomeMember.home_id == home_id)
        result = await self.session.scalars(stmt)
        return list(result.all())

    async def add_member(self, home_id: int, user_id: int, role: HomeRole) -> HomeMember:
        member = HomeMember(home_id=home_id, user_id=user_id, role=role)
        self.session.add(member)
        await self.session.flush()
        return member

    async def delete(self, member: HomeMember) -> None:
        await self.session.delete(member)
        await self.session.flush()
