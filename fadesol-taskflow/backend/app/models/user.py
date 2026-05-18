from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    """
    Modèle SQLAlchemy représentant la table users.

    Ce modèle décrit la structure de la table users dans PostgreSQL.
    Il ne doit contenir que la définition des colonnes de la table.

    Important :
    Le modèle ne doit pas importer crud.py, routes.py ou service.py.
    Sinon, on risque un problème de circular import.
    """

    # Nom réel de la table dans PostgreSQL
    __tablename__ = "users"

    # Identifiant unique de l'utilisateur
    id = Column(Integer, primary_key=True, index=True)

    # Prénom de l'utilisateur
    first_name = Column(String(100), nullable=False)

    # Nom de l'utilisateur
    last_name = Column(String(100), nullable=False)

    # Email unique utilisé pour la connexion
    email = Column(String(255), unique=True, index=True, nullable=False)

    # Mot de passe hashé, jamais le mot de passe en clair
    password_hash = Column(String(255), nullable=False)

    # Rôle applicatif : Administrateur, Manager ou Employé
    role = Column(String(50), nullable=False)

    # Identifiant du service interne Fadesol
    # On ne met pas encore ForeignKey car la table services sera créée plus tard
    service_id = Column(Integer, nullable=True)

    # Permet de désactiver un compte sans supprimer ses données
    is_active = Column(Boolean, default=True, nullable=False)

    # Date de création automatique de l'utilisateur
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)