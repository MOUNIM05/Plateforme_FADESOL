from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


# Contexte Passlib charge de produire et verifier des hashes bcrypt.
# Le mot de passe brut n'est donc jamais stocke dans la base.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    # Transforme un mot de passe en hash non reversible avant enregistrement.
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Compare le mot de passe saisi avec le hash stocke sans exposer le mot de passe.
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str | Any, claims: dict[str, Any] | None = None) -> str:
    # Le token contient le sujet (sub), une expiration, puis des claims utiles au frontend/gateway.
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(subject), "exp": expire}

    if claims:
        payload.update(claims)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict | None:
    # Decode et valide la signature JWT; None indique un token invalide ou expire.
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None
