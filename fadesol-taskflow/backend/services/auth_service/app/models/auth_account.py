"""Modele ORM du compte d'authentification.

Il stocke uniquement les informations necessaires a la connexion.
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.db.database import Base


class AuthAccount(Base):
    """Compte de connexion associe a un utilisateur metier."""
    # Table locale qui stocke uniquement les donnees necessaires a la connexion.
    # Les informations de profil restent dans user_service pour respecter la separation microservices.
    __tablename__ = "auth_accounts"

    id = Column(Integer, primary_key=True, index=True)
    # user_id fait le lien logique avec user_service sans relation SQL directe entre bases.
    user_id = Column(Integer, nullable=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    # On conserve le hash du mot de passe, jamais le mot de passe en clair.
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    # Permet de bloquer une connexion sans supprimer l'historique du compte.
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
