from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Cette classe centralise la configuration du backend.

    Les valeurs peuvent venir directement d'ici
    ou depuis le fichier backend/.env.
    """

    # Application
    PROJECT_NAME: str = "Fadesol TaskFlow API"
    PROJECT_VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # PostgreSQL
    DATABASE_URL: str = "postgresql+psycopg2://postgres:mounim@localhost:5432/fadesol_taskflow"

    # JWT
    JWT_SECRET_KEY: str = "change_this_long_random_secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # ClickUp
    CLICKUP_API_TOKEN: str | None = None
    CLICKUP_TEAM_ID: str | None = None

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
