"""Calculs et agregations du tableau de bord.

Le dashboard consolide les donnees provenant des microservices utilisateurs,
services, projets et taches afin de produire les KPI et graphiques du frontend.
"""

from datetime import date
from json import JSONDecodeError
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException, status

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
PENDING_STATUSES = {"A faire", "À faire", "AFaire", "Nouveau"}
COMPLETED_STATUSES = {"Terminé", "Terminée", "DONE", "COMPLETED", "Termine", "Validee"}
BLOCKED_STATUSES = {"Bloqué", "BLOCKED", "Bloque"}
LOW_PRIORITIES = {"Basse", "Faible", "LOW", "Low"}
MEDIUM_PRIORITIES = {"Moyenne", "Normale", "MEDIUM", "Medium"}
HIGH_PRIORITIES = {"Haute", "Urgente", "HIGH", "High", "URGENT"}
FALLBACK_STATISTICS = DashboardStatisticsResponse()


def get_dashboard_statistics() -> StatistiquesTableauBord:
    """Retourne les statistiques historiques du tableau de bord."""
    stats = StatistiquesTableauBord()
    stats.taux_avancement_global = stats.calculerTauxAvancementGlobal()
    return stats


def get_global_dashboard_statistics(authorization: str | None = None) -> DashboardStatisticsResponse:
    """Calcule les KPI globaux visibles par l'utilisateur connecte."""
    # Les donnees sont d'abord recuperees depuis les autres microservices.
    profile = _fetch_current_profile(authorization)
    services, users, projects, tasks = _fetch_dashboard_sources(authorization, profile)
    # Le filtrage applique les droits : Admin voit tout, Manager voit son service, Employee ses taches.
    visible_services = _visible_services(profile, services)
    tasks = _filter_tasks_for_profile(tasks, visible_services, profile)
    projects = _filter_records_for_services(projects, visible_services, profile)

    return DashboardStatisticsResponse(
        total_tasks=len(tasks),
        tasks_in_progress=_count_tasks_in_progress(tasks),
        tasks_completed=_count_tasks_completed(tasks),
        tasks_late=_count_tasks_late(tasks),
        tasks_blocked=_count_tasks_blocked(tasks),
        total_projects=len(projects),
        active_services=sum(1 for service in visible_services if service.get("is_active", True)),
    )


def get_dashboard_analytics(authorization: str | None = None) -> dict:
    """Construit les donnees analytiques utilisees par les graphiques."""
    profile = _fetch_current_profile(authorization)
    services, users, projects, tasks = _fetch_dashboard_sources(authorization, profile)
    visible_services = _visible_services(profile, services)
    visible_users = _filter_records_for_services(users, visible_services, profile)
    visible_projects = _filter_records_for_services(projects, visible_services, profile)
    visible_tasks = _filter_tasks_for_profile(tasks, visible_services, profile)
    stats = get_global_dashboard_statistics(authorization)
    completed = _count_tasks_completed(visible_tasks)
    total_tasks = len(visible_tasks)

    return {
        "kpis": {
            "total_tasks": total_tasks,
            "tasks_in_progress": _count_tasks_in_progress(visible_tasks),
            "tasks_done": completed,
            "tasks_completed": completed,
            "tasks_late": _count_tasks_late(visible_tasks),
            "tasks_blocked": _count_tasks_blocked(visible_tasks),
            "active_services": sum(1 for service in visible_services if service.get("is_active", True)),
            "active_users": sum(1 for user in visible_users if _is_active_user(user)),
            "active_projects": len(visible_projects),
            "total_projects": stats.total_projects,
        },
        "tasks_by_status": _tasks_by_status(visible_tasks),
        "tasks_by_service": _tasks_by_service(visible_tasks, visible_services),
        "workload_by_member": [
            {
                "label": item.full_name,
                "value": item.total_tasks,
                "completed": item.completed_tasks,
                "in_progress": item.in_progress_tasks,
                "blocked": item.blocked_tasks,
            }
            for item in get_members_workload(authorization)
        ],
        "tasks_by_priority": _tasks_by_priority(visible_tasks),
        "global_progress": _calculate_progress(total_tasks, completed),
    }


def get_services_overview(authorization: str | None = None) -> list[DashboardServiceOverviewItem]:
    """Produit une vue synthetique par service."""
    profile = _fetch_current_profile(authorization)
    services, users, projects, tasks = _fetch_dashboard_sources(authorization, profile)
    services = _visible_services(profile, services)
    users = _filter_records_for_services(users, services, profile)
    projects = _filter_records_for_services(projects, services, profile)
    tasks = _filter_tasks_for_profile(tasks, services, profile)

    return [
        _build_service_overview_item(service, users, projects, tasks)
        for service in services
    ]


def get_service_dashboard(service_id: str, authorization: str | None = None) -> DashboardServiceDetail:
    """Retourne le detail d'un service avec ses membres et KPI."""
    profile = _fetch_current_profile(authorization)
    services, users, projects, tasks = _fetch_dashboard_sources(authorization, profile)
    visible_services = _visible_services(profile, services)
    service = _find_service(visible_services, service_id)

    # Un utilisateur non admin ne peut consulter que les services visibles pour son profil.
    if not _is_admin(profile) and not any(str(service.get("id")) in _service_identifiers(item) for item in visible_services):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dashboard service non autorise.")

    users = _filter_records_for_services(users, [service], profile)
    projects = _filter_records_for_services(projects, [service], profile)
    tasks = _filter_tasks_for_profile(tasks, [service], profile)

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
    """Calcule la charge de travail par membre."""
    profile = _fetch_current_profile(authorization)
    services, users, _, tasks = _fetch_dashboard_sources(authorization, profile)
    visible_services = _visible_services(profile, services)
    selected_service = _find_service(visible_services, service_id) if service_id else None
    normalized_search = (search or "").strip().lower()
    users = _filter_records_for_services(users, visible_services, profile)
    tasks = _filter_tasks_for_profile(tasks, visible_services, profile)

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


def _fetch_dashboard_sources(
    authorization: str | None,
    profile: dict | None = None,
) -> tuple[list[dict], list[dict], list[dict], list[dict]]:
    """Recupere les donnees necessaires depuis les microservices."""
    # Les appels sont tolerants aux indisponibilites pour eviter de bloquer tout le dashboard.
    services = _safe_fetch_list(settings.SERVICE_FADESOL_URL, "/api/services/", authorization) or _fallback_services()
    users = _safe_fetch_list(settings.USER_SERVICE_URL, "/api/users/", authorization)
    projects = _safe_fetch_list(settings.PROJECT_SERVICE_URL, "/api/projects/", authorization)
    tasks = _safe_fetch_list(settings.TASK_SERVICE_URL, "/api/tasks/", authorization)

    if not users and profile:
        users = [profile]

    return services, users, projects, tasks


def _safe_fetch_list(base_url: str, path: str, authorization: str | None) -> list[dict]:
    """Retourne une liste vide si un microservice ne repond pas correctement."""
    try:
        return _fetch_list(base_url, path, authorization)
    except (HTTPError, URLError, JSONDecodeError, TimeoutError, ValueError):
        return []


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


def _fetch_current_profile(authorization: str | None) -> dict | None:
    """Recupere le profil courant pour appliquer les filtres de role."""
    if not authorization:
        return None

    try:
        data = _fetch_json(settings.USER_SERVICE_URL, "/api/users/me/profile", authorization)
    except (HTTPError, URLError, JSONDecodeError, TimeoutError, ValueError):
        return None

    return data if isinstance(data, dict) else None


def _fetch_json(base_url: str, path: str, authorization: str | None) -> dict | list:
    url = f"{base_url.rstrip('/')}{path}"
    headers = {"Accept": "application/json"}

    if authorization:
        headers["Authorization"] = authorization

    request = UrlRequest(url, headers=headers, method="GET")

    with urlopen(request, timeout=5) as response:
        data = response.read()

    import json

    return json.loads(data.decode("utf-8"))


def _fallback_services() -> list[dict]:
    """Services de secours pour garder le dashboard lisible hors base complete."""
    return [
        {"id": "commercial", "name": "Commercial", "is_active": True},
        {"id": "technique", "name": "Technique", "is_active": True},
        {"id": "achat", "name": "Achat", "is_active": True},
        {"id": "magasin-stock", "name": "Magasin / Stock", "is_active": True},
        {"id": "comptabilite-management", "name": "Comptabilité & Management", "is_active": True},
        {"id": "direction-rh-administration", "name": "Direction / RH / Administration", "is_active": True},
    ]


def _service_label(service: dict) -> str:
    return (
        service.get("name")
        or service.get("nom")
        or service.get("nom_service")
        or service.get("libelle")
        or service.get("id")
        or "Service"
    )


def _service_identifiers(service: dict) -> set[str]:
    return {
        str(identifier)
        for identifier in [
            service.get("id"),
            service.get("uuid"),
            service.get("name"),
            service.get("nom"),
            service.get("nom_service"),
            service.get("libelle"),
        ]
        if identifier not in {None, ""}
    }


def _find_service(services: list[dict], service_id: str) -> dict:
    for service in services:
        if str(service_id) in _service_identifiers(service):
            return service

    return {"id": service_id, "name": "Service Fadesol", "is_active": True}


def _role(profile: dict | None) -> str:
    return str((profile or {}).get("role") or "").lower()


def _is_admin(profile: dict | None) -> bool:
    return _role(profile) in {"admin", "administrateur"}


def _is_employee(profile: dict | None) -> bool:
    return _role(profile) in {"employee", "employe", "employé"}


def _visible_services(profile: dict | None, services: list[dict]) -> list[dict]:
    """Filtre les services selon le role de l'utilisateur."""
    if not profile or _is_admin(profile):
        return services

    service_value = str(profile.get("service_id") or profile.get("id_service") or profile.get("service") or "")

    if not service_value:
        return []

    return [
        service
        for service in services
        if service_value in _service_identifiers(service)
    ]


def _filter_records_for_services(records: list[dict], services: list[dict], profile: dict | None) -> list[dict]:
    if not profile or _is_admin(profile):
        return records

    if not services:
        return []

    return [record for record in records if any(_record_belongs_to_service(record, service) for service in services)]


def _filter_tasks_for_profile(tasks: list[dict], services: list[dict], profile: dict | None) -> list[dict]:
    """Filtre les taches selon le role et le service de l'utilisateur."""
    if not profile or _is_admin(profile):
        return tasks

    scoped_tasks = [
        task
        for task in tasks
        if any(_record_belongs_to_service(task, service) for service in services)
    ]

    if _is_employee(profile):
        # Un employe voit prioritairement les taches qui lui sont affectees.
        member_ids = _member_identifiers(profile)
        return [
            task
            for task in scoped_tasks
            if _task_belongs_to_member(task, profile)
            or str(task.get("assigned_to") or task.get("assignee_a") or "") in member_ids
        ] or scoped_tasks

    return scoped_tasks


def _build_service_overview_item(
    service: dict,
    users: list[dict],
    projects: list[dict],
    tasks: list[dict],
) -> DashboardServiceOverviewItem:
    """Calcule les KPI d'un service pour la carte de synthese."""
    service_tasks = [task for task in tasks if _record_belongs_to_service(task, service)]
    completed_tasks = _count_tasks_completed(service_tasks)

    return DashboardServiceOverviewItem(
        service_id=str(service.get("id")),
        service_name=_service_label(service),
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
    """Calcule les indicateurs de charge pour un membre."""
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
        if service_value in _service_identifiers(service):
            return str(service.get("id") or service_value)

    return service_value


def _member_service_name(user: dict, services: list[dict]) -> str:
    service_value = str(user.get("service_id") or user.get("service") or "")

    if not service_value:
        return "Non affecté"

    for service in services:
        if service_value in _service_identifiers(service):
            return _service_label(service)

    return service_value


def _record_belongs_to_service(record: dict, service: dict) -> bool:
    record_service = str(record.get("service_id") or record.get("id_service") or record.get("service") or "")

    return record_service in _service_identifiers(service)


def _belongs_to_service(user: dict, service: dict) -> bool:
    return _record_belongs_to_service(user, service)


def _calculate_progress(total_tasks: int, completed_tasks: int) -> int:
    if total_tasks == 0:
        return 0

    return round((completed_tasks / total_tasks) * 100)


def _count_tasks_in_progress(tasks: list[dict]) -> int:
    return sum(1 for task in tasks if _task_status(task) in IN_PROGRESS_STATUSES)


def _count_tasks_completed(tasks: list[dict]) -> int:
    return sum(1 for task in tasks if _task_status(task) in COMPLETED_STATUSES)


def _count_tasks_blocked(tasks: list[dict]) -> int:
    return sum(1 for task in tasks if _task_status(task) in BLOCKED_STATUSES)


def _count_tasks_late(tasks: list[dict]) -> int:
    """Compte les taches non terminees dont la date limite est depassee."""
    today = date.today()
    late_count = 0

    for task in tasks:
        due_date = task.get("date_limite") or task.get("due_date")

        if not due_date or _task_status(task) in COMPLETED_STATUSES:
            continue

        try:
            parsed_due_date = date.fromisoformat(str(due_date).split("T", 1)[0])
        except ValueError:
            continue

        if parsed_due_date < today:
            late_count += 1

    return late_count


def _task_status(task: dict) -> str | None:
    return task.get("statut") or task.get("status")


def _task_priority(task: dict) -> str | None:
    return task.get("priorite") or task.get("priority")


def _group_tasks_by_field(tasks: list[dict], *fields: str) -> list[dict]:
    grouped: dict[str, int] = {}

    for task in tasks:
        label = next((str(task.get(field)) for field in fields if task.get(field)), "Non renseigne")
        grouped[label] = grouped.get(label, 0) + 1

    return [{"label": label, "value": value} for label, value in grouped.items()]


def _tasks_by_status(tasks: list[dict]) -> list[dict]:
    """Regroupe les taches par statut normalise pour les graphiques."""
    counters = {
        "À faire": 0,
        "En cours": 0,
        "Terminée": 0,
        "Bloquée": 0,
        "En retard": _count_tasks_late(tasks),
    }

    for task in tasks:
        status_value = str(_task_status(task) or "")

        if status_value in PENDING_STATUSES:
            counters["À faire"] += 1
        elif status_value in IN_PROGRESS_STATUSES:
            counters["En cours"] += 1
        elif status_value in COMPLETED_STATUSES:
            counters["Terminée"] += 1
        elif status_value in BLOCKED_STATUSES:
            counters["Bloquée"] += 1

    return [{"label": label, "value": value} for label, value in counters.items()]


def _tasks_by_priority(tasks: list[dict]) -> list[dict]:
    """Regroupe les taches par priorite normalisee."""
    counters = {"Basse": 0, "Moyenne": 0, "Haute": 0}

    for task in tasks:
        priority_value = str(_task_priority(task) or "")

        if priority_value in LOW_PRIORITIES:
            counters["Basse"] += 1
        elif priority_value in HIGH_PRIORITIES:
            counters["Haute"] += 1
        elif priority_value in MEDIUM_PRIORITIES or priority_value:
            counters["Moyenne"] += 1

    return [{"label": label, "value": value} for label, value in counters.items()]


def _tasks_by_service(tasks: list[dict], services: list[dict]) -> list[dict]:
    items = []

    for service in services:
        service_tasks = [task for task in tasks if _record_belongs_to_service(task, service)]
        items.append({
            "label": _service_label(service),
            "value": len(service_tasks),
        })

    return items
