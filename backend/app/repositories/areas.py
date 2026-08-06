from sqlalchemy import select

from app.models import Area
from app.repositories.base import Repository


class AreaRepository(Repository[Area]):
    async def list(self) -> list[Area]:
        result = await self.session.scalars(select(Area).order_by(Area.name))
        return list(result)

    async def get(self, area_id: int) -> Area | None:
        return await self.session.get(Area, area_id)

    async def create(self, *, name: str, description: str | None) -> Area:
        area = Area(name=name, description=description)
        self.session.add(area)
        return await self.commit(area)

    async def delete(self, area: Area) -> None:
        await self.session.delete(area)
        await self.session.commit()
