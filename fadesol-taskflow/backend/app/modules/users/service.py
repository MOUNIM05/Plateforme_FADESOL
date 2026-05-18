from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.users import crud
from app.modules.users.schemas import UserCreate, UserUpdate


def create_user_service(db: Session, user_data: UserCreate):
    existing_user = crud.get_user_by_email(db, user_data.email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un utilisateur avec cet email existe déjà.",
        )

    return crud.create_user(db, user_data)


def get_users_service(db: Session, skip: int = 0, limit: int = 100):
    return crud.get_users(db, skip, limit)


def get_user_service(db: Session, user_id: int):
    user = crud.get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    return user


def update_user_service(db: Session, user_id: int, user_data: UserUpdate):
    user = crud.get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    if user_data.email and user_data.email != user.email:
        existing_user = crud.get_user_by_email(db, user_data.email)

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un utilisateur avec cet email existe déjà.",
            )

    return crud.update_user(db, user, user_data)


def delete_user_service(db: Session, user_id: int):
    user = crud.get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )

    crud.delete_user(db, user)

    return {"message": "Utilisateur supprimé avec succès."}
