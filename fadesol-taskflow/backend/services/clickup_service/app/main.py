from fastapi import FastAPI

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.clickup_routes import router as clickup_router


app = FastAPI(title="ClickUp Service - Fadesol TaskFlow")
app.include_router(clickup_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "clickup_service"}
