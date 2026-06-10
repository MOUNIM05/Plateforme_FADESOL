"""Schemas Pydantic des journaux de synchronisation ClickUp."""

from datetime import datetime

from pydantic import BaseModel

from shared.enums import StatutSynchronisation


class ClickUpSyncCreate(BaseModel):
    """Payload de creation d'un journal de synchronisation."""
    # tache_id reference la tache interne concernee par la tentative de synchronisation.
    tache_id: str

    # clickup_task_id est rempli si ClickUp a deja retourne un identifiant distant.
    clickup_task_id: str | None = None

    # Statut par defaut : une synchronisation commence en attente avant succes ou echec.
    statut_synchronisation: StatutSynchronisation = StatutSynchronisation.EN_ATTENTE

    # Message optionnel pour expliquer un echec ou une information de suivi.
    message_synchronisation: str | None = None


class ClickUpSyncUpdate(BaseModel):
    """Payload de mise a jour partielle d'un journal."""
    # Tous les champs sont optionnels car une mise a jour peut ne changer que le statut ou le message.
    clickup_task_id: str | None = None
    statut_synchronisation: StatutSynchronisation | None = None
    message_synchronisation: str | None = None


class ClickUpSyncResponse(ClickUpSyncCreate):
    """Representation API complete d'un journal de synchronisation."""
    # id et date_creation sont ajoutes par la base de donnees.
    id: str
    date_creation: datetime

    class Config:
        # Permet a Pydantic de convertir directement un objet SQLAlchemy en reponse API.
        from_attributes = True
