# Task Service

## Role du service

`task_service` gere les taches, sous-taches, affectations, statuts, priorites, progression et pieces jointes.

## Port

```text
8005
```

## Base de donnees

```text
task_db
```

## Routes principales

- `GET /health` : verification de disponibilite.
- `GET /api/tasks/` : liste des taches.
- `POST /api/tasks/` : creation d'une tache.
- `GET /api/tasks/{task_id}` : detail d'une tache.
- `PUT /api/tasks/{task_id}` : mise a jour d'une tache.
- `PATCH /api/tasks/{task_id}/assign` : affectation d'une tache.
- `PATCH /api/tasks/{task_id}/status` : mise a jour du statut.
- `GET /api/tasks/{task_id}/progress` : progression calculee.
- `GET /api/tasks/{task_id}/subtasks` : liste des sous-taches.
- `POST /api/tasks/{task_id}/subtasks` : creation d'une sous-tache.
- `POST /api/tasks/{task_id}/attachments` : ajout d'une piece jointe.

## Dependances principales

- FastAPI.
- SQLAlchemy.
- Pydantic.
- python-multipart.
- Uvicorn.

## Commande Docker

```powershell
docker compose up -d --build task_service
```

## Endpoints utiles

```text
Health: http://localhost:8005/health
Docs:   http://localhost:8005/docs
```
