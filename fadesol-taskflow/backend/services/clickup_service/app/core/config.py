import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol ClickUp Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "CLICKUP_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/fadesol_clickup",
    )
    CLICKUP_TOKEN: str = os.getenv("CLICKUP_TOKEN", "")
    CLICKUP_API_BASE_URL: str = (
        os.getenv("CLICKUP_API_BASE_URL") or "https://api.clickup.com/api/v2"
    ).rstrip("/")
    CLICKUP_WORKSPACE_ID: str = os.getenv("CLICKUP_WORKSPACE_ID", "")
    CLICKUP_SPACE_ID: str = os.getenv("CLICKUP_SPACE_ID", "")
    CLICKUP_FOLDER_ID: str = os.getenv("CLICKUP_FOLDER_ID", "")
    CLICKUP_LIST_ID: str = os.getenv("CLICKUP_LIST_ID", "")


settings = Settings()
