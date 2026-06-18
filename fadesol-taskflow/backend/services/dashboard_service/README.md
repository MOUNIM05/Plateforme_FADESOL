# Dashboard Service

## Role du service

`dashboard_service` agrege les donnees des autres microservices pour produire les indicateurs globaux, les statistiques par service et la charge de travail des membres.

## Port

```text
8008
```

## Base de donnees

```text
dashboard_db
```

## Routes principales

- `GET /health` : verification de disponibilite.
- `GET /api/dashboard/statistics` : statistiques globales.
- `GET /api/dashboard/analytics` : donnees analytiques pour les graphiques.
- `GET /api/dashboard/services` : vue d'ensemble des services.
- `GET /api/dashboard/services/{service_id}` : dashboard detaille d'un service.
- `GET /api/dashboard/workload` : charge de travail par membre.

## Dependances principales

- FastAPI.
- Pydantic.
- Uvicorn.
- Appels HTTP internes vers les microservices.

## Commande Docker

```powershell
docker compose up -d --build dashboard_service
```

## Endpoints utiles

```text
Health: http://localhost:8008/health
Docs:   http://localhost:8008/docs
```
