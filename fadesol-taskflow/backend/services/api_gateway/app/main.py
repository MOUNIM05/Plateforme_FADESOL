from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.gateway_routes import root_router as gateway_root_router
from app.routes.gateway_routes import router as gateway_router


# API Gateway : point d'entree unique appele par le frontend.
# Le frontend peut appeler localhost:8000, puis le gateway redirige vers le bon microservice.
app = FastAPI(title="Fadesol API Gateway")

# CORS autorise le frontend Vite local a communiquer avec le gateway pendant le developpement.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Les routes /api/* et certaines routes racines sont exposees pour assurer la compatibilite frontend.
app.include_router(gateway_router, prefix="/api")
app.include_router(gateway_root_router)


@app.get("/health")
def health_check():
    # Permet de verifier que le gateway repond, independamment des services cibles.
    return {"status": "ok", "service": "api_gateway"}
