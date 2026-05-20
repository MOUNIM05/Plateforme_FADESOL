from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import APIRouter
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.core.config import settings


router = APIRouter(tags=["Gateway"])
root_router = APIRouter(tags=["Gateway"])


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


@router.get("/services")
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


@root_router.api_route("/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users_root(request: Request):
    return await proxy_request(request, build_user_service_url(), "User service")


@root_router.get("/users/health")
async def proxy_users_health(request: Request):
    return await proxy_request(request, build_user_health_url(), "User service")


@root_router.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users(path: str, request: Request):
    return await proxy_request(request, build_user_service_url(path), "User service")
