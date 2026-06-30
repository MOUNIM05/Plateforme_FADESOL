"""Schemas Pydantic pour la gestion des permissions."""

from pydantic import BaseModel


class PermissionItem(BaseModel):
    """Permission elementaire affichee dans l'ecran d'administration."""
    key: str
    label: str


class PermissionGroup(BaseModel):
    """Groupe de permissions par module fonctionnel."""
    module: str
    permissions: list[PermissionItem]


class UserPermissionsResponse(BaseModel):
    """Permissions effectives renvoyees pour un utilisateur."""
    user_id: int
    permissions: dict[str, bool]


class UserPermissionsUpdate(BaseModel):
    """Payload de sauvegarde des surcharges de permissions."""
    permissions: dict[str, bool]
