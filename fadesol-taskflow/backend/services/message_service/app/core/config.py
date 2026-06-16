import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol Message Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "MESSAGE_DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/message_db",
    )
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:8002")


settings = Settings()
