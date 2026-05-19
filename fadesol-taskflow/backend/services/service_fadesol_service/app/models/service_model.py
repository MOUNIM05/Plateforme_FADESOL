from uuid import uuid4

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base


class Service(Base):
    __tablename__ = "services_fadesol"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    nom = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    manager_id = Column(String(36), nullable=True, index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def ajouterMembre(self, utilisateurId: str) -> str:
        return utilisateurId

    def changerManager(self, managerId: str) -> None:
        self.manager_id = managerId

    def calculerStatistiques(self) -> dict:
        return {"service_id": self.id, "nom": self.nom}
