from sqlalchemy import select

from app.models import Area
from app.repositories.base import Repository


class AreaRepository(Repository[Area]):
    async def list(self, home_id: int) -> list[Area]:
        stmt = select(Area).where(Area.home_id == home_id).order_by(Area.name)
        result = await self.session.scalars(stmt)
        return list(result)

    async def get(self, area_id: int) -> Area | None:
        return await self.session.get(Area, area_id)

    async def create(self, *, name: str, description: str | None, home_id: int) -> Area:
        area = Area(name=name, description=description, home_id=home_id)
        self.session.add(area)
        return await self.commit(area)

    async def delete(self, area: Area) -> None:
        await self.session.delete(area)
        await self.session.commit()
