"""Schemas Pydantic pour la gestion des permissions."""

from pydantic import BaseModel


class PermissionItem(BaseModel):
    key: str
    label: str


class PermissionGroup(BaseModel):
    module: str
    permissions: list[PermissionItem]


class UserPermissionsResponse(BaseModel):
    user_id: int
    permissions: dict[str, bool]


class UserPermissionsUpdate(BaseModel):
    permissions: dict[str, bool]
