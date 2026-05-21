from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.core.config import settings
from app.db.database import get_db
from app.schemas.auth_schema import AuthAccountResponse, AuthAccountSyncRequest, LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import (
    delete_account_by_user_id,
    get_account_by_id,
    login,
    register_account,
    sync_account_by_user_id,
)


router = APIRouter(prefix="/auth", tags=["Auth"])
bearer_scheme = HTTPBearer(auto_error=True)


def require_internal_service(
    x_internal_service_secret: str | None = Header(default=None),
):
    if x_internal_service_secret != settings.INTERNAL_SERVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces interne refuse.",
        )


def get_current_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(credentials.credentials)

    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide.")

    account = get_account_by_id(db, int(payload["sub"]))

    if not account:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Compte introuvable.")

    if not account.is_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte desactive.")

    return account


@router.post("/register", response_model=AuthAccountResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    return register_account(db, payload)


@router.put(
    "/sync/users/{user_id}",
    response_model=AuthAccountResponse,
    dependencies=[Depends(require_internal_service)],
)
def sync_user_account(user_id: int, payload: AuthAccountSyncRequest, db: Session = Depends(get_db)):
    return sync_account_by_user_id(db, user_id, payload)


@router.delete("/sync/users/{user_id}", dependencies=[Depends(require_internal_service)])
def delete_user_account(user_id: int, db: Session = Depends(get_db)):
    delete_account_by_user_id(db, user_id)
    return {"message": "Compte d'authentification supprime avec succes."}


@router.post("/login", response_model=TokenResponse)
def login_route(payload: LoginRequest, db: Session = Depends(get_db)):
    return login(db, payload)


@router.get("/me", response_model=AuthAccountResponse)
def me(account=Depends(get_current_account)):
    return account
