from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app import models  # noqa: F401
from app.db.database import Base, engine
from app.routes.message_routes import router as message_router
from app.websocket_manager import message_ws_manager


app = FastAPI(title="Message Service - Fadesol TaskFlow")
app.include_router(message_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "message_service"}


@app.websocket("/ws/messages")
async def messages_websocket(websocket: WebSocket):
    await message_ws_manager.connect(websocket)

    try:
        await websocket.send_json({"type": "connected", "message": "Messagerie temps réel connectée."})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        message_ws_manager.disconnect(websocket)
