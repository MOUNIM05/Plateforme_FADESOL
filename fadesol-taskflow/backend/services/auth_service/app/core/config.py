import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol Auth Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "AUTH_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/auth_db",
    )
    JWT_SECRET_KEY: str = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY", "change_this_long_random_secret")
    JWT_ALGORITHM: str = os.getenv("ALGORITHM") or os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or os.getenv("JWT_EXPIRE_MINUTES", "60")
    )


settings = Settings()
