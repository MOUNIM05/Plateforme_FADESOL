from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.gateway_routes import root_router as gateway_root_router
from app.routes.gateway_routes import router as gateway_router


app = FastAPI(title="Fadesol API Gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(gateway_router, prefix="/api")
app.include_router(gateway_root_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "api_gateway"}
