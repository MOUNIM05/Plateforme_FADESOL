# Image Python legere utilisee pour executer le microservice ClickUp.
FROM python:3.11-slim

# Tous les chemins suivants sont relatifs au dossier /app dans le conteneur.
WORKDIR /app

# Copie uniquement les dependances du service pour profiter du cache Docker.
COPY services/clickup_service/requirements.txt .

# Installation des librairies Python necessaires a FastAPI, SQLAlchemy et PostgreSQL.
RUN pip install --no-cache-dir -r requirements.txt

# Copie le code applicatif du microservice ClickUp.
COPY services/clickup_service/app ./app

# Copie le module shared pour reutiliser enums, exceptions et reponses communes.
COPY shared ./shared

# Permet a Python de trouver les modules app et shared depuis /app.
ENV PYTHONPATH=/app

# Port interne expose par clickup_service.
EXPOSE 8007

# Demarre l'application FastAPI avec Uvicorn dans le conteneur.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8007"]
