from datetime import datetime

from pydantic import BaseModel, Field

from shared.enums import FadesolService, UserRole


class UserBase(BaseModel):
    first_name: str
    last_name: str
    prenom: str | None = None
    nom: str | None = None
    email: str
    role: UserRole
    service_id: str | None = None
    service: FadesolService | None = None
    is_active: bool = True
    est_actif: bool | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    prenom: str | None = None
    nom: str | None = None
    email: str | None = None
    role: UserRole | None = None
    service_id: str | None = None
    service: FadesolService | None = None
    is_active: bool | None = None
    est_actif: bool | None = None


class UserResponse(UserBase):
    id: int
    uuid: str
    created_at: datetime
    date_creation: datetime

    class Config:
        from_attributes = True
