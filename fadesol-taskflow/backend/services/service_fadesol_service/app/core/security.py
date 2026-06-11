import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from shared.enums import UserRole


bearer_scheme = HTTPBearer(auto_error=True)


def get_current_claims(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
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
    if claims.get("role") != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces reserve aux administrateurs.",
        )

    return claims


def require_roles(allowed_roles: list[str]):
    def role_checker(claims: dict = Depends(get_current_claims)) -> dict:
        if claims.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acces refuse pour ce role.",
            )

        return claims

    return role_checker


require_admin_or_manager = require_roles([UserRole.ADMIN.value, UserRole.MANAGER.value])


def user_has_permission(authorization: str, permission_key: str) -> bool:
    target_url = f"{settings.USER_SERVICE_URL.rstrip('/')}/api/users/me/permissions"
    request = UrlRequest(target_url, headers={"Authorization": authorization}, method="GET")

    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError, UnicodeDecodeError):
        return False

    return bool(payload.get("permissions", {}).get(permission_key))


def require_permission(permission_key: str, allowed_roles: list[str] | None = None):
    def permission_checker(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
        claims: dict = Depends(get_current_claims),
    ) -> dict:
        if claims.get("role") == UserRole.ADMIN.value:
            return claims

        if allowed_roles and claims.get("role") in allowed_roles:
            return claims

        authorization = f"Bearer {credentials.credentials}"

        if user_has_permission(authorization, permission_key):
            return claims

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission insuffisante.",
        )

    return permission_checker
