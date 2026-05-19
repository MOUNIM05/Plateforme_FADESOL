from datetime import date, datetime

from pydantic import BaseModel, Field

from shared.enums import Priorite, StatutProjet


class ProjetBase(BaseModel):
    titre: str
    description: str | None = None
    service_id: str
    responsable_id: str | None = None
    statut: StatutProjet = StatutProjet.NOUVEAU
    priorite: Priorite = Priorite.NORMALE
    date_debut: date | None = None
    date_limite: date | None = None
    progression: float = Field(default=0.0, ge=0.0, le=100.0)


class ProjetCreate(ProjetBase):
    pass


class ProjetUpdate(BaseModel):
    titre: str | None = None
    description: str | None = None
    service_id: str | None = None
    responsable_id: str | None = None
    statut: StatutProjet | None = None
    priorite: Priorite | None = None
    date_debut: date | None = None
    date_limite: date | None = None
    progression: float | None = Field(default=None, ge=0.0, le=100.0)


class ProjetResponse(ProjetBase):
    id: str
    date_creation: datetime
    date_modification: datetime | None = None

    class Config:
        from_attributes = True
