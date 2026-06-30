# Fadesol TaskFlow

Fadesol TaskFlow est une plateforme interne de gestion des projets, taches, services, utilisateurs, dashboards, messagerie, notifications et permissions pour Fadesol Power Solutions.

L'objectif du projet est de centraliser l'organisation interne, ameliorer le suivi des taches et projets, et faciliter la communication entre les services dans un environnement gere par l'entreprise.

## Objectifs

- Centraliser les projets, taches, services et utilisateurs.
- Ameliorer la visibilite sur l'avancement et les retards.
- Donner a chaque role un espace de travail adapte.
- Faciliter la communication interne avec la messagerie et les notifications.
- Fournir des tableaux de bord clairs pour le pilotage.
- Conserver les donnees dans une architecture interne basee sur PostgreSQL et FastAPI.

## Technologies

### Frontend

- React
- Vite
- CSS modulaire par pages et dashboards
- Lucide React pour les icones
- Graphiques SVG internes pour les visualisations du dashboard

### Backend

- FastAPI
- PostgreSQL
- SQLAlchemy
- Pydantic
- JWT
- WebSocket pour la messagerie et la presence

### DevOps

- Docker
- Docker Compose
- GitHub Actions
- pgAdmin

## Architecture du projet

```text
fadesol-taskflow/
|-- frontend/                         Interface React / Vite
|-- backend/
|   |-- services/
|   |   |-- api_gateway/              Point d'entree HTTP unique
|   |   |-- auth_service/             Login, JWT, comptes d'authentification
|   |   |-- user_service/             Utilisateurs, roles, permissions, profils
|   |   |-- service_fadesol_service/  Referentiel des services internes
|   |   |-- project_service/          Gestion des projets
|   |   |-- task_service/             Taches, sous-taches, pieces jointes
|   |   |-- message_service/          Messagerie interne et WebSocket
|   |   `-- dashboard_service/        KPIs et donnees analytiques
|   `-- shared/                       Exceptions, enums et reponses communes
|-- docs/                             Documentation technique
|-- scripts/                          Scripts utilitaires
|-- docker-compose.yml                Orchestration locale
|-- .env.example                      Exemple de configuration
`-- README.md
```

## Microservices

| Service | Port | Role |
| --- | ---: | --- |
| Frontend Vite | 5173 | Interface web |
| api_gateway | 8000 | Point d'entree unique du frontend |
| auth_service | 8001 | Authentification, JWT et comptes de connexion |
| user_service | 8002 | Profils utilisateurs, roles, permissions |
| service_fadesol_service | 8003 | Services internes Fadesol |
| project_service | 8004 | Projets et suivi d'avancement |
| task_service | 8005 | Taches, sous-taches et pieces jointes |
| message_service | 8006 | Messagerie interne et presence WebSocket |
| dashboard_service | 8008 | Statistiques et graphiques |
| postgres_db | 5432 | Base PostgreSQL |
| pgAdmin | 5050 | Administration PostgreSQL |

## Prerequis

- Node.js
- Python
- Docker Desktop
- PostgreSQL si lancement local sans Docker
- Git

## Installation frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Application frontend :

```text
http://localhost:5173
```

## Build frontend

```powershell
cd frontend
npm.cmd run build
```

## Lancement Docker

```powershell
docker compose up -d --build
docker compose ps
```

## Verification des services

```powershell
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:8005/health
curl http://localhost:8006/health
curl http://localhost:8008/health
```

## Acces utiles

| Ressource | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8000 |
| Swagger Gateway | http://localhost:8000/docs |
| pgAdmin | http://localhost:5050 |

## Comptes de demonstration

```text
Admin:
admin.demo@fadesol.local / Admin123456

Manager:
manager.technique@fadesol.local / Manager123456

Employee:
employee.commercial@fadesol.local / Employee123456
```

## Fonctionnalites principales

- Authentification JWT.
- Gestion des utilisateurs.
- Gestion des services.
- Gestion des projets.
- Gestion des taches et sous-taches.
- Gestion des roles et permissions.
- Dashboards Admin, Manager et Employee.
- Messagerie interne entre utilisateurs.
- Notifications de messages et de taches.
- Mode clair / sombre.
- Interface responsive.
- Presence en ligne via WebSocket.
- Suivi de progression et statuts des taches.

## Roles applicatifs

| Role | Acces principal |
| --- | --- |
| Admin | Administration globale, utilisateurs, permissions, services, projets, taches et dashboards |
| Manager | Suivi operationnel du service, projets, taches, membres et messagerie |
| Employee | Taches affectees, progression personnelle, messagerie et notifications |

## Tests et validations

Commandes de validation principales :

```powershell
cd frontend
npm.cmd run build

cd ..
python -m compileall backend/services

docker compose config
```

Tests manuels recommandes avant soutenance :

- Connexion Admin, Manager et Employee.
- Consultation des dashboards par role.
- Creation et affectation de taches.
- Mise a jour du statut et de la progression.
- Messagerie entre utilisateurs de roles differents.
- Notifications de messages et de taches.
- Mode clair et mode sombre.
- Responsive desktop et mobile.

## Securite

- Ne jamais versionner `.env`.
- Utiliser `.env.example` comme modele de configuration.
- Les tokens JWT protegent les routes authentifiees.
- Les permissions fines sont gerees par `user_service`.
- Les mots de passe sont hashes cote backend.
- Les services communiquent via l'API Gateway ou via des appels inter-services controles.

## CI/CD

Le workflow GitHub Actions est situe dans :

```text
../.github/workflows/ci.yml
```

Il verifie notamment :

- build frontend ;
- compilation backend ;
- validation Docker Compose.

## Documentation complementaire

- [Frontend](frontend/README.md)
- [Backend](backend/README.md)
- [Docker](docs/DOCKER.md)
- [CI/CD](docs/CI_CD.md)
- [Tests](docs/TESTS.md)

## Auteurs

- Abdelmounim Maani
- Mouhcine Asfoury

## Encadrement

- Encadrante entreprise : Mme Souad Sifati
- Encadrante academique : Mme Ichraq Esadeq

## Annee universitaire

2025 / 2026
