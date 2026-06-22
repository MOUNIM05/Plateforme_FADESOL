# Image du microservice projets.
FROM public.ecr.aws/docker/library/python:3.11-slim

WORKDIR /app

# Installation des dependances Python du service.
COPY services/project_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code applicatif et du module shared commun.
COPY services/project_service/app ./app
COPY shared ./shared

# PYTHONPATH permet aux imports app.* et shared.* de fonctionner dans le conteneur.
ENV PYTHONPATH=/app

EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
