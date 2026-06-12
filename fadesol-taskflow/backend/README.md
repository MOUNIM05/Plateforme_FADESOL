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

## Local Development (Sans Docker)

### Prerequisites

- Python 3.10+
- PostgreSQL running on localhost:5432
- pip packages installed per service

### Step 1: Start API Gateway (Required - Main Entry Point)

The API Gateway is the single entry point for all requests. Start it first:

```powershell
cd backend/services/api_gateway
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API Gateway Swagger: http://localhost:8000/docs
API Gateway Health: http://localhost:8000/health

### Step 2: Start Other Microservices (Optional - Only if Needed)

Open **new PowerShell terminals** for each service:

#### Auth Service
```powershell
cd backend/services/auth_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```
Swagger: http://localhost:8001/docs

#### User Service
```powershell
cd backend/services/user_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```
Swagger: http://localhost:8002/docs

#### Service Fadesol
```powershell
cd backend/services/service_fadesol_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```
Swagger: http://localhost:8003/docs

#### Project Service
```powershell
cd backend/services/project_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```
Swagger: http://localhost:8004/docs

#### Task Service
```powershell
cd backend/services/task_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```
Swagger: http://localhost:8005/docs

#### Message Service
```powershell
cd backend/services/message_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8006
```
Swagger: http://localhost:8006/docs

#### Dashboard Service
```powershell
cd backend/services/dashboard_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8008
```
Swagger: http://localhost:8008/docs

### Troubleshooting

**Error: "Could not import module 'app.main'"**
- ❌ Do NOT run `uvicorn app.main:app` from `/backend` root
- ✅ Always navigate to `/backend/services/{service_name}` first
- ✅ Verify `app/main.py` exists in the service folder

**Port already in use**
```powershell
netstat -ano | findstr "8000"  # Find process on port 8000
taskkill /PID <PID> /F          # Kill the process
```

**Module import errors**
```powershell
pip install -r requirements.txt  # Reinstall dependencies
```

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
