from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class UserRole(StrEnum):
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"


class DeviceType(StrEnum):
    LIGHT = "light"
    CLIMATE = "climate"
    SECURITY = "security"
    ENTERTAINMENT = "entertainment"
    CAMERA = "camera"
    OTHER = "other"


class AlertSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.MEMBER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    type: Mapped[DeviceType] = mapped_column(Enum(DeviceType), default=DeviceType.OTHER)
    area_id: Mapped[int] = mapped_column(
        ForeignKey("areas.id", ondelete="CASCADE"), index=True
    )
    feed_key: Mapped[str | None] = mapped_column(
        String(120), unique=True, nullable=True
    )
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)
    is_on: Mapped[bool] = mapped_column(Boolean, default=False)
    state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Telemetry(Base):
    __tablename__ = "telemetry"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"), index=True
    )
    metric: Mapped[str] = mapped_column(String(80), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(24), default="")
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    trigger: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    action: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int | None] = mapped_column(
        ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity), default=AlertSeverity.INFO
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )


class AreaPermission(Base):
    __tablename__ = "area_permissions"
    __table_args__ = (UniqueConstraint("user_id", "area_id", name="uq_user_area"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    area_id: Mapped[int] = mapped_column(
        ForeignKey("areas.id", ondelete="CASCADE"), index=True
    )
    can_view: Mapped[bool] = mapped_column(Boolean, default=True)
    can_control: Mapped[bool] = mapped_column(Boolean, default=False)


__all__ = [
    "Alert",
    "AlertSeverity",
    "Area",
    "AreaPermission",
    "Automation",
    "Device",
    "DeviceType",
    "Telemetry",
    "User",
    "UserRole",
]
