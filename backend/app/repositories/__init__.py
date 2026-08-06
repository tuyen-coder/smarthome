"""Database query layer used by application services."""

from app.repositories.alerts import AlertRepository
from app.repositories.areas import AreaRepository
from app.repositories.automations import AutomationRepository
from app.repositories.devices import DeviceRepository
from app.repositories.permissions import PermissionRepository
from app.repositories.telemetry import TelemetryRepository
from app.repositories.users import UserRepository

__all__ = [
    "AlertRepository",
    "AreaRepository",
    "AutomationRepository",
    "DeviceRepository",
    "PermissionRepository",
    "TelemetryRepository",
    "UserRepository",
]
