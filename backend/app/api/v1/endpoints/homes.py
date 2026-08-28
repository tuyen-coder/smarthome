from fastapi import APIRouter, Response, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.models import HomeRole, UserRole
from app.schemas import (
    HomeCreate,
    HomeMemberCreate,
    HomeMemberRead,
    HomeRead,
    HomeUpdate,
    MyRoleResponse,
    PermissionRead,
)
from app.services.home_service import HomeService
from app.services.permission_service import PermissionService

router = APIRouter()


@router.get("", response_model=list[HomeRead])
async def list_homes(user: CurrentUser, session: DatabaseSession) -> list:
    return await HomeService(session).list_homes(user)


@router.post("", response_model=HomeRead, status_code=status.HTTP_201_CREATED)
async def create_home(payload: HomeCreate, user: CurrentUser, session: DatabaseSession):
    return await HomeService(session).create_home(user, payload.name, payload.address)


@router.get("/{home_id}", response_model=HomeRead)
async def get_home(home_id: int, user: CurrentUser, session: DatabaseSession):
    return await HomeService(session).get_home(user, home_id)


@router.put("/{home_id}", response_model=HomeRead)
async def update_home(home_id: int, payload: HomeUpdate, user: CurrentUser, session: DatabaseSession):
    return await HomeService(session).update_home(user, home_id, payload.name, payload.address)


@router.delete("/{home_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_home(home_id: int, user: CurrentUser, session: DatabaseSession) -> Response:
    await HomeService(session).delete_home(user, home_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{home_id}/members", response_model=list[HomeMemberRead])
async def list_home_members(home_id: int, user: CurrentUser, session: DatabaseSession):
    return await HomeService(session).list_members(user, home_id)

@router.get("/{home_id}/my_role", response_model=MyRoleResponse)
async def get_my_role(home_id: int, user: CurrentUser, session: DatabaseSession):
    if user.role == UserRole.ADMIN:
        return MyRoleResponse(role="admin")
    member = await HomeService(session).members.get(home_id, user.id)
    return MyRoleResponse(role=member.role if member else None)

@router.post("/{home_id}/members", response_model=HomeMemberRead, status_code=status.HTTP_201_CREATED)
async def add_home_member(home_id: int, payload: HomeMemberCreate, user: CurrentUser, session: DatabaseSession):
    return await HomeService(session).add_member(user, home_id, payload.email, payload.role)

from app.schemas import HomeMemberUpdate
@router.put("/{home_id}/members/{target_user_id}", response_model=HomeMemberRead)
async def update_home_member(home_id: int, target_user_id: int, payload: HomeMemberUpdate, user: CurrentUser, session: DatabaseSession):
    return await HomeService(session).update_member(user, home_id, target_user_id, payload.role)

@router.delete("/{home_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_home_member(home_id: int, target_user_id: int, user: CurrentUser, session: DatabaseSession) -> Response:
    await HomeService(session).remove_member(user, home_id, target_user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{home_id}/members/{target_user_id}/permissions", response_model=list[PermissionRead])
async def list_member_permissions(home_id: int, target_user_id: int, user: CurrentUser, session: DatabaseSession):
    return await PermissionService(session).list_user_permissions(user, target_user_id, home_id)


@router.get("/{home_id}/my_permissions", response_model=list[PermissionRead])
async def get_my_permissions(home_id: int, user: CurrentUser, session: DatabaseSession):
    return await PermissionService(session).list_user_permissions(user, user.id, home_id)
