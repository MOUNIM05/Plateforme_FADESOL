"""Routes de proxy de l'API Gateway.

Ces routes recoivent les appels du frontend puis les transmettent au service cible.
Le gateway reste le point d'entree unique afin que le frontend ne connaisse pas les ports internes.
"""

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.websocket_manager import gateway_ws_manager


router = APIRouter(tags=["Gateway"])
root_router = APIRouter(tags=["Gateway"])


async def websocket_endpoint(websocket: WebSocket):
    """Maintient une connexion WebSocket cote gateway pour la messagerie."""
    await gateway_ws_manager.connect(websocket)

    try:
        await websocket.send_json({"type": "connected", "message": "Messagerie temps reel connectee."})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        gateway_ws_manager.disconnect(websocket)


async def broadcast_proxied_message(response: Response, event_type: str) -> None:
    """Diffuse aux clients WebSocket les messages crees ou lus via le proxy HTTP."""
    if response.status_code < 200 or response.status_code >= 300:
        return

    try:
        payload = json.loads(response.body.decode("utf-8"))
    except (AttributeError, json.JSONDecodeError, UnicodeDecodeError):
        return

    await gateway_ws_manager.broadcast({"type": event_type, "message": payload})


async def proxy_request(request: Request, target_url: str, service_name: str):
    """Transfere une requete FastAPI vers un microservice cible."""
    # Fonction centrale du gateway : elle transfere la requete entrante vers le microservice cible.
    body = await request.body()

    # On conserve les headers utiles comme Authorization, mais on retire ceux lies a la connexion HTTP locale.
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length", "connection"}
    }

    if request.url.query:
        # Les query params du frontend sont conserves pour les filtres, pagination, etc.
        target_url = f"{target_url}?{request.url.query}"

    # UrlRequest reconstruit une requete HTTP avec la meme methode et le meme body que la requete initiale.
    proxied_request = UrlRequest(
        target_url,
        data=body or None,
        headers=headers,
        method=request.method,
    )

    try:
        with urlopen(proxied_request, timeout=30) as proxied_response:
            # La reponse du microservice est renvoyee telle quelle au frontend.
            return Response(
                content=proxied_response.read(),
                status_code=proxied_response.status,
                media_type=proxied_response.headers.get("content-type", "application/json"),
            )
    except HTTPError as exc:
        # Les erreurs HTTP du service cible sont propagees pour garder le meme comportement API.
        return Response(
            content=exc.read(),
            status_code=exc.code,
            media_type=exc.headers.get("content-type", "application/json"),
        )
    except URLError:
        # Si le service cible est indisponible, le gateway retourne une erreur 502 explicite.
        return JSONResponse(
            status_code=502,
            content={"detail": f"{service_name} indisponible."},
        )


def build_user_service_url(path: str = "") -> str:
    """Construit l'URL cible de user_service."""
    # Construit l'URL user_service en gardant la convention /api/users.
    user_base_url = settings.USER_SERVICE_URL.rstrip("/")

    if not path:
        return f"{user_base_url}/api/users/"

    return f"{user_base_url}/api/users/{path}"


def build_user_health_url() -> str:
    """Construit l'URL de healthcheck de user_service."""
    # Healthcheck direct de user_service, utile pour diagnostiquer les services derriere le gateway.
    return f"{settings.USER_SERVICE_URL.rstrip('/')}/health"


def build_task_service_url(path: str = "") -> str:
    """Construit l'URL cible de task_service."""
    # Construit l'URL task_service pour que le frontend n'appelle pas directement le port du service.
    task_base_url = settings.TASK_SERVICE_URL.rstrip("/")

    if not path:
        return f"{task_base_url}/api/tasks/"

    return f"{task_base_url}/api/tasks/{path}"


def build_service_fadesol_url(path: str = "") -> str:
    """Construit l'URL cible de service_fadesol_service pour les routes /services-fadesol."""
    service_base_url = settings.SERVICE_FADESOL_URL.rstrip("/")

    if not path:
        return f"{service_base_url}/api/services-fadesol/"

    return f"{service_base_url}/api/services-fadesol/{path}"


