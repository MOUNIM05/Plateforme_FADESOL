from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from shared.enums import UserRole


bearer_scheme = HTTPBearer(auto_error=True)


def get_current_claims(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    # Decode le JWT envoye par le frontend pour connaitre l'utilisateur et son role.
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide.",
        ) from exc

    if not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide.",
        )

    return payload


def require_admin(claims: dict = Depends(get_current_claims)) -> dict:
    # Les operations sensibles comme creer ou supprimer un utilisateur sont reservees a l'Admin.
    if claims.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces reserve aux administrateurs.",
        )

    return claims


def require_roles(allowed_roles: list[str]):
    # Fabrique une dependency FastAPI reutilisable pour proteger les routes selon plusieurs roles.
    def role_checker(claims: dict = Depends(get_current_claims)) -> dict:
        if claims.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acces refuse pour ce role.",
            )

        return claims

    return role_checker


require_admin_or_manager = require_roles([UserRole.ADMIN.value, UserRole.MANAGER.value])
