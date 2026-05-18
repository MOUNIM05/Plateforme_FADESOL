from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserUpdate


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user_data: UserCreate):
    new_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role.value,
        service_id=user_data.service_id,
        is_active=user_data.is_active,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def update_user(db: Session, user: User, user_data: UserUpdate):
    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == "role" and value is not None:
            value = value.value

        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


def delete_user(db: Session, user: User):
    db.delete(user)
    db.commit()
