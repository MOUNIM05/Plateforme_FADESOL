from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_claims, require_admin, require_admin_or_manager
from app.db.database import get_db
from app.schemas.user_schema import UserCreate, UserResponse, UserUpdate
from app.services.user_service import (
    create_user,
    delete_user,
    get_user_by_id,
    list_users,
    set_user_active_state,
    update_user,
)
from shared.exceptions import not_found
from shared.responses import MessageResponse


router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse, dependencies=[Depends(require_admin)])
def create(payload: UserCreate, db: Session = Depends(get_db)):
    # Creation d'un utilisateur reservee a l'Admin; le service cree aussi le compte auth associe.
    return create_user(db, payload)


@router.get("/", response_model=list[UserResponse], dependencies=[Depends(require_admin_or_manager)])
def list_all(
    skip: int = 0,
    limit: int = 100,
    id_service: str | None = None,
    service_id: str | None = None,
    db: Session = Depends(get_db),
):
    # Liste les utilisateurs avec pagination et filtre optionnel par service.
    # Admin et Manager peuvent consulter, mais les mots de passe ne sont jamais retournes.
    return list_users(db, skip, limit, id_service or service_id)


@router.get("/me/profile", response_model=UserResponse)
def get_my_profile(claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)):
    # Le profil courant est retrouve a partir du user_id transporte dans le JWT.
    user_id = claims.get("user_id")

    if not user_id:
        raise not_found("Profil utilisateur introuvable.")

    user = get_user_by_id(db, int(user_id))

    if not user:
        raise not_found("Profil utilisateur introuvable.")

    return user


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin_or_manager)])
def get_one(user_id: int, db: Session = Depends(get_db)):
    # Consultation d'un utilisateur precis, autorisee aux roles de supervision.
    user = get_user_by_id(db, user_id)

    if not user:
        raise not_found("Utilisateur introuvable.")

    return user


@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin)])
def update(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    # Modification du profil utilisateur; les changements sensibles sont synchronises avec auth_service.
    return update_user(db, user_id, payload)


@router.delete("/{user_id}", response_model=MessageResponse, dependencies=[Depends(require_admin)])
def delete(user_id: int, db: Session = Depends(get_db)):
    # Suppression admin : elle retire le profil puis le compte d'authentification associe.
    delete_user(db, user_id)
    return {"message": "Utilisateur supprime avec succes."}


@router.patch("/{user_id}/activate", response_model=UserResponse, dependencies=[Depends(require_admin)])
def activate(user_id: int, db: Session = Depends(get_db)):
    # Reactive un utilisateur dans le service utilisateur.
    return set_user_active_state(db, user_id, True)


@router.patch("/{user_id}/deactivate", response_model=UserResponse, dependencies=[Depends(require_admin)])
def deactivate(user_id: int, db: Session = Depends(get_db)):
    # Desactive le profil utilisateur sans supprimer son historique.
    return set_user_active_state(db, user_id, False)
