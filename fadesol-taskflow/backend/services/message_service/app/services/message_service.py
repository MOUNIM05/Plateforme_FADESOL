from sqlalchemy.orm import Session

from app.models.message import Message
from app.schemas.message_schema import MessageCreate, MessageUpdate
from shared.exceptions import not_found


def list_messages(db: Session, skip: int = 0, limit: int = 100) -> list[Message]:
    return db.query(Message).offset(skip).limit(limit).all()


def get_message(db: Session, message_id: str) -> Message | None:
    return db.query(Message).filter(Message.id == message_id).first()


def create_message(db: Session, payload: MessageCreate) -> Message:
    message = Message(**payload.model_dump())
    message.envoyer()
    db.add(message)
    db.commit()
    db.refresh(message)

    return message


def update_message(db: Session, message_id: str, payload: MessageUpdate) -> Message:
    message = get_message(db, message_id)

    if not message:
        raise not_found("Message introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(message, field, value)

    db.commit()
    db.refresh(message)

    return message


def mark_as_read(db: Session, message_id: str) -> Message:
    message = get_message(db, message_id)

    if not message:
        raise not_found("Message introuvable.")

    message.marquerCommeLu()
    db.commit()
    db.refresh(message)

    return message


def list_by_field(db: Session, field: str, value: str) -> list[Message]:
    return db.query(Message).filter(getattr(Message, field) == value).all()
