import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.clickup_sync_log import JournalSynchronisationClickUp
from app.schemas.clickup_sync_schema import ClickUpSyncCreate, ClickUpSyncUpdate
from shared.exceptions import not_found


def _missing_clickup_value(value: str) -> bool:
    return value.strip() in {"", "change_me"}


def _clickup_error(message: str = "Connexion ClickUp echouee") -> dict:
    return {
        "status": "error",
        "message": message,
        "data": None,
    }


def _clickup_get(endpoint: str) -> dict:
    if _missing_clickup_value(settings.CLICKUP_TOKEN):
        return _clickup_error("Token ClickUp manquant")

    target_url = f"{settings.CLICKUP_API_BASE_URL}{endpoint}"
    request = UrlRequest(
        target_url,
        headers={
            "Authorization": settings.CLICKUP_TOKEN,
            "Content-Type": "application/json",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            raw_body = response.read().decode("utf-8")
    except (HTTPError, URLError, TimeoutError):
        return _clickup_error()

    try:
        data = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError:
        return _clickup_error("Reponse ClickUp invalide")

    return {
        "status": "ok",
        "message": "Connexion ClickUp reussie",
        "data": data,
    }


def test_clickup_connection() -> dict:
    response = get_clickup_workspaces()

    if response["status"] != "ok":
        return {
            "status": "error",
            "message": "Connexion ClickUp echouee",
        }

    return {
        "status": "ok",
        "message": "Connexion ClickUp reussie",
    }


def get_clickup_workspaces() -> dict:
    return _clickup_get("/team")


def get_clickup_spaces() -> dict:
    if _missing_clickup_value(settings.CLICKUP_WORKSPACE_ID):
        return _clickup_error("CLICKUP_WORKSPACE_ID manquant")

    return _clickup_get(f"/team/{settings.CLICKUP_WORKSPACE_ID}/space")


def get_clickup_folders() -> dict:
    if _missing_clickup_value(settings.CLICKUP_SPACE_ID):
        return _clickup_error("CLICKUP_SPACE_ID manquant")

    return _clickup_get(f"/space/{settings.CLICKUP_SPACE_ID}/folder")


def get_clickup_lists() -> dict:
    if not _missing_clickup_value(settings.CLICKUP_FOLDER_ID):
        return _clickup_get(f"/folder/{settings.CLICKUP_FOLDER_ID}/list")

    if not _missing_clickup_value(settings.CLICKUP_SPACE_ID):
        return _clickup_get(f"/space/{settings.CLICKUP_SPACE_ID}/list")

    return _clickup_error("CLICKUP_FOLDER_ID ou CLICKUP_SPACE_ID manquant")


def sync_tasks_placeholder() -> dict:
    return {
        "status": "not_configured",
        "message": "ClickUp synchronization will be implemented later",
    }


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
