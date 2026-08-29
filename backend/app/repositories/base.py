from typing import Generic, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class Repository(Generic[ModelT]):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def commit(self, instance: ModelT) -> ModelT:
        await self.session.commit()
        await self.session.refresh(instance)
        return instance
