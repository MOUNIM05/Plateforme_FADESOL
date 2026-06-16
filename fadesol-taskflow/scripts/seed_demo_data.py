"""Seed de donnees demo Fadesol TaskFlow via API Gateway.

Usage:
    python scripts/seed_demo_data.py

Variables optionnelles:
    API_BASE_URL=http://localhost:8000/api
    DEMO_ADMIN_EMAIL=admin.demo@fadesol.local
    DEMO_ADMIN_PASSWORD=Admin123456
"""

from __future__ import annotations

import json
import os
from datetime import date, timedelta
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api").rstrip("/")
ADMIN_EMAIL = os.getenv("DEMO_ADMIN_EMAIL", "admin.demo@fadesol.local")
ADMIN_PASSWORD = os.getenv("DEMO_ADMIN_PASSWORD", "Admin123456")

SERVICES = [
    ("Commercial", "commercial", "Commercial"),
    ("Technique", "technique", "Technique"),
    ("Achat", "achat", "Achat"),
    ("Magasin / Stock", "magasin-stock", "MagasinStock"),
    ("Comptabilite & Management", "comptabilite-management", "ComptabiliteManagement"),
    ("Direction / RH / Administration", "direction-rh-administration", "DirectionRHAdministration"),
]

USERS = [
    ("Admin", "General", "admin.demo@fadesol.local", "Admin", "DirectionRHAdministration", "Admin123456"),
    ("Manager", "Commercial", "manager.commercial@fadesol.local", "Manager", "Commercial", "Manager123456"),
    ("Manager", "Technique", "manager.technique@fadesol.local", "Manager", "Technique", "Manager123456"),
    ("Employee", "Commercial", "employee.commercial@fadesol.local", "Employee", "Commercial", "Employee123456"),
    ("Employee", "Technique", "employee.technique@fadesol.local", "Employee", "Technique", "Employee123456"),
    ("Employee", "Achat", "employee.achat@fadesol.local", "Employee", "Achat", "Employee123456"),
    ("Employee", "Stock", "employee.stock@fadesol.local", "Employee", "MagasinStock", "Employee123456"),
    ("Employee", "Administration", "employee.rh@fadesol.local", "Employee", "DirectionRHAdministration", "Employee123456"),
]


def request_json(method: str, path: str, token: str | None = None, payload: dict | None = None, params: dict | None = None):
    query = f"?{urlencode(params)}" if params else ""
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Accept": "application/json"}

    if payload is not None:
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = Request(f"{API_BASE_URL}{path}{query}", data=body, headers=headers, method=method)

    with urlopen(request, timeout=20) as response:
        data = response.read()

    if not data:
        return None

    return json.loads(data.decode("utf-8"))


