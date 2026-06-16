"""Logique metier des sous-taches.

Ce module reste dans task_service car les sous-taches appartiennent au domaine tache.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.subtask import SubTask
from app.models.task import Task
from app.schemas.subtask_schema import SubTaskAssign, SubTaskCreate, SubTaskCreateLegacy, SubTaskUpdate
from app.services.integration_service import normalize_optional_uuid, validate_user_exists
from shared.enums import StatutTache
from shared.exceptions import not_found


def _enum_value(value):
    """Retourne la valeur brute d'un enum."""
    # Convertit les enums en chaines compatibles avec les colonnes SQL.
    return value.value if hasattr(value, "value") else value


def _payload_data(payload, exclude_unset: bool = False) -> dict:
    """Prepare les donnees Pydantic avant insertion ou mise a jour."""
    # Prepare les donnees d'une sous-tache avant insertion ou modification.
    data = payload.model_dump(exclude_unset=exclude_unset)

    if "status" in data and data["status"] is not None:
        data["status"] = _enum_value(data["status"])

    if "priority" in data and data["priority"] is not None:
        data["priority"] = _enum_value(data["priority"])

    return data


def list_subtasks(db: Session, skip: int = 0, limit: int = 100) -> list[SubTask]:
    """Liste toutes les sous-taches avec pagination."""
    # Consultation paginee des sous-taches.
    return db.query(SubTask).offset(skip).limit(limit).all()


def get_subtasks_by_task(db: Session, task_id: str) -> list[SubTask]:
    """Liste les sous-taches d'une tache principale."""
    # Retourne uniquement les sous-taches rattachees a la tache principale demandee.
    return db.query(SubTask).filter(SubTask.task_id == task_id).all()


def get_subtask_by_id(db: Session, subtask_id: str) -> SubTask | None:
    """Retourne une sous-tache par UUID."""
    return db.query(SubTask).filter(SubTask.id == subtask_id).first()


def calculate_task_progress(db: Session, task_id: str) -> dict:
    """Calcule total, terminees et pourcentage de progression."""
    # Calcule la progression d'une tache principale a partir de ses sous-taches.
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise not_found("Tache principale introuvable.")

    total_subtasks = db.query(SubTask).filter(SubTask.task_id == task_id).count()
    completed_statuses = {
        StatutTache.TERMINE.value,
        StatutTache.VALIDEE.value,
        "Termine",
        "Terminé",
        "Terminée",
        "Valide",
        "Validée",
        "Validee",
    }
    completed_subtasks = (
        db.query(SubTask)
        .filter(SubTask.task_id == task_id, SubTask.status.in_(completed_statuses))
        .count()
    )
    progression = 0 if total_subtasks == 0 else round((completed_subtasks / total_subtasks) * 100)

    return {
        "task_id": task_id,
        "total_subtasks": total_subtasks,
        "completed_subtasks": completed_subtasks,
        "progression": progression,
    }


def create_subtask(db: Session, task_id: str, subtask_data: SubTaskCreate) -> SubTask:
    """Cree une sous-tache rattachee a une tache existante."""
    # Verifie que la tache principale existe avant de rattacher une sous-tache.
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise not_found("Tache principale introuvable.")

    data = _payload_data(subtask_data)
    data.pop("task_id", None)
    data["assigned_to"] = validate_user_exists(data.get("assigned_to"))
    data["service_id"] = normalize_optional_uuid(data.get("service_id"))

    subtask = SubTask(task_id=task_id, **data)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    return subtask


def create_legacy_subtask(db: Session, payload: SubTaskCreateLegacy) -> SubTask:
    """Cree une sous-tache via l'ancien endpoint /sous-taches."""
    # Conserve l'ancien endpoint /sous-taches en reutilisant la creation imbriquee.
    return create_subtask(db, payload.task_id, payload)


def update_subtask(db: Session, subtask_id: str, payload: SubTaskUpdate) -> SubTask:
    """Met a jour une sous-tache existante."""
    # Applique uniquement les champs fournis dans la requete de mise a jour.
    subtask = get_subtask_by_id(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    data = _payload_data(payload, exclude_unset=True)

    if "assigned_to" in data:
        data["assigned_to"] = validate_user_exists(data.get("assigned_to"))

    if "service_id" in data:
        data["service_id"] = normalize_optional_uuid(data.get("service_id"))

    for field, value in data.items():
        setattr(subtask, field, value)

    db.commit()
    db.refresh(subtask)

    return subtask


def delete_subtask(db: Session, subtask_id: str) -> None:
    """Supprime une sous-tache."""
    # Supprime une sous-tache apres verification de son existence.
    subtask = get_subtask_by_id(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    db.delete(subtask)
    db.commit()


def assigner_subtask(db: Session, subtask_id: str, utilisateur_id: str) -> SubTask:
    """Affecte une sous-tache a un utilisateur avec l'ancienne API."""
    # Affecte la sous-tache a un utilisateur reference par UUID.
    subtask = get_subtask_by_id(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    utilisateur_id = validate_user_exists(utilisateur_id)
    subtask.assigner(utilisateur_id)
    db.commit()
    db.refresh(subtask)

    return subtask


def assign_subtask(db: Session, subtask_id: str, payload: SubTaskAssign) -> SubTask:
    """Affecte une sous-tache a un service et/ou un utilisateur."""
    # Affecte une sous-tache a un service et/ou a un membre sans relation SQL vers les autres services.
    subtask = get_subtask_by_id(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    data = payload.model_dump(exclude_unset=True)

    if "service_id" in data:
        subtask.service_id = normalize_optional_uuid(data["service_id"])

    if "assigned_to" in data:
        subtask.assigned_to = validate_user_exists(data["assigned_to"])

    subtask.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(subtask)

    return subtask


def changer_statut_subtask(db: Session, subtask_id: str, statut: StatutTache) -> SubTask:
    """Change le statut d'une sous-tache."""
    # Change le statut de la sous-tache puis persiste la modification.
    subtask = get_subtask_by_id(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    subtask.changerStatut(statut)
    db.commit()
    db.refresh(subtask)

    return subtask


get_subtask = get_subtask_by_id

# Alias conserve pour les routes existantes.
