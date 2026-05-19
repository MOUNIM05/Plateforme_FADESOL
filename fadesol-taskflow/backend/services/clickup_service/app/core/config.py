import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol ClickUp Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "CLICKUP_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/fadesol_clickup",
    )


settings = Settings()
