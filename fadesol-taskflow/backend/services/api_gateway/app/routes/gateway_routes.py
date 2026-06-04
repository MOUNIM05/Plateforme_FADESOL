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
        with urlopen(proxied_request, timeout=10) as proxied_response:
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
    # Construit l'URL user_service en gardant la convention /api/users.
    user_base_url = settings.USER_SERVICE_URL.rstrip("/")

    if not path:
        return f"{user_base_url}/api/users/"

    return f"{user_base_url}/api/users/{path}"


def build_user_health_url() -> str:
    # Healthcheck direct de user_service, utile pour diagnostiquer les services derriere le gateway.
    return f"{settings.USER_SERVICE_URL.rstrip('/')}/health"


def build_task_service_url(path: str = "") -> str:
    # Construit l'URL task_service pour que le frontend n'appelle pas directement le port du service.
    task_base_url = settings.TASK_SERVICE_URL.rstrip("/")

    if not path:
        return f"{task_base_url}/api/tasks/"

    return f"{task_base_url}/api/tasks/{path}"


def build_service_fadesol_url(path: str = "") -> str:
    service_base_url = settings.SERVICE_FADESOL_URL.rstrip("/")

    if not path:
        return f"{service_base_url}/api/services-fadesol/"

    return f"{service_base_url}/api/services-fadesol/{path}"


def build_clickup_service_url(path: str = "") -> str:
    # Construit l'URL du service ClickUp pour centraliser les appels externes via le gateway.
    clickup_base_url = settings.CLICKUP_SERVICE_URL.rstrip("/")

    if not path:
        return f"{clickup_base_url}/api/clickup"

    return f"{clickup_base_url}/api/clickup/{path}"


@router.get("/services")
def list_services():
    # Expose les URLs configurees afin de verifier rapidement le routage microservices.
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
    # Proxy vers auth_service : login, register, /me et synchronisations internes.
    target_url = f"{settings.AUTH_SERVICE_URL.rstrip('/')}/api/auth/{path}"
    return await proxy_request(request, target_url, "Auth service")


@router.api_route("/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_users_root(request: Request):
    # Proxy racine /api/users vers user_service.
    return await proxy_request(request, build_user_service_url(), "User service")


@router.get("/users/health")
async def proxy_api_users_health(request: Request):
    return await proxy_request(request, build_user_health_url(), "User service")


@router.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_users(path: str, request: Request):
    # Proxy des sous-routes utilisateur : detail, update, activate, profile, etc.
    return await proxy_request(request, build_user_service_url(path), "User service")


@router.api_route("/tasks", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_tasks_root(request: Request):
    # Proxy racine /api/tasks vers task_service.
    return await proxy_request(request, build_task_service_url(), "Task service")


@router.api_route("/tasks/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_tasks(path: str, request: Request):
    # Proxy des sous-routes taches : consultation, assignation, statut et suppression.
    return await proxy_request(request, build_task_service_url(path), "Task service")


@router.api_route("/services-fadesol", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services_fadesol_root(request: Request):
    return await proxy_request(request, build_service_fadesol_url(), "Service Fadesol service")


@router.api_route("/services-fadesol/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_services_fadesol(path: str, request: Request):
    return await proxy_request(request, build_service_fadesol_url(path), "Service Fadesol service")


@router.api_route("/clickup/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_api_clickup(path: str, request: Request):
    # Proxy vers clickup_service pour isoler l'integration ClickUp du frontend.
    return await proxy_request(request, build_clickup_service_url(path), "ClickUp service")


@root_router.api_route("/users", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users_root(request: Request):
    # Routes racines conservees pour les appels frontend qui n'utilisent pas le prefixe /api.
    return await proxy_request(request, build_user_service_url(), "User service")


@root_router.get("/users/health")
async def proxy_users_health(request: Request):
    return await proxy_request(request, build_user_health_url(), "User service")


@root_router.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_users(path: str, request: Request):
    return await proxy_request(request, build_user_service_url(path), "User service")


@root_router.api_route("/tasks", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_tasks_root(request: Request):
    # Compatibilite racine pour /tasks.
    return await proxy_request(request, build_task_service_url(), "Task service")


@root_router.api_route("/tasks/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_tasks(path: str, request: Request):
    return await proxy_request(request, build_task_service_url(path), "Task service")


@root_router.api_route("/services-fadesol", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services_fadesol_root(request: Request):
    return await proxy_request(request, build_service_fadesol_url(), "Service Fadesol service")


@root_router.api_route("/services-fadesol/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_services_fadesol(path: str, request: Request):
    return await proxy_request(request, build_service_fadesol_url(path), "Service Fadesol service")


@root_router.api_route("/clickup/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_clickup(path: str, request: Request):
    return await proxy_request(request, build_clickup_service_url(path), "ClickUp service")
