from fastapi import APIRouter

from app.api.deps import CurrentUser, DatabaseSession
from app.schemas import LoginRequest, TokenResponse, UserRead
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: DatabaseSession) -> TokenResponse:
    _, token = await AuthService(session).authenticate(payload)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
