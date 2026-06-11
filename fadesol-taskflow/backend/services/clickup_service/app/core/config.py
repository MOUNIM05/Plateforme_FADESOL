"""Configuration du microservice ClickUp.

Les valeurs sensibles sont lues depuis les variables d'environnement.
Le token ClickUp ne doit jamais etre ecrit en dur dans le code ni affiche.
"""

import os


class Settings:
    """Regroupe les variables d'environnement utilisees par clickup_service."""
    # Nom informatif du service, utile dans les logs ou la documentation.
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol ClickUp Service")

    # Prefixe conventionnel de l'API interne; les routes directes existent aussi sans prefixe.
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # URL de la base de donnees du service ClickUp.
    # DATABASE_URL est prioritaire pour Docker, CLICKUP_DATABASE_URL reste une alternative explicite.
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "CLICKUP_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/fadesol_clickup",
    )

    # Token personnel ClickUp. Il est seulement lu ici et transmis dans le header Authorization.
    CLICKUP_TOKEN: str = os.getenv("CLICKUP_TOKEN", "")

    # URL racine de ClickUp API v2. Le rstrip evite les doubles slash dans les endpoints.
    CLICKUP_API_BASE_URL: str = (
        os.getenv("CLICKUP_API_BASE_URL") or "https://api.clickup.com/api/v2"
    ).rstrip("/")

    # Identifiants ClickUp utilises pour naviguer dans la structure workspace -> space -> folder -> list.
    CLICKUP_WORKSPACE_ID: str = os.getenv("CLICKUP_WORKSPACE_ID", "")
    CLICKUP_SPACE_ID: str = os.getenv("CLICKUP_SPACE_ID", "")
    CLICKUP_FOLDER_ID: str = os.getenv("CLICKUP_FOLDER_ID", "")
    CLICKUP_LIST_ID: str = os.getenv("CLICKUP_LIST_ID", "")

    # URL interne de task_service dans Docker; clickup_service l'utilise pour recuperer et marquer les taches.
    TASK_SERVICE_URL: str = os.getenv("TASK_SERVICE_URL", "http://localhost:8005")


# Instance unique importee par les autres modules pour lire la configuration.
settings = Settings()
