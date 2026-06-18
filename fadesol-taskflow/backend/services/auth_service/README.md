# Auth Service

## Role du service

`auth_service` gere les comptes d'authentification, la verification des identifiants, le hash des mots de passe et la generation des tokens JWT.

## Port

```text
8001
```

## Base de donnees

```text
auth_db
```

## Routes principales

- `GET /health` : verification de disponibilite.
- `POST /api/auth/login` : connexion utilisateur.
- `POST /api/auth/register` : creation d'un compte d'authentification.
- `GET /api/auth/me` : compte authentifie courant.
- `PUT /api/auth/sync/users/{user_id}` : synchronisation interne du compte.
- `DELETE /api/auth/sync/users/{user_id}` : suppression interne du compte.

## Dependances principales

- FastAPI.
- SQLAlchemy.
- Pydantic.
- python-jose.
- passlib.
- Uvicorn.

## Commande Docker

```powershell
docker compose up -d --build auth_service
```

## Endpoints utiles

```text
Health: http://localhost:8001/health
Docs:   http://localhost:8001/docs
```
