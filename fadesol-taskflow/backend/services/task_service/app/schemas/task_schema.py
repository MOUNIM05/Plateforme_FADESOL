"""Schemas Pydantic des taches principales."""

from datetime import date, datetime
from uuid import UUID

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator

from shared.enums import Priorite, StatutTache


class TaskBase(BaseModel):
    """Champs communs d'une tache principale."""
    # Champs communs d'une tache.
    # Les alias acceptent les noms anglais et francais pour garder la compatibilite des appels API.
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    title: str = Field(validation_alias=AliasChoices("title", "titre"))
    description: str | None = None
    project_id: str | None = Field(default=None, validation_alias=AliasChoices("project_id", "projet_id"))
    assigned_to: str | None = Field(default=None, validation_alias=AliasChoices("assigned_to", "assignee_a"))
    service_id: str | None = None
    status: StatutTache = Field(default=StatutTache.NOUVEAU, validation_alias=AliasChoices("status", "statut"))
    priority: Priorite = Field(default=Priorite.NORMALE, validation_alias=AliasChoices("priority", "priorite"))
    due_date: date | None = Field(default=None, validation_alias=AliasChoices("due_date", "date_limite"))


class TaskCreate(TaskBase):
    """Payload de creation d'une tache."""
    # Schema de creation : il reprend les champs metier obligatoires ou optionnels de TaskBase.
    pass


class TaskUpdate(BaseModel):
    """Payload de mise a jour partielle d'une tache."""
    # Schema de mise a jour partielle : seuls les champs envoyes seront modifies.
    model_config = ConfigDict(populate_by_name=True)

    title: str | None = Field(default=None, validation_alias=AliasChoices("title", "titre"))
    description: str | None = None
    project_id: str | None = Field(default=None, validation_alias=AliasChoices("project_id", "projet_id"))
    assigned_to: str | None = Field(default=None, validation_alias=AliasChoices("assigned_to", "assignee_a"))
    service_id: str | None = None
    status: StatutTache | None = Field(default=None, validation_alias=AliasChoices("status", "statut"))
    priority: Priorite | None = Field(default=None, validation_alias=AliasChoices("priority", "priorite"))
    due_date: date | None = Field(default=None, validation_alias=AliasChoices("due_date", "date_limite"))


class TaskAssign(BaseModel):
    """Payload d'affectation d'une tache a un utilisateur."""
    # Payload dedie a l'affectation d'une tache a un utilisateur.
    model_config = ConfigDict(populate_by_name=True)

    assigned_to: UUID = Field(validation_alias=AliasChoices("assigned_to", "assignee_a"))


class TaskStatusUpdate(BaseModel):
    """Payload de mise a jour du statut d'une tache."""
    # Payload dedie au changement de statut, separe pour simplifier l'endpoint PATCH /status.
    model_config = ConfigDict(populate_by_name=True)

    status: StatutTache = Field(validation_alias=AliasChoices("status", "statut"))

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value):
        """Normalise les libelles de statut avant validation."""
        # Accepte plusieurs libelles venant du frontend ou d'anciennes donnees avant validation enum.
        status_map = {
            "A faire": StatutTache.A_FAIRE.value,
            "À faire": StatutTache.A_FAIRE.value,
            "En cours": StatutTache.EN_COURS.value,
            "En attente": StatutTache.EN_ATTENTE.value,
            "Bloqué": StatutTache.BLOQUE.value,
            "Bloque": StatutTache.BLOQUE.value,
            "Validée": StatutTache.VALIDEE.value,
            "Validee": StatutTache.VALIDEE.value,
            "Terminé": StatutTache.TERMINE.value,
            "Termine": StatutTache.TERMINE.value,
            "Annulé": StatutTache.ANNULE.value,
            "Annule": StatutTache.ANNULE.value,
        }

        return status_map.get(value, value)


class TaskImportFromClickUp(TaskBase):
    """Payload d'import ou synchronisation depuis ClickUp."""
    # Schema utilise lorsqu'une tache vient de ClickUp au lieu d'etre creee localement.
    clickup_task_id: str
    source: str = "clickup"


class TaskResponse(TaskBase):
    """Representation API complete d'une tache."""
    # Reponse API complete incluant les metadonnees et les champs de synchronisation ClickUp.
    id: str
    created_at: datetime
    updated_at: datetime | None = None
    clickup_task_id: str | None = None
    source: str = "local"
    est_synchronisee_clickup: bool = False
    date_synchronisation: datetime | None = None


class TaskProgressResponse(BaseModel):
    """Representation API de la progression calculee d'une tache."""
    # Reponse dediee au suivi d'avancement calcule a partir des sous-taches.
    task_id: str
    total_subtasks: int
    completed_subtasks: int
    progression: int


# Alias francais conserves pour compatibilite avec le vocabulaire Tache.
TacheCreate = TaskCreate
TacheUpdate = TaskUpdate
TacheResponse = TaskResponse
TacheAssign = TaskAssign
TacheStatusUpdate = TaskStatusUpdate
TacheProgressResponse = TaskProgressResponse
