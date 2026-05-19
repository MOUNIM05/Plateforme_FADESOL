from sqlalchemy.orm import Session

from app.models.task import Tache
from app.schemas.task_schema import TacheCreate, TacheUpdate
from shared.enums import StatutTache
from shared.exceptions import not_found


def list_tasks(db: Session, skip: int = 0, limit: int = 100) -> list[Tache]:
    return db.query(Tache).offset(skip).limit(limit).all()


def get_task(db: Session, task_id: str) -> Tache | None:
    return db.query(Tache).filter(Tache.id == task_id).first()


def create_task(db: Session, payload: TacheCreate) -> Tache:
    data = payload.model_dump()
    data["statut"] = payload.statut.value
    data["priorite"] = payload.priorite.value
    task = Tache(**data)
    db.add(task)
    db.commit()
    db.refresh(task)

    return task


def update_task(db: Session, task_id: str, payload: TacheUpdate) -> Tache:
    task = get_task(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in {"statut", "priorite"} and value is not None:
            value = value.value
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    return task


def delete_task(db: Session, task_id: str) -> None:
    task = get_task(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    db.delete(task)
    db.commit()


def assigner_task(db: Session, task_id: str, utilisateur_id: str) -> Tache:
    task = get_task(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    task.assigner(utilisateur_id)
    db.commit()
    db.refresh(task)

    return task


def changer_statut_task(db: Session, task_id: str, statut: StatutTache) -> Tache:
    task = get_task(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    task.changerStatut(statut)
    db.commit()
    db.refresh(task)

    return task


def synchroniser_clickup(db: Session, task_id: str, clickup_task_id: str | None = None) -> Tache:
    task = get_task(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    task.synchroniserAvecClickUp(clickup_task_id)
    db.commit()
    db.refresh(task)

    return task
