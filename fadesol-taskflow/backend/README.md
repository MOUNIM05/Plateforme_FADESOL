# Fadesol TaskFlow Backend

Backend FastAPI en architecture microservices.

## Services

```text
backend/
  services/
    api_gateway/
    auth_service/
    user_service/
    service_fadesol_service/
    project_service/
    task_service/
    message_service/
    dashboard_service/
  shared/
  docker/
    init-db.sql
  .env.example
  .dockerignore
```

Chaque microservice contient son application FastAPI dans `app/`, son `requirements.txt`, et son `Dockerfile`.

## Ports

```text
api_gateway             8000
auth_service            8001
user_service            8002
service_fadesol_service 8003
project_service         8004
task_service            8005
message_service         8006
dashboard_service       8008
pgAdmin                 5050
PostgreSQL              5432
```

## Docker

Prerequis:

- Docker Desktop installe
- Docker Desktop lance

Depuis la racine du projet `fadesol-taskflow`:

```powershell
docker compose build
```

```powershell
docker compose up
```

```powershell
docker compose up -d
```

```powershell
docker compose down
```

```powershell
docker compose logs -f auth_service
```

```powershell
docker compose up --build
```

Voir les conteneurs:

```powershell
docker compose ps
```

## Execution officielle

Docker Compose est la seule methode officielle pour lancer la plateforme.
L'API Gateway reste le point d'entree unique du frontend et des appels API.

## URLs De Test

```text
API Gateway:
http://localhost:8000/health
http://localhost:8000/docs
http://localhost:8000/api/auth/login

Microservices (if running):
http://localhost:8001/health
http://localhost:8002/health
http://localhost:8003/health
http://localhost:8004/health
http://localhost:8005/health
http://localhost:8006/health
http://localhost:8008/health
```

pgAdmin:

```text
http://localhost:5050
```

Identifiants pgAdmin:

```text
email: admin@fadesol.com
password: admin
```

PostgreSQL:

```text
host: postgres_db
port: 5432
user: postgres
password: postgres
```

Databases creees automatiquement:

```text
auth_db
user_db
service_fadesol_db
project_db
task_db
message_db
dashboard_db
```

## Validation

```powershell
python -m compileall backend/services
python -m compileall backend/shared
```
