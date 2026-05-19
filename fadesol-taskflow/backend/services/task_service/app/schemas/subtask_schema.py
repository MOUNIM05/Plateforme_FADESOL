from datetime import date, datetime

from pydantic import BaseModel

from shared.enums import Priorite, StatutTache


class SousTacheBase(BaseModel):
    titre: str
    description: str | None = None
    tache_id: str
    assignee_a: str | None = None
    service_id: str
    statut: StatutTache = StatutTache.NOUVEAU
    priorite: Priorite = Priorite.NORMALE
    date_limite: date | None = None


class SousTacheCreate(SousTacheBase):
    pass


class SousTacheUpdate(BaseModel):
    titre: str | None = None
    description: str | None = None
    tache_id: str | None = None
    assignee_a: str | None = None
    service_id: str | None = None
    statut: StatutTache | None = None
    priorite: Priorite | None = None
    date_limite: date | None = None


class SousTacheResponse(SousTacheBase):
    id: str
    date_creation: datetime
    date_modification: datetime | None = None

    class Config:
        from_attributes = True
