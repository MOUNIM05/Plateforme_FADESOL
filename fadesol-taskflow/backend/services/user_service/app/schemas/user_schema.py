from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from shared.enums import FadesolService, UserRole


class UserBase(BaseModel):
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


class UserCreate(UserBase):
    # Le mot de passe est requis a la creation, puis envoye a auth_service pour le compte de connexion.
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
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
    # Reponse API envoyee au frontend : elle contient l'identite metier, mais jamais le mot de passe ni son hash.
    id: int
    uuid: str
    date_creation: datetime
