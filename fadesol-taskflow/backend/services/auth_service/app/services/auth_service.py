from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.auth_account import AuthAccount
from app.schemas.auth_schema import AuthAccountSyncRequest, LoginRequest, RegisterRequest
from shared.exceptions import bad_request, forbidden, unauthorized


def get_account_by_email(db: Session, email: str) -> AuthAccount | None:
    return db.query(AuthAccount).filter(AuthAccount.email == email).first()


def get_account_by_id(db: Session, account_id: int) -> AuthAccount | None:
    return db.query(AuthAccount).filter(AuthAccount.id == account_id).first()


def get_account_by_user_id(db: Session, user_id: int) -> AuthAccount | None:
    return db.query(AuthAccount).filter(AuthAccount.user_id == user_id).first()


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


def sync_account_by_user_id(db: Session, user_id: int, payload: AuthAccountSyncRequest) -> AuthAccount:
    account = get_account_by_user_id(db, user_id)

    if not account:
        raise bad_request("Compte d'authentification introuvable pour cet utilisateur.")

    if payload.email and payload.email != account.email:
        existing = get_account_by_email(db, payload.email)
        if existing and existing.id != account.id:
            raise bad_request("Un compte avec cet email existe deja.")
        account.email = payload.email

    if payload.role is not None:
        account.role = payload.role.value

    if payload.is_enabled is not None:
        account.is_enabled = payload.is_enabled

    if payload.password:
        account.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(account)
    return account


def delete_account_by_user_id(db: Session, user_id: int) -> None:
    account = get_account_by_user_id(db, user_id)

    if not account:
        return

    db.delete(account)
    db.commit()


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
