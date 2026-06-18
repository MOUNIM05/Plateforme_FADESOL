# Docker Backend

Ce dossier contient les fichiers Docker utilises par le backend et par `docker-compose.yml`.

## Fichiers

| Fichier | Role |
| --- | --- |
| `init-db.sql` | Cree les bases PostgreSQL logiques utilisees par les microservices. |

## Utilisation

Le fichier `init-db.sql` est monte dans le conteneur PostgreSQL au demarrage. Il prepare les bases suivantes :

- `auth_db`
- `user_db`
- `service_fadesol_db`
- `project_db`
- `task_db`
- `message_db`
- `dashboard_db`

## Commande de verification

Depuis `fadesol-taskflow` :

```powershell
docker compose config
```
