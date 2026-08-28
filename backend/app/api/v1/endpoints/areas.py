from fastapi import APIRouter, Response, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.schemas import AreaCreate, AreaRead, PermissionRead, PermissionUpdate
from app.services.permission_service import PermissionService

router = APIRouter()


@router.get("", response_model=list[AreaRead])
async def list_areas(user: CurrentUser, session: DatabaseSession, home_id: int) -> list:
    return await PermissionService(session).list_areas(user, home_id)


@router.post("", response_model=AreaRead, status_code=status.HTTP_201_CREATED)
async def create_area(payload: AreaCreate, user: CurrentUser, session: DatabaseSession):
    return await PermissionService(session).create_area(
        user, payload.home_id, payload.name, payload.description
    )


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(area_id: int, user: CurrentUser, session: DatabaseSession) -> Response:
    await PermissionService(session).delete_area(user, area_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{area_id}/permissions/{user_id}", response_model=PermissionRead)
async def grant_permission(
    area_id: int,
    user_id: int,
    payload: PermissionUpdate,
    user: CurrentUser,
    session: DatabaseSession,
):
    return await PermissionService(session).grant(
        current_user=user,
        user_id=user_id,
        area_id=area_id,
        **payload.model_dump(),
    )
