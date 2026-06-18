# API Gateway

## Role du service

`api_gateway` est le point d'entree unique du frontend. Il recoit les requetes HTTP et les redirige vers les microservices internes.

## Port

```text
8000
```

## Base de donnees

Ce service ne possede pas de base de donnees dediee. Il transmet les requetes aux services responsables des donnees.

## Routes principales

- `GET /health` : verification de disponibilite.
- `/api/auth/*` : proxy vers `auth_service`.
- `/api/users/*` : proxy vers `user_service`.
- `/api/services/*` : proxy vers `service_fadesol_service`.
- `/api/projects/*` : proxy vers `project_service`.
- `/api/tasks/*` : proxy vers `task_service`.
- `/api/messages/*` : proxy vers `message_service`.
- `/api/dashboard/*` : proxy vers `dashboard_service`.
- `/ws/messages` : WebSocket de messagerie.

## Dependances principales

- FastAPI.
- Uvicorn.
- Python standard library pour le proxy HTTP.

## Commande Docker

```powershell
docker compose up -d --build api_gateway
```

## Endpoints utiles

```text
Health: http://localhost:8000/health
Docs:   http://localhost:8000/docs
```
