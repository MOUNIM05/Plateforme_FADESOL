"""Point d'entree FastAPI du microservice ClickUp.

Ce service centralise l'integration avec ClickUp API afin que le frontend
et les autres services ne manipulent jamais directement le token ClickUp.
"""

from fastapi import FastAPI

# Importe les modeles SQLAlchemy pour que Base.metadata connaisse les tables au demarrage.
from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.clickup_routes import placeholder_router as clickup_placeholder_router
from app.routes.clickup_routes import router as clickup_router


# Creation de l'application FastAPI propre au microservice ClickUp.
app = FastAPI(title="ClickUp Service - Fadesol TaskFlow")

# Les routes sans prefixe /api servent aux tests directs du service sur le port 8007.
app.include_router(clickup_placeholder_router)

# Les routes avec prefixe /api sont celles que l'API Gateway cible dans Docker.
app.include_router(clickup_placeholder_router, prefix="/api")

# Router dedie aux journaux de synchronisation ClickUp stockes en base.
app.include_router(clickup_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Cree les tables du service au demarrage si elles n'existent pas."""
    # create_all est utile en developpement et pour le PFE afin de preparer la base clickup_db.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    """Endpoint de verification utilise par Docker, le gateway et Postman."""
    # Cette reponse simple confirme que le microservice ClickUp est joignable.
    return {"status": "ok", "service": "clickup_service"}
