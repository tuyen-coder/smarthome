from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parents[1]


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
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    mqtt_enabled: bool = False
    mqtt_host: str = "io.adafruit.com"
    mqtt_port: int = 8883
    mqtt_username: str = ""
    mqtt_key: str = ""
    mqtt_topic_prefix: str = ""

    face_detection_model_path: Path = (
        APP_DIR / "ai" / "models" / "face_detection_yunet_2026may.onnx"
    )
    face_recognition_model_path: Path = (
        APP_DIR / "ai" / "models" / "face_recognition_sface_2021dec.onnx"
    )
    face_match_threshold: float = 0.45
    face_max_upload_bytes: int = 10 * 1024 * 1024
    face_min_size: int = 80


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
