from datetime import date, datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from shared.enums import Priorite, StatutTache


class SubTaskBase(BaseModel):
    # Champs communs d'une sous-tache.
    # Une sous-tache est rattachee a une tache principale via task_id/tache_id.
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    task_id: str = Field(validation_alias=AliasChoices("task_id", "tache_id"))
    title: str = Field(validation_alias=AliasChoices("title", "titre"))
    description: str | None = None
    assigned_to: str | None = Field(default=None, validation_alias=AliasChoices("assigned_to", "assignee_a"))
    service_id: str | None = None
    status: StatutTache = Field(default=StatutTache.NOUVEAU, validation_alias=AliasChoices("status", "statut"))
    priority: Priorite = Field(default=Priorite.NORMALE, validation_alias=AliasChoices("priority", "priorite"))
    due_date: date | None = Field(default=None, validation_alias=AliasChoices("due_date", "date_limite"))


class SubTaskCreate(SubTaskBase):
    # Creation d'une sous-tache avec les champs de base.
    pass


class SubTaskUpdate(BaseModel):
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


class SubTaskResponse(SubTaskBase):
    # Reponse API exposee au frontend pour afficher une sous-tache.
    id: str
    created_at: datetime
    updated_at: datetime | None = None


# Alias francais conserves pour les routes et services existants.
SousTacheCreate = SubTaskCreate
SousTacheUpdate = SubTaskUpdate
SousTacheResponse = SubTaskResponse
