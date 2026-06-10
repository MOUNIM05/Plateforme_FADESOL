from sqlalchemy.orm import Session

from app.models.service_model import Service
from app.schemas.service_schema import ServiceCreate, ServiceUpdate
from shared.exceptions import bad_request, not_found


def get_services(db: Session, skip: int = 0, limit: int = 100) -> list[Service]:
    return db.query(Service).order_by(Service.name.asc()).offset(skip).limit(limit).all()


def get_service_by_id(db: Session, service_id: str) -> Service | None:
    return db.query(Service).filter(Service.id == service_id).first()


def get_service_by_name(db: Session, name: str) -> Service | None:
    return db.query(Service).filter(Service.name == name).first()


def create_service(db: Session, payload: ServiceCreate) -> Service:
    if get_service_by_name(db, payload.name):
        raise bad_request("Un service avec ce nom existe deja.")

    service = Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)

    return service


def update_service(db: Session, service_id: str, payload: ServiceUpdate) -> Service:
    service = get_service_by_id(db, service_id)

    if not service:
        raise not_found("Service introuvable.")

    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] != service.name:
        if get_service_by_name(db, update_data["name"]):
            raise bad_request("Un service avec ce nom existe deja.")

    for field, value in update_data.items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)

    return service


def delete_service(db: Session, service_id: str) -> None:
    service = get_service_by_id(db, service_id)

    if not service:
        raise not_found("Service introuvable.")

    db.delete(service)
    db.commit()


def get_service_members(service: Service, users: list[dict]) -> list[dict]:
    # Compatibility: older users may store service name in service_id/service before migration.
    return [
        user
        for user in users
        if str(user.get("service_id") or "") == service.id
        or str(user.get("service") or "") == service.name
        or str(user.get("service_id") or "") == service.name
    ]


def count_service_members(service: Service, users: list[dict]) -> int:
    return len(get_service_members(service, users))
