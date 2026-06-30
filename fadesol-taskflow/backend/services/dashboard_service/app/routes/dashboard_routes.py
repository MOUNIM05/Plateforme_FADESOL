"""Routes HTTP du dashboard.

Les endpoints exposent des agregations calculees depuis les microservices.
La dependance require_dashboard_user garantit que seuls les utilisateurs
autorises peuvent consulter les statistiques.
"""

from fastapi import APIRouter, Depends, Header, Query

from app.core.security import require_dashboard_user
from app.schemas.dashboard_schema import (
    DashboardMemberWorkloadItem,
    DashboardServiceDetail,
    DashboardServiceOverviewItem,
    DashboardStatisticsResponse,
    StatistiquesTableauBord,
)
from app.schemas.service_statistic_schema import StatistiqueService
from app.services.dashboard_service import (
    get_dashboard_analytics,
    get_dashboard_statistics,
    get_global_dashboard_statistics,
    get_members_workload,
    get_service_dashboard,
    get_service_statistics,
    get_services_overview,
)


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", dependencies=[Depends(require_dashboard_user)])
def global_dashboard(authorization: str | None = Header(default=None)):
    """Alias historique de /analytics pour la page dashboard."""
    return get_dashboard_analytics(authorization)


@router.get("/analytics", dependencies=[Depends(require_dashboard_user)])
def dashboard_analytics(authorization: str | None = Header(default=None)):
    """Retourne les donnees de graphiques et KPI analytiques."""
    return get_dashboard_analytics(authorization)


@router.get(
    "/statistics",
    response_model=DashboardStatisticsResponse,
    dependencies=[Depends(require_dashboard_user)],
)
def global_statistics(authorization: str | None = Header(default=None)):
    """Retourne les compteurs principaux visibles par le profil courant."""
    return get_global_dashboard_statistics(authorization)


@router.get(
    "/services-overview",
    response_model=list[DashboardServiceOverviewItem],
    dependencies=[Depends(require_dashboard_user)],
)
def services_overview(authorization: str | None = Header(default=None)):
    return get_services_overview(authorization)


@router.get(
    "/members-workload",
    response_model=list[DashboardMemberWorkloadItem],
    dependencies=[Depends(require_dashboard_user)],
)
def members_workload(
    service_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
):
    """Retourne la charge par membre, filtrable par service ou recherche."""
    return get_members_workload(authorization, service_id, search)


@router.get(
    "/service/{service_id}",
    response_model=DashboardServiceDetail,
    dependencies=[Depends(require_dashboard_user)],
)
def service_detail(service_id: str, authorization: str | None = Header(default=None)):
    return get_service_dashboard(service_id, authorization)


@router.get("/services/{service_id}", response_model=StatistiqueService)
def service_dashboard(service_id: str):
    return get_service_statistics(service_id)
