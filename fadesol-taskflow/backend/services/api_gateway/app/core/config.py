import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol API Gateway")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:8002")
    SERVICE_FADESOL_URL: str = os.getenv("SERVICE_FADESOL_URL", "http://localhost:8003")
    PROJECT_SERVICE_URL: str = os.getenv("PROJECT_SERVICE_URL", "http://localhost:8004")
    TASK_SERVICE_URL: str = os.getenv("TASK_SERVICE_URL", "http://localhost:8005")
    MESSAGE_SERVICE_URL: str = os.getenv("MESSAGE_SERVICE_URL", "http://localhost:8006")
    CLICKUP_SERVICE_URL: str = os.getenv("CLICKUP_SERVICE_URL", "http://localhost:8007")
    DASHBOARD_SERVICE_URL: str = os.getenv("DASHBOARD_SERVICE_URL", "http://localhost:8008")


settings = Settings()
