from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    name = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    manager_id = Column(String(36), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def ajouterMembre(self, utilisateurId: str) -> str:
        return utilisateurId

    def changerManager(self, managerId: str) -> None:
        self.manager_id = managerId

    def calculerStatistiques(self) -> dict:
        return {"service_id": self.id, "service_name": self.name}
