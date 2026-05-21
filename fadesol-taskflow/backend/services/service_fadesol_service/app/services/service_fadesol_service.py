import json
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
from shared.exceptions import not_found


def list_services(db: Session, skip: int = 0, limit: int = 100) -> list[Service]:
    return get_services(db, skip, limit)


def create_service(db: Session, payload: ServiceCreate) -> Service:
    return crud_create_service(db, payload)


def update_service(db: Session, service_id: str, payload: ServiceUpdate) -> Service:
    return crud_update_service(db, service_id, payload)


def delete_service(db: Session, service_id: str) -> None:
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


def changer_manager(db: Session, service_id: str, manager_id: str) -> Service:
    return update_service(db, service_id, ServiceUpdate(manager_id=manager_id))
