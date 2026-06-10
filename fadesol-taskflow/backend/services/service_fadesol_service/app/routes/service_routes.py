from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.core.security import require_admin, require_admin_or_manager
from app.db.database import get_db
from app.schemas.service_schema import (
    ServiceCreate,
    ServiceMembersResponse,
    ServiceResponse,
    ServiceStatisticsResponse,
    ServiceUpdate,
)
from app.services.service_fadesol_service import (
    changer_manager,
    create_service,
    delete_service,
    get_service,
    get_service_members,
    get_service_statistics,
    list_services,
    update_service,
)
from shared.responses import MessageResponse


router = APIRouter(prefix="/services", tags=["Services Fadesol"])
legacy_router = APIRouter(prefix="/services-fadesol", tags=["Services Fadesol Legacy"])


@router.get("/", response_model=list[ServiceResponse], dependencies=[Depends(require_admin_or_manager)])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_services(db, skip, limit)


@router.post("/", response_model=ServiceResponse, dependencies=[Depends(require_admin)])
def create(payload: ServiceCreate, db: Session = Depends(get_db)):
    return create_service(db, payload)


@router.get("/{service_id}", response_model=ServiceResponse, dependencies=[Depends(require_admin_or_manager)])
def get_one(service_id: str, db: Session = Depends(get_db)):
    return get_service(db, service_id)


@router.put("/{service_id}", response_model=ServiceResponse, dependencies=[Depends(require_admin)])
def update(service_id: str, payload: ServiceUpdate, db: Session = Depends(get_db)):
    return update_service(db, service_id, payload)


@router.get(
    "/{service_id}/members",
    response_model=ServiceMembersResponse,
    dependencies=[Depends(require_admin_or_manager)],
)
def members(
    service_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    return get_service_members(db, service_id, authorization)


@router.get(
    "/{service_id}/statistics",
    response_model=ServiceStatisticsResponse,
    dependencies=[Depends(require_admin_or_manager)],
)
def statistics(
    service_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    return get_service_statistics(db, service_id, authorization)


@legacy_router.get("/", response_model=list[ServiceResponse], dependencies=[Depends(require_admin_or_manager)])
def legacy_list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_services(db, skip, limit)


@legacy_router.post("/", response_model=ServiceResponse, dependencies=[Depends(require_admin)])
def legacy_create(payload: ServiceCreate, db: Session = Depends(get_db)):
    return create_service(db, payload)


@legacy_router.get("/{service_id}", response_model=ServiceResponse, dependencies=[Depends(require_admin_or_manager)])
def legacy_get_one(service_id: str, db: Session = Depends(get_db)):
    return get_service(db, service_id)


@legacy_router.put("/{service_id}", response_model=ServiceResponse, dependencies=[Depends(require_admin)])
def legacy_update(service_id: str, payload: ServiceUpdate, db: Session = Depends(get_db)):
    return update_service(db, service_id, payload)


@legacy_router.patch("/{service_id}/manager/{manager_id}", response_model=ServiceResponse, dependencies=[Depends(require_admin)])
def legacy_change_manager(service_id: str, manager_id: str, db: Session = Depends(get_db)):
    return changer_manager(db, service_id, manager_id)


@legacy_router.delete("/{service_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def legacy_delete(service_id: str, db: Session = Depends(get_db)):
    delete_service(db, service_id)
    return {"message": "Service supprime avec succes."}