def build_fadesol_service_url(path: str = "") -> str:
    """Construit l'URL cible de service_fadesol_service pour les routes /services."""
    service_base_url = settings.SERVICE_FADESOL_URL.rstrip("/")

    if not path:
        return f"{service_base_url}/api/services/"

    return f"{service_base_url}/api/services/{path}"


def build_fadesol_service_health_url() -> str:
    """Construit l'URL de healthcheck de service_fadesol_service."""
    return f"{settings.SERVICE_FADESOL_URL.rstrip('/')}/health"


def build_project_service_url(path: str = "") -> str:
    """Construit l'URL cible de project_service."""
    project_base_url = settings.PROJECT_SERVICE_URL.rstrip("/")

    if not path:
        return f"{project_base_url}/api/projects/"

    return f"{project_base_url}/api/projects/{path}"


def build_project_health_url() -> str:
    """Construit l'URL de healthcheck de project_service."""
    return f"{settings.PROJECT_SERVICE_URL.rstrip('/')}/health"


def build_dashboard_service_url(path: str = "") -> str:
    """Construit l'URL cible de dashboard_service."""
    dashboard_base_url = settings.DASHBOARD_SERVICE_URL.rstrip("/")

    if not path:
        return f"{dashboard_base_url}/api/dashboard/"

    return f"{dashboard_base_url}/api/dashboard/{path}"


def build_dashboard_health_url() -> str:
    """Construit l'URL de healthcheck de dashboard_service."""
    return f"{settings.DASHBOARD_SERVICE_URL.rstrip('/')}/health"


def build_message_service_url(path: str = "") -> str:
    """Construit l'URL cible de message_service."""
    message_base_url = settings.MESSAGE_SERVICE_URL.rstrip("/")

    if not path:
        return f"{message_base_url}/api/messages/"

    return f"{message_base_url}/api/messages/{path}"


def build_message_health_url() -> str:
    """Construit l'URL de healthcheck de message_service."""
    return f"{settings.MESSAGE_SERVICE_URL.rstrip('/')}/health"


@router.get("/gateway/services")
def list_services():
    """Retourne les URLs connues par le gateway pour diagnostic."""
    # Expose les URLs configurees afin de verifier rapidement le routage microservices.
    return {
        "auth_service": settings.AUTH_SERVICE_URL,
        "user_service": settings.USER_SERVICE_URL,
        "service_fadesol_service": settings.SERVICE_FADESOL_URL,
        "project_service": settings.PROJECT_SERVICE_URL,
        "task_service": settings.TASK_SERVICE_URL,
        "dashboard_service": settings.DASHBOARD_SERVICE_URL,
        "message_service": settings.MESSAGE_SERVICE_URL,
    }


@router.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_auth(path: str, request: Request):
    """Proxy vers auth_service."""
    # Proxy vers auth_service : login, register, /me et synchronisations internes.
    target_url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/auth/{path}"
    return await proxy_request(request, target_url, "Auth service")


