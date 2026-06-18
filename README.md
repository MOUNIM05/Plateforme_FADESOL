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
- Gestion des utilisateurs.
- Gestion des roles et permissions.
- Gestion des services FADESOL.
- Gestion des projets.
- Gestion des taches.
- Gestion des sous-taches.
- Dashboard global et par service.
- Messagerie interne.
- Notifications.
- Profil utilisateur.
- Parametres.
- CI/CD avec GitHub Actions.

## Acteurs

| Acteur | Role principal |
| --- | --- |
| Administrateur | Gere les utilisateurs, les droits, les services et la configuration globale. |
| Manager | Suit les projets, les taches et les membres de son service. |
| Employe | Consulte et met a jour les taches qui lui sont affectees. |

## Architecture technique

- Frontend : React, Vite, Tailwind CSS.
- Backend : FastAPI, SQLAlchemy, Pydantic.
- API Gateway : point d'entree unique pour le frontend.
- Base de donnees : PostgreSQL.
- Orchestration : Docker Compose.
- Architecture : microservices.
- CI/CD : GitHub Actions.

## Microservices

| Service | Port | Role |
| --- | ---: | --- |
| frontend | 5173 | Interface web React/Vite. |
| api_gateway | 8000 | Point d'entree HTTP unique. |
| auth_service | 8001 | Authentification, comptes et JWT. |
| user_service | 8002 | Utilisateurs, roles, permissions et profils. |
| service_fadesol_service | 8003 | Referentiel des services internes. |
| project_service | 8004 | Projets et responsables. |
| task_service | 8005 | Taches, sous-taches et pieces jointes. |
| message_service | 8006 | Messagerie interne. |
| dashboard_service | 8008 | Indicateurs et tableaux de bord. |
| postgres_db | 5432 | Base PostgreSQL. |
| pgAdmin | 5050 | Interface d'administration PostgreSQL. |

## Structure du projet

```text
Plateforme_FADESOL/
|-- .github/
|   `-- workflows/
|       `-- ci.yml
|-- fadesol-taskflow/
|   |-- backend/
|   |   |-- services/
|   |   |   |-- api_gateway/
|   |   |   |-- auth_service/
|   |   |   |-- user_service/
|   |   |   |-- service_fadesol_service/
|   |   |   |-- project_service/
|   |   |   |-- task_service/
|   |   |   |-- message_service/
|   |   |   `-- dashboard_service/
|   |   |-- shared/
|   |   `-- docker/
|   |-- frontend/
|   |   `-- src/
|   |-- docs/
|   |-- scripts/
|   |-- docker-compose.yml
|   |-- .env.example
|   `-- README.md
`-- README.md
```

## Prerequis

- Docker Desktop.
- Node.js.
- Python.
- Git.
- PostgreSQL si lancement local sans Docker.

## Installation avec Docker

Depuis le dossier applicatif :

```powershell
cd fadesol-taskflow
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

Health API Gateway :

```powershell
curl http://localhost:8000/health
```

Build frontend :

```powershell
cd fadesol-taskflow/frontend
npm.cmd run build
```

Compilation backend :

```powershell
cd fadesol-taskflow
python -m compileall backend/services
```

Validation Docker Compose :

```powershell
cd fadesol-taskflow
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

Le workflow GitHub Actions est defini dans `.github/workflows/ci.yml`.

Il verifie automatiquement :

- le build du frontend React/Vite ;
- la compilation des services backend FastAPI ;
- la validite de la configuration Docker Compose.

## Securite

- Ne jamais pousser le fichier `.env`.
- Placer les secrets dans les variables d'environnement.
- Utiliser l'authentification JWT pour proteger les routes.
- Appliquer les acces selon les roles et permissions.

## Documentation complementaire

- [Backend](fadesol-taskflow/backend/README.md)
- [Frontend](fadesol-taskflow/frontend/README.md)
- [Docker](fadesol-taskflow/docs/DOCKER.md)
- [CI/CD](fadesol-taskflow/docs/CI_CD.md)
- [Tests](fadesol-taskflow/docs/TESTS.md)

## Auteurs

- Mouhcine Asfoury
- Abdelmounim Maani

## Annee universitaire

2025 / 2026
