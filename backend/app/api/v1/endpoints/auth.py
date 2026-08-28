from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DatabaseSession
from app.schemas import LoginRequest, TokenResponse, UserRead, ChangePasswordRequest, UserCreate
from app.services.auth_service import AuthService


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: DatabaseSession) -> TokenResponse:
    _, token = await AuthService(session).authenticate(payload)
    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, session: DatabaseSession):
    return await AuthService(session).register(payload)

@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, user: CurrentUser, session: DatabaseSession):
    await AuthService(session).change_password(user.id, payload.old_password, payload.new_password)
    return {"message": "Đổi mật khẩu thành công"}


@router.post("/login-swagger", response_model=TokenResponse, include_in_schema=False)
async def login_swagger(
    session: DatabaseSession, 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> TokenResponse:
    # Đổi username=form_data.username thành email=form_data.username
    payload = LoginRequest(email=form_data.username, password=form_data.password)
    
    _, token = await AuthService(session).authenticate(payload)
    return TokenResponse(access_token=token)