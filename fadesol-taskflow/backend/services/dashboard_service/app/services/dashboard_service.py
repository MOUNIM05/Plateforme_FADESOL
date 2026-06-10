from datetime import date
from json import JSONDecodeError
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from app.core.config import settings
from app.schemas.dashboard_schema import (
    DashboardMemberWorkloadItem,
    DashboardServiceDetail,
    DashboardServiceMember,
    DashboardServiceOverviewItem,
    DashboardStatisticsResponse,
    StatistiquesTableauBord,
)
from app.schemas.service_statistic_schema import StatistiqueService

IN_PROGRESS_STATUSES = {"En cours", "EN_PROGRESS", "IN_PROGRESS", "EnCours"}
COMPLETED_STATUSES = {"Terminé", "Terminée", "DONE", "COMPLETED", "Termine", "Validee"}
BLOCKED_STATUSES = {"Bloqué", "BLOCKED", "Bloque"}
FALLBACK_STATISTICS = DashboardStatisticsResponse()


def get_dashboard_statistics() -> StatistiquesTableauBord:
    stats = StatistiquesTableauBord()
    stats.taux_avancement_global = stats.calculerTauxAvancementGlobal()
    return stats


def get_global_dashboard_statistics(authorization: str | None = None) -> DashboardStatisticsResponse:
    try:
        tasks = _fetch_list(settings.TASK_SERVICE_URL, "/api/taches/", authorization)
        projects = _fetch_list(settings.PROJECT_SERVICE_URL, "/api/projects/", authorization)
        services = _fetch_list(settings.SERVICE_FADESOL_URL, "/api/services/", authorization)
    except (HTTPError, URLError, JSONDecodeError, TimeoutError, ValueError):
        # Safe fallback until all dependent services are available locally.
        return FALLBACK_STATISTICS

    return DashboardStatisticsResponse(
        total_tasks=len(tasks),
        tasks_in_progress=_count_tasks_in_progress(tasks),
        tasks_completed=_count_tasks_completed(tasks),
        tasks_late=_count_tasks_late(tasks),
        tasks_blocked=_count_tasks_blocked(tasks),
        total_projects=len(projects),
        active_services=sum(1 for service in services if service.get("is_active", True)),
    )


def get_services_overview(authorization: str | None = None) -> list[DashboardServiceOverviewItem]:
    services, users, projects, tasks = _fetch_dashboard_sources(authorization)

    return [
        _build_service_overview_item(service, users, projects, tasks)
        for service in services
    ]


def get_service_dashboard(service_id: str, authorization: str | None = None) -> DashboardServiceDetail:
    services, users, projects, tasks = _fetch_dashboard_sources(authorization)
    service = _find_service(services, service_id)

    overview = _build_service_overview_item(service, users, projects, tasks)
    members = [
        _build_member(member)
        for member in users
        if _belongs_to_service(member, service)
    ]

    return DashboardServiceDetail(
        **overview.model_dump(),
        members=members,
    )


def get_members_workload(
    authorization: str | None = None,
    service_id: str | None = None,
    search: str | None = None,
) -> list[DashboardMemberWorkloadItem]:
    services, users, _, tasks = _fetch_dashboard_sources(authorization)
    selected_service = _find_service(services, service_id) if service_id else None
    normalized_search = (search or "").strip().lower()

    members = [
        user
        for user in users
        if _is_active_user(user)
        and (not selected_service or _belongs_to_service(user, selected_service))
        and (not normalized_search or normalized_search in _member_search_text(user))
    ]

    return [
        _build_member_workload(member, services, tasks, selected_service)
        for member in members
    ]


def get_service_statistics(service_id: str) -> StatistiqueService:
    stats = StatistiqueService(service_id=service_id, nom_service="Service Fadesol")
    stats.taux_avancement = stats.calculerAvancementService()
    return stats


def _fetch_dashboard_sources(authorization: str | None) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    try:
        services = _fetch_list(settings.SERVICE_FADESOL_URL, "/api/services/", authorization)
        users = _fetch_list(settings.USER_SERVICE_URL, "/api/users/", authorization)
        projects = _fetch_list(settings.PROJECT_SERVICE_URL, "/api/projects/", authorization)
        tasks = _fetch_list(settings.TASK_SERVICE_URL, "/api/taches/", authorization)
    except (HTTPError, URLError, JSONDecodeError, TimeoutError, ValueError):
        return _fallback_services(), [], [], []

    return services, users, projects, tasks


def _fetch_list(base_url: str, path: str, authorization: str | None) -> list[dict]:
    url = f"{base_url.rstrip('/')}{path}?limit=1000"
    headers = {"Accept": "application/json"}

    if authorization:
        headers["Authorization"] = authorization

    request = UrlRequest(url, headers=headers, method="GET")

    with urlopen(request, timeout=5) as response:
        data = response.read()

    import json

    parsed = json.loads(data.decode("utf-8"))

    if isinstance(parsed, list):
        return parsed

    return []


def _fallback_services() -> list[dict]:
    return [
        {"id": "commercial", "name": "Commercial", "is_active": True},
        {"id": "technique", "name": "Technique", "is_active": True},
        {"id": "achat", "name": "Achat", "is_active": True},
        {"id": "magasin-stock", "name": "Magasin / Stock", "is_active": True},
        {"id": "comptabilite-management", "name": "Comptabilité & Management", "is_active": True},
        {"id": "direction-rh-administration", "name": "Direction / RH / Administration", "is_active": True},
    ]


def _find_service(services: list[dict], service_id: str) -> dict:
    for service in services:
        if str(service.get("id")) == str(service_id):
            return service

    return {"id": service_id, "name": "Service Fadesol", "is_active": True}


def _build_service_overview_item(
    service: dict,
    users: list[dict],
    projects: list[dict],
    tasks: list[dict],
) -> DashboardServiceOverviewItem:
    service_tasks = [task for task in tasks if _record_belongs_to_service(task, service)]
    completed_tasks = _count_tasks_completed(service_tasks)

    return DashboardServiceOverviewItem(
        service_id=str(service.get("id")),
        service_name=service.get("name") or "Service Fadesol",
        total_members=sum(1 for user in users if _belongs_to_service(user, service)),
        total_projects=sum(1 for project in projects if _record_belongs_to_service(project, service)),
        total_tasks=len(service_tasks),
        tasks_in_progress=_count_tasks_in_progress(service_tasks),
        tasks_completed=completed_tasks,
        tasks_late=_count_tasks_late(service_tasks),
        tasks_blocked=_count_tasks_blocked(service_tasks),
        progress=_calculate_progress(len(service_tasks), completed_tasks),
    )


def _build_member(user: dict) -> DashboardServiceMember:
    full_name = " ".join(
        value
        for value in [
            user.get("first_name") or user.get("prenom"),
            user.get("last_name") or user.get("nom"),
        ]
        if value
    ).strip()

    return DashboardServiceMember(
        id=user.get("id") or user.get("uuid") or "",
        full_name=full_name or user.get("email") or "Utilisateur",
        email=user.get("email") or "Non renseigné",
        role=user.get("role") or "Utilisateur",
    )


def _build_member_workload(
    user: dict,
    services: list[dict],
    tasks: list[dict],
    selected_service: dict | None = None,
) -> DashboardMemberWorkloadItem:
    user_tasks = [
        task
        for task in tasks
        if _task_belongs_to_member(task, user)
        and (not selected_service or _record_belongs_to_service(task, selected_service))
    ]
    completed_tasks = _count_tasks_completed(user_tasks)

    return DashboardMemberWorkloadItem(
        member_id=str(user.get("uuid") or user.get("id") or ""),
        full_name=_member_full_name(user),
        email=user.get("email") or "Non renseigné",
        role=user.get("role") or "Utilisateur",
        service_id=_member_service_id(user, services),
        service_name=_member_service_name(user, services),
        total_tasks=len(user_tasks),
        completed_tasks=completed_tasks,
        overdue_tasks=_count_tasks_late(user_tasks),
        in_progress_tasks=_count_tasks_in_progress(user_tasks),
        blocked_tasks=_count_tasks_blocked(user_tasks),
        progression=_calculate_progress(len(user_tasks), completed_tasks),
    )


def _member_full_name(user: dict) -> str:
    full_name = " ".join(
        value
        for value in [
            user.get("first_name") or user.get("prenom"),
            user.get("last_name") or user.get("nom"),
        ]
        if value
    ).strip()

    return full_name or user.get("email") or "Utilisateur"


def _member_search_text(user: dict) -> str:
    return " ".join(
        str(value or "")
        for value in [
            _member_full_name(user),
            user.get("email"),
            user.get("role"),
            user.get("service_id"),
            user.get("service"),
        ]
    ).lower()


def _is_active_user(user: dict) -> bool:
    return bool(user.get("is_active", True)) and bool(user.get("est_actif", True))


def _member_identifiers(user: dict) -> set[str]:
    return {
        str(identifier)
        for identifier in [user.get("uuid"), user.get("id")]
        if identifier not in {None, ""}
    }


def _task_belongs_to_member(task: dict, user: dict) -> bool:
    assignee = (
        task.get("assignee_a")
        or task.get("assignee_id")
        or task.get("assigned_to")
        or task.get("responsable_id")
    )

    return str(assignee or "") in _member_identifiers(user)


def _member_service_id(user: dict, services: list[dict]) -> str | None:
    service_value = str(user.get("service_id") or user.get("service") or "")

    if not service_value:
        return None

    for service in services:
        if service_value in {str(service.get("id") or ""), str(service.get("name") or "")}:
            return str(service.get("id") or service_value)

    return service_value


def _member_service_name(user: dict, services: list[dict]) -> str:
    service_value = str(user.get("service_id") or user.get("service") or "")

    if not service_value:
        return "Non affecté"

    for service in services:
        if service_value in {str(service.get("id") or ""), str(service.get("name") or "")}:
            return service.get("name") or service_value

    return service_value


def _record_belongs_to_service(record: dict, service: dict) -> bool:
    service_id = str(service.get("id") or "")
    service_name = str(service.get("name") or "")
    record_service = str(record.get("service_id") or record.get("service") or "")

    return record_service in {service_id, service_name}


def _belongs_to_service(user: dict, service: dict) -> bool:
    return _record_belongs_to_service(user, service)


def _calculate_progress(total_tasks: int, completed_tasks: int) -> int:
    if total_tasks == 0:
        return 0

    return round((completed_tasks / total_tasks) * 100)


def _count_tasks_in_progress(tasks: list[dict]) -> int:
    return sum(1 for task in tasks if task.get("statut") in IN_PROGRESS_STATUSES)


def _count_tasks_completed(tasks: list[dict]) -> int:
    return sum(1 for task in tasks if task.get("statut") in COMPLETED_STATUSES)


def _count_tasks_blocked(tasks: list[dict]) -> int:
    return sum(1 for task in tasks if task.get("statut") in BLOCKED_STATUSES)


def _count_tasks_late(tasks: list[dict]) -> int:
    today = date.today()
    late_count = 0

    for task in tasks:
        due_date = task.get("date_limite") or task.get("due_date")

        if not due_date or task.get("statut") in COMPLETED_STATUSES:
            continue

        try:
            parsed_due_date = date.fromisoformat(str(due_date).split("T", 1)[0])
        except ValueError:
            continue

        if parsed_due_date < today:
            late_count += 1

    return late_count
