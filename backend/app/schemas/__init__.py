from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import AlertSeverity, DeviceType, DeviceCategory, UserRole, HomeRole
from enum import Enum


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    role: UserRole = UserRole.MEMBER


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=72)


class UserRead(ORMModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime


class HomeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    address: str | None = None


class HomeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = None


class HomeRead(ORMModel):
    id: int
    name: str
    address: str | None
    owner_id: int
    created_at: datetime


class HomeMemberCreate(BaseModel):
    email: EmailStr
    role: HomeRole = HomeRole.MEMBER


class HomeMemberUpdate(BaseModel):
    role: HomeRole


class HomeMemberRead(ORMModel):
    id: int
    user_id: int
    home_id: int
    role: HomeRole
    joined_at: datetime
    user: UserRead


class MyRoleResponse(BaseModel):
    role: HomeRole | None


class AreaCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    home_id: int


class AreaRead(ORMModel):
    id: int
    home_id: int
    name: str
    description: str | None
    created_at: datetime


class PermissionUpdate(BaseModel):
    can_view: bool = True
    can_control: bool = False


class PermissionRead(ORMModel):
    id: int
    user_id: int
    area_id: int
    can_view: bool
    can_control: bool


class DeviceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: DeviceCategory = DeviceCategory.ACTUATOR
    type: DeviceType = DeviceType.OTHER
    area_id: int
    feed_key: str | None = None
    state: dict[str, Any] = Field(default_factory=dict)

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v


class DeviceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: DeviceCategory | None = None
    type: DeviceType | None = None
    area_id: int | None = None
    feed_key: str | None = None

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, v: Any) -> Any:
        if isinstance(v, str):
            return v.lower()
        return v


class DeviceRead(ORMModel):
    id: int
    name: str
    category: DeviceCategory
    type: DeviceType
    area_id: int
    feed_key: str | None
    is_online: bool
    is_on: bool
    state: dict[str, Any]
    updated_at: datetime


class DeviceCommand(BaseModel):
    is_on: bool | None = None
    state: dict[str, Any] = Field(default_factory=dict)


class TelemetryCreate(BaseModel):
    device_id: int
    metric: str = Field(min_length=1, max_length=80)
    value: float
    unit: str = Field(default="", max_length=24)


class TelemetryRead(ORMModel):
    id: int
    device_id: int
    metric: str
    value: float
    unit: str
    recorded_at: datetime


class AutomationCreate(BaseModel):
    home_id: int
    name: str = Field(min_length=2, max_length=160)
    enabled: bool = True
    trigger: dict[str, Any]
    action: dict[str, Any]


class AutomationRead(ORMModel):
    id: int
    home_id: int
    name: str
    enabled: bool
    trigger: dict[str, Any]
    action: dict[str, Any]
    created_at: datetime


class AlertCreate(BaseModel):
    home_id: int | None = None
    device_id: int | None = None
    user_id: int | None = None
    user_name: str | None = None
    title: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=2)
    severity: AlertSeverity = AlertSeverity.INFO


class AlertRead(ORMModel):
    id: int
    home_id: int | None
    device_id: int | None
    user_id: int | None
    user_name: str | None
    title: str
    message: str
    severity: AlertSeverity
    is_read: bool
    is_acknowledged: bool
    is_resolved: bool
    created_at: datetime


class DashboardSummary(BaseModel):
    temperature: float | None
    humidity: float | None
    online_devices: int
    active_devices: int
    unresolved_alerts: int

class AdafruitFeed(str, Enum):
    LED1 = "bbc-led1"
    LED2 = "bbc-led2"
    LED3 = "bbc-led3"
    LED4 = "bbc-led4"
    PUMP = "bbc-pump"
    TEMP = "bbc-temp"
    HUMI = "bbc-humi"