"""Configuration de l'API Gateway.

Chaque URL de microservice est lue depuis l'environnement afin de fonctionner
en local comme dans Docker.
"""

import os


class Settings:
    # Le gateway lit les URLs des microservices depuis l'environnement.
    # Ainsi Docker peut utiliser les noms de services, tandis que le local peut utiliser localhost.
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Fadesol API Gateway")

    # Services principaux appeles par le frontend via le gateway.
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://localhost:8002")
    SERVICE_FADESOL_URL: str = os.getenv("SERVICE_FADESOL_URL", "http://localhost:8003")
    PROJECT_SERVICE_URL: str = os.getenv("PROJECT_SERVICE_URL", "http://localhost:8004")
    TASK_SERVICE_URL: str = os.getenv("TASK_SERVICE_URL", "http://localhost:8005")
    MESSAGE_SERVICE_URL: str = os.getenv("MESSAGE_SERVICE_URL", "http://localhost:8006")
    DASHBOARD_SERVICE_URL: str = os.getenv("DASHBOARD_SERVICE_URL", "http://localhost:8008")


settings = Settings()

# Instance unique de configuration du gateway.
