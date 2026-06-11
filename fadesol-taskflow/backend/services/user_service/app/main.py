"""Point d'entree FastAPI du microservice user_service.

Ce service expose les routes de gestion des profils utilisateurs.
"""

from fastapi import FastAPI

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.user_routes import router as user_router


# Application FastAPI du microservice utilisateur.
# Ce service gere les profils metier : nom, prenom, role, service et etat actif.
app = FastAPI(title="Fadesol User Service")

# Les routes utilisateur sont exposees sous /api/users via le router.
app.include_router(user_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Initialise les tables du service utilisateur."""
    # Cree automatiquement les tables de user_service si elles n'existent pas encore.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    """Indique que user_service est disponible."""
    # Route de sante pour verifier que le microservice repond correctement.
    return {"status": "ok", "service": "user_service"}
