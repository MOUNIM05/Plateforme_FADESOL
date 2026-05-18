from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True
