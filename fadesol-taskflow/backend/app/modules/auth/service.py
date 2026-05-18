from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.users.crud import get_user_by_email
from app.schemas.auth_schema import LoginRequest
from app.security import create_access_token, verify_password


def login_service(db: Session, login_data: LoginRequest):
    user = get_user_by_email(db, login_data.email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte utilisateur désactivé.",
        )

    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    token = create_access_token(subject=user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
    }