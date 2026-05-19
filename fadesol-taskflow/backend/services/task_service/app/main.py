from fastapi import FastAPI

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.subtask_routes import router as subtask_router
from app.routes.task_routes import router as task_router


app = FastAPI(title="Tache Service - Fadesol TaskFlow")
app.include_router(task_router, prefix="/api")
app.include_router(subtask_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "task_service"}
