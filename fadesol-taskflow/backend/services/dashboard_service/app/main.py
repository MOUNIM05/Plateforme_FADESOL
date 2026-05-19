from fastapi import FastAPI

from app.routes.dashboard_routes import router as dashboard_router


app = FastAPI(title="Dashboard Service - Fadesol TaskFlow")
app.include_router(dashboard_router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "dashboard_service"}
