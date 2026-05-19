from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.subtask_schema import SousTacheCreate, SousTacheResponse, SousTacheUpdate
from app.services.subtask_service import (
    assigner_subtask,
    changer_statut_subtask,
    create_subtask,
    delete_subtask,
    get_subtask,
    list_subtasks,
    update_subtask,
)
from shared.enums import StatutTache
from shared.exceptions import not_found
from shared.responses import MessageResponse


router = APIRouter(prefix="/sous-taches", tags=["Sous-taches"])


@router.get("/", response_model=list[SousTacheResponse])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_subtasks(db, skip, limit)


@router.post("/", response_model=SousTacheResponse)
def create(payload: SousTacheCreate, db: Session = Depends(get_db)):
    return create_subtask(db, payload)


@router.get("/{subtask_id}", response_model=SousTacheResponse)
def get_one(subtask_id: str, db: Session = Depends(get_db)):
    subtask = get_subtask(db, subtask_id)

    if not subtask:
        raise not_found("Sous-tache introuvable.")

    return subtask


@router.put("/{subtask_id}", response_model=SousTacheResponse)
def update(subtask_id: str, payload: SousTacheUpdate, db: Session = Depends(get_db)):
    return update_subtask(db, subtask_id, payload)


@router.patch("/{subtask_id}/assigner/{utilisateur_id}", response_model=SousTacheResponse)
def assign(subtask_id: str, utilisateur_id: str, db: Session = Depends(get_db)):
    return assigner_subtask(db, subtask_id, utilisateur_id)


@router.patch("/{subtask_id}/statut/{statut}", response_model=SousTacheResponse)
def change_status(subtask_id: str, statut: StatutTache, db: Session = Depends(get_db)):
    return changer_statut_subtask(db, subtask_id, statut)


@router.delete("/{subtask_id}", response_model=MessageResponse)
def delete(subtask_id: str, db: Session = Depends(get_db)):
    delete_subtask(db, subtask_id)
    return {"message": "Sous-tache supprimee avec succes."}
