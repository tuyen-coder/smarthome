from fastapi import APIRouter, Response, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.schemas import AreaCreate, AreaRead, PermissionRead, PermissionUpdate
from app.services.permission_service import PermissionService

router = APIRouter()


@router.get("", response_model=list[AreaRead])
async def list_areas(user: CurrentUser, session: DatabaseSession) -> list:
    return await PermissionService(session).list_areas(user)


@router.post("", response_model=AreaRead, status_code=status.HTTP_201_CREATED)
async def create_area(payload: AreaCreate, _: AdminUser, session: DatabaseSession):
    return await PermissionService(session).create_area(
        payload.name, payload.description
    )


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(area_id: int, _: AdminUser, session: DatabaseSession) -> Response:
    await PermissionService(session).delete_area(area_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{area_id}/permissions/{user_id}", response_model=PermissionRead)
async def grant_permission(
    area_id: int,
    user_id: int,
    payload: PermissionUpdate,
    _: AdminUser,
    session: DatabaseSession,
):
    return await PermissionService(session).grant(
        user_id=user_id,
        area_id=area_id,
        **payload.model_dump(),
    )
