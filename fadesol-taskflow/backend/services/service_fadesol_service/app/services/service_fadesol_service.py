import json
from datetime import date
from urllib.parse import quote
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud.service_crud import (
    count_service_members,
    create_service as crud_create_service,
    delete_service as crud_delete_service,
    get_service_by_id,
    get_service_members as crud_get_service_members,
    get_services,
    update_service as crud_update_service,
)
from app.models.service_model import Service
from app.schemas.service_schema import (
    ServiceCreate,
    ServiceMembersResponse,
    ServiceStatisticsResponse,
    ServiceUpdate,
)
from shared.exceptions import bad_request, not_found


SERVICE_DELETE_BLOCKED_MESSAGE = (
    "Ce service ne peut pas etre supprime car il est lie a des utilisateurs, projets ou taches."
)


def list_services(db: Session, skip: int = 0, limit: int = 100) -> list[Service]:
    return get_services(db, skip, limit)


def create_service(db: Session, payload: ServiceCreate) -> Service:
    return crud_create_service(db, payload)


def update_service(db: Session, service_id: str, payload: ServiceUpdate) -> Service:
    return crud_update_service(db, service_id, payload)


def delete_service(db: Session, service_id: str, authorization: str | None = None) -> None:
    service = get_service(db, service_id)

    ensure_service_has_no_dependencies(service, authorization)
    crud_delete_service(db, service_id)


def get_service(db: Session, service_id: str) -> Service:
    service = get_service_by_id(db, service_id)

    if not service:
        raise not_found("Service introuvable.")

    return service


def fetch_users_from_user_service(authorization: str | None) -> list[dict]:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification requis.",
        )

    target_url = f"{settings.USER_SERVICE_URL.rstrip('/')}/api/users/"
    request = UrlRequest(
        target_url,
        headers={"Authorization": authorization},
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = "Impossible de charger les membres du service."
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            detail = payload.get("detail", detail)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="User service indisponible pour charger les membres.",
        ) from exc


def fetch_remote_list(target_url: str, authorization: str | None, service_name: str) -> list[dict]:
    headers = {"Authorization": authorization} if authorization else {}
    request = UrlRequest(target_url, headers=headers, method="GET")

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return payload if isinstance(payload, list) else []
    except HTTPError as exc:
        detail = f"{service_name} indisponible pour verifier les dependances."
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            detail = payload.get("detail", detail)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"{service_name} indisponible pour verifier les dependances.",
        ) from exc


def ensure_service_has_no_dependencies(service: Service, authorization: str | None) -> None:
    users = fetch_users_from_user_service(authorization)
    members = crud_get_service_members(service, users)

    if members:
        raise bad_request(SERVICE_DELETE_BLOCKED_MESSAGE)

    service_id = quote(service.id)
    projects_url = f"{settings.PROJECT_SERVICE_URL.rstrip('/')}/api/projects/?service_id={service_id}&limit=1000"
    task_url = f"{settings.TASK_SERVICE_URL.rstrip('/')}/api/tasks/?limit=1000"

    projects = fetch_remote_list(projects_url, authorization, "Project service")
    tasks = fetch_remote_list(task_url, authorization, "Task service")
    linked_tasks = [
        task
        for task in tasks
        if str(task.get("service_id") or "") in {service.id, service.name}
    ]

    if projects or linked_tasks:
        raise bad_request(SERVICE_DELETE_BLOCKED_MESSAGE)


def get_service_members(
    db: Session,
    service_id: str,
    authorization: str | None,
) -> ServiceMembersResponse:
    service = get_service(db, service_id)
    users = fetch_users_from_user_service(authorization)
    members = crud_get_service_members(service, users)

    return ServiceMembersResponse(
        service_id=service.id,
        service_name=service.name,
        total_members=len(members),
        members=members,
    )


def get_service_statistics(
    db: Session,
    service_id: str,
    authorization: str | None,
) -> ServiceStatisticsResponse:
    service = get_service(db, service_id)
    users = fetch_users_from_user_service(authorization)
    members = crud_get_service_members(service, users)
    active_members = sum(1 for member in members if member.get("is_active", True))
    total_members = count_service_members(service, users)

    return ServiceStatisticsResponse(
        service_id=service.id,
        service_name=service.name,
        total_members=total_members,
        active_members=active_members,
        inactive_members=total_members - active_members,
        total_projects=0,
        total_tasks=0,
        completed_tasks=0,
        pending_tasks=0,
    )


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None

    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _is_done_status(status: str | None) -> bool:
    normalized = str(status or "").strip().lower()
    return normalized in {"termine", "terminé", "done", "completed", "validee", "validée"}


def _is_blocked_status(status: str | None) -> bool:
    return "bloque" in str(status or "").strip().lower() or "bloqué" in str(status or "").strip().lower()


def _is_in_progress_status(status: str | None) -> bool:
    normalized = str(status or "").strip().lower()
    return normalized in {"encours", "en cours", "in_progress", "progress"}


def get_service_details(db: Session, service_id: str, authorization: str | None) -> dict:
    service = get_service(db, service_id)
    users = fetch_users_from_user_service(authorization)
    members = crud_get_service_members(service, users)
    manager = next(
        (
            member
            for member in members
            if str(member.get("id") or member.get("uuid") or "") == str(service.manager_id or "")
            or str(member.get("role") or "").lower() == "manager"
        ),
        None,
    )

    encoded_service_id = quote(service.id)
    projects_url = f"{settings.PROJECT_SERVICE_URL.rstrip('/')}/api/projects/?service_id={encoded_service_id}&limit=1000"
    tasks_url = f"{settings.TASK_SERVICE_URL.rstrip('/')}/api/tasks/?limit=1000"
    projects = fetch_remote_list(projects_url, authorization, "Project service")
    all_tasks = fetch_remote_list(tasks_url, authorization, "Task service")
    tasks = [
        task
        for task in all_tasks
        if str(task.get("service_id") or "") in {service.id, service.name}
    ]
    today = date.today()

    tasks_done = sum(1 for task in tasks if _is_done_status(task.get("status") or task.get("statut")))
    tasks_blocked = sum(1 for task in tasks if _is_blocked_status(task.get("status") or task.get("statut")))
    tasks_in_progress = sum(1 for task in tasks if _is_in_progress_status(task.get("status") or task.get("statut")))
    tasks_late = sum(
        1
        for task in tasks
        if not _is_done_status(task.get("status") or task.get("statut"))
        and (_parse_date(task.get("due_date") or task.get("date_limite")) or today) < today
    )

    return {
        "service": {
            "id": service.id,
            "name": service.name,
            "nom": service.name,
            "description": service.description,
            "manager_id": service.manager_id,
            "is_active": service.is_active,
            "statut": "Actif" if service.is_active else "Inactif",
            "created_at": service.created_at,
            "updated_at": None,
        },
        "manager": manager or {},
        "members": members,
        "projects_count": len(projects),
        "tasks_count": len(tasks),
        "tasks_in_progress": tasks_in_progress,
        "tasks_done": tasks_done,
        "tasks_blocked": tasks_blocked,
        "tasks_late": tasks_late,
    }


def changer_manager(db: Session, service_id: str, manager_id: str) -> Service:
    return update_service(db, service_id, ServiceUpdate(manager_id=manager_id))
