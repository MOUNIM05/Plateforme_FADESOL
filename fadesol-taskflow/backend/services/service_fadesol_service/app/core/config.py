import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol Service Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "SERVICE_FADESOL_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/fadesol_services",
    )


settings = Settings()
