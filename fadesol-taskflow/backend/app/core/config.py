from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """
    Centralise la configuration du backend.

    Les valeurs sensibles viennent du fichier backend/.env.
    """

    PROJECT_NAME: str = "Fadesol TaskFlow API"
    PROJECT_VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    CLICKUP_API_TOKEN: str | None = None
    CLICKUP_TEAM_ID: str | None = None

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