@router.api_route("/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_users_root(request: Request):
    """Proxy vers la racine /api/users."""
    # Proxy racine /api/users vers user_service.
    return await proxy_request(request, build_user_service_url(), "User service")


@router.get("/users/health")
async def proxy_api_users_health(request: Request):
    """Proxy vers le healthcheck de user_service."""
    return await proxy_request(request, build_user_health_url(), "User service")


@router.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_users(path: str, request: Request):
    """Proxy vers les sous-routes /api/users/*."""
    # Proxy des sous-routes utilisateur : detail, update, activate, profile, etc.
    return await proxy_request(request, build_user_service_url(path), "User service")


@router.api_route("/tasks", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_tasks_root(request: Request):
    """Proxy vers la racine /api/tasks."""
    # Proxy racine /api/tasks vers task_service.
    return await proxy_request(request, build_task_service_url(), "Task service")


@router.api_route("/tasks/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_tasks(path: str, request: Request):
    """Proxy vers les sous-routes /api/tasks/*."""
    # Proxy des sous-routes taches : consultation, assignation, statut et suppression.
    return await proxy_request(request, build_task_service_url(path), "Task service")


@router.api_route("/services-fadesol", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services_fadesol_root(request: Request):
    """Proxy vers la racine /api/services-fadesol."""
    return await proxy_request(request, build_service_fadesol_url(), "Service Fadesol service")


@router.api_route("/services-fadesol/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services_fadesol(path: str, request: Request):
    """Proxy vers les sous-routes /api/services-fadesol/*."""
    return await proxy_request(request, build_service_fadesol_url(path), "Service Fadesol service")


@router.api_route("/services", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services_root(request: Request):
    """Proxy vers la racine /api/services."""
    return await proxy_request(request, build_fadesol_service_url(), "Service Fadesol service")


@router.get("/services/health")
async def proxy_api_services_health(request: Request):
    """Proxy vers le healthcheck de service_fadesol_service."""
    return await proxy_request(request, build_fadesol_service_health_url(), "Service Fadesol service")


@router.api_route("/services/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services(path: str, request: Request):
    """Proxy vers les sous-routes /api/services/*."""
    return await proxy_request(request, build_fadesol_service_url(path), "Service Fadesol service")


@router.api_route("/projects", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_projects_root(request: Request):
    """Proxy vers la racine /api/projects."""
    return await proxy_request(request, build_project_service_url(), "Project service")


@router.get("/projects/health")
async def proxy_api_projects_health(request: Request):
    """Proxy vers le healthcheck de project_service."""
    return await proxy_request(request, build_project_health_url(), "Project service")


@router.api_route("/projects/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_projects(path: str, request: Request):
    """Proxy vers les sous-routes /api/projects/*."""
    return await proxy_request(request, build_project_service_url(path), "Project service")


@router.api_route("/dashboard", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_dashboard_root(request: Request):
    """Proxy vers la racine /api/dashboard."""
    return await proxy_request(request, build_dashboard_service_url(), "Dashboard service")


@router.get("/dashboard/health")
async def proxy_api_dashboard_health(request: Request):
    """Proxy vers le healthcheck de dashboard_service."""
    return await proxy_request(request, build_dashboard_health_url(), "Dashboard service")


@router.api_route("/dashboard/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_dashboard(path: str, request: Request):
    """Proxy vers les sous-routes /api/dashboard/*."""
    return await proxy_request(request, build_dashboard_service_url(path), "Dashboard service")


@router.api_route("/messages", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_messages_root(request: Request):
    """Proxy vers la racine /api/messages avec diffusion WebSocket apres creation."""
    response = await proxy_request(request, build_message_service_url(), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    return response


@router.get("/messages/health")
async def proxy_api_messages_health(request: Request):
    """Proxy vers le healthcheck de message_service."""
    return await proxy_request(request, build_message_health_url(), "Message service")


@router.api_route("/messages/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_messages(path: str, request: Request):
    """Proxy vers les sous-routes /api/messages/* avec evenements temps reel."""
    response = await proxy_request(request, build_message_service_url(path), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    if request.method == "PATCH" and path.endswith("/lu"):
        await broadcast_proxied_message(response, "message_read")

    return response


@router.websocket("/ws/messages")
async def proxy_api_messages_websocket(websocket: WebSocket):
    """WebSocket expose sous /api/ws/messages."""
    await websocket_endpoint(websocket)


@root_router.api_route("/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users_root(request: Request):
    """Proxy racine sans prefixe /api pour /users."""
    # Routes racines conservees pour les appels frontend qui n'utilisent pas le prefixe /api.
    return await proxy_request(request, build_user_service_url(), "User service")


@root_router.get("/users/health")
async def proxy_users_health(request: Request):
    """Proxy racine sans prefixe /api pour /users/health."""
    return await proxy_request(request, build_user_health_url(), "User service")


@root_router.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users(path: str, request: Request):
    """Proxy racine sans prefixe /api pour /users/*."""
    return await proxy_request(request, build_user_service_url(path), "User service")


@root_router.api_route("/tasks", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_tasks_root(request: Request):
    """Proxy racine sans prefixe /api pour /tasks."""
    # Compatibilite racine pour /tasks.
    return await proxy_request(request, build_task_service_url(), "Task service")


@root_router.api_route("/tasks/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_tasks(path: str, request: Request):
    """Proxy racine sans prefixe /api pour /tasks/*."""
    return await proxy_request(request, build_task_service_url(path), "Task service")


@root_router.api_route("/services-fadesol", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services_fadesol_root(request: Request):
    """Proxy racine sans prefixe /api pour /services-fadesol."""
    return await proxy_request(request, build_service_fadesol_url(), "Service Fadesol service")


@root_router.api_route("/services-fadesol/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services_fadesol(path: str, request: Request):
    """Proxy racine sans prefixe /api pour /services-fadesol/*."""
    return await proxy_request(request, build_service_fadesol_url(path), "Service Fadesol service")


@root_router.api_route("/services", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services_root(request: Request):
    """Proxy racine sans prefixe /api pour /services."""
    return await proxy_request(request, build_fadesol_service_url(), "Service Fadesol service")


@root_router.get("/services/health")
async def proxy_services_health(request: Request):
    """Proxy racine sans prefixe /api pour /services/health."""
    return await proxy_request(request, build_fadesol_service_health_url(), "Service Fadesol service")


@root_router.api_route("/services/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services(path: str, request: Request):
    """Proxy racine sans prefixe /api pour /services/*."""
    return await proxy_request(request, build_fadesol_service_url(path), "Service Fadesol service")


@root_router.api_route("/projects", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_projects_root(request: Request):
    """Proxy racine sans prefixe /api pour /projects."""
    return await proxy_request(request, build_project_service_url(), "Project service")


@root_router.get("/projects/health")
async def proxy_projects_health(request: Request):
    """Proxy racine sans prefixe /api pour /projects/health."""
    return await proxy_request(request, build_project_health_url(), "Project service")


@root_router.api_route("/projects/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_projects(path: str, request: Request):
    """Proxy racine sans prefixe /api pour /projects/*."""
    return await proxy_request(request, build_project_service_url(path), "Project service")


@root_router.api_route("/dashboard", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_dashboard_root(request: Request):
    """Proxy racine sans prefixe /api pour /dashboard."""
    return await proxy_request(request, build_dashboard_service_url(), "Dashboard service")


@root_router.get("/dashboard/health")
async def proxy_dashboard_health(request: Request):
    """Proxy racine sans prefixe /api pour /dashboard/health."""
    return await proxy_request(request, build_dashboard_health_url(), "Dashboard service")


@root_router.api_route("/dashboard/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_dashboard(path: str, request: Request):
    """Proxy racine sans prefixe /api pour /dashboard/*."""
    return await proxy_request(request, build_dashboard_service_url(path), "Dashboard service")


@root_router.api_route("/messages", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_messages_root(request: Request):
    """Proxy racine sans prefixe /api pour /messages."""
    response = await proxy_request(request, build_message_service_url(), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    return response


@root_router.get("/messages/health")
async def proxy_messages_health(request: Request):
    """Proxy racine sans prefixe /api pour /messages/health."""
    return await proxy_request(request, build_message_health_url(), "Message service")


@root_router.api_route("/messages/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_messages(path: str, request: Request):
    """Proxy racine sans prefixe /api pour /messages/*."""
    response = await proxy_request(request, build_message_service_url(path), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    if request.method == "PATCH" and path.endswith("/lu"):
        await broadcast_proxied_message(response, "message_read")

    return response


@root_router.websocket("/ws/messages")
async def proxy_messages_websocket(websocket: WebSocket):
    """WebSocket expose sous /ws/messages."""
    await websocket_endpoint(websocket)


