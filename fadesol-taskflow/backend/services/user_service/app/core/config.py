"""Configuration du service utilisateur."""

import os


class Settings:
    # Configuration chargee depuis l'environnement pour garder le code portable entre local et Docker.
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol User Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # Base de donnees propre aux utilisateurs; les autres services y accedent via API, pas via SQL direct.
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "USER_DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/user_db",
    )

    # Parametres de lecture des JWT emis par auth_service.
    JWT_SECRET_KEY: str = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY", "change_this_long_random_secret")
    JWT_ALGORITHM: str = os.getenv("ALGORITHM") or os.getenv("JWT_ALGORITHM", "HS256")

    # URL appelee pour creer, synchroniser ou supprimer le compte de connexion associe a un utilisateur.
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
    INTERNAL_SERVICE_SECRET: str = os.getenv("INTERNAL_SERVICE_SECRET", "user-service-sync")


settings = Settings()

# Instance de configuration partagee par les routes et services.
