"""Schemas Pydantic du service utilisateur."""

from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from shared.enums import FadesolService, UserRole


class UserBase(BaseModel):
    """Champs communs pour creer, modifier et retourner un utilisateur."""
    # Schema commun aux entrees et sorties utilisateur.
    # AliasChoices accepte les noms francais et les noms techniques pour faciliter l'integration frontend/API.
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    prenom: str = Field(validation_alias=AliasChoices("prenom", "first_name"))
    nom: str = Field(validation_alias=AliasChoices("nom", "last_name"))
    email: str
    role: UserRole
    id_service: str | None = Field(default=None, validation_alias=AliasChoices("id_service", "service_id"))
    service: FadesolService | None = None
    est_actif: bool = Field(default=True, validation_alias=AliasChoices("est_actif", "is_active"))
    photo_url: str | None = None


class UserCreate(UserBase):
    """Payload de creation d'utilisateur."""
    # Le mot de passe est requis a la creation, puis envoye a auth_service pour le compte de connexion.
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    """Payload de mise a jour partielle d'un utilisateur."""
    # Tous les champs sont optionnels afin de permettre une mise a jour partielle du profil.
    model_config = ConfigDict(populate_by_name=True)

    prenom: str | None = Field(default=None, validation_alias=AliasChoices("prenom", "first_name"))
    nom: str | None = Field(default=None, validation_alias=AliasChoices("nom", "last_name"))
    email: str | None = None
    role: UserRole | None = None
    id_service: str | None = Field(default=None, validation_alias=AliasChoices("id_service", "service_id"))
    service: FadesolService | None = None
    est_actif: bool | None = Field(default=None, validation_alias=AliasChoices("est_actif", "is_active"))


class UserResponse(UserBase):
    """Representation API d'un utilisateur sans mot de passe."""
    # Reponse API envoyee au frontend : elle contient l'identite metier, mais jamais le mot de passe ni son hash.
    id: int
    uuid: str
    date_creation: datetime
    created_at: datetime | None = None
    updated_at: datetime | None = None
