from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.modules.users.models import User
from app.modules.users.crud import get_user_by_id
from app.shared.constants import UserRole


DbSession = Annotated[Session, Depends(get_db)]

# HTTPBearer lit le header Authorization: Bearer <token>.
# auto_error=True force FastAPI à retourner 403 si le header est absent.
bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Récupère l'utilisateur connecté à partir du token JWT.

    Étapes :
    1. Lire le token depuis le header Authorization.
    2. Décoder le token JWT.
    3. Récupérer l'ID utilisateur depuis le champ "sub".
    4. Charger l'utilisateur depuis PostgreSQL.
    5. Vérifier que l'utilisateur existe et qu'il est actif.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré.",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide : utilisateur manquant.",
        )

    try:
        user_id = int(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide : identifiant utilisateur incorrect.",
        )

    current_user = get_user_by_id(db, user_id)

    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable.",
        )

    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte utilisateur désactivé.",
        )

    return current_user


def require_roles(*allowed_roles: UserRole):
    """
    Crée une dépendance FastAPI pour protéger une route par rôle.

    Exemple :
    Depends(require_roles(UserRole.ADMIN))
    autorise uniquement les administrateurs.
    """

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        allowed_values = [role.value for role in allowed_roles]

        if current_user.role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé : rôle insuffisant.",
            )

        return current_user

    return role_checker
