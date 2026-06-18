"""Routes HTTP du service projets.

Ce fichier expose les anciennes routes francaises et les routes modernes
anglaises, avec filtrage des projets selon le role de l'utilisateur.
"""

import json
import unicodedata
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


def _normalize_service_key(value: str | None) -> str:
    """Normalise un nom ou identifiant de service pour les comparaisons."""
    normalized = unicodedata.normalize("NFD", str(value or ""))
    without_accents = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return "".join(char for char in without_accents.lower() if char.isalnum())


def _fetch_services(authorization: str | None) -> list[dict]:
    """Recupere le referentiel des services pour traduire nom de service vers UUID."""
    if not authorization:
        return []

    request = UrlRequest(
        f"{settings.SERVICE_FADESOL_URL.rstrip('/')}/api/services-fadesol/",
        headers={"Authorization": authorization},
        method="GET",
    )

    try:
        with urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError, UnicodeDecodeError, TimeoutError):
        return []

    return payload if isinstance(payload, list) else []


def _manager_service_scope(profile: dict, authorization: str | None) -> list[str]:
    """Retourne les valeurs de service acceptables pour un manager.

    Les anciens profils peuvent contenir "Commercial" alors que les projets
    stockent l'UUID du service. On conserve donc les deux valeurs.
    """
    raw_values = [
        profile.get("id_service"),
        profile.get("service_id"),
        profile.get("service"),
        profile.get("service_name"),
        profile.get("nom_service"),
    ]
    service_keys = {_normalize_service_key(value) for value in raw_values if value not in {None, ""}}
    scope = []

    for service in _fetch_services(authorization):
        candidates = [
            service.get("id"),
            service.get("uuid"),
            service.get("name"),
            service.get("nom"),
            service.get("nom_service"),
        ]

        if service_keys.intersection({_normalize_service_key(candidate) for candidate in candidates if candidate}):
            service_id = service.get("id") or service.get("uuid")
            if service_id:
                scope.append(str(service_id))

    scope.extend(str(value) for value in raw_values if value not in {None, ""})
    return list(dict.fromkeys(scope))


def _manager_primary_service_id(profile: dict, authorization: str | None) -> str | None:
    scope = _manager_service_scope(profile, authorization)
    return scope[0] if scope else None


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
        return list_projects(
            db,
            skip,
            limit,
            service_ids=_manager_service_scope(profile, request.headers.get("authorization")),
            status=status,
        )

    return list_projects(db, skip, limit, service_id, status)


@projects_router.post("/", response_model=ProjetResponse)
def create_project_en(payload: ProjetCreate, request: Request, db: Session = Depends(get_db)):
    """Cree un projet en appliquant le service du manager si necessaire."""
    profile = _fetch_current_profile(request.headers.get("authorization"))
    # Le manager cree automatiquement dans son propre perimetre de service.
    if _is_manager(profile):
        payload.service_id = _manager_primary_service_id(profile, request.headers.get("authorization"))

    return create_project(db, payload)


@projects_router.get("/{project_id}", response_model=ProjetResponse)
def get_project_en(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Retourne un projet apres controle du perimetre."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    profile = _fetch_current_profile(request.headers.get("authorization"))
    if _is_manager(profile) and project.service_id not in _manager_service_scope(profile, request.headers.get("authorization")):
        raise not_found("Projet introuvable.")

    return project


@projects_router.put("/{project_id}", response_model=ProjetResponse)
def update_project_en(project_id: str, payload: ProjetUpdate, request: Request, db: Session = Depends(get_db)):
    """Met a jour un projet dans le perimetre autorise."""
    profile = _fetch_current_profile(request.headers.get("authorization"))
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    if _is_manager(profile) and project.service_id not in _manager_service_scope(profile, request.headers.get("authorization")):
        raise not_found("Projet introuvable.")

    if _is_manager(profile):
        # Un manager ne peut pas deplacer un projet vers un autre service.
        payload.service_id = _manager_primary_service_id(profile, request.headers.get("authorization"))

    return update_project(db, project_id, payload)


@projects_router.delete("/{project_id}", response_model=MessageResponse)
def delete_project_en(project_id: str, request: Request, db: Session = Depends(get_db)):
    """Supprime un projet apres verification du perimetre utilisateur."""
    profile = _fetch_current_profile(request.headers.get("authorization"))
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    if _is_manager(profile) and project.service_id not in _manager_service_scope(profile, request.headers.get("authorization")):
        raise not_found("Projet introuvable.")
    delete_project(db, project_id)
    return {"message": "Projet supprime avec succes."}
