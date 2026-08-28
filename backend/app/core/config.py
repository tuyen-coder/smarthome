from functools import lru_cache

# pyrefly: ignore [missing-import]
from pydantic import Field
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Smart Home API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-me-with-at-least-32-random-characters"
    access_token_expire_minutes: int = 60
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/smarthome"
    )
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    mqtt_enabled: bool = False
    mqtt_host: str = "io.adafruit.com"
    mqtt_port: int = 8883
    mqtt_username: str = ""
    mqtt_key: str = ""
    mqtt_topic_prefix: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
