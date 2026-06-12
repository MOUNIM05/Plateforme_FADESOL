# Fadesol TaskFlow

Fadesol TaskFlow is a PFE project for an internal task management platform based on a microservices architecture.

The goal is to help Fadesol centralize internal tasks, assign work by service, track progress, detect delays, and manage internal collaboration.

## Technologies

Frontend:
- React
- Vite
- Tailwind CSS
- Axios
- React Router

Backend:
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT authentication
- Uvicorn

Database:
- PostgreSQL

DevOps and tools:
- Docker
- Docker Compose
- Git and GitHub
- Postman
- VS Code

## Project Structure

```text
fadesol-taskflow/
├── frontend/
├── backend/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── user-service/
│   ├── project-service/
│   ├── task-service/
│   └── dashboard-service/
├── docs/
│   ├── cahier-des-charges/
│   ├── diagrams/
│   └── postman/
├── docker-compose.yml
├── README.md
├── .gitignore
└── .env.example
```

## Architecture Overview

The frontend communicates only with the API Gateway.

The API Gateway forwards requests to internal services:
- Auth Service for login, registration, and JWT authentication
- User Service for users, roles, and services
- Project Service for project management
- Task Service for tasks and subtasks
- Dashboard Service for statistics and reporting

For the MVP, all services can share one PostgreSQL instance while keeping the code separated by service.

## Git Workflow for Two Developers

Recommended branches:
- `main`: stable version
- `develop`: integration branch
- `feature/<module-name>`: one feature or module per branch

Example workflow:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/auth-service
```

After completing a small change:

```bash
git status
git add .
git commit -m "Add auth service structure"
git push origin feature/auth-service
```

Then open a pull request from `feature/auth-service` into `develop`.

Good practices:
- Pull before starting work.
- Keep commits small and clear.
- Do not commit `.env` files or secrets.
- Use pull requests to review each other's changes.
- Merge into `main` only when the version is tested and stable.

## Current Status

Initial GitHub-ready structure only. Full implementation will be added progressively phase by phase.
