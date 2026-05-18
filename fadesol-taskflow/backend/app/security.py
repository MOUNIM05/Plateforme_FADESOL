from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings


# Configuration du système de hashage des mots de passe.
# bcrypt permet de transformer le mot de passe en clair en valeur hashée sécurisée.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash le mot de passe avant de l'enregistrer dans la base de données.

    Exemple :
    password = "123456"
    password_hash = "$2b$12$..."
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie si le mot de passe saisi correspond au mot de passe hashé.

    plain_password : mot de passe saisi par l'utilisateur.
    hashed_password : mot de passe stocké dans PostgreSQL.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """
    Génère un token JWT après une connexion réussie.

    subject représente généralement l'ID de l'utilisateur connecté.
    Le token contient aussi une date d'expiration.
    """

    # Définir la date d'expiration du token
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_EXPIRE_MINUTES
        )

    # Données stockées dans le token JWT
    payload = {
        "sub": str(subject),
        "exp": expire,
    }

    # Génération du token avec la clé secrète et l'algorithme configurés dans .env
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict | None:
    """
    Décode et vérifie un token JWT.

    Si le token est valide, la fonction retourne son contenu.
    Si le token est invalide ou expiré, elle retourne None.
    """
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None