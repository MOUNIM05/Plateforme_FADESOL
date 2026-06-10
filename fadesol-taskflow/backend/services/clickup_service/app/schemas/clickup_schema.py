"""Schemas Pydantic des endpoints publics ClickUp."""

from pydantic import BaseModel


class ClickUpConnectionResponse(BaseModel):
    """Reponse courte du test de connexion ClickUp."""
    # status indique si la connexion est utilisable, message donne une explication lisible.
    status: str
    message: str


class ClickUpApiResponse(BaseModel):
    """Reponse generique utilisee pour certaines routes de diagnostic ClickUp."""
    # data peut contenir un objet ou une liste selon la reponse de ClickUp API.
    status: str
    message: str
    data: dict | list | None = None


class ClickUpSpaceResponse(BaseModel):
    """Representation simplifiee d'un espace ClickUp."""
    # On ne retourne que les champs utiles au frontend pour choisir un espace.
    id: str
    name: str


class ClickUpFolderResponse(BaseModel):
    """Representation simplifiee d'un folder ClickUp."""
    # space_id garde le lien avec l'espace parent sans exposer toute la reponse ClickUp brute.
    id: str
    name: str
    space_id: str | None = None


class ClickUpListResponse(BaseModel):
    """Representation simplifiee d'une liste ClickUp."""
    # folder_id et space_id permettent de savoir d'ou vient la liste.
    id: str
    name: str
    folder_id: str | None = None
    space_id: str | None = None


class ClickUpStructureResponse(BaseModel):
    """Structure complete simplifiee : espaces, folders et listes."""
    # spaces contient une arborescence deja preparee pour le frontend.
    spaces: list[dict]


class ClickUpSyncTaskResponse(BaseModel):
    """Reponse retournee apres synchronisation d'une tache interne vers ClickUp."""
    # clickup_task_id est l'id distant cree ou deja connu.
    status: str
    message: str
    task_id: str
    clickup_task_id: str | None = None
