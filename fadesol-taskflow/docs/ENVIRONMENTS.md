# Fadesol TaskFlow Docker environment

Docker Compose is the official way to run the Fadesol TaskFlow platform.

## Start the platform

From the project root:

```powershell
docker compose up -d --build
docker compose ps
```

## Stop the platform

```powershell
docker compose down --remove-orphans
```

Do not use `-v` unless you intentionally want to delete PostgreSQL data.

## Main URLs

```text
Frontend     http://localhost:5173
API Gateway  http://localhost:8000
pgAdmin      http://localhost:5050
PostgreSQL   localhost:5432
```

## Backend services

```text
api_gateway             8000
auth_service            8001
user_service            8002
service_fadesol_service 8003
project_service         8004
task_service            8005
message_service         8006
dashboard_service       8008
```

The frontend must call only the API Gateway:

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

Inside Docker, the API Gateway reaches microservices by Docker service name:

```text
AUTH_SERVICE_URL=http://auth_service:8001
USER_SERVICE_URL=http://user_service:8002
SERVICE_FADESOL_URL=http://service_fadesol_service:8003
PROJECT_SERVICE_URL=http://project_service:8004
TASK_SERVICE_URL=http://task_service:8005
MESSAGE_SERVICE_URL=http://message_service:8006
DASHBOARD_SERVICE_URL=http://dashboard_service:8008
```

## Health checks

```text
GET http://localhost:8000/health
GET http://localhost:8000/api/tasks
GET http://localhost:8000/api/messages
GET http://localhost:8000/api/dashboard
```

Protected routes can return `401` without a token:

```text
GET http://localhost:8000/api/users
GET http://localhost:8000/api/services-fadesol/
GET http://localhost:8000/api/projects
```
