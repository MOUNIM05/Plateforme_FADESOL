from fastapi import WebSocket
import asyncio
from datetime import datetime


class WebSocketConnectionManager:
    def __init__(self) -> None:
        # mapping user_id -> list[WebSocket]
        self.user_connections: dict[str, list[WebSocket]] = {}
        # mapping websocket -> user_id
        self.socket_to_user: dict[WebSocket, str] = {}
        # mapping user_id -> {is_online: bool, last_seen: isoformat str | None}
        self.online_users: dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, user_id: str | None = None) -> None:
        await websocket.accept()
        uid = str(user_id) if user_id is not None else "__anonymous__"
        self.socket_to_user[websocket] = uid
        self.user_connections.setdefault(uid, []).append(websocket)
        # mark as online
        self.online_users[uid] = {"is_online": True, "last_seen": None}

        # broadcast presence update
        await self.broadcast_presence(uid, True, None)

    def disconnect(self, websocket: WebSocket) -> None:
        uid = self.socket_to_user.pop(websocket, None)

        if not uid:
            return

        conns = self.user_connections.get(uid, [])
        if websocket in conns:
            conns.remove(websocket)

        if not conns:
            # last connection closed for this user
            last_seen = datetime.utcnow().isoformat() + "Z"
            self.online_users[uid] = {"is_online": False, "last_seen": last_seen}

            # schedule broadcast
            try:
                asyncio.create_task(self.broadcast_presence(uid, False, last_seen))
            except Exception:
                # best-effort
                pass

    async def broadcast(self, payload: dict) -> None:
        disconnected: list[WebSocket] = []

        for conns in list(self.user_connections.values()):
            for websocket in list(conns):
                try:
                    await websocket.send_json(payload)
                except Exception:
                    disconnected.append(websocket)

        for websocket in disconnected:
            try:
                self.disconnect(websocket)
            except Exception:
                pass

    async def broadcast_presence(self, user_id: str, is_online: bool, last_seen: str | None) -> None:
        payload = {
            "type": "presence_update",
            "user_id": user_id,
            "is_online": is_online,
            "last_seen": last_seen,
        }

        await self.broadcast(payload)

    def get_online_users(self) -> dict:
        return self.online_users


message_ws_manager = WebSocketConnectionManager()
