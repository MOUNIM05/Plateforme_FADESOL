from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid4()), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=True)
    nom = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mot_de_passe_hash = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False)
    service_id = Column(String(36), nullable=True, index=True)
    service = Column(String(80), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    est_actif = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def seConnecter(self) -> bool:
        return bool(self.is_active and self.est_actif)

    def modifierProfil(self, **updates) -> None:
        for field, value in updates.items():
            if hasattr(self, field):
                setattr(self, field, value)

    def desactiverCompte(self) -> None:
        self.is_active = False
        self.est_actif = False
