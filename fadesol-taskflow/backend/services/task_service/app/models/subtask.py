from datetime import date
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutTache


class SousTache(Base):
    __tablename__ = "sous_taches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    titre = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    tache_id = Column(String(36), nullable=False, index=True)
    assignee_a = Column(String(36), nullable=True, index=True)
    service_id = Column(String(36), nullable=False, index=True)
    statut = Column(String(40), default=StatutTache.NOUVEAU.value, nullable=False)
    priorite = Column(String(40), nullable=False)
    date_limite = Column(Date, nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    date_modification = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def assigner(self, utilisateurId: str) -> None:
        self.assignee_a = utilisateurId

    def changerStatut(self, statut: StatutTache) -> None:
        self.statut = statut.value if hasattr(statut, "value") else str(statut)

    def estTerminee(self) -> bool:
        return self.statut == StatutTache.TERMINE.value

    def estEnRetard(self) -> bool:
        if not self.date_limite:
            return False
        return self.date_limite < date.today() and not self.estTerminee()
