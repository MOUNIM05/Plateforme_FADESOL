from fastapi import FastAPI

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.project_routes import projects_router, router as project_router


app = FastAPI(title="Projet Service - Fadesol TaskFlow")
app.include_router(project_router, prefix="/api")
app.include_router(projects_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "project_service"}
