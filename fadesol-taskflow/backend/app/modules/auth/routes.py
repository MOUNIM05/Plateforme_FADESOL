from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.modules.auth import service
from app.models.user import User
from app.schemas.auth_schema import CurrentUserResponse, LoginRequest, TokenResponse


# Router خاص بالمصادقة Auth.
# prefix="/auth" يعني routes هنا غادي تبدأ بـ /auth.
# main.py كيزيد /api، يعني login غادي يكون /api/auth/login.
router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Connexion utilisateur.

    Cette route vérifie l'email et le mot de passe.
    Si les informations sont correctes, elle retourne un token JWT.
    """
    return service.login_service(db, login_data)


@router.get("/me", response_model=CurrentUserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """
    Retourne les informations de l'utilisateur connecté.

    Cette route est protégée par JWT, mais elle est accessible
    à tous les rôles authentifiés : Administrateur, Manager et Employé.
    """
    return current_user
