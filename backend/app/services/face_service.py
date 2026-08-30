from __future__ import annotations

import asyncio
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import FaceDetection, FaceSample, face_engine
from app.core.config import settings
from app.core.exceptions import EntityNotFoundError, InvalidFaceImageError
from app.models import FaceAccessEvent, FaceProfile, User
from app.repositories.devices import DeviceRepository
from app.repositories.faces import FaceRepository
from app.repositories.users import UserRepository


@dataclass(frozen=True, slots=True)
class RecognitionResult:
    event: FaceAccessEvent
    user: User | None
    similarity: float | None
    detection: FaceDetection


class FaceService:
    def __init__(self, session: AsyncSession) -> None:
        self.faces = FaceRepository(session)
        self.users = UserRepository(session)
        self.devices = DeviceRepository(session)

    @staticmethod
    async def extract(image: bytes, *, strict_quality: bool = True) -> FaceSample:
        if len(image) > settings.face_max_upload_bytes:
            raise InvalidFaceImageError("Ảnh vượt quá dung lượng 10 MB")
        return await asyncio.to_thread(
            face_engine.extract, image, strict_quality=strict_quality
        )

    async def enroll(
        self, user_id: int, images: list[bytes]
    ) -> tuple[FaceProfile, int]:
        if await self.users.get(user_id) is None:
            raise EntityNotFoundError("Không tìm thấy người dùng")
        if not 1 <= len(images) <= 10:
            raise InvalidFaceImageError("Cần từ 1 đến 10 ảnh đăng ký")
        samples = [await self.extract(image) for image in images]
        profile = await self.faces.replace_embeddings(
            user_id=user_id,
            samples=[
                (sample.embedding, sample.detection.quality_score) for sample in samples
            ],
        )
        return profile, len(samples)

    async def get_profile(self, user_id: int) -> tuple[FaceProfile, int]:
        profile = await self.faces.get_profile(user_id)
        if profile is None:
            raise EntityNotFoundError("Người dùng chưa đăng ký khuôn mặt")
        return profile, await self.faces.sample_count(profile.id)

    async def delete_profile(self, user_id: int) -> None:
        profile = await self.faces.get_profile(user_id)
        if profile is None:
            raise EntityNotFoundError("Người dùng chưa đăng ký khuôn mặt")
        await self.faces.delete_profile(profile)

    async def recognize(self, image: bytes, device_id: int | None) -> RecognitionResult:
        if device_id is not None and await self.devices.get(device_id) is None:
            raise EntityNotFoundError("Không tìm thấy thiết bị camera")
        sample = await self.extract(image, strict_quality=False)
        candidates = await self.faces.list_candidates()
        best_user: User | None = None
        best_similarity: float | None = None
        for embedding, user in candidates:
            similarity = face_engine.cosine_similarity(
                sample.embedding, embedding.embedding
            )
            if best_similarity is None or similarity > best_similarity:
                best_similarity = similarity
                best_user = user

        recognized = (
            best_user is not None
            and best_similarity is not None
            and best_similarity >= settings.face_match_threshold
        )
        matched_user = best_user if recognized else None
        reason = "Đã nhận diện khuôn mặt" if recognized else "Khuôn mặt không xác định"
        event = await self.faces.create_event(
            user_id=matched_user.id if matched_user else None,
            device_id=device_id,
            recognized=recognized,
            similarity=best_similarity,
            reason=reason,
        )
        return RecognitionResult(
            event=event,
            user=matched_user,
            similarity=best_similarity,
            detection=sample.detection,
        )

    async def list_events(
        self, limit: int = 100
    ) -> list[tuple[FaceAccessEvent, str | None]]:
        return await self.faces.list_events(limit)
