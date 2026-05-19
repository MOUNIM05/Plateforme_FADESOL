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
