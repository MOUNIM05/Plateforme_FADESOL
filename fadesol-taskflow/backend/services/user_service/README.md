# User Service

## Role du service

`user_service` gere les profils utilisateurs, les roles, les permissions, l'etat actif/inactif et les photos de profil.

## Port

```text
8002
```

## Base de donnees

```text
user_db
```

## Routes principales

- `GET /health` : verification de disponibilite.
- `GET /api/users/` : liste des utilisateurs.
- `POST /api/users/` : creation d'un utilisateur.
- `GET /api/users/me/profile` : profil de l'utilisateur connecte.
- `GET /api/users/me/permissions` : permissions de l'utilisateur connecte.
- `POST /api/users/me/photo` : upload de photo de profil.
- `GET /api/users/permissions` : catalogue des permissions.
- `GET /api/users/{user_id}` : detail utilisateur.
- `PUT /api/users/{user_id}` : mise a jour utilisateur.
- `DELETE /api/users/{user_id}` : suppression utilisateur.

## Dependances principales

- FastAPI.
- SQLAlchemy.
- Pydantic.
- passlib.
- python-jose.
- Uvicorn.

## Commande Docker

```powershell
docker compose up -d --build user_service
```

## Endpoints utiles

```text
Health: http://localhost:8002/health
Docs:   http://localhost:8002/docs
```
