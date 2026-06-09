from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.clickup_schema import ClickUpApiResponse, ClickUpConnectionResponse
from app.schemas.clickup_sync_schema import ClickUpSyncCreate, ClickUpSyncResponse, ClickUpSyncUpdate
from app.services.clickup_service import (
    create_sync_log,
    get_clickup_folders,
    get_clickup_lists,
    get_clickup_spaces,
    get_clickup_workspaces,
    get_sync_log,
    list_sync_logs,
    mark_failed,
    mark_success,
    sync_tasks_placeholder,
    test_clickup_connection,
    update_sync_log,
)
from shared.exceptions import not_found


router = APIRouter(prefix="/clickup/sync-logs", tags=["ClickUp"])
placeholder_router = APIRouter(prefix="/clickup", tags=["ClickUp"])


@placeholder_router.get("/")
def clickup_status():
    return {
        "status": "ok",
        "service": "clickup_service",
        "message": "Service ClickUp disponible",
    }


@placeholder_router.post("/sync-tasks")
def sync_tasks():
    return sync_tasks_placeholder()


@placeholder_router.get("/test-connection", response_model=ClickUpConnectionResponse)
def test_connection():
    return test_clickup_connection()


@placeholder_router.get("/workspaces", response_model=ClickUpApiResponse)
def workspaces():
    return get_clickup_workspaces()


@placeholder_router.get("/spaces", response_model=ClickUpApiResponse)
def spaces():
    return get_clickup_spaces()


@placeholder_router.get("/folders", response_model=ClickUpApiResponse)
def folders():
    return get_clickup_folders()


@placeholder_router.get("/lists", response_model=ClickUpApiResponse)
def lists():
    return get_clickup_lists()


@router.get("/", response_model=list[ClickUpSyncResponse])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_sync_logs(db, skip, limit)


@router.post("/", response_model=ClickUpSyncResponse)
def create(payload: ClickUpSyncCreate, db: Session = Depends(get_db)):
    return create_sync_log(db, payload)


@router.get("/{log_id}", response_model=ClickUpSyncResponse)
def get_one(log_id: str, db: Session = Depends(get_db)):
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    return log


@router.put("/{log_id}", response_model=ClickUpSyncResponse)
def update(log_id: str, payload: ClickUpSyncUpdate, db: Session = Depends(get_db)):
    return update_sync_log(db, log_id, payload)


@router.patch("/{log_id}/succes", response_model=ClickUpSyncResponse)
def success(log_id: str, db: Session = Depends(get_db)):
    return mark_success(db, log_id)


@router.patch("/{log_id}/echec", response_model=ClickUpSyncResponse)
def failed(log_id: str, message: str, db: Session = Depends(get_db)):
    return mark_failed(db, log_id, message)
