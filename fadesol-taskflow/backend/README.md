# Fadesol TaskFlow Backend

## Architecture Decision

For the MVP PFE, the backend is designed as a modular monolith with FastAPI.
This means the project runs as one backend application, but the code is organized
by business modules: authentication, users, services, projects, tasks, dashboard,
messages, and ClickUp synchronization.

This architecture is suitable for the PFE because it keeps development realistic
within the available time while still following professional backend principles.
Each module has its own routes, service layer, and CRUD layer. Routes stay thin,
business rules live in services, and database queries live in CRUD files.

The result is maintainable because each responsibility has a clear place.
It is also scalable at the code level: if the platform grows after the MVP,
a module such as ClickUp synchronization or messaging can later be extracted into
a real microservice without rewriting the whole application.

Direction / RH / Administration is modeled as an internal Fadesol service, not as
an application role. The only application roles are Administrator, Manager, and
Employee.

## Current Status

This is the backend skeleton only. Business logic, database models, schemas,
authentication routes, and module implementations will be added progressively.

## Skeleton Creation Commands

```powershell
cd fadesol-taskflow/backend

New-Item -ItemType Directory -Force app, app\models, app\schemas, app\modules, app\modules\auth, app\modules\users, app\modules\services, app\modules\projects, app\modules\tasks, app\modules\dashboard, app\modules\messages, app\modules\clickup, app\utils

New-Item -ItemType File -Force app\main.py, app\config.py, app\database.py, app\dependencies.py, app\security.py
New-Item -ItemType File -Force requirements.txt, Dockerfile, .env.example, README.md
```

## Run Locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Health check:

```text
GET http://localhost:8000/health
```
