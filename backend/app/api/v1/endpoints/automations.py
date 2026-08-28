from fastapi import APIRouter, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.schemas import AutomationCreate, AutomationRead
from app.services.automation_service import AutomationService

router = APIRouter()


@router.get("", response_model=list[AutomationRead])
async def list_automations(_: CurrentUser, session: DatabaseSession, home_id: int) -> list:
    return await AutomationService(session).list(home_id)


@router.post("", response_model=AutomationRead, status_code=status.HTTP_201_CREATED)
async def create_automation(
    payload: AutomationCreate, _: AdminUser, session: DatabaseSession
):
    return await AutomationService(session).create(payload)


@router.patch("/{automation_id}", response_model=AutomationRead)
async def toggle_automation(
    automation_id: int,
    enabled: bool,
    _: AdminUser,
    session: DatabaseSession,
):
    return await AutomationService(session).toggle(automation_id, enabled)
