"""Routes HTTP du service projets.

Ce fichier expose les anciennes routes francaises et les routes modernes
anglaises, avec filtrage des projets selon le role de l'utilisateur.
"""

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
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


def _fetch_current_profile(authorization: str | None) -> dict:
    """Recupere le profil courant depuis user_service pour filtrer les projets."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")

    request = UrlRequest(
        f"{settings.USER_SERVICE_URL.rstrip('/')}/api/users/me/profile",
        headers={"Authorization": authorization},
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise HTTPException(status_code=exc.code, detail="Utilisateur connecte introuvable.") from exc
    except (URLError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="User service indisponible pour filtrer les projets.",
        ) from exc

    return payload if isinstance(payload, dict) else {}


def _role(profile: dict) -> str:
    return str(profile.get("role") or "").lower()


def _is_manager(profile: dict) -> bool:
    return _role(profile) == "manager"


def _manager_service_id(profile: dict) -> str | None:
    value = profile.get("id_service") or profile.get("service_id")
    return str(value) if value not in {None, ""} else None


def _ensure_project_scope(project, profile: dict):
    """Verifie qu'un manager reste limite aux projets de son service."""
    if _is_manager(profile) and project.service_id != _manager_service_id(profile):
        raise not_found("Projet introuvable.")

    return project


@router.get("/", response_model=list[ProjetResponse])
def list_all(
    skip: int = 0,
    limit: int = 100,
    service_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """Liste les projets via l'ancienne route /projets."""
    return list_projects(db, skip, limit, service_id, status)


@router.post("/", response_model=ProjetResponse)
def create(payload: ProjetCreate, db: Session = Depends(get_db)):
    """Cree un projet via l'ancienne route /projets."""
    return create_project(db, payload)


@router.get("/{project_id}", response_model=ProjetResponse)
def get_one(project_id: str, db: Session = Depends(get_db)):
    """Retourne un projet via son identifiant."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    return project


@router.put("/{project_id}", response_model=ProjetResponse)
def update(project_id: str, payload: ProjetUpdate, db: Session = Depends(get_db)):
    """Met a jour un projet existant."""
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
    request: Request,
    skip: int = 0,
    limit: int = 100,
    service_id: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    """Liste les projets visibles sur la route moderne /projects."""
    profile = _fetch_current_profile(request.headers.get("authorization"))
    # Un manager ne consulte que les projets rattaches a son service.
    if _is_manager(profile):
        service_id = _manager_service_id(profile)

    return list_projects(db, skip, limit, service_id, status)


@projects_router.post("/", response_model=ProjetResponse)
def create_project_en(payload: ProjetCreate, request: Request, db: Session = Depends(get_db)):
    """Cree un projet en appliquant le service du manager si necessaire."""
    profile = _fetch_current_profile(request.headers.get("authorization"))
    # Le manager cree automatiquement dans son propre perimetre de service.
    if _is_manager(profile):
        payload.service_id = _manager_service_id(profile)

    return create_project(db, payload)


@projects_router.get("/{project_id}", response_model=ProjetResponse)
def get_project_en(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Retourne un projet apres controle du perimetre."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    profile = _fetch_current_profile(request.headers.get("authorization"))
    return _ensure_project_scope(project, profile)


@projects_router.put("/{project_id}", response_model=ProjetResponse)
def update_project_en(project_id: str, payload: ProjetUpdate, request: Request, db: Session = Depends(get_db)):
    """Met a jour un projet dans le perimetre autorise."""
    profile = _fetch_current_profile(request.headers.get("authorization"))
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    _ensure_project_scope(project, profile)

    if _is_manager(profile):
        # Un manager ne peut pas deplacer un projet vers un autre service.
        payload.service_id = _manager_service_id(profile)

    return update_project(db, project_id, payload)


@projects_router.delete("/{project_id}", response_model=MessageResponse)
def delete_project_en(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Supprime un projet apres verification du perimetre utilisateur."""
    profile = _fetch_current_profile(request.headers.get("authorization"))
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    _ensure_project_scope(project, profile)
    delete_project(db, project_id)
    return {"message": "Projet supprime avec succes."}
