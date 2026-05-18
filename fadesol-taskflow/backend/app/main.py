from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import User
from app.modules.auth.routes import router as auth_router
from app.modules.users.routes import router as users_router


# Création automatique des tables SQLAlchemy si elles n'existent pas encore.
# Pour le MVP, on utilise create_all afin de générer rapidement les tables.
Base.metadata.create_all(bind=engine)


# Création de l'application FastAPI principale.
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Backend API for Fadesol TaskFlow.",
)


# Configuration CORS pour permettre au frontend React
# de communiquer avec le backend FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """
    Endpoint simple pour vérifier que le backend fonctionne.
    """
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
    }


# Enregistrement des routes Users.
# Les endpoints seront accessibles avec le préfixe /api.
# Exemple : POST /api/users/
app.include_router(users_router, prefix=settings.API_PREFIX)


# Enregistrement des routes Auth.
# Exemple : POST /api/auth/login
app.include_router(auth_router, prefix=settings.API_PREFIX)
