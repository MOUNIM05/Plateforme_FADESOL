import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.schemas.user_schema import UserCreate, UserUpdate
from shared.exceptions import bad_request, not_found


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def list_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return db.query(User).offset(skip).limit(limit).all()


def create_auth_account(user: User, password: str) -> None:
    target_url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/auth/register"
    body = json.dumps(
        {
            "user_id": user.id,
            "email": user.email,
            "password": password,
            "role": user.role,
            "is_enabled": user.is_active,
        }
    ).encode("utf-8")
    request = UrlRequest(
        target_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=10) as response:
            response.read()
    except HTTPError as exc:
        detail = "Impossible de creer le compte d'authentification."
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            detail = payload.get("detail", detail)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Auth service indisponible pour creer le compte utilisateur.",
        ) from exc


def create_user(db: Session, payload: UserCreate) -> User:
    if get_user_by_email(db, payload.email):
        raise bad_request("Un utilisateur avec cet email existe deja.")

    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        prenom=payload.prenom or payload.first_name,
        nom=payload.nom or payload.last_name,
        email=payload.email,
        mot_de_passe_hash=hash_password(payload.password),
        role=payload.role.value,
        service_id=payload.service_id,
        service=payload.service.value if payload.service else None,
        is_active=payload.is_active,
        est_actif=payload.est_actif if payload.est_actif is not None else payload.is_active,
    )

    try:
        db.add(user)
        db.flush()
        create_auth_account(user, payload.password)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user


def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    if payload.email and payload.email != user.email and get_user_by_email(db, payload.email):
        raise bad_request("Un utilisateur avec cet email existe deja.")

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field in {"role", "service"} and value is not None:
            value = value.value

        setattr(user, field, value)

    if payload.first_name is not None and payload.prenom is None:
        user.prenom = payload.first_name

    if payload.last_name is not None and payload.nom is None:
        user.nom = payload.last_name

    if payload.is_active is not None and payload.est_actif is None:
        user.est_actif = payload.is_active

    db.commit()
    db.refresh(user)

    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    db.delete(user)
    db.commit()


def set_user_active_state(db: Session, user_id: int, is_active: bool) -> User:
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    user.is_active = is_active
    user.est_actif = is_active
    db.commit()
    db.refresh(user)

    return user
