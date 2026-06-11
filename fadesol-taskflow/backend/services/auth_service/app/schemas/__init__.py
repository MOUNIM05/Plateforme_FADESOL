from app.schemas.auth_schema import (
    AuthAccountResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)

__all__ = [
    "AuthAccountResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
]
"""Schemas Pydantic du service auth.

Les schemas decrivent les donnees recues et renvoyees par l'API.
"""
