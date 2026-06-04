from fastapi import FastAPI
from sqlalchemy import text

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

    # create_all ne modifie pas une table deja existante.
    # Ces ALTER preservent la table sous_taches tout en ajoutant les colonnes necessaires a l'affectation US18.
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE sous_taches ADD COLUMN IF NOT EXISTS service_id VARCHAR(36)"))
        connection.execute(text("ALTER TABLE sous_taches ADD COLUMN IF NOT EXISTS assignee_a VARCHAR(36)"))
        connection.execute(text("ALTER TABLE sous_taches ALTER COLUMN service_id DROP NOT NULL"))
        connection.execute(text("ALTER TABLE sous_taches ALTER COLUMN assignee_a DROP NOT NULL"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_sous_taches_service_id ON sous_taches (service_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_sous_taches_assignee_a ON sous_taches (assignee_a)"))


@app.get("/health")
def health_check():
    # Endpoint de verification pour Docker, l'API Gateway ou le monitoring.
    return {"status": "ok", "service": "task_service"}
