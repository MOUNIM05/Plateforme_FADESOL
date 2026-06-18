# Message Service

## Role du service

`message_service` gere la messagerie interne, les conversations, les messages lus/non lus et les notifications temps reel via WebSocket.

## Port

```text
8006
```

## Base de donnees

```text
message_db
```

## Routes principales

- `GET /health` : verification de disponibilite.
- `GET /api/messages/` : liste des messages visibles.
- `POST /api/messages/` : envoi d'un message.
- `GET /api/messages/conversations` : liste des conversations.
- `GET /api/messages/conversations/{conversation_id}` : detail d'une conversation.
- `PATCH /api/messages/{message_id}/lu` : marquer un message comme lu.
- `GET /api/messages/online-users` : etat de presence.
- `WS /api/messages/ws/messages` : canal WebSocket.

## Dependances principales

- FastAPI.
- SQLAlchemy.
- Pydantic.
- WebSocket FastAPI.
- Uvicorn.

## Commande Docker

```powershell
docker compose up -d --build message_service
```

## Endpoints utiles

```text
Health: http://localhost:8006/health
Docs:   http://localhost:8006/docs
```
