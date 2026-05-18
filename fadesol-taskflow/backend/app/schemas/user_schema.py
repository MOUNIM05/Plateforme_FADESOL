from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.utils.constants import UserRole


class UserBase(BaseModel):
    """
    Schéma de base d'un utilisateur.

    Il contient les champs communs utilisés
    dans la création, la modification et l'affichage.
    """

    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole
    service_id: int | None = None
    is_active: bool = True


class UserCreate(UserBase):
    """
    Schéma utilisé lors de la création d'un utilisateur.

    On ajoute password ici car il est nécessaire
    uniquement pendant la création.
    Le mot de passe sera ensuite hashé avant stockage.
    """

    password: str


class UserUpdate(BaseModel):
    """
    Schéma utilisé pour modifier un utilisateur.

    Tous les champs sont optionnels car on peut modifier
    seulement une partie des informations.
    """

    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    role: UserRole | None = None
    service_id: int | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    """
    Schéma utilisé pour retourner un utilisateur au frontend.

    Important :
    On ne retourne jamais le password_hash au frontend.
    """

    id: int
    created_at: datetime

    class Config:
        # Permet à Pydantic de convertir un objet SQLAlchemy en réponse JSON
        from_attributes = True