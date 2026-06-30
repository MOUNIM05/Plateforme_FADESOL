"""Logique metier du service de messagerie.

Ce module filtre les messages selon les participants connectes, construit les
conversations et applique les operations d'envoi, lecture et mise a jour.
"""

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.message import Message
from app.schemas.message_schema import (
    ConversationDetail,
    ConversationSummary,
    MessageCreate,
    MessageResponse,
    MessageUpdate,
)
from shared.exceptions import not_found


def list_messages(db: Session, skip: int = 0, limit: int = 100, authorization: str | None = None) -> list[Message]:
    """Liste les messages visibles avec pagination."""
    # La visibilite est calculee en memoire selon les participants, sans filtre role/service.
    profile = _fetch_current_profile(authorization)
    messages = db.query(Message).order_by(Message.date_creation.desc()).all()
    visible_messages = [message for message in messages if _message_visible_for_profile(message, profile)]

    return visible_messages[skip : skip + limit]


def get_message(db: Session, message_id: str) -> Message | None:
    """Retourne un message par UUID."""
    return db.query(Message).filter(Message.id == message_id).first()


def create_message(db: Session, payload: MessageCreate, authorization: str | None = None) -> Message:
    """Cree un message et force l'expediteur depuis le profil connecte."""
    profile = _fetch_current_profile(authorization)
    data = payload.model_dump()

    # Evite qu'un client puisse usurper l'expediteur dans le payload.
    if profile.get("uuid"):
        data["expediteur_id"] = str(profile["uuid"])

    message = Message(**data)
    message.envoyer()
    db.add(message)
    db.commit()
    db.refresh(message)

    return message


def list_conversations(db: Session, authorization: str | None = None) -> list[ConversationSummary]:
    """Regroupe les messages visibles en conversations."""
    profile = _fetch_current_profile(authorization)
    messages = [
        message
        for message in _list_messages_ordered(db)
        if _message_visible_for_profile(message, profile)
    ]
    grouped_messages: dict[str, list[Message]] = {}

    for message in messages:
        grouped_messages.setdefault(_conversation_id(message), []).append(message)

    conversations = [
        _build_conversation_summary(conversation_id, conversation_messages)
        for conversation_id, conversation_messages in grouped_messages.items()
    ]

    return sorted(conversations, key=lambda conversation: conversation.last_message_at, reverse=True)


def get_conversation(db: Session, conversation_id: str, authorization: str | None = None) -> ConversationDetail:
    """Retourne les messages d'une conversation accessible."""
    profile = _fetch_current_profile(authorization)
    conversation_messages = [
        message
        for message in _list_messages_ordered(db)
        if _conversation_id(message) == conversation_id and _message_visible_for_profile(message, profile)
    ]

    if not conversation_messages:
        raise not_found("Conversation introuvable.")

    return ConversationDetail(
        conversation=_build_conversation_summary(conversation_id, conversation_messages),
        messages=[MessageResponse.model_validate(message) for message in conversation_messages],
    )


def update_message(db: Session, message_id: str, payload: MessageUpdate) -> Message:
    """Met a jour les champs envoyes pour un message."""
    message = get_message(db, message_id)

    if not message:
        raise not_found("Message introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(message, field, value)

    db.commit()
    db.refresh(message)

    return message


def mark_as_read(db: Session, message_id: str, authorization: str | None = None) -> Message:
    """Marque un message comme lu apres verification de visibilite."""
    message = get_message(db, message_id)

    if not message:
        raise not_found("Message introuvable.")

    profile = _fetch_current_profile(authorization)
    # Un utilisateur ne peut marquer comme lu qu'un message qu'il a le droit de voir.
    if not _message_visible_for_profile(message, profile):
        raise not_found("Message introuvable.")

    message.marquerCommeLu()
    db.commit()
    db.refresh(message)

    return message


def list_by_field(db: Session, field: str, value: str) -> list[Message]:
    """Filtre les messages sur une colonne simple."""
    return db.query(Message).filter(getattr(Message, field) == value).all()


def _list_messages_ordered(db: Session) -> list[Message]:
    return db.query(Message).order_by(Message.date_creation.asc()).all()


def _fetch_current_profile(authorization: str | None) -> dict:
    """Recupere le profil courant via user_service."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")

    request = UrlRequest(
        f"{settings.USER_SERVICE_URL.rstrip('/')}/api/users/me/profile",
        headers={"Authorization": authorization},
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise HTTPException(status_code=exc.code, detail="Utilisateur connecte introuvable.") from exc
    except (URLError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="User service indisponible pour filtrer la messagerie.",
        ) from exc

    return payload if isinstance(payload, dict) else {}


def _profile_identifiers(profile: dict) -> set[str]:
    return {
        str(identifier)
        for identifier in [profile.get("uuid"), profile.get("id")]
        if identifier not in {None, ""}
    }


def _message_visible_for_profile(message: Message, profile: dict) -> bool:
    """Applique les regles de visibilite de la messagerie."""
    identifiers = _profile_identifiers(profile)

    # Aucun filtrage par role ou service : seuls les participants lisent une conversation directe.
    return str(message.expediteur_id or "") in identifiers or str(message.destinataire_id or "") in identifiers


def _conversation_id(message: Message) -> str:
    """Construit un identifiant stable pour regrouper les messages."""
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
    """Resume une conversation pour la liste laterale du frontend."""
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
