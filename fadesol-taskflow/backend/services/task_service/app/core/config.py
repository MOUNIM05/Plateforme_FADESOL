"""Configuration du service taches."""

import os


class Settings:
    # Configuration lue depuis les variables d'environnement pour adapter local, Docker et production.
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol Task Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # URL de user_service utilisee pour resoudre l'utilisateur courant quand assigned_to=me.
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:8002")
    PROJECT_SERVICE_URL: str = os.getenv("PROJECT_SERVICE_URL", "http://localhost:8004")
    INTERNAL_SERVICE_SECRET: str = os.getenv("INTERNAL_SERVICE_SECRET", "user-service-sync")

    # Stockage local des pieces jointes du domaine taches.
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/uploads")
    MAX_UPLOAD_SIZE_BYTES: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))
    ALLOWED_UPLOAD_EXTENSIONS: set[str] = {
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "png",
        "jpg",
        "jpeg",
    }

    # Base de donnees propre au service des taches.
    # Les references aux autres services sont stockees en UUID pour eviter les relations SQL inter-services.
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "TASK_DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/task_db",
    )


settings = Settings()

# Instance de configuration importee par la base, les routes et les services.
