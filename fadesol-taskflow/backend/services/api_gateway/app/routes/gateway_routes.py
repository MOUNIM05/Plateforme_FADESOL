import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.websocket_manager import gateway_ws_manager


router = APIRouter(tags=["Gateway"])
root_router = APIRouter(tags=["Gateway"])


async def websocket_endpoint(websocket: WebSocket):
    await gateway_ws_manager.connect(websocket)

    try:
        await websocket.send_json({"type": "connected", "message": "Messagerie temps réel connectée."})

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        gateway_ws_manager.disconnect(websocket)


async def broadcast_proxied_message(response: Response, event_type: str) -> None:
    if response.status_code < 200 or response.status_code >= 300:
        return

    try:
        payload = json.loads(response.body.decode("utf-8"))
    except (AttributeError, json.JSONDecodeError, UnicodeDecodeError):
        return

    await gateway_ws_manager.broadcast({"type": event_type, "message": payload})


async def proxy_request(request: Request, target_url: str, service_name: str):
    body = await request.body()
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length", "connection"}
    }

    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    proxied_request = UrlRequest(
        target_url,
        data=body or None,
        headers=headers,
        method=request.method,
    )

    try:
        with urlopen(proxied_request, timeout=10) as proxied_response:
            return Response(
                content=proxied_response.read(),
                status_code=proxied_response.status,
                media_type=proxied_response.headers.get("content-type", "application/json"),
            )
    except HTTPError as exc:
        return Response(
            content=exc.read(),
            status_code=exc.code,
            media_type=exc.headers.get("content-type", "application/json"),
        )
    except URLError:
        return JSONResponse(
            status_code=502,
            content={"detail": f"{service_name} indisponible."},
        )


def build_user_service_url(path: str = "") -> str:
    user_base_url = settings.USER_SERVICE_URL.rstrip("/")

    if not path:
        return f"{user_base_url}/api/users/"

    return f"{user_base_url}/api/users/{path}"


def build_user_health_url() -> str:
    return f"{settings.USER_SERVICE_URL.rstrip('/')}/health"


def build_fadesol_service_url(path: str = "") -> str:
    service_base_url = settings.SERVICE_FADESOL_URL.rstrip("/")

    if not path:
        return f"{service_base_url}/api/services/"

    return f"{service_base_url}/api/services/{path}"


def build_fadesol_service_health_url() -> str:
    return f"{settings.SERVICE_FADESOL_URL.rstrip('/')}/health"


def build_project_service_url(path: str = "") -> str:
    project_base_url = settings.PROJECT_SERVICE_URL.rstrip("/")

    if not path:
        return f"{project_base_url}/api/projects/"

    return f"{project_base_url}/api/projects/{path}"


def build_project_health_url() -> str:
    return f"{settings.PROJECT_SERVICE_URL.rstrip('/')}/health"


def build_dashboard_service_url(path: str = "") -> str:
    dashboard_base_url = settings.DASHBOARD_SERVICE_URL.rstrip("/")

    if not path:
        return f"{dashboard_base_url}/api/dashboard/"

    return f"{dashboard_base_url}/api/dashboard/{path}"


def build_dashboard_health_url() -> str:
    return f"{settings.DASHBOARD_SERVICE_URL.rstrip('/')}/health"


def build_message_service_url(path: str = "") -> str:
    message_base_url = settings.MESSAGE_SERVICE_URL.rstrip("/")

    if not path:
        return f"{message_base_url}/api/messages/"

    return f"{message_base_url}/api/messages/{path}"


def build_message_health_url() -> str:
    return f"{settings.MESSAGE_SERVICE_URL.rstrip('/')}/health"


@router.get("/gateway/services")
def list_services():
    return {
        "auth_service": settings.AUTH_SERVICE_URL,
        "user_service": settings.USER_SERVICE_URL,
        "service_fadesol_service": settings.SERVICE_FADESOL_URL,
        "project_service": settings.PROJECT_SERVICE_URL,
        "task_service": settings.TASK_SERVICE_URL,
        "dashboard_service": settings.DASHBOARD_SERVICE_URL,
        "message_service": settings.MESSAGE_SERVICE_URL,
        "clickup_service": settings.CLICKUP_SERVICE_URL,
    }


@router.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_auth(path: str, request: Request):
    target_url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/auth/{path}"
    return await proxy_request(request, target_url, "Auth service")


