from datetime import datetime

from pydantic import BaseModel

from shared.enums import StatutSynchronisation


class ClickUpSyncCreate(BaseModel):
    tache_id: str
    clickup_task_id: str | None = None
    statut_synchronisation: StatutSynchronisation = StatutSynchronisation.EN_ATTENTE
    message_synchronisation: str | None = None


class ClickUpSyncUpdate(BaseModel):
    clickup_task_id: str | None = None
    statut_synchronisation: StatutSynchronisation | None = None
    message_synchronisation: str | None = None


class ClickUpSyncResponse(ClickUpSyncCreate):
    id: str
    date_creation: datetime

    class Config:
        from_attributes = True
