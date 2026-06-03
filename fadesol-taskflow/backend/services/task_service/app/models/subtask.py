from datetime import date
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, String, Text
from sqlalchemy.orm import synonym
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutTache


class SubTask(Base):
    # Une sous-tache depend logiquement d'une tache principale via task_id/tache_id.
    # Elle a son propre cycle de statut, priorite et affectation.
    __tablename__ = "sous_taches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    # Reference logique vers la tache parente, stockee en UUID.
    task_id = Column("tache_id", String(36), nullable=False, index=True)
    title = Column("titre", String(200), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to = Column("assignee_a", String(36), nullable=True, index=True)
    service_id = Column(String(36), nullable=True, index=True)
    status = Column("statut", String(40), default=StatutTache.NOUVEAU.value, nullable=False)
    priority = Column("priorite", String(40), nullable=False)
    due_date = Column("date_limite", Date, nullable=True)
    created_at = Column("date_creation", DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        "date_modification",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Alias de compatibilite entre les noms francais historiques et les noms techniques anglais.
    tache_id = synonym("task_id")
    titre = synonym("title")
    assignee_a = synonym("assigned_to")
    statut = synonym("status")
    priorite = synonym("priority")
    date_limite = synonym("due_date")
    date_creation = synonym("created_at")
    date_modification = synonym("updated_at")

    def assigner(self, utilisateurId: str) -> None:
        # Affecte la sous-tache a un utilisateur via son UUID.
        self.assigned_to = utilisateurId

    def changerStatut(self, statut: StatutTache) -> None:
        # Applique un nouveau statut en acceptant un enum ou une valeur brute.
        self.status = statut.value if hasattr(statut, "value") else str(statut)

    def estTerminee(self) -> bool:
        # Verifie si la sous-tache est terminee.
        return self.status == StatutTache.TERMINE.value

    def estEnRetard(self) -> bool:
        # Une sous-tache en retard a une date limite passee et n'est pas terminee.
        if not self.due_date:
            return False
        return self.due_date < date.today() and not self.estTerminee()


SousTache = SubTask
