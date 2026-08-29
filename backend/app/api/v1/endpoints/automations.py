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


@router.get("/{automation_id}", response_model=AutomationRead)
async def get_automation(
    automation_id: int, _: CurrentUser, session: DatabaseSession
):
    return await AutomationService(session).get(automation_id)


@router.put("/{automation_id}", response_model=AutomationRead)
async def update_automation(
    automation_id: int, payload: AutomationCreate, _: AdminUser, session: DatabaseSession
):
    return await AutomationService(session).update(automation_id, payload)


@router.patch("/{automation_id}", response_model=AutomationRead)
async def toggle_automation(
    automation_id: int,
    enabled: bool,
    _: AdminUser,
    session: DatabaseSession,
):
    return await AutomationService(session).toggle(automation_id, enabled)


@router.post("/{automation_id}/execute")
async def execute_automation(
    automation_id: int,
    user: CurrentUser,
    session: DatabaseSession,
):
    await AutomationService(session).execute_scene(automation_id, user)
    return {"message": "Automation executed successfully"}


@router.delete("/{automation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_automation(
    automation_id: int,
    _: AdminUser,
    session: DatabaseSession,
):
    await AutomationService(session).delete(automation_id)
