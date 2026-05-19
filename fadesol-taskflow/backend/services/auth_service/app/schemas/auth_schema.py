from datetime import datetime

from pydantic import BaseModel, Field

from shared.enums import UserRole


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    role: UserRole = UserRole.EMPLOYEE
    user_id: int | None = None
    is_enabled: bool = True


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthAccountResponse(BaseModel):
    id: int
    user_id: int | None
    email: str
    role: UserRole
    last_login_at: datetime | None
    is_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True
