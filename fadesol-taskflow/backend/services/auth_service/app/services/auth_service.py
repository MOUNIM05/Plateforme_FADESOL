from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth_account import AuthAccount
from app.schemas.auth_schema import LoginRequest, RegisterRequest
from shared.exceptions import bad_request, forbidden, unauthorized


def get_account_by_email(db: Session, email: str) -> AuthAccount | None:
    return db.query(AuthAccount).filter(AuthAccount.email == email).first()


def get_account_by_id(db: Session, account_id: int) -> AuthAccount | None:
    return db.query(AuthAccount).filter(AuthAccount.id == account_id).first()


def register_account(db: Session, payload: RegisterRequest) -> AuthAccount:
    if get_account_by_email(db, payload.email):
        raise bad_request("Un compte avec cet email existe deja.")

    account = AuthAccount(
        user_id=payload.user_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
        is_enabled=payload.is_enabled,
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return account


def login(db: Session, payload: LoginRequest) -> dict:
    account = get_account_by_email(db, payload.email)

    if not account or not verify_password(payload.password, account.password_hash):
        raise unauthorized("Email ou mot de passe incorrect.")

    if not account.is_enabled:
        raise forbidden("Compte utilisateur desactive.")

    account.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(
        account.id,
        claims={"role": account.role, "user_id": account.user_id},
    )

    return {"access_token": token, "token_type": "bearer"}
