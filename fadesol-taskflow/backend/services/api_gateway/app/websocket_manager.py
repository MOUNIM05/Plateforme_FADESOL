"""Gestionnaire WebSocket partage par l'API Gateway.

Il conserve les connexions par utilisateur et diffuse les evenements de
messagerie ou de presence aux clients connectes.
"""

from fastapi import WebSocket
import asyncio
from datetime import datetime


class WebSocketConnectionManager:
    """Suit les connexions actives et l'etat de presence des utilisateurs."""

    def __init__(self) -> None:
        # Connexions groupees par utilisateur pour diffuser un meme evenement a tous ses onglets.
        self.user_connections: dict[str, list[WebSocket]] = {}
        # Index inverse pour retrouver rapidement l'utilisateur lors d'une deconnexion.
        self.socket_to_user: dict[WebSocket, str] = {}
        # Etat de presence expose au frontend.
        self.online_users: dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, user_id: str | None = None) -> None:
        """Accepte une connexion et marque l'utilisateur en ligne."""
        await websocket.accept()
        uid = str(user_id) if user_id is not None else "__anonymous__"
        self.socket_to_user[websocket] = uid
        self.user_connections.setdefault(uid, []).append(websocket)
        # Marque l'utilisateur comme en ligne des qu'une connexion est ouverte.
        self.online_users[uid] = {"is_online": True, "last_seen": None}

        # Informe tous les clients qu'un utilisateur vient de passer en ligne.
        await self.broadcast_presence(uid, True, None)

    def disconnect(self, websocket: WebSocket) -> None:
        """Retire une connexion et met a jour la presence si c'etait la derniere."""
        uid = self.socket_to_user.pop(websocket, None)

        if not uid:
            return

        conns = self.user_connections.get(uid, [])
        if websocket in conns:
            conns.remove(websocket)

        if not conns:
            # Derniere connexion fermee pour cet utilisateur : on conserve l'heure de derniere activite.
            last_seen = datetime.utcnow().isoformat() + "Z"
            self.online_users[uid] = {"is_online": False, "last_seen": last_seen}

            # Diffusion best-effort car la deconnexion peut arriver hors contexte async favorable.
            try:
                asyncio.create_task(self.broadcast_presence(uid, False, last_seen))
            except Exception:
                pass

    async def broadcast(self, payload: dict) -> None:
        """Diffuse un payload JSON a toutes les connexions actives."""
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
        """Diffuse un changement de presence utilisateur."""
        payload = {
            "type": "presence_update",
            "user_id": user_id,
            "is_online": is_online,
            "last_seen": last_seen,
        }

        await self.broadcast(payload)

    def get_online_users(self) -> dict:
        """Retourne l'etat de presence connu par le gateway."""
        return self.online_users


gateway_ws_manager = WebSocketConnectionManager()
