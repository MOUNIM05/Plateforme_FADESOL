"""Modele ORM des messages.

Un message peut etre rattache a un destinataire direct, un service, une tache
ou un projet afin de construire plusieurs types de conversations.
"""

from uuid import uuid4

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base


class Message(Base):
    """Message persiste par le service de messagerie."""

    __tablename__ = "messages"

    # UUID partageable avec le frontend et les evenements WebSocket.
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    # References logiques vers les utilisateurs et domaines metier des autres microservices.
    expediteur_id = Column(String(36), nullable=False, index=True)
    destinataire_id = Column(String(36), nullable=True, index=True)
    service_id = Column(String(36), nullable=True, index=True)
    tache_id = Column(String(36), nullable=True, index=True)
    projet_id = Column(String(36), nullable=True, index=True)
    contenu = Column(Text, nullable=False)
    est_lu = Column(Boolean, default=False, nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    date_lecture = Column(DateTime(timezone=True), nullable=True)

    def envoyer(self) -> "Message":
        """Retourne le message apres initialisation metier."""
        # Point d'extension pour une future logique d'envoi ou notification.
        return self

    def marquerCommeLu(self) -> None:
        """Marque le message comme lu et renseigne la date de lecture."""
        self.est_lu = True
        try:
            self.date_lecture = datetime.utcnow()
        except Exception:
            # Best-effort : la lecture ne doit pas echouer pour un probleme de date.
            self.date_lecture = None
