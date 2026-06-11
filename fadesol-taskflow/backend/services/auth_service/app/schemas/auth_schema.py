"""Schemas Pydantic du service d'authentification.

Ils separent clairement les donnees d'entree, de synchronisation et de sortie.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from shared.enums import UserRole


class RegisterRequest(BaseModel):
    """Payload utilise pour creer un compte auth."""
    # Donnees recues lors de la creation d'un compte de connexion.
    # Cette creation peut etre appelee par user_service apres creation du profil utilisateur.
    email: str
    password: str = Field(min_length=6)
    role: UserRole = UserRole.EMPLOYEE
    user_id: int | None = None
    is_enabled: bool = True


class AuthAccountSyncRequest(BaseModel):
    """Payload de synchronisation entre user_service et auth_service."""
    # Schema partiel utilise pour synchroniser email, role, etat ou mot de passe depuis user_service.
    email: str | None = None
    role: UserRole | None = None
    is_enabled: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class LoginRequest(BaseModel):
    """Payload de connexion envoye par le frontend."""
    # Identifiants fournis par l'utilisateur au moment de la connexion.
    email: str
    password: str


class TokenResponse(BaseModel):
    """Token JWT retourne apres authentification reussie."""
    # Reponse retournee au frontend apres une connexion reussie.
    access_token: str
    token_type: str = "bearer"


class AuthAccountResponse(BaseModel):
    """Representation publique d'un compte auth."""
    # Reponse publique du compte d'authentification : le hash du mot de passe est volontairement absent.
    id: int
    user_id: int | None
    email: str
    role: UserRole
    last_login_at: datetime | None
    is_enabled: bool
    created_at: datetime

    class Config:
        """Autorise la construction du schema a partir d'un objet SQLAlchemy."""
        from_attributes = True
