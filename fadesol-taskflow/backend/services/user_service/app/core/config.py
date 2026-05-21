import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol User Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "USER_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/fadesol_users",
    )
    JWT_SECRET_KEY: str = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY", "change_this_long_random_secret")
    JWT_ALGORITHM: str = os.getenv("ALGORITHM") or os.getenv("JWT_ALGORITHM", "HS256")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
    INTERNAL_SERVICE_SECRET: str = os.getenv("INTERNAL_SERVICE_SECRET", "user-service-sync")


settings = Settings()
