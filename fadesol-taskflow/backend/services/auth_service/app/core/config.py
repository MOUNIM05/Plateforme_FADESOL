"""Configuration du service d'authentification.

Les valeurs sont lues depuis l'environnement afin d'eviter de coder les secrets
ou les URLs directement dans l'application.
"""

import os


class Settings:
    # Les valeurs viennent des variables d'environnement pour separer la configuration du code.
    # Cela evite d'ecrire des secrets directement dans le depot et facilite Docker/production.
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol Auth Service")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # URL de la base propre au service d'authentification.
    # Chaque microservice garde sa base afin de limiter les dependances directes entre services.
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv(
        "AUTH_DATABASE_URL",
        "postgresql+psycopg2://postgres:mounim@localhost:5432/auth_db",
    )

    # Parametres JWT : cle de signature, algorithme et duree de validite du token.
    JWT_SECRET_KEY: str = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET_KEY", "change_this_long_random_secret")
    JWT_ALGORITHM: str = os.getenv("ALGORITHM") or os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or os.getenv("JWT_EXPIRE_MINUTES", "60")
    )

    # Secret partage entre microservices pour les operations internes de synchronisation.
    INTERNAL_SERVICE_SECRET: str = os.getenv("INTERNAL_SERVICE_SECRET", "user-service-sync")


settings = Settings()

# Instance unique importee dans le reste du service.
