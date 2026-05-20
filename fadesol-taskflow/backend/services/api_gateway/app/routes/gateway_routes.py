from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import APIRouter
from fastapi import Request, Response
from fastapi.responses import JSONResponse

from app.core.config import settings


router = APIRouter(tags=["Gateway"])


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


@router.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_auth(path: str, request: Request):
    body = await request.body()
    target_url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/auth/{path}"
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length", "connection"}
    }

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
            content={"detail": "Auth service indisponible."},
        )
