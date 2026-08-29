from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AlertSeverity, DeviceType, UserRole


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


class UserRead(ORMModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime


class AreaCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None


class AreaRead(ORMModel):
    id: int
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
    type: DeviceType = DeviceType.OTHER
    area_id: int
    feed_key: str | None = None
    state: dict[str, Any] = Field(default_factory=dict)


class DeviceRead(ORMModel):
    id: int
    name: str
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
    name: str = Field(min_length=2, max_length=160)
    enabled: bool = True
    trigger: dict[str, Any]
    action: dict[str, Any]


class AutomationRead(ORMModel):
    id: int
    name: str
    enabled: bool
    trigger: dict[str, Any]
    action: dict[str, Any]
    created_at: datetime


class AlertCreate(BaseModel):
    device_id: int | None = None
    title: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=2)
    severity: AlertSeverity = AlertSeverity.INFO


class AlertRead(ORMModel):
    id: int
    device_id: int | None
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
