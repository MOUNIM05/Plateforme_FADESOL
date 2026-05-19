from datetime import date, datetime

from pydantic import BaseModel

from shared.enums import Priorite, StatutTache


class TacheBase(BaseModel):
    titre: str
    description: str | None = None
    projet_id: str
    assignee_a: str | None = None
    service_id: str
    statut: StatutTache = StatutTache.NOUVEAU
    priorite: Priorite = Priorite.NORMALE
    date_limite: date | None = None
    est_synchronisee_clickup: bool = False
    clickup_task_id: str | None = None


class TacheCreate(TacheBase):
    pass


class TacheUpdate(BaseModel):
    titre: str | None = None
    description: str | None = None
    projet_id: str | None = None
    assignee_a: str | None = None
    service_id: str | None = None
    statut: StatutTache | None = None
    priorite: Priorite | None = None
    date_limite: date | None = None
    est_synchronisee_clickup: bool | None = None
    clickup_task_id: str | None = None


class TacheResponse(TacheBase):
    id: str
    date_creation: datetime
    date_modification: datetime | None = None

    class Config:
        from_attributes = True
