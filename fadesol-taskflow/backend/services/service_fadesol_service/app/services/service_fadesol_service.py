from sqlalchemy.orm import Session

from app.models.service_model import Service
from app.schemas.service_schema import ServiceCreate, ServiceUpdate
from shared.exceptions import bad_request, not_found


def list_services(db: Session, skip: int = 0, limit: int = 100) -> list[Service]:
    return db.query(Service).offset(skip).limit(limit).all()


def get_service(db: Session, service_id: str) -> Service | None:
    return db.query(Service).filter(Service.id == service_id).first()


def create_service(db: Session, payload: ServiceCreate) -> Service:
    exists = db.query(Service).filter(Service.nom == payload.nom).first()

    if exists:
        raise bad_request("Un service avec ce nom existe deja.")

    service = Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)

    return service


def update_service(db: Session, service_id: str, payload: ServiceUpdate) -> Service:
    service = get_service(db, service_id)

    if not service:
        raise not_found("Service introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)

    return service


def delete_service(db: Session, service_id: str) -> None:
    service = get_service(db, service_id)

    if not service:
        raise not_found("Service introuvable.")

    db.delete(service)
    db.commit()


def changer_manager(db: Session, service_id: str, manager_id: str) -> Service:
    service = get_service(db, service_id)

    if not service:
        raise not_found("Service introuvable.")

    service.changerManager(manager_id)
    db.commit()
    db.refresh(service)

    return service
