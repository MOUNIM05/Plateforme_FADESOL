"""Point d'entree FastAPI du microservice task_service.

Ce service gere les taches principales, les sous-taches, leur affectation
et la progression calculee a partir des sous-taches.
"""

from fastapi import FastAPI
from sqlalchemy import inspect
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
    """Prepare les tables task_service et synchronise les colonnes utiles."""
    # Cree les tables du service tache au demarrage si elles sont absentes.
    Base.metadata.create_all(bind=engine)

    # create_all ne modifie pas une table deja existante.
    # Ces ALTER preservent la table sous_taches tout en ajoutant les colonnes necessaires a l'affectation US18.
    inspector = inspect(engine)

    def has_column(table_name: str, column_name: str) -> bool:
        return column_name in {column["name"] for column in inspector.get_columns(table_name)}

    with engine.begin() as connection:
        if not has_column("sous_taches", "service_id"):
            connection.execute(text("ALTER TABLE sous_taches ADD COLUMN service_id VARCHAR(36)"))
        if not has_column("sous_taches", "assignee_a"):
            connection.execute(text("ALTER TABLE sous_taches ADD COLUMN assignee_a VARCHAR(36)"))
        if not has_column("taches", "clickup_task_id"):
            connection.execute(text("ALTER TABLE taches ADD COLUMN clickup_task_id VARCHAR(120)"))
        if not has_column("taches", "source"):
            connection.execute(text("ALTER TABLE taches ADD COLUMN source VARCHAR(40) DEFAULT 'local' NOT NULL"))
        if not has_column("taches", "est_synchronisee_clickup"):
            connection.execute(text("ALTER TABLE taches ADD COLUMN est_synchronisee_clickup BOOLEAN DEFAULT FALSE NOT NULL"))
        if not has_column("taches", "date_synchronisation"):
            connection.execute(text("ALTER TABLE taches ADD COLUMN date_synchronisation TIMESTAMP"))

        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_sous_taches_service_id ON sous_taches (service_id)"))
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_sous_taches_assignee_a ON sous_taches (assignee_a)"))
        connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_taches_clickup_task_id ON taches (clickup_task_id)"))


@app.get("/health")
def health_check():
    """Indique que task_service est disponible."""
    # Endpoint de verification pour Docker, l'API Gateway ou le monitoring.
    return {"status": "ok", "service": "task_service"}
