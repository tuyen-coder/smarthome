from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Form, Response, UploadFile, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.core.config import settings
from app.core.exceptions import InvalidFaceImageError
from app.schemas import (
    FaceAccessEventRead,
    FaceBox,
    FaceDetectionRead,
    FaceProfileRead,
    FaceRecognitionRead,
)
from app.services.face_service import FaceService

router = APIRouter()


async def read_image(upload: UploadFile) -> bytes:
    if upload.content_type is not None and not upload.content_type.startswith("image/"):
        raise InvalidFaceImageError("Tệp tải lên phải là ảnh")
    image = await upload.read(settings.face_max_upload_bytes + 1)
    if len(image) > settings.face_max_upload_bytes:
        raise InvalidFaceImageError("Ảnh vượt quá dung lượng 10 MB")
    return image


def detection_read(detection) -> FaceDetectionRead:
    return FaceDetectionRead(
        box=FaceBox(
            x=detection.x,
            y=detection.y,
            width=detection.width,
            height=detection.height,
        ),
        confidence=detection.confidence,
        brightness=detection.brightness,
        sharpness=detection.sharpness,
        quality_score=detection.quality_score,
    )


def profile_read(profile, sample_count: int) -> FaceProfileRead:
    return FaceProfileRead(
        user_id=profile.user_id,
        sample_count=sample_count,
        model_name=profile.model_name,
        model_version=profile.model_version,
        is_active=profile.is_active,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.post("/detect", response_model=FaceDetectionRead)
async def detect_face(
    file: Annotated[UploadFile, File()],
    _: CurrentUser,
    session: DatabaseSession,
) -> FaceDetectionRead:
    sample = await FaceService(session).extract(await read_image(file))
    return detection_read(sample.detection)


@router.post("/users/{user_id}/enroll", response_model=FaceProfileRead)
async def enroll_face(
    user_id: int,
    files: Annotated[list[UploadFile], File()],
    _: AdminUser,
    session: DatabaseSession,
) -> FaceProfileRead:
    images = [await read_image(upload) for upload in files]
    profile, count = await FaceService(session).enroll(user_id, images)
    return profile_read(profile, count)


@router.get("/users/{user_id}", response_model=FaceProfileRead)
async def get_face_profile(
    user_id: int, _: AdminUser, session: DatabaseSession
) -> FaceProfileRead:
    profile, count = await FaceService(session).get_profile(user_id)
    return profile_read(profile, count)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_face_profile(
    user_id: int, _: AdminUser, session: DatabaseSession
) -> Response:
    await FaceService(session).delete_profile(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/recognize", response_model=FaceRecognitionRead)
async def recognize_face(
    file: Annotated[UploadFile, File()],
    _: CurrentUser,
    session: DatabaseSession,
    device_id: Annotated[int | None, Form()] = None,
) -> FaceRecognitionRead:
    result = await FaceService(session).recognize(
        await read_image(file), device_id=device_id
    )
    return FaceRecognitionRead(
        event_id=result.event.id,
        recognized=result.event.recognized,
        user_id=result.user.id if result.user else None,
        user_name=result.user.name if result.user else None,
        similarity=result.similarity,
        threshold=settings.face_match_threshold,
        reason=result.event.reason,
        detection=detection_read(result.detection),
    )


@router.get("/events", response_model=list[FaceAccessEventRead])
async def list_face_events(
    _: AdminUser,
    session: DatabaseSession,
    limit: int = 100,
) -> list[FaceAccessEventRead]:
    rows = await FaceService(session).list_events(min(max(limit, 1), 500))
    return [
        FaceAccessEventRead(
            id=event.id,
            user_id=event.user_id,
            user_name=user_name,
            device_id=event.device_id,
            recognized=event.recognized,
            similarity=event.similarity,
            reason=event.reason,
            created_at=event.created_at,
        )
        for event, user_name in rows
    ]
