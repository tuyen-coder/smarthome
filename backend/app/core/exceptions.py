class SmartHomeError(Exception):
    """Base class for expected domain errors."""


class PermissionDeniedError(SmartHomeError):
    """Raised when a user lacks area or control permission."""


class DeviceUnavailableError(SmartHomeError):
    """Raised when a command cannot reach a device."""


class AuthenticationError(SmartHomeError):
    """Raised when credentials or access tokens are invalid."""


class EntityNotFoundError(SmartHomeError):
    """Raised when a requested database record does not exist."""


class ConflictError(SmartHomeError):
    """Raised when a unique resource already exists."""
