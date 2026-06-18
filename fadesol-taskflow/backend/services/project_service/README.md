# Project Service

## Role du service

`project_service` gere les projets internes : creation, consultation, mise a jour, suppression, statut, priorite et responsable.

## Port

```text
8004
```

## Base de donnees

```text
project_db
```

## Routes principales

- `GET /health` : verification de disponibilite.
- `GET /api/projects/` : liste des projets.
- `POST /api/projects/` : creation d'un projet.
- `GET /api/projects/{project_id}` : detail d'un projet.
- `PUT /api/projects/{project_id}` : mise a jour d'un projet.
- `DELETE /api/projects/{project_id}` : suppression d'un projet.
- `PATCH /api/projets/{project_id}/statut/{statut}` : changement de statut.
- `PATCH /api/projets/{project_id}/archiver` : archivage d'un projet.

## Dependances principales

- FastAPI.
- SQLAlchemy.
- Pydantic.
- Uvicorn.

## Commande Docker

```powershell
docker compose up -d --build project_service
```

## Endpoints utiles

```text
Health: http://localhost:8004/health
Docs:   http://localhost:8004/docs
```
