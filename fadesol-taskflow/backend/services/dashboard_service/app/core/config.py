import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol Dashboard Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    JWT_SECRET_KEY: str = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY", "change_this_long_random_secret")
    JWT_ALGORITHM: str = os.getenv("ALGORITHM") or os.getenv("JWT_ALGORITHM", "HS256")
    TASK_SERVICE_URL: str = os.getenv("TASK_SERVICE_URL", "http://localhost:8005")
    PROJECT_SERVICE_URL: str = os.getenv("PROJECT_SERVICE_URL", "http://localhost:8004")
    SERVICE_FADESOL_URL: str = os.getenv("SERVICE_FADESOL_URL", "http://localhost:8003")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:8002")


settings = Settings()
