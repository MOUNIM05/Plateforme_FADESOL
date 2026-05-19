from sqlalchemy.orm import Session

from app.models.clickup_sync_log import JournalSynchronisationClickUp
from app.schemas.clickup_sync_schema import ClickUpSyncCreate, ClickUpSyncUpdate
from shared.exceptions import not_found


def list_sync_logs(db: Session, skip: int = 0, limit: int = 100) -> list[JournalSynchronisationClickUp]:
    return db.query(JournalSynchronisationClickUp).offset(skip).limit(limit).all()


def get_sync_log(db: Session, log_id: str) -> JournalSynchronisationClickUp | None:
    return db.query(JournalSynchronisationClickUp).filter(JournalSynchronisationClickUp.id == log_id).first()


def create_sync_log(db: Session, payload: ClickUpSyncCreate) -> JournalSynchronisationClickUp:
    data = payload.model_dump()
    data["statut_synchronisation"] = payload.statut_synchronisation.value
    log = JournalSynchronisationClickUp(**data)
    db.add(log)
    db.commit()
    db.refresh(log)

    return log


def update_sync_log(db: Session, log_id: str, payload: ClickUpSyncUpdate) -> JournalSynchronisationClickUp:
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "statut_synchronisation" and value is not None:
            value = value.value
        setattr(log, field, value)

    db.commit()
    db.refresh(log)

    return log


def mark_success(db: Session, log_id: str) -> JournalSynchronisationClickUp:
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    log.marquerSucces()
    db.commit()
    db.refresh(log)

    return log


def mark_failed(db: Session, log_id: str, message: str) -> JournalSynchronisationClickUp:
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    log.marquerEchec(message)
    db.commit()
    db.refresh(log)

    return log
