"""Modele SQLAlchemy des journaux de synchronisation ClickUp."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutSynchronisation


class JournalSynchronisationClickUp(Base):
    """Trace une tentative de synchronisation entre Fadesol TaskFlow et ClickUp."""
    # Table dediee aux logs fonctionnels de synchronisation, separee des taches principales.
    __tablename__ = "journaux_synchronisation_clickup"

    # Identifiant UUID local du journal, independant de l'id ClickUp.
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)

    # Identifiant de la tache interne concernee par la synchronisation.
    tache_id = Column(String(36), nullable=False, index=True)

    # Identifiant distant retourne par ClickUp lorsque la synchronisation cree une tache.
    clickup_task_id = Column(String(120), nullable=True, index=True)

    # Statut fonctionnel du traitement : en attente, succes ou echec.
    statut_synchronisation = Column(String(40), default=StatutSynchronisation.EN_ATTENTE.value, nullable=False)

    # Message explicatif utile pour comprendre pourquoi une synchronisation a echoue.
    message_synchronisation = Column(Text, nullable=True)

    # Date de creation du journal, generee par PostgreSQL.
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def marquerSucces(self) -> None:
        """Marque le journal comme reussi."""
        # Methode metier simple pour eviter de dupliquer les libelles de succes.
        self.statut_synchronisation = StatutSynchronisation.SUCCES.value
        self.message_synchronisation = "Synchronisation reussie."

    def marquerEchec(self, message: str) -> None:
        """Marque le journal comme echoue avec un message lisible."""
        # Le message est conserve pour faciliter le diagnostic pendant la soutenance ou les tests.
        self.statut_synchronisation = StatutSynchronisation.ECHEC.value
        self.message_synchronisation = message
