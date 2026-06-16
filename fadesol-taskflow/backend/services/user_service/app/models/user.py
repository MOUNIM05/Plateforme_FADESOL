"""Modele ORM du profil utilisateur.

Le compte de connexion est gere par auth_service; ce modele garde les donnees metier.
"""

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.db.database import Base


class User(Base):
    """Profil utilisateur stocke dans user_service."""
    # Modele principal du service utilisateur.
    # Il represente le profil metier, tandis que le mot de passe et le JWT sont geres par auth_service.
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # uuid sert de reference stable entre microservices sans imposer de cle etrangere SQL.
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid4()), nullable=False)

    # Les champs anglais et francais coexistent pour compatibilite avec le frontend et les schemas PFE.
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    prenom = Column(String(100), nullable=True)
    nom = Column(String(100), nullable=True)

    # email identifie l'utilisateur et doit rester unique.
    email = Column(String(255), unique=True, index=True, nullable=False)

    # Ce hash ne doit jamais etre expose dans les reponses API.
    mot_de_passe_hash = Column(String(255), nullable=True)

    # role porte les droits fonctionnels : Admin, Manager ou Employee.
    role = Column(String(50), nullable=False)

    # service_id/reference service permet de filtrer les utilisateurs sans joindre une autre base.
    service_id = Column(String(36), nullable=True, index=True)
    service = Column(String(80), nullable=True)
    photo_url = Column(String(500), nullable=True)

    # Deux noms d'etat actif sont conserves pour rester compatibles avec l'ancien et le nouveau vocabulaire.
    is_active = Column(Boolean, default=True, nullable=False)
    est_actif = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def seConnecter(self) -> bool:
        """Indique si le profil utilisateur est actif."""
        # Un utilisateur ne peut se connecter que si les deux indicateurs d'activite sont vrais.
        return bool(self.is_active and self.est_actif)

    def modifierProfil(self, **updates) -> None:
        """Applique des modifications de profil champ par champ."""
        # Methode utilitaire pour appliquer des changements sans exposer directement la logique de mapping.
        for field, value in updates.items():
            if hasattr(self, field):
                setattr(self, field, value)

    def desactiverCompte(self) -> None:
        """Desactive le compte sans supprimer l'enregistrement."""
        # Desactive le profil utilisateur tout en gardant l'enregistrement en base.
        self.is_active = False
        self.est_actif = False
