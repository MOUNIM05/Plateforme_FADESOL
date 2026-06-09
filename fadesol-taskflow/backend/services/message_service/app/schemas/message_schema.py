from datetime import datetime

from pydantic import BaseModel


class MessageBase(BaseModel):
    expediteur_id: str
    destinataire_id: str | None = None
    service_id: str | None = None
    tache_id: str | None = None
    projet_id: str | None = None
    contenu: str
    est_lu: bool = False


class MessageCreate(MessageBase):
    pass


class MessageUpdate(BaseModel):
    destinataire_id: str | None = None
    service_id: str | None = None
    tache_id: str | None = None
    projet_id: str | None = None
    contenu: str | None = None
    est_lu: bool | None = None


class MessageResponse(MessageBase):
    id: str
    date_creation: datetime

    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    conversation_id: str
    type: str
    title: str
    total_messages: int = 0
    unread_count: int = 0
    last_message: str
    last_message_at: datetime
    expediteur_id: str | None = None
    destinataire_id: str | None = None
    service_id: str | None = None
    tache_id: str | None = None
    projet_id: str | None = None


class ConversationDetail(BaseModel):
    conversation: ConversationSummary
    messages: list[MessageResponse]
