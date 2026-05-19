from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.service_schema import ServiceCreate, ServiceResponse, ServiceUpdate
from app.services.service_fadesol_service import (
    changer_manager,
    create_service,
    delete_service,
    get_service,
    list_services,
    update_service,
)
from shared.exceptions import not_found
from shared.responses import MessageResponse


router = APIRouter(prefix="/services-fadesol", tags=["Services Fadesol"])


@router.get("/", response_model=list[ServiceResponse])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_services(db, skip, limit)


@router.post("/", response_model=ServiceResponse)
def create(payload: ServiceCreate, db: Session = Depends(get_db)):
    return create_service(db, payload)


@router.get("/{service_id}", response_model=ServiceResponse)
def get_one(service_id: str, db: Session = Depends(get_db)):
    service = get_service(db, service_id)

    if not service:
        raise not_found("Service introuvable.")

    return service


@router.put("/{service_id}", response_model=ServiceResponse)
def update(service_id: str, payload: ServiceUpdate, db: Session = Depends(get_db)):
    return update_service(db, service_id, payload)


@router.patch("/{service_id}/manager/{manager_id}", response_model=ServiceResponse)
def change_manager(service_id: str, manager_id: str, db: Session = Depends(get_db)):
    return changer_manager(db, service_id, manager_id)


@router.delete("/{service_id}", response_model=MessageResponse)
def delete(service_id: str, db: Session = Depends(get_db)):
    delete_service(db, service_id)
    return {"message": "Service supprime avec succes."}
