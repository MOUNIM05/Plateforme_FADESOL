"""Logique metier du service utilisateur.

Ce module gere les profils utilisateurs et synchronise les comptes auth.
"""

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
    """Hash le mot de passe recu a la creation utilisateur."""
    # Hash local utilise pour ne jamais stocker le mot de passe en clair dans user_service.
    return pwd_context.hash(password)


def get_user_by_email(db: Session, email: str) -> User | None:
    """Retourne un utilisateur par email."""
    # Recherche par email pour garantir l'unicite avant creation ou modification.
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Retourne un utilisateur par identifiant interne."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_uuid(db: Session, user_uuid: str) -> User | None:
    """Retourne un utilisateur par UUID public."""
    return db.query(User).filter(User.uuid == user_uuid).first()


def list_users(db: Session, skip: int = 0, limit: int = 100, service_id: str | None = None) -> list[User]:
    """Liste les utilisateurs, avec filtre facultatif par service."""
    # Construit la requete de liste avec pagination et filtre facultatif par service.
    query = db.query(User)

    if service_id:
        query = query.filter(User.service_id == service_id)

    return query.offset(skip).limit(limit).all()


def create_auth_account(user: User, password: str) -> None:
    """Demande a auth_service de creer le compte de connexion."""
    # Apres creation du profil, user_service demande a auth_service de creer le compte de connexion.
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


def sync_auth_account(user: User) -> None:
    """Synchronise email, role et etat actif dans auth_service."""
    # Synchronise les champs qui influencent l'authentification : email, role et etat actif.
    target_url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/auth/sync/users/{user.id}"
    body = json.dumps(
        {
            "email": user.email,
            "role": user.role,
            "is_enabled": user.is_active,
        }
    ).encode("utf-8")
    request = UrlRequest(
        target_url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Internal-Service-Secret": settings.INTERNAL_SERVICE_SECRET,
        },
        method="PUT",
    )

    try:
        with urlopen(request, timeout=10) as response:
            response.read()
    except HTTPError as exc:
        detail = "Impossible de synchroniser le compte d'authentification."
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            detail = payload.get("detail", detail)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Auth service indisponible pour synchroniser le compte utilisateur.",
        ) from exc


def delete_auth_account(user_id: int) -> None:
    """Demande a auth_service de supprimer le compte associe."""
    # Supprime le compte auth correspondant pour eviter un login orphelin.
    target_url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/auth/sync/users/{user_id}"
    request = UrlRequest(
        target_url,
        headers={"X-Internal-Service-Secret": settings.INTERNAL_SERVICE_SECRET},
        method="DELETE",
    )

    try:
        with urlopen(request, timeout=10) as response:
            response.read()
    except HTTPError as exc:
        detail = "Impossible de supprimer le compte d'authentification."
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            detail = payload.get("detail", detail)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Auth service indisponible pour supprimer le compte utilisateur.",
        ) from exc


def create_user(db: Session, payload: UserCreate) -> User:
    """Cree le profil utilisateur et le compte auth correspondant."""
    # L'email est unique dans user_service et auth_service.
    if get_user_by_email(db, payload.email):
        raise bad_request("Un utilisateur avec cet email existe deja.")

    # Le profil conserve les informations metier; le mot de passe sert ensuite a creer le compte auth.
    user = User(
        first_name=payload.prenom,
        last_name=payload.nom,
        prenom=payload.prenom,
        nom=payload.nom,
        email=payload.email,
        mot_de_passe_hash=hash_password(payload.password),
        role=payload.role.value,
        service_id=payload.id_service,
        service=payload.service.value if payload.service else None,
        is_active=payload.est_actif,
        est_actif=payload.est_actif,
    )

    try:
        # flush donne un id a l'utilisateur avant l'appel a auth_service, sans valider definitivement la transaction.
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
    """Met a jour un profil utilisateur et synchronise auth_service."""
    # Recupere le profil puis applique uniquement les champs envoyes par le client.
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    if payload.email and payload.email != user.email and get_user_by_email(db, payload.email):
        raise bad_request("Un utilisateur avec cet email existe deja.")

    update_data = payload.model_dump(exclude_unset=True)

    # Mapping entre les noms exposes en francais et les colonnes techniques deja presentes.
    field_map = {
        "prenom": "first_name",
        "nom": "last_name",
        "id_service": "service_id",
        "est_actif": "is_active",
    }

    for field, value in update_data.items():
        if field in {"role", "service"} and value is not None:
            value = value.value

        setattr(user, field_map.get(field, field), value)

        if field == "prenom":
            user.prenom = value
        elif field == "nom":
            user.nom = value
        elif field == "est_actif":
            user.est_actif = value

    if payload.service is not None and payload.id_service is None:
        user.service_id = payload.service.value

    try:
        # La synchronisation auth est faite avant commit pour pouvoir rollback en cas d'echec.
        db.flush()
        sync_auth_account(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user


def delete_user(db: Session, user_id: int) -> None:
    """Supprime un utilisateur et son compte d'authentification."""
    # Supprime le profil et le compte auth associe dans une meme transaction logique.
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    try:
        auth_user_id = user.id
        db.delete(user)
        db.flush()
        delete_auth_account(auth_user_id)
        db.commit()
    except Exception:
        db.rollback()
        raise


def set_user_active_state(db: Session, user_id: int, is_active: bool) -> User:
    """Active ou desactive un utilisateur."""
    # Active/desactive le profil utilisateur; les deux champs restent alignes.
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    user.is_active = is_active
    user.est_actif = is_active
    db.commit()
    db.refresh(user)

    return user


def update_user_photo(db: Session, user_id: int, photo_url: str) -> User:
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    user.photo_url = photo_url
    db.commit()
    db.refresh(user)

    return user
