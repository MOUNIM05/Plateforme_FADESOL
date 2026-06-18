# Fadesol TaskFlow

Plateforme interne de gestion des projets, taches, services, utilisateurs, messagerie, notifications et tableaux de bord pour FADESOL.

Fadesol TaskFlow centralise le suivi du travail dans un environnement interne afin de mieux coordonner les services, reduire les charges d'abonnement aux outils externes et conserver les donnees de l'entreprise dans son propre systeme.

## Objectifs du projet

- Centraliser le suivi du travail.
- Ameliorer la coordination entre les services.
- Reduire les charges d'abonnement aux outils externes.
- Garder les donnees dans l'entreprise.
- Faciliter le suivi des taches et projets.

## Fonctionnalites principales

- Authentification JWT.
- Gestion utilisateurs.
- Gestion roles et permissions.
- Gestion services FADESOL.
- Gestion projets.
- Gestion taches.
- Gestion sous-taches.
- Dashboard global et par service.
- Messagerie interne.
- Notifications.
- Profil utilisateur.
- Parametres.
- CI/CD avec GitHub Actions.

## Acteurs

| Acteur | Role principal |
| --- | --- |
| Administrateur | Gere les utilisateurs, les permissions, les services et la configuration globale. |
| Manager | Suit les projets, les taches et l'activite de son service. |
| Employe | Consulte et met a jour les taches qui lui sont affectees. |

## Architecture technique

- Frontend React / Vite / Tailwind CSS.
- Backend FastAPI.
- API Gateway.
- PostgreSQL.
- Docker Compose.
- Microservices.

## Microservices

| Service | Port | Role |
| --- | ---: | --- |
| frontend | 5173 | Interface web. |
| api_gateway | 8000 | Point d'entree unique. |
| auth_service | 8001 | Authentification et JWT. |
| user_service | 8002 | Utilisateurs, roles et permissions. |
| service_fadesol_service | 8003 | Services internes FADESOL. |
| project_service | 8004 | Projets. |
| task_service | 8005 | Taches et sous-taches. |
| message_service | 8006 | Messagerie interne. |
| dashboard_service | 8008 | Tableaux de bord. |
| postgres_db | 5432 | Base PostgreSQL. |
| pgAdmin | 5050 | Administration PostgreSQL. |

## Structure du projet

```text
fadesol-taskflow/
|-- backend/
|   |-- services/
|   |   |-- api_gateway/
|   |   |-- auth_service/
|   |   |-- user_service/
|   |   |-- service_fadesol_service/
|   |   |-- project_service/
|   |   |-- task_service/
|   |   |-- message_service/
|   |   `-- dashboard_service/
|   |-- shared/
|   `-- docker/
|-- frontend/
|   `-- src/
|-- docs/
|-- scripts/
|-- docker-compose.yml
|-- .env.example
`-- README.md
```

## Prerequis

- Docker Desktop.
- Node.js.
- Python.
- Git.
- PostgreSQL si lancement local sans Docker.

## Installation avec Docker

```powershell
docker compose up -d --build
docker compose ps
```

## Acces application

| Ressource | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8000 |
| Swagger Gateway | http://localhost:8000/docs |
| pgAdmin | http://localhost:5050 |

## Comptes de demonstration

| Acteur | Email | Mot de passe |
| --- | --- | --- |
| Admin | admin.demo@fadesol.local | Admin123456 |
| Manager | manager.technique@fadesol.local | Manager123456 |
| Employee | employee.commercial@fadesol.local | Employee123456 |

## Tests rapides

```powershell
curl http://localhost:8000/health
cd frontend
npm.cmd run build
cd ..
python -m compileall backend/services
docker compose config
```

## Commandes utiles

```powershell
docker compose ps
docker compose logs api_gateway --tail=100
docker compose logs task_service --tail=100
npm.cmd run build
python -m compileall backend/services
docker compose config
```

## CI/CD

GitHub Actions verifie :

- build frontend ;
- compilation backend ;
- validation Docker Compose.

Le workflow se trouve dans `../.github/workflows/ci.yml` depuis ce dossier applicatif.

## Securite

- Ne jamais pousser `.env`.
- Stocker les secrets dans les variables d'environnement.
- Utiliser l'authentification JWT.
- Controler les acces selon les roles et permissions.

## Documentation

- [Frontend](frontend/README.md)
- [Backend](backend/README.md)
- [Docker](docs/DOCKER.md)
- [CI/CD](docs/CI_CD.md)
- [Tests](docs/TESTS.md)

## Auteurs

- Mouhcine Asfoury
- Abdelmounim Maani

## Annee universitaire

2025 / 2026