def login() -> str:
    try:
        data = request_json("POST", "/auth/login", payload={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    except (HTTPError, URLError) as exc:
        raise SystemExit(
            "Impossible de se connecter avec le compte admin demo. "
            "Creez un admin ou renseignez DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD."
        ) from exc

    token = data.get("access_token") if isinstance(data, dict) else None

    if not token:
        raise SystemExit("Login admin demo reussi mais aucun access_token recu.")

    return token


def find_by(items: list[dict[str, Any]], key: str, value: str) -> dict[str, Any] | None:
    return next((item for item in items if str(item.get(key) or "").lower() == value.lower()), None)


def ensure_services(token: str) -> dict[str, dict[str, Any]]:
    services = request_json("GET", "/services/", token=token, params={"limit": 1000}) or []
    by_enum: dict[str, dict[str, Any]] = {}

    for name, _, enum_value in SERVICES:
        service = find_by(services, "name", name)

        if not service:
            service = request_json(
                "POST",
                "/services/",
                token=token,
                payload={"name": name, "description": f"Service demo {name}", "is_active": True},
            )
            services.append(service)

        by_enum[enum_value] = service

    return by_enum


def ensure_users(token: str, services_by_enum: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    users = request_json("GET", "/users/", token=token, params={"limit": 1000}) or []
    by_email: dict[str, dict[str, Any]] = {user["email"]: user for user in users if user.get("email")}

    for first_name, last_name, email, role, service_enum, password in USERS:
        if email in by_email:
            continue

        service = services_by_enum.get(service_enum)
        payload = {
            "prenom": first_name,
            "nom": last_name,
            "email": email,
            "password": password,
            "role": role,
            "id_service": service.get("id") if service else None,
            "service": service_enum,
            "est_actif": True,
        }

        try:
            by_email[email] = request_json("POST", "/users/", token=token, payload=payload)
        except HTTPError as exc:
            if exc.code != 400:
                raise

    users = request_json("GET", "/users/", token=token, params={"limit": 1000}) or []
    return {user["email"]: user for user in users if user.get("email")}


def ensure_projects(token: str, services_by_enum: dict[str, dict[str, Any]], users_by_email: dict[str, dict[str, Any]]):
    projects = request_json("GET", "/projects/", token=token, params={"limit": 1000}) or []
    today = date.today()
    definitions = [
        ("Campagne commerciale demo", "Commercial", "manager.commercial@fadesol.local", "EnCours"),
        ("Maintenance technique demo", "Technique", "manager.technique@fadesol.local", "EnCours"),
        ("Optimisation stock demo", "MagasinStock", "employe.stock@fadesol.local", "Nouveau"),
    ]
    by_title: dict[str, dict[str, Any]] = {}

    for title, service_enum, owner_email, status in definitions:
        project = find_by(projects, "titre", title)

        if not project:
            service = services_by_enum[service_enum]
            owner = users_by_email.get(owner_email, {})
            project = request_json(
                "POST",
                "/projects/",
                token=token,
                payload={
                    "titre": title,
                    "description": f"Projet de demonstration - {title}",
                    "service_id": service["id"],
                    "responsable_id": owner.get("uuid"),
                    "statut": status,
                    "priorite": "Haute" if service_enum in {"Commercial", "Technique"} else "Normale",
                    "date_debut": today.isoformat(),
                    "date_limite": (today + timedelta(days=30)).isoformat(),
                    "progression": 35,
                },
            )
            projects.append(project)

        by_title[title] = project

    return by_title


def ensure_tasks(token: str, services_by_enum, users_by_email, projects_by_title):
    tasks = request_json("GET", "/tasks/", token=token, params={"limit": 1000}) or []
    today = date.today()
    definitions = [
        (
            "Qualifier les besoins client demo",
            "Commercial",
            "employee.commercial@fadesol.local",
            "Campagne commerciale demo",
            "EnCours",
            "Haute",
            5,
        ),
        (
            "Verifier installation technique demo",
            "Technique",
            "employee.technique@fadesol.local",
            "Maintenance technique demo",
            "Bloque",
            "Haute",
            -1,
        ),
        (
            "Controle inventaire rapide demo",
            "MagasinStock",
            "employee.stock@fadesol.local",
            None,
            "AFaire",
            "Normale",
            7,
        ),
        (
            "Preparer dossier RH demo",
            "DirectionRHAdministration",
            "employee.rh@fadesol.local",
            None,
            "Termine",
            "Faible",
            3,
        ),
    ]
    by_title: dict[str, dict[str, Any]] = {}

    for title, service_enum, assignee_email, project_title, status, priority, due_offset in definitions:
        task = find_by(tasks, "title", title) or find_by(tasks, "titre", title)

        if not task:
            service = services_by_enum[service_enum]
            assignee = users_by_email.get(assignee_email, {})
            project = projects_by_title.get(project_title) if project_title else None
            task = request_json(
                "POST",
                "/tasks/",
                token=token,
                payload={
                    "title": title,
                    "description": f"Tache demo pour {service.get('name')}",
                    "project_id": project.get("id") if project else None,
                    "assigned_to": assignee.get("uuid"),
                    "service_id": service["id"],
                    "status": status,
                    "priority": priority,
                    "due_date": (today + timedelta(days=due_offset)).isoformat(),
                },
            )
            tasks.append(task)

        by_title[title] = task

    for title, task in by_title.items():
        subtasks = request_json("GET", f"/tasks/{task['id']}/subtasks", token=token) or []
        if find_by(subtasks, "title", f"Sous-tache demo - {title}"):
            continue
        request_json(
            "POST",
            f"/tasks/{task['id']}/subtasks",
            token=token,
            payload={
                "title": f"Sous-tache demo - {title}",
                "description": "Sous-tache de validation demo",
                "assigned_to": task.get("assigned_to") or task.get("assignee_a"),
                "service_id": task.get("service_id"),
                "status": "EnCours",
                "priority": "Normale",
                "due_date": (today + timedelta(days=10)).isoformat(),
            },
        )

    return by_title


def main() -> None:
    token = login()
    services = ensure_services(token)
    users = ensure_users(token, services)
    projects = ensure_projects(token, services, users)
    tasks = ensure_tasks(token, services, users, projects)

    print("Seed demo termine.")
    print(f"Services: {len(services)}")
    print(f"Utilisateurs connus: {len(users)}")
    print(f"Projets demo: {len(projects)}")
    print(f"Taches demo: {len(tasks)}")


if __name__ == "__main__":
    main()
