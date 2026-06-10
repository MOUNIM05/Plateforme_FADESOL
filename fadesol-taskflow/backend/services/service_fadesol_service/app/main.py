from fastapi import FastAPI

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.service_routes import legacy_router, router as service_router


app = FastAPI(title="Service Fadesol Service - Fadesol TaskFlow")
app.include_router(service_router, prefix="/api")
app.include_router(legacy_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "service_fadesol_service"}
