# Image du microservice referentiel des services Fadesol.
FROM python:3.11-slim

WORKDIR /app

# Installation des dependances Python du service.
COPY services/service_fadesol_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code applicatif et du module shared commun.
COPY services/service_fadesol_service/app ./app
COPY shared ./shared

# PYTHONPATH permet aux imports app.* et shared.* de fonctionner dans le conteneur.
ENV PYTHONPATH=/app

EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
