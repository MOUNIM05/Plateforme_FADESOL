"""Modele ORM des projets Fadesol.

Un projet appartient a un service et peut etre pilote par un responsable
identifie par UUID, sans cle etrangere directe vers user_service.
"""

from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Float, String, Text
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutProjet


class Projet(Base):
    """Projet stocke dans project_service."""
    __tablename__ = "projets"

    # UUID partageable entre services, stable pour les taches et les dashboards.
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    titre = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    # References logiques vers service_fadesol_service et user_service.
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
        """Affecte le projet a un responsable utilisateur."""
        self.responsable_id = utilisateurId

    def changerStatut(self, statut: StatutProjet) -> None:
        """Change le statut metier du projet."""
        self.statut = statut.value if hasattr(statut, "value") else str(statut)

    def calculerProgression(self) -> float:
        """Retourne la progression normalisee du projet."""
        return float(self.progression or 0.0)

    def archiver(self) -> None:
        """Archive le projet sans suppression physique."""
        self.statut = StatutProjet.ANNULE.value
