from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Float, String, Text
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutProjet


class Projet(Base):
    __tablename__ = "projets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    titre = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    service_id = Column(String(36), nullable=False, index=True)
    responsable_id = Column(String(36), nullable=True, index=True)
    statut = Column(String(40), default=StatutProjet.NOUVEAU.value, nullable=False)
    priorite = Column(String(40), nullable=False)
    date_debut = Column(Date, nullable=True)
    date_limite = Column(Date, nullable=True)
    progression = Column(Float, default=0.0, nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    date_modification = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def assignerResponsable(self, utilisateurId: str) -> None:
        self.responsable_id = utilisateurId

    def changerStatut(self, statut: StatutProjet) -> None:
        self.statut = statut.value if hasattr(statut, "value") else str(statut)

    def calculerProgression(self) -> float:
        return float(self.progression or 0.0)

    def archiver(self) -> None:
        self.statut = StatutProjet.ANNULE.value
