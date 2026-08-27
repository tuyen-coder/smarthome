from typing import Literal

from fastapi import APIRouter, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.schemas import AlertCreate, AlertRead
from app.services.alert_service import AlertService

router = APIRouter()


@router.get("", response_model=list[AlertRead])
async def list_alerts(
    _: CurrentUser,
    session: DatabaseSession,
    unresolved_only: bool = False,
) -> list:
    return await AlertService(session).list(unresolved_only)


@router.post("", response_model=AlertRead, status_code=status.HTTP_201_CREATED)
async def create_alert(payload: AlertCreate, _: AdminUser, session: DatabaseSession):
    return await AlertService(session).create(payload)


@router.patch("/{alert_id}/{action}", response_model=AlertRead)
async def update_alert(
    alert_id: int,
    action: Literal["read", "acknowledge", "resolve"],
    _: CurrentUser,
    session: DatabaseSession,
):
    return await AlertService(session).mark(alert_id, action)


@router.patch("/mark-all-read", response_model=dict)
async def mark_all_alerts_read(
    _: CurrentUser,
    session: DatabaseSession,
):
    await AlertService(session).mark_all_read()
    return {"status": "success"}
