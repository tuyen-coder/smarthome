from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import delete, func, select

from app.models import FaceAccessEvent, FaceEmbedding, FaceProfile, User, utc_now
from app.repositories.base import Repository


class FaceRepository(Repository[FaceProfile]):
    async def get_profile(self, user_id: int) -> FaceProfile | None:
        return await self.session.scalar(
            select(FaceProfile).where(FaceProfile.user_id == user_id)
        )

    async def sample_count(self, profile_id: int) -> int:
        count = await self.session.scalar(
            select(func.count(FaceEmbedding.id)).where(
                FaceEmbedding.profile_id == profile_id
            )
        )
        return int(count or 0)

    async def replace_embeddings(
        self,
        *,
        user_id: int,
        samples: Sequence[tuple[list[float], float]],
    ) -> FaceProfile:
        profile = await self.get_profile(user_id)
        if profile is None:
            profile = FaceProfile(user_id=user_id)
            self.session.add(profile)
            await self.session.flush()
        else:
            profile.is_active = True
            profile.updated_at = utc_now()
            await self.session.execute(
                delete(FaceEmbedding).where(FaceEmbedding.profile_id == profile.id)
            )
        self.session.add_all(
            [
                FaceEmbedding(
                    profile_id=profile.id,
                    embedding=embedding,
                    quality_score=quality_score,
                )
                for embedding, quality_score in samples
            ]
        )
        await self.session.commit()
        await self.session.refresh(profile)
        return profile

    async def list_candidates(self) -> list[tuple[FaceEmbedding, User]]:
        result = await self.session.execute(
            select(FaceEmbedding, User)
            .join(FaceProfile, FaceEmbedding.profile_id == FaceProfile.id)
            .join(User, FaceProfile.user_id == User.id)
            .where(FaceProfile.is_active.is_(True), User.is_active.is_(True))
        )
        return [(row[0], row[1]) for row in result.all()]

    async def delete_profile(self, profile: FaceProfile) -> None:
        await self.session.delete(profile)
        await self.session.commit()

    async def create_event(
        self,
        *,
        user_id: int | None,
        device_id: int | None,
        recognized: bool,
        similarity: float | None,
        reason: str,
    ) -> FaceAccessEvent:
        event = FaceAccessEvent(
            user_id=user_id,
            device_id=device_id,
            recognized=recognized,
            similarity=similarity,
            reason=reason,
        )
        self.session.add(event)
        return await self.commit(event)

    async def list_events(
        self, limit: int = 100
    ) -> list[tuple[FaceAccessEvent, str | None]]:
        result = await self.session.execute(
            select(FaceAccessEvent, User.name)
            .outerjoin(User, FaceAccessEvent.user_id == User.id)
            .order_by(FaceAccessEvent.created_at.desc())
            .limit(limit)
        )
        return [(row[0], row[1]) for row in result.all()]
