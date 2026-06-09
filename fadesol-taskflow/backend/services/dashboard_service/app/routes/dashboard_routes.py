from fastapi import APIRouter, Depends, Header, Query

from app.core.security import require_admin_or_manager
from app.schemas.dashboard_schema import (
    DashboardMemberWorkloadItem,
    DashboardServiceDetail,
    DashboardServiceOverviewItem,
    DashboardStatisticsResponse,
    StatistiquesTableauBord,
)
from app.schemas.service_statistic_schema import StatistiqueService
from app.services.dashboard_service import (
    get_dashboard_statistics,
    get_global_dashboard_statistics,
    get_members_workload,
    get_service_dashboard,
    get_service_statistics,
    get_services_overview,
)


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=StatistiquesTableauBord)
def global_dashboard():
    return get_dashboard_statistics()


@router.get(
    "/statistics",
    response_model=DashboardStatisticsResponse,
    dependencies=[Depends(require_admin_or_manager)],
)
def global_statistics(authorization: str | None = Header(default=None)):
    return get_global_dashboard_statistics(authorization)


@router.get(
    "/services-overview",
    response_model=list[DashboardServiceOverviewItem],
    dependencies=[Depends(require_admin_or_manager)],
)
def services_overview(authorization: str | None = Header(default=None)):
    return get_services_overview(authorization)


@router.get(
    "/members-workload",
    response_model=list[DashboardMemberWorkloadItem],
    dependencies=[Depends(require_admin_or_manager)],
)
def members_workload(
    service_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
):
    return get_members_workload(authorization, service_id, search)


@router.get(
    "/service/{service_id}",
    response_model=DashboardServiceDetail,
    dependencies=[Depends(require_admin_or_manager)],
)
def service_detail(service_id: str, authorization: str | None = Header(default=None)):
    return get_service_dashboard(service_id, authorization)


@router.get("/services/{service_id}", response_model=StatistiqueService)
def service_dashboard(service_id: str):
    return get_service_statistics(service_id)
