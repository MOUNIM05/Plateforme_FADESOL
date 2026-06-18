# Service Fadesol Service

## Role du service

`service_fadesol_service` gere le referentiel des services internes FADESOL, leurs informations, leurs managers, leurs membres et leurs statistiques principales.

## Port

```text
8003
```

## Base de donnees

```text
service_fadesol_db
```

## Routes principales

- `GET /health` : verification de disponibilite.
- `GET /api/services/` : liste des services.
- `POST /api/services/` : creation d'un service.
- `GET /api/services/{service_id}` : detail d'un service.
- `GET /api/services/{service_id}/details` : details agreges du service.
- `GET /api/services/{service_id}/members` : membres du service.
- `GET /api/services/{service_id}/statistics` : statistiques du service.
- `PUT /api/services/{service_id}` : mise a jour du service.
- `DELETE /api/services/{service_id}` : suppression controlee du service.

## Dependances principales

- FastAPI.
- SQLAlchemy.
- Pydantic.
- Uvicorn.

## Commande Docker

```powershell
docker compose up -d --build service_fadesol_service
```

## Endpoints utiles

```text
Health: http://localhost:8003/health
Docs:   http://localhost:8003/docs
```
