class SmartHomeError(Exception):
    """Base class for expected domain errors."""


class PermissionDeniedError(SmartHomeError):
    """Raised when a user lacks area or control permission."""


class DeviceUnavailableError(SmartHomeError):
    """Raised when a command cannot reach a device."""
