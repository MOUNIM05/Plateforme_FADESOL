from uuid import uuid4

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
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
        return self

    def marquerCommeLu(self) -> None:
        self.est_lu = True
        try:
            self.date_lecture = datetime.utcnow()
        except Exception:
            # best-effort, don't break on datetime issues
            self.date_lecture = None
