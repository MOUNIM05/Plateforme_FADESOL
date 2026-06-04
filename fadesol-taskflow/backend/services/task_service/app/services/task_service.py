"""Logique metier des taches principales."""

import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.task import Task
from app.schemas.task_schema import TaskAssign, TaskCreate, TaskImportFromClickUp, TaskStatusUpdate, TaskUpdate
from shared.enums import StatutTache
from shared.exceptions import not_found


def _enum_value(value):
    """Retourne la valeur brute d'un enum ou la valeur initiale."""
    # Convertit les enums Pydantic en valeurs stockables par SQLAlchemy.
    return value.value if hasattr(value, "value") else value


def _payload_data(payload, exclude_unset: bool = False) -> dict:
    """Convertit un schema Pydantic en dictionnaire pret pour SQLAlchemy."""
    # Prepare les donnees des schemas avant creation ou mise a jour en base.
    data = payload.model_dump(exclude_unset=exclude_unset)

    if "status" in data and data["status"] is not None:
        data["status"] = _enum_value(data["status"])

    if "priority" in data and data["priority"] is not None:
        data["priority"] = _enum_value(data["priority"])

    return data


def get_tasks(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    priority: str | None = None,
    assigned_to: str | None = None,
) -> list[Task]:
    """Liste les taches avec pagination et filtres."""
    # Requete principale de consultation avec filtres par statut, priorite et utilisateur assigne.
    query = db.query(Task)

    if status:
        query = query.filter(Task.status == status)

    if priority:
        query = query.filter(Task.priority == priority)

    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)

    return query.offset(skip).limit(limit).all()


def get_my_tasks(db: Session, current_user_uuid: str, skip: int = 0, limit: int = 100) -> list[Task]:
    """Liste les taches affectees a un utilisateur."""
    # Raccourci pour recuperer les taches affectees a l'utilisateur courant.
    return get_tasks(db, skip=skip, limit=limit, assigned_to=current_user_uuid)


def resolve_current_user_uuid(authorization_header: str | None) -> str:
    """Demande a user_service le UUID de l'utilisateur connecte."""
    # task_service ne lit pas directement la base user_service : il appelle son API pour obtenir le UUID.
    if not authorization_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")

    target_url = f"{settings.USER_SERVICE_URL.rstrip('/')}/api/users/me/profile"
    request = UrlRequest(
        target_url,
        headers={"Authorization": authorization_header},
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
            detail="User service indisponible pour resoudre l'utilisateur connecte.",
        ) from exc

    user_uuid = payload.get("uuid")

    if not user_uuid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="UUID utilisateur introuvable.")

    return user_uuid


def get_task_by_id(db: Session, task_id: str) -> Task | None:
    """Retourne une tache par UUID."""
    return db.query(Task).filter(Task.id == task_id).first()


def get_task_by_clickup_id(db: Session, clickup_task_id: str) -> Task | None:
    """Retourne une tache a partir de son identifiant ClickUp."""
    return db.query(Task).filter(Task.clickup_task_id == clickup_task_id).first()


def create_task(db: Session, payload: TaskCreate) -> Task:
    """Cree une tache locale."""
    # Creation d'une tache locale, par opposition aux taches importees depuis ClickUp.
    task = Task(**_payload_data(payload), source="local")
    db.add(task)
    db.commit()
    db.refresh(task)

    return task


def update_task(db: Session, task_id: str, payload: TaskUpdate) -> Task:
    """Met a jour une tache existante."""
    # Mise a jour partielle d'une tache existante.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    for field, value in _payload_data(payload, exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    return task


def delete_task(db: Session, task_id: str) -> None:
    """Supprime une tache."""
    # Suppression definitive de la tache dans la base du service.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    db.delete(task)
    db.commit()


def upsert_task_from_clickup(db: Session, payload: TaskImportFromClickUp) -> Task:
    """Cree ou met a jour une tache importee depuis ClickUp."""
    # Upsert ClickUp : met a jour la tache existante si l'id ClickUp est connu, sinon la cree.
    task = get_task_by_clickup_id(db, payload.clickup_task_id)
    data = _payload_data(payload)
    data["source"] = "clickup"
    data["est_synchronisee_clickup"] = True
    data["date_synchronisation"] = datetime.now(timezone.utc)

    if task:
        for field, value in data.items():
            setattr(task, field, value)
    else:
        task = Task(**data)
        db.add(task)

    db.commit()
    db.refresh(task)

    return task


def assigner_task(db: Session, task_id: str, utilisateur_id: str) -> Task:
    """Affecte une tache via l'ancienne route en francais."""
    # Ancienne API d'affectation en francais, conservee pour compatibilite.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    task.assigner(utilisateur_id)
    db.commit()
    db.refresh(task)

    return task


def assign_task(db: Session, task_id: str, payload: TaskAssign) -> Task:
    """Affecte une tache via la route moderne."""
    # Nouvelle API d'affectation : le payload porte l'UUID utilisateur.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    # assigned_to stocke seulement le UUID utilisateur; pas de relation SQL directe avec user_service.
    task.assigned_to = str(payload.assigned_to)
    db.commit()
    db.refresh(task)

    return task


def update_task_status(db: Session, task_id: str, payload: TaskStatusUpdate) -> Task:
    """Met a jour uniquement le statut d'une tache."""
    # Change le statut et met a jour la date de modification pour le suivi.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    task.status = _enum_value(payload.status)
    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    return task


def changer_statut_task(db: Session, task_id: str, statut: StatutTache) -> Task:
    """Change le statut via l'ancienne route en francais."""
    # Variante historique du changement de statut, basee sur l'enum passe dans l'URL.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    task.changerStatut(statut)
    db.commit()
    db.refresh(task)

    return task


def synchroniser_clickup(db: Session, task_id: str, clickup_task_id: str | None = None) -> Task:
    """Marque une tache comme synchronisee avec ClickUp."""
    # Marque une tache comme synchronisee avec ClickUp et renseigne la date de synchronisation.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    task.synchroniserAvecClickUp(clickup_task_id)
    task.date_synchronisation = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    return task


list_tasks = get_tasks
get_task = get_task_by_id

# Alias conserves pour compatibilite avec d'anciens imports.
