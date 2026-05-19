from sqlalchemy.orm import Session

from app.models.subtask import SousTache
from app.schemas.subtask_schema import SousTacheCreate, SousTacheUpdate
from shared.enums import StatutTache
from shared.exceptions import not_found


def list_subtasks(db: Session, skip: int = 0, limit: int = 100) -> list[SousTache]:
    return db.query(SousTache).offset(skip).limit(limit).all()


def get_subtask(db: Session, subtask_id: str) -> SousTache | None:
    return db.query(SousTache).filter(SousTache.id == subtask_id).first()


def create_subtask(db: Session, payload: SousTacheCreate) -> SousTache:
    data = payload.model_dump()
    data["statut"] = payload.statut.value
    data["priorite"] = payload.priorite.value
    subtask = SousTache(**data)
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    return subtask


def update_subtask(db: Session, subtask_id: str, payload: SousTacheUpdate) -> SousTache:
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in {"statut", "priorite"} and value is not None:
            value = value.value
        setattr(subtask, field, value)

    db.commit()
    db.refresh(subtask)

    return subtask


def delete_subtask(db: Session, subtask_id: str) -> None:
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    db.delete(subtask)
    db.commit()


def assigner_subtask(db: Session, subtask_id: str, utilisateur_id: str) -> SousTache:
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    subtask.assigner(utilisateur_id)
    db.commit()
    db.refresh(subtask)

    return subtask


def changer_statut_subtask(db: Session, subtask_id: str, statut: StatutTache) -> SousTache:
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    subtask.changerStatut(statut)
    db.commit()
    db.refresh(subtask)

    return subtask
