from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_admin_or_manager
from app.db.database import get_db
from app.schemas.project_schema import ProjetCreate, ProjetResponse, ProjetUpdate
from app.services.project_service import (
    archiver_project,
    assigner_responsable,
    changer_statut,
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
)
from shared.enums import StatutProjet
from shared.exceptions import not_found
from shared.responses import MessageResponse


router = APIRouter(prefix="/projets", tags=["Projets"])
projects_router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
    dependencies=[Depends(require_admin_or_manager)],
)


@router.get("/", response_model=list[ProjetResponse])
def list_all(
    skip: int = 0,
    limit: int = 100,
    service_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    return list_projects(db, skip, limit, service_id, status)


@router.post("/", response_model=ProjetResponse)
def create(payload: ProjetCreate, db: Session = Depends(get_db)):
    return create_project(db, payload)


@router.get("/{project_id}", response_model=ProjetResponse)
def get_one(project_id: str, db: Session = Depends(get_db)):
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    return project


@router.put("/{project_id}", response_model=ProjetResponse)
def update(project_id: str, payload: ProjetUpdate, db: Session = Depends(get_db)):
    return update_project(db, project_id, payload)


@router.patch("/{project_id}/responsable/{utilisateur_id}", response_model=ProjetResponse)
def assign_responsable(project_id: str, utilisateur_id: str, db: Session = Depends(get_db)):
    return assigner_responsable(db, project_id, utilisateur_id)


@router.patch("/{project_id}/statut/{statut}", response_model=ProjetResponse)
def change_status(project_id: str, statut: StatutProjet, db: Session = Depends(get_db)):
    return changer_statut(db, project_id, statut)


@router.patch("/{project_id}/archiver", response_model=ProjetResponse)
def archive(project_id: str, db: Session = Depends(get_db)):
    return archiver_project(db, project_id)


@router.delete("/{project_id}", response_model=MessageResponse)
def delete(project_id: str, db: Session = Depends(get_db)):
    delete_project(db, project_id)
    return {"message": "Projet supprime avec succes."}


@projects_router.get("/", response_model=list[ProjetResponse])
def list_projects_en(
    skip: int = 0,
    limit: int = 100,
    service_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    return list_projects(db, skip, limit, service_id, status)


@projects_router.post("/", response_model=ProjetResponse)
def create_project_en(payload: ProjetCreate, db: Session = Depends(get_db)):
    return create_project(db, payload)


@projects_router.get("/{project_id}", response_model=ProjetResponse)
def get_project_en(project_id: str, db: Session = Depends(get_db)):
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    return project


@projects_router.put("/{project_id}", response_model=ProjetResponse)
def update_project_en(project_id: str, payload: ProjetUpdate, db: Session = Depends(get_db)):
    return update_project(db, project_id, payload)


@projects_router.delete("/{project_id}", response_model=MessageResponse)
def delete_project_en(project_id: str, db: Session = Depends(get_db)):
    delete_project(db, project_id)
    return {"message": "Projet supprime avec succes."}
