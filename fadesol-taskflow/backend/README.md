# Backend - Fadesol TaskFlow

Le backend de Fadesol TaskFlow est organise en microservices FastAPI. Chaque service porte un domaine fonctionnel precis et communique avec le frontend via l'API Gateway.

## Role du backend

- Exposer les API REST de la plateforme.
- Gerer l'authentification JWT.
- Gerer les utilisateurs, roles et permissions.
- Gerer les services, projets, taches, sous-taches et messages.
- Produire les donnees des dashboards.
- Persister les donnees dans PostgreSQL.

## Architecture microservices

```text
backend/
|-- services/
|   |-- api_gateway/
|   |-- auth_service/
|   |-- user_service/
|   |-- service_fadesol_service/
|   |-- project_service/
|   |-- task_service/
|   |-- message_service/
|   `-- dashboard_service/
|-- shared/
`-- docker/
    `-- init-db.sql
```

## Technologies

- FastAPI.
- Uvicorn.
- SQLAlchemy.
- Pydantic.
- PostgreSQL.
- JWT.
- Docker.

## API Gateway

L'API Gateway est le point d'entree unique du frontend. Il recoit les requetes HTTP puis les transmet au microservice concerne.

URL :

```text
http://localhost:8000
```

Swagger :

```text
http://localhost:8000/docs
```

## Services et ports

| Service | Port | Documentation |
| --- | ---: | --- |
| api_gateway | 8000 | `services/api_gateway/README.md` |
| auth_service | 8001 | `services/auth_service/README.md` |
| user_service | 8002 | `services/user_service/README.md` |
| service_fadesol_service | 8003 | `services/service_fadesol_service/README.md` |
| project_service | 8004 | `services/project_service/README.md` |
| task_service | 8005 | `services/task_service/README.md` |
| message_service | 8006 | `services/message_service/README.md` |
| dashboard_service | 8008 | `services/dashboard_service/README.md` |

## Securite JWT

- `auth_service` genere les tokens JWT.
- Le frontend envoie le token dans l'en-tete `Authorization`.
- Les routes protegent les actions selon les roles et permissions.
- Les secrets doivent rester dans les variables d'environnement et ne jamais etre ajoutes au depot.

## Lancement avec Docker

Depuis `fadesol-taskflow` :

```powershell
docker compose up -d --build
docker compose ps
```

## Compilation des services

Depuis `fadesol-taskflow` :

```powershell
python -m compileall backend/services
```

## Swagger des services

| Service | Swagger |
| --- | --- |
| API Gateway | http://localhost:8000/docs |
| Auth | http://localhost:8001/docs |
| Users | http://localhost:8002/docs |
| Services | http://localhost:8003/docs |
| Projects | http://localhost:8004/docs |
| Tasks | http://localhost:8005/docs |
| Messages | http://localhost:8006/docs |
| Dashboard | http://localhost:8008/docs |

## Healthchecks

```text
http://localhost:8000/health
http://localhost:8001/health
http://localhost:8002/health
http://localhost:8003/health
http://localhost:8004/health
http://localhost:8005/health
http://localhost:8006/health
http://localhost:8008/health
```
