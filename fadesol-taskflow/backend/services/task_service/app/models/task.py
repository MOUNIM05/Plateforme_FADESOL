from datetime import date
from uuid import uuid4

from sqlalchemy import Boolean, Column, Date, DateTime, String, Text
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutTache


class Tache(Base):
    __tablename__ = "taches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    titre = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    projet_id = Column(String(36), nullable=False, index=True)
    assignee_a = Column(String(36), nullable=True, index=True)
    service_id = Column(String(36), nullable=False, index=True)
    statut = Column(String(40), default=StatutTache.NOUVEAU.value, nullable=False)
    priorite = Column(String(40), nullable=False)
    date_limite = Column(Date, nullable=True)
    est_synchronisee_clickup = Column(Boolean, default=False, nullable=False)
    clickup_task_id = Column(String(120), nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    date_modification = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def assigner(self, utilisateurId: str) -> None:
        self.assignee_a = utilisateurId

    def changerStatut(self, statut: StatutTache) -> None:
        self.statut = statut.value if hasattr(statut, "value") else str(statut)

    def estEnRetard(self) -> bool:
        if not self.date_limite:
            return False
        return self.date_limite < date.today() and self.statut != StatutTache.TERMINE.value

    def synchroniserAvecClickUp(self, clickup_task_id: str | None = None) -> None:
        self.est_synchronisee_clickup = True
        if clickup_task_id:
            self.clickup_task_id = clickup_task_id
