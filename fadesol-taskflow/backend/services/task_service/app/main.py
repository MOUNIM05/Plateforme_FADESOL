from fastapi import FastAPI

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.subtask_routes import router as subtask_router
from app.routes.task_routes import legacy_router as legacy_task_router
from app.routes.task_routes import router as task_router


# Application FastAPI du microservice des taches.
# Elle centralise les taches, sous-taches et routes de compatibilite en francais.
app = FastAPI(title="Tache Service - Fadesol TaskFlow")

# Routes modernes (/tasks), routes historiques (/taches) et routes de sous-taches.
app.include_router(task_router, prefix="/api")
app.include_router(legacy_task_router, prefix="/api")
app.include_router(subtask_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    # Cree les tables du service tache au demarrage si elles sont absentes.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    # Endpoint de verification pour Docker, l'API Gateway ou le monitoring.
    return {"status": "ok", "service": "task_service"}
