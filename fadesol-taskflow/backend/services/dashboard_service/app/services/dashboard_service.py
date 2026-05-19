from app.schemas.dashboard_schema import StatistiquesTableauBord
from app.schemas.service_statistic_schema import StatistiqueService


def get_dashboard_statistics() -> StatistiquesTableauBord:
    stats = StatistiquesTableauBord()
    stats.taux_avancement_global = stats.calculerTauxAvancementGlobal()
    return stats


def get_service_statistics(service_id: str) -> StatistiqueService:
    stats = StatistiqueService(service_id=service_id, nom_service="Service Fadesol")
    stats.taux_avancement = stats.calculerAvancementService()
    return stats
