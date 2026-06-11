"""Point d'entree FastAPI du microservice auth_service.

Ce fichier cree l'application, branche les routes et initialise les tables
necessaires au stockage des comptes d'authentification.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.auth_routes import router as auth_router


# Application FastAPI dediee a l'authentification.
# Ce service gere les comptes de connexion, les mots de passe hashes et les tokens JWT.
app = FastAPI(title="Fadesol Auth Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Les routes sont regroupees sous /api pour garder une convention commune entre microservices.
app.include_router(auth_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Initialise la base locale du service auth au demarrage."""
    # Au demarrage, SQLAlchemy cree les tables manquantes de ce microservice uniquement.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    """Retourne un indicateur simple pour verifier que le service est disponible."""
    # Endpoint simple utilise par Docker, le gateway ou un outil de monitoring pour verifier le service.
    return {"status": "ok", "service": "auth_service"}
