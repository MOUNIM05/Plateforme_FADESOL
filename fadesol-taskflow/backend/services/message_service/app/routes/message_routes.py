from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
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
)
from app.websocket_manager import message_ws_manager
from shared.exceptions import not_found


router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/", response_model=list[MessageResponse])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_messages(db, skip, limit)


@router.post("/", response_model=MessageResponse)
async def send(payload: MessageCreate, db: Session = Depends(get_db)):
    message = create_message(db, payload)
    response = MessageResponse.model_validate(message)

    await message_ws_manager.broadcast(
        {
            "type": "message_created",
            "message": response.model_dump(mode="json"),
        }
    )

    return response


@router.get("/conversations", response_model=list[ConversationSummary])
def conversations(db: Session = Depends(get_db)):
    return list_conversations(db)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def conversation_detail(conversation_id: str, db: Session = Depends(get_db)):
    return get_conversation(db, conversation_id)


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
async def read(message_id: str, db: Session = Depends(get_db)):
    message = mark_as_read(db, message_id)
    response = MessageResponse.model_validate(message)

    await message_ws_manager.broadcast(
        {
            "type": "message_read",
            "message": response.model_dump(mode="json"),
        }
    )

    return response


@router.websocket("/ws/messages")
async def messages_websocket(websocket: WebSocket):
    await message_ws_manager.connect(websocket)

    try:
        await websocket.send_json({"type": "connected", "message": "Messagerie temps réel connectée."})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        message_ws_manager.disconnect(websocket)
