# Image du microservice API Gateway.
FROM python:3.11-slim

WORKDIR /app

# Installation des dependances Python du service.
COPY services/api_gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code applicatif et du module shared commun.
COPY services/api_gateway/app ./app
COPY shared ./shared

# PYTHONPATH permet aux imports app.* et shared.* de fonctionner dans le conteneur.
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
