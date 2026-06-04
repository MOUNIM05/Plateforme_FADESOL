"""Schemas Pydantic des sous-taches."""

from datetime import date, datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from shared.enums import Priorite, StatutTache


class SubTaskBase(BaseModel):
    """Champs communs des sous-taches."""
    # Champs communs d'une sous-tache.
    # Pour la route /tasks/{task_id}/subtasks, le task_id vient de l'URL et pas du body.
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    title: str = Field(validation_alias=AliasChoices("title", "titre"))
    description: str | None = None
    assigned_to: str | None = Field(default=None, validation_alias=AliasChoices("assigned_to", "assignee_a"))
    service_id: str | None = None
    status: StatutTache = Field(default=StatutTache.NOUVEAU, validation_alias=AliasChoices("status", "statut"))
    priority: Priorite = Field(default=Priorite.NORMALE, validation_alias=AliasChoices("priority", "priorite"))
    due_date: date | None = Field(default=None, validation_alias=AliasChoices("due_date", "date_limite"))


class SubTaskCreate(SubTaskBase):
    """Payload de creation d'une sous-tache via /tasks/{task_id}/subtasks."""
    # Creation d'une sous-tache avec les champs de base.
    pass


class SubTaskCreateLegacy(SubTaskBase):
    """Payload historique avec task_id dans le body."""
    # Schema historique pour /sous-taches : l'ancien endpoint recoit encore le task_id dans le body.
    task_id: str = Field(validation_alias=AliasChoices("task_id", "tache_id"))


class SubTaskUpdate(BaseModel):
    """Payload de mise a jour partielle d'une sous-tache."""
    # Mise a jour partielle : aucun champ n'est obligatoire.
    model_config = ConfigDict(populate_by_name=True)

    task_id: str | None = Field(default=None, validation_alias=AliasChoices("task_id", "tache_id"))
    title: str | None = Field(default=None, validation_alias=AliasChoices("title", "titre"))
    description: str | None = None
    assigned_to: str | None = Field(default=None, validation_alias=AliasChoices("assigned_to", "assignee_a"))
    service_id: str | None = None
    status: StatutTache | None = Field(default=None, validation_alias=AliasChoices("status", "statut"))
    priority: Priorite | None = Field(default=None, validation_alias=AliasChoices("priority", "priorite"))
    due_date: date | None = Field(default=None, validation_alias=AliasChoices("due_date", "date_limite"))


class SubTaskAssign(BaseModel):
    """Payload d'affectation d'une sous-tache a un service ou membre."""
    # Payload d'affectation : on peut affecter un service, un membre, ou les deux.
    # Les champs absents ne doivent pas ecraser les valeurs deja presentes.
    model_config = ConfigDict(populate_by_name=True)

    service_id: str | None = None
    assigned_to: str | None = Field(default=None, validation_alias=AliasChoices("assigned_to", "assignee_a"))


class SubTaskResponse(SubTaskBase):
    """Representation API d'une sous-tache."""
    # Reponse API exposee au frontend pour afficher une sous-tache.
    id: str
    task_id: str = Field(validation_alias=AliasChoices("task_id", "tache_id"))
    created_at: datetime
    updated_at: datetime | None = None


# Alias francais conserves pour les routes et services existants.
SousTacheCreate = SubTaskCreateLegacy
SousTacheUpdate = SubTaskUpdate
SousTacheAssign = SubTaskAssign
SousTacheResponse = SubTaskResponse
