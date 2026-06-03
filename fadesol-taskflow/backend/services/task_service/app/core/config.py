import os


class Settings:
    # Configuration lue depuis les variables d'environnement pour adapter local, Docker et production.
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol Task Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # URL de user_service utilisee pour resoudre l'utilisateur courant quand assigned_to=me.
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://user_service:8002")

    # Base de donnees propre au service des taches.
    # Les references aux autres services sont stockees en UUID pour eviter les relations SQL inter-services.
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "TASK_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/fadesol_tasks",
    )


settings = Settings()
