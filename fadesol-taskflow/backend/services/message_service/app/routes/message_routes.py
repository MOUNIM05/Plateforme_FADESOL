from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.message_schema import MessageCreate, MessageResponse, MessageUpdate
from app.services.message_service import (
    create_message,
    get_message,
    list_by_field,
    list_messages,
    mark_as_read,
    update_message,
)
from shared.exceptions import not_found


router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/", response_model=list[MessageResponse])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_messages(db, skip, limit)


@router.post("/", response_model=MessageResponse)
def send(payload: MessageCreate, db: Session = Depends(get_db)):
    return create_message(db, payload)


@router.get("/utilisateur/{utilisateur_id}", response_model=list[MessageResponse])
def by_user(utilisateur_id: str, db: Session = Depends(get_db)):
    return list_by_field(db, "destinataire_id", utilisateur_id)


@router.get("/service/{service_id}", response_model=list[MessageResponse])
def by_service(service_id: str, db: Session = Depends(get_db)):
    return list_by_field(db, "service_id", service_id)


@router.get("/tache/{tache_id}", response_model=list[MessageResponse])
def by_task(tache_id: str, db: Session = Depends(get_db)):
    return list_by_field(db, "tache_id", tache_id)


@router.get("/projet/{projet_id}", response_model=list[MessageResponse])
def by_project(projet_id: str, db: Session = Depends(get_db)):
    return list_by_field(db, "projet_id", projet_id)


@router.get("/{message_id}", response_model=MessageResponse)
def get_one(message_id: str, db: Session = Depends(get_db)):
    message = get_message(db, message_id)

    if not message:
        raise not_found("Message introuvable.")

    return message


@router.put("/{message_id}", response_model=MessageResponse)
def update(message_id: str, payload: MessageUpdate, db: Session = Depends(get_db)):
    return update_message(db, message_id, payload)


@router.patch("/{message_id}/lu", response_model=MessageResponse)
def read(message_id: str, db: Session = Depends(get_db)):
    return mark_as_read(db, message_id)
