from fastapi import APIRouter

from app.schemas.dashboard_schema import StatistiquesTableauBord
from app.schemas.service_statistic_schema import StatistiqueService
from app.services.dashboard_service import get_dashboard_statistics, get_service_statistics


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=StatistiquesTableauBord)
def global_dashboard():
    return get_dashboard_statistics()


@router.get("/services/{service_id}", response_model=StatistiqueService)
def service_dashboard(service_id: str):
    return get_service_statistics(service_id)
