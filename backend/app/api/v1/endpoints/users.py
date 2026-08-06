from fastapi import APIRouter, status

from app.api.deps import AdminUser, DatabaseSession
from app.schemas import UserCreate, UserRead
from app.services.auth_service import AuthService

router = APIRouter()


@router.get("", response_model=list[UserRead])
async def list_users(_: AdminUser, session: DatabaseSession) -> list:
    return await AuthService(session).list_users()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, _: AdminUser, session: DatabaseSession):
    return await AuthService(session).register(payload)
