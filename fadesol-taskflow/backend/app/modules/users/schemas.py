from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.shared.constants import UserRole


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole
    service_id: int | None = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    role: UserRole | None = None
    service_id: int | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
