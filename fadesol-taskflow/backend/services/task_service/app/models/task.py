"""Modele ORM des taches principales."""

from datetime import date
from uuid import uuid4

from sqlalchemy import Column, Date, DateTime, Float, String, Text
from sqlalchemy.orm import synonym
from sqlalchemy.sql import func

from app.db.database import Base
from shared.enums import StatutTache


class Task(Base):
    """Tache principale stockee dans la table taches."""
    # Modele ORM d'une tache principale.
    # La table physique s'appelle "taches" pour rester proche du vocabulaire PFE/metier.
    __tablename__ = "taches"

    # L'id est un UUID afin de referencer la tache depuis d'autres services sans dependance SQL directe.
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    title = Column("titre", String(200), nullable=False)
    description = Column(Text, nullable=True)

    # project_id, assigned_to et service_id sont des references logiques vers d'autres microservices.
    project_id = Column("projet_id", String(36), nullable=True, index=True)
    assigned_to = Column("assignee_a", String(36), nullable=True, index=True)
    service_id = Column(String(36), nullable=True, index=True)

    # Statut et priorite structurent le suivi operationnel de la tache.
    status = Column("statut", String(40), default=StatutTache.NOUVEAU.value, nullable=False)
    priority = Column("priorite", String(40), nullable=False)
    progression = Column(Float, default=0.0, nullable=False)
    due_date = Column("date_limite", Date, nullable=True)
    created_at = Column("date_creation", DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        "date_modification",
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Alias de compatibilite : le code peut utiliser les noms anglais ou francais sans dupliquer les colonnes.
    titre = synonym("title")
    projet_id = synonym("project_id")
    assignee_a = synonym("assigned_to")
    statut = synonym("status")
    priorite = synonym("priority")
    date_limite = synonym("due_date")
    date_creation = synonym("created_at")
    date_modification = synonym("updated_at")

    def assigner(self, utilisateurId: str) -> None:
        """Affecte la tache a un utilisateur."""
        # Affecte la tache a l'UUID d'un utilisateur, sans relation directe vers user_service.
        self.assigned_to = utilisateurId

    def changerStatut(self, statut: StatutTache) -> None:
        """Change le statut de la tache."""
        # Centralise le changement de statut pour accepter un enum ou une valeur simple.
        self.status = statut.value if hasattr(statut, "value") else str(statut)

    def estEnRetard(self) -> bool:
        """Verifie si la tache est en retard."""
        # Une tache est en retard si sa date limite est passee et qu'elle n'est pas terminee.
        if not self.due_date:
            return False
        return self.due_date < date.today() and self.status != StatutTache.TERMINE.value

Tache = Task

# Alias francais conserve pour le vocabulaire PFE.