@router.api_route("/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_users_root(request: Request):
    return await proxy_request(request, build_user_service_url(), "User service")


@router.get("/users/health")
async def proxy_api_users_health(request: Request):
    return await proxy_request(request, build_user_health_url(), "User service")


@router.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_users(path: str, request: Request):
    return await proxy_request(request, build_user_service_url(path), "User service")


@router.api_route("/services", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services_root(request: Request):
    return await proxy_request(request, build_fadesol_service_url(), "Service Fadesol service")


@router.get("/services/health")
async def proxy_api_services_health(request: Request):
    return await proxy_request(request, build_fadesol_service_health_url(), "Service Fadesol service")


@router.api_route("/services/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services(path: str, request: Request):
    return await proxy_request(request, build_fadesol_service_url(path), "Service Fadesol service")


@router.api_route("/projects", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_projects_root(request: Request):
    return await proxy_request(request, build_project_service_url(), "Project service")


@router.get("/projects/health")
async def proxy_api_projects_health(request: Request):
    return await proxy_request(request, build_project_health_url(), "Project service")


@router.api_route("/projects/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_projects(path: str, request: Request):
    return await proxy_request(request, build_project_service_url(path), "Project service")


@router.api_route("/dashboard", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_dashboard_root(request: Request):
    return await proxy_request(request, build_dashboard_service_url(), "Dashboard service")


@router.get("/dashboard/health")
async def proxy_api_dashboard_health(request: Request):
    return await proxy_request(request, build_dashboard_health_url(), "Dashboard service")


@router.api_route("/dashboard/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_dashboard(path: str, request: Request):
    return await proxy_request(request, build_dashboard_service_url(path), "Dashboard service")


@router.api_route("/messages", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_messages_root(request: Request):
    response = await proxy_request(request, build_message_service_url(), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    return response


@router.get("/messages/health")
async def proxy_api_messages_health(request: Request):
    return await proxy_request(request, build_message_health_url(), "Message service")


@router.api_route("/messages/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_messages(path: str, request: Request):
    response = await proxy_request(request, build_message_service_url(path), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    if request.method == "PATCH" and path.endswith("/lu"):
        await broadcast_proxied_message(response, "message_read")

    return response


@router.websocket("/ws/messages")
async def proxy_api_messages_websocket(websocket: WebSocket):
    await websocket_endpoint(websocket)


@root_router.api_route("/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users_root(request: Request):
    return await proxy_request(request, build_user_service_url(), "User service")


@root_router.get("/users/health")
async def proxy_users_health(request: Request):
    return await proxy_request(request, build_user_health_url(), "User service")


@root_router.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users(path: str, request: Request):
    return await proxy_request(request, build_user_service_url(path), "User service")


@root_router.api_route("/services", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services_root(request: Request):
    return await proxy_request(request, build_fadesol_service_url(), "Service Fadesol service")


@root_router.get("/services/health")
async def proxy_services_health(request: Request):
    return await proxy_request(request, build_fadesol_service_health_url(), "Service Fadesol service")


@root_router.api_route("/services/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services(path: str, request: Request):
    return await proxy_request(request, build_fadesol_service_url(path), "Service Fadesol service")


@root_router.api_route("/projects", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_projects_root(request: Request):
    return await proxy_request(request, build_project_service_url(), "Project service")


@root_router.get("/projects/health")
async def proxy_projects_health(request: Request):
    return await proxy_request(request, build_project_health_url(), "Project service")


@root_router.api_route("/projects/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_projects(path: str, request: Request):
    return await proxy_request(request, build_project_service_url(path), "Project service")


@root_router.api_route("/dashboard", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_dashboard_root(request: Request):
    return await proxy_request(request, build_dashboard_service_url(), "Dashboard service")


@root_router.get("/dashboard/health")
async def proxy_dashboard_health(request: Request):
    return await proxy_request(request, build_dashboard_health_url(), "Dashboard service")


@root_router.api_route("/dashboard/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_dashboard(path: str, request: Request):
    return await proxy_request(request, build_dashboard_service_url(path), "Dashboard service")


@root_router.api_route("/messages", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_messages_root(request: Request):
    response = await proxy_request(request, build_message_service_url(), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    return response


@root_router.get("/messages/health")
async def proxy_messages_health(request: Request):
    return await proxy_request(request, build_message_health_url(), "Message service")


@root_router.api_route("/messages/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_messages(path: str, request: Request):
    response = await proxy_request(request, build_message_service_url(path), "Message service")

    if request.method == "POST":
        await broadcast_proxied_message(response, "message_created")

    if request.method == "PATCH" and path.endswith("/lu"):
        await broadcast_proxied_message(response, "message_read")

    return response


@root_router.websocket("/ws/messages")
async def proxy_messages_websocket(websocket: WebSocket):
    await websocket_endpoint(websocket)
