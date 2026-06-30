"""Routes HTTP et WebSocket du service de messagerie.

Ce fichier expose les conversations, l'envoi de messages, la lecture et la
connexion temps reel utilisee par l'interface de messagerie.
"""

import asyncio
from fastapi import APIRouter, Depends, Request, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.message_schema import ConversationDetail, ConversationSummary, MessageCreate, MessageResponse, MessageUpdate
from app.services.message_service import (
    create_message,
    get_conversation,
    get_message,
    list_conversations,
    list_by_field,
    list_messages,
    mark_as_read,
    update_message,
    _fetch_current_profile,
)
from app.websocket_manager import message_ws_manager
from shared.exceptions import not_found


router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/", response_model=list[MessageResponse])
def list_all(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Liste les messages visibles pour l'utilisateur connecte."""
    # Le service applique ensuite les regles de visibilite par participant.
    return list_messages(db, skip, limit, request.headers.get("authorization"))


@router.post("/", response_model=MessageResponse)
async def send(payload: MessageCreate, request: Request, db: Session = Depends(get_db)):
    """Envoie un message et notifie les clients connectes."""
    # Le profil courant determine automatiquement l'expediteur du message.
    message = create_message(db, payload, request.headers.get("authorization"))
    response = MessageResponse.model_validate(message)

    # Diffusion temps reel pour rafraichir les conversations sans recharger la page.
    await message_ws_manager.broadcast(
        {
            "type": "message_created",
            "message": response.model_dump(mode="json"),
        }
    )

    return response


@router.get("/conversations", response_model=list[ConversationSummary])
def conversations(request: Request, db: Session = Depends(get_db)):
    """Retourne la liste des conversations agregees."""
    # Les messages sont regroupes par tache, projet, service ou discussion directe.
    return list_conversations(db, request.headers.get("authorization"))


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def conversation_detail(conversation_id: str, request: Request, db: Session = Depends(get_db)):
    """Retourne le detail d'une conversation accessible."""
    return get_conversation(db, conversation_id, request.headers.get("authorization"))


@router.get("/utilisateur/{utilisateur_id}", response_model=list[MessageResponse])
def by_user(utilisateur_id: str, db: Session = Depends(get_db)):
    """Filtre les messages par destinataire utilisateur."""
    return list_by_field(db, "destinataire_id", utilisateur_id)


@router.get("/service/{service_id}", response_model=list[MessageResponse])
def by_service(service_id: str, db: Session = Depends(get_db)):
    """Filtre les messages lies a un service."""
    return list_by_field(db, "service_id", service_id)


@router.get("/tache/{tache_id}", response_model=list[MessageResponse])
def by_task(tache_id: str, db: Session = Depends(get_db)):
    """Filtre les messages lies a une tache."""
    return list_by_field(db, "tache_id", tache_id)


@router.get("/projet/{projet_id}", response_model=list[MessageResponse])
def by_project(projet_id: str, db: Session = Depends(get_db)):
    """Filtre les messages lies a un projet."""
    return list_by_field(db, "projet_id", projet_id)


@router.get("/{message_id}", response_model=MessageResponse)
def get_one(message_id: str, db: Session = Depends(get_db)):
    """Retourne un message precis."""
    message = get_message(db, message_id)

    if not message:
        raise not_found("Message introuvable.")

    return message


@router.put("/{message_id}", response_model=MessageResponse)
def update(message_id: str, payload: MessageUpdate, db: Session = Depends(get_db)):
    """Met a jour le contenu ou les metadonnees d'un message."""
    return update_message(db, message_id, payload)


@router.patch("/{message_id}/lu", response_model=MessageResponse)
async def read(message_id: str, request: Request, db: Session = Depends(get_db)):
    """Marque un message comme lu et diffuse l'information en temps reel."""
    message = mark_as_read(db, message_id, request.headers.get("authorization"))
    response = MessageResponse.model_validate(message)

    # Identifie le lecteur pour que le frontend sache quel utilisateur a lu le message.
    reader_id = None
    try:
        reader_profile = _fetch_current_profile(request.headers.get("authorization"))
        reader_id = str(reader_profile.get("uuid") or reader_profile.get("id") or "")
    except Exception:
        reader_id = None

    # Reconstruit l'identifiant de conversation pour cibler la mise a jour cote client.
    conv_id = None
    if getattr(response, "tache_id", None):
        conv_id = f"tache--{response.tache_id}"
    elif getattr(response, "projet_id", None):
        conv_id = f"projet--{response.projet_id}"
    elif getattr(response, "service_id", None):
        conv_id = f"service--{response.service_id}"
    elif getattr(response, "destinataire_id", None):
        participants = sorted([str(response.expediteur_id), str(response.destinataire_id)])
        conv_id = f"direct--{participants[0]}--{participants[1]}"
    elif getattr(response, "expediteur_id", None):
        conv_id = f"general--{response.expediteur_id}"

    await message_ws_manager.broadcast(
        {
            "type": "message_read",
            "message": response.model_dump(mode="json"),
            "read_by": reader_id,
            "read_at": response.date_lecture.isoformat() if getattr(response, "date_lecture", None) else None,
            "conversation_id": conv_id,
        }
    )

    return response


@router.websocket("/ws/messages")
async def messages_websocket(websocket: WebSocket):
    """Maintient une connexion WebSocket pour les notifications de messagerie."""
    # Tente d'identifier l'utilisateur depuis l'en-tete Authorization.
    auth = websocket.headers.get("authorization")
    if not auth:
        # Fallback pour les clients WebSocket qui passent le token en query string.
        try:
            auth = websocket.query_params.get("authorization") or websocket.query_params.get("token")
        except Exception:
            auth = None
    user_id = None

    try:
        if auth:
            profile = _fetch_current_profile(auth)
            user_id = str(profile.get("uuid") or profile.get("id") or "__anonymous__")
    except Exception:
        user_id = "__anonymous__"

    await message_ws_manager.connect(websocket, user_id)

    try:
        await websocket.send_json({"type": "connected", "message": "Messagerie temps réel connectée."})

        while True:
            # Garde la connexion active; le client peut envoyer des pings texte.
            try:
                await websocket.receive_text()
            except Exception:
                await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        message_ws_manager.disconnect(websocket)


@router.get("/online-users")
def online_users():
    """Retourne les utilisateurs actuellement connectes au WebSocket."""
    return message_ws_manager.get_online_users()
