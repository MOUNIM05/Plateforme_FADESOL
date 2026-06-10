from sqlalchemy.orm import Session

from app.models.message import Message
from app.schemas.message_schema import (
    ConversationDetail,
    ConversationSummary,
    MessageCreate,
    MessageResponse,
    MessageUpdate,
)
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


def list_conversations(db: Session) -> list[ConversationSummary]:
    messages = _list_messages_ordered(db)
    grouped_messages: dict[str, list[Message]] = {}

    for message in messages:
        grouped_messages.setdefault(_conversation_id(message), []).append(message)

    conversations = [
        _build_conversation_summary(conversation_id, conversation_messages)
        for conversation_id, conversation_messages in grouped_messages.items()
    ]

    return sorted(conversations, key=lambda conversation: conversation.last_message_at, reverse=True)


def get_conversation(db: Session, conversation_id: str) -> ConversationDetail:
    conversation_messages = [
        message
        for message in _list_messages_ordered(db)
        if _conversation_id(message) == conversation_id
    ]

    if not conversation_messages:
        raise not_found("Conversation introuvable.")

    return ConversationDetail(
        conversation=_build_conversation_summary(conversation_id, conversation_messages),
        messages=[MessageResponse.model_validate(message) for message in conversation_messages],
    )


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


def _list_messages_ordered(db: Session) -> list[Message]:
    return db.query(Message).order_by(Message.date_creation.asc()).all()


def _conversation_id(message: Message) -> str:
    if message.tache_id:
        return f"tache--{message.tache_id}"

    if message.projet_id:
        return f"projet--{message.projet_id}"

    if message.service_id:
        return f"service--{message.service_id}"

    if message.destinataire_id:
        participants = sorted([message.expediteur_id, message.destinataire_id])
        return f"direct--{participants[0]}--{participants[1]}"

    return f"general--{message.expediteur_id}"


def _build_conversation_summary(conversation_id: str, messages: list[Message]) -> ConversationSummary:
    last_message = messages[-1]
    first_message = messages[0]
    conversation_type = conversation_id.split("--", 1)[0]

    return ConversationSummary(
        conversation_id=conversation_id,
        type=conversation_type,
        title=_conversation_title(conversation_type, first_message),
        total_messages=len(messages),
        unread_count=sum(1 for message in messages if not message.est_lu),
        last_message=last_message.contenu,
        last_message_at=last_message.date_creation,
        expediteur_id=first_message.expediteur_id,
        destinataire_id=first_message.destinataire_id,
        service_id=first_message.service_id,
        tache_id=first_message.tache_id,
        projet_id=first_message.projet_id,
    )


def _conversation_title(conversation_type: str, message: Message) -> str:
    if conversation_type == "tache":
        return f"Tâche {message.tache_id}"

    if conversation_type == "projet":
        return f"Projet {message.projet_id}"

    if conversation_type == "service":
        return f"Service {message.service_id}"

    if conversation_type == "direct":
        return f"Conversation {message.expediteur_id} / {message.destinataire_id}"

    return "Conversation générale"
