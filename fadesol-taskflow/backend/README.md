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
    clickup_service/
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
clickup_service         8007
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

## URLs De Test

```text
http://localhost:8000/health
http://localhost:8001/health
http://localhost:8002/health
http://localhost:8003/health
http://localhost:8004/health
http://localhost:8005/health
http://localhost:8006/health
http://localhost:8007/health
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
clickup_db
dashboard_db
```

## Validation Locale

```powershell
python -m compileall backend/services
python -m compileall backend/shared
```

Exemple lancement local hors Docker:

Mode local sans Docker ni PostgreSQL:

```powershell
cd backend
.\start-local-backend.ps1
```

Ce script lance:

```text
API Gateway  http://127.0.0.1:8000
Auth Service http://127.0.0.1:8001
SQLite       backend/.local/auth_local.db
```

Si Windows garde temporairement le port 8000 bloque, le script utilise automatiquement 8010 ou 8020 et met a jour `frontend/.env.local`.

Compte local cree automatiquement:

```text
email: admin@fadesol.com
password: admin12345
```

Arreter le backend local:

```powershell
.\stop-local-backend.ps1
```

API Gateway:

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

Auth service:

```powershell
cd backend/services/auth_service
$env:PYTHONPATH = (Resolve-Path ../..).Path
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Exemple pour le service Fadesol:

```powershell
cd backend/services/service_fadesol_service
$env:PYTHONPATH = (Resolve-Path ../..).Path
uvicorn app.main:app --reload --port 8003
```

Si Windows indique que le port est deja utilise:

```powershell
netstat -ano -p TCP | findstr :8003
Stop-Process -Id <PID>
```
