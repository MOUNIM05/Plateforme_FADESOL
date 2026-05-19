from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.task_schema import TacheCreate, TacheResponse, TacheUpdate
from app.services.task_service import (
    assigner_task,
    changer_statut_task,
    create_task,
    delete_task,
    get_task,
    list_tasks,
    synchroniser_clickup,
    update_task,
)
from shared.enums import StatutTache
from shared.exceptions import not_found
from shared.responses import MessageResponse


router = APIRouter(prefix="/taches", tags=["Taches"])


@router.get("/", response_model=list[TacheResponse])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_tasks(db, skip, limit)


@router.post("/", response_model=TacheResponse)
def create(payload: TacheCreate, db: Session = Depends(get_db)):
    return create_task(db, payload)


@router.get("/{task_id}", response_model=TacheResponse)
def get_one(task_id: str, db: Session = Depends(get_db)):
    task = get_task(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    return task


@router.put("/{task_id}", response_model=TacheResponse)
def update(task_id: str, payload: TacheUpdate, db: Session = Depends(get_db)):
    return update_task(db, task_id, payload)


@router.patch("/{task_id}/assigner/{utilisateur_id}", response_model=TacheResponse)
def assign(task_id: str, utilisateur_id: str, db: Session = Depends(get_db)):
    return assigner_task(db, task_id, utilisateur_id)


@router.patch("/{task_id}/statut/{statut}", response_model=TacheResponse)
def change_status(task_id: str, statut: StatutTache, db: Session = Depends(get_db)):
    return changer_statut_task(db, task_id, statut)


@router.patch("/{task_id}/clickup", response_model=TacheResponse)
def sync_clickup(task_id: str, clickup_task_id: str | None = None, db: Session = Depends(get_db)):
    return synchroniser_clickup(db, task_id, clickup_task_id)


@router.delete("/{task_id}", response_model=MessageResponse)
def delete(task_id: str, db: Session = Depends(get_db)):
    delete_task(db, task_id)
    return {"message": "Tache supprimee avec succes."}
