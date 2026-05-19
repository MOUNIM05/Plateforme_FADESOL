from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.schemas.auth_schema import AuthAccountResponse, LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import get_account_by_id, login, register_account


router = APIRouter(prefix="/auth", tags=["Auth"])
bearer_scheme = HTTPBearer(auto_error=True)


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


@router.post("/login", response_model=TokenResponse)
def login_route(payload: LoginRequest, db: Session = Depends(get_db)):
    return login(db, payload)


@router.get("/me", response_model=AuthAccountResponse)
def me(account=Depends(get_current_account)):
    return account
