from fastapi import FastAPI

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.auth_routes import router as auth_router


# Application FastAPI dediee a l'authentification.
# Ce service gere les comptes de connexion, les mots de passe hashes et les tokens JWT.
app = FastAPI(title="Fadesol Auth Service")

# Les routes sont regroupees sous /api pour garder une convention commune entre microservices.
app.include_router(auth_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    # Au demarrage, SQLAlchemy cree les tables manquantes de ce microservice uniquement.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    # Endpoint simple utilise par Docker, le gateway ou un outil de monitoring pour verifier le service.
    return {"status": "ok", "service": "auth_service"}
