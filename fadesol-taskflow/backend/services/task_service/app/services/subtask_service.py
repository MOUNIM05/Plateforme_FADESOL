from sqlalchemy.orm import Session

from app.models.subtask import SubTask
from app.schemas.subtask_schema import SubTaskCreate, SubTaskUpdate
from shared.enums import StatutTache
from shared.exceptions import not_found


def _enum_value(value):
    # Convertit les enums en chaines compatibles avec les colonnes SQL.
    return value.value if hasattr(value, "value") else value


def _payload_data(payload, exclude_unset: bool = False) -> dict:
    # Prepare les donnees d'une sous-tache avant insertion ou modification.
    data = payload.model_dump(exclude_unset=exclude_unset)

    if "status" in data and data["status"] is not None:
        data["status"] = _enum_value(data["status"])

    if "priority" in data and data["priority"] is not None:
        data["priority"] = _enum_value(data["priority"])

    return data


def list_subtasks(db: Session, skip: int = 0, limit: int = 100) -> list[SubTask]:
    # Consultation paginee des sous-taches.
    return db.query(SubTask).offset(skip).limit(limit).all()


def get_subtask(db: Session, subtask_id: str) -> SubTask | None:
    return db.query(SubTask).filter(SubTask.id == subtask_id).first()


def create_subtask(db: Session, payload: SubTaskCreate) -> SubTask:
    # Cree une sous-tache en base a partir du schema valide par Pydantic.
    subtask = SubTask(**_payload_data(payload))
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    return subtask


def update_subtask(db: Session, subtask_id: str, payload: SubTaskUpdate) -> SubTask:
    # Applique uniquement les champs fournis dans la requete de mise a jour.
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    for field, value in _payload_data(payload, exclude_unset=True).items():
        setattr(subtask, field, value)

    db.commit()
    db.refresh(subtask)

    return subtask


def delete_subtask(db: Session, subtask_id: str) -> None:
    # Supprime une sous-tache apres verification de son existence.
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    db.delete(subtask)
    db.commit()


def assigner_subtask(db: Session, subtask_id: str, utilisateur_id: str) -> SubTask:
    # Affecte la sous-tache a un utilisateur reference par UUID.
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    subtask.assigner(utilisateur_id)
    db.commit()
    db.refresh(subtask)

    return subtask


def changer_statut_subtask(db: Session, subtask_id: str, statut: StatutTache) -> SubTask:
    # Change le statut de la sous-tache puis persiste la modification.
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    subtask.changerStatut(statut)
    db.commit()
    db.refresh(subtask)

    return subtask
