from uuid import uuid4

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutSynchronisation


class JournalSynchronisationClickUp(Base):
    __tablename__ = "journaux_synchronisation_clickup"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    tache_id = Column(String(36), nullable=False, index=True)
    clickup_task_id = Column(String(120), nullable=True, index=True)
    statut_synchronisation = Column(String(40), default=StatutSynchronisation.EN_ATTENTE.value, nullable=False)
    message_synchronisation = Column(Text, nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def marquerSucces(self) -> None:
        self.statut_synchronisation = StatutSynchronisation.SUCCES.value
        self.message_synchronisation = "Synchronisation reussie."

    def marquerEchec(self, message: str) -> None:
        self.statut_synchronisation = StatutSynchronisation.ECHEC.value
        self.message_synchronisation = message
