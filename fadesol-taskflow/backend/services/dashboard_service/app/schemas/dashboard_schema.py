from pydantic import BaseModel


class StatistiquesTableauBord(BaseModel):
    total_taches: int = 0
    taches_en_cours: int = 0
    taches_terminees: int = 0
    taches_en_retard: int = 0
    taches_bloquees: int = 0
    taches_par_service: int = 0
    taches_par_priorite: int = 0
    projets_en_cours: int = 0
    taux_avancement_global: float = 0.0

    def calculerTauxAvancementGlobal(self) -> float:
        if self.total_taches == 0:
            return 0.0
        return round((self.taches_terminees / self.total_taches) * 100, 2)


class DashboardStatisticsResponse(BaseModel):
    total_tasks: int = 124
    tasks_in_progress: int = 36
    tasks_completed: int = 87
    tasks_late: int = 9
    tasks_blocked: int = 4
    total_projects: int = 18
    active_services: int = 6


class DashboardServiceMember(BaseModel):
    id: int | str
    full_name: str
    email: str
    role: str


class DashboardServiceOverviewItem(BaseModel):
    service_id: str
    service_name: str
    total_members: int = 0
    total_projects: int = 0
    total_tasks: int = 0
    tasks_in_progress: int = 0
    tasks_completed: int = 0
    tasks_late: int = 0
    tasks_blocked: int = 0
    progress: int = 0


class DashboardServiceDetail(DashboardServiceOverviewItem):
    members: list[DashboardServiceMember] = []


class DashboardMemberWorkloadItem(BaseModel):
    member_id: str
    full_name: str
    email: str
    role: str
    service_id: str | None = None
    service_name: str
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    in_progress_tasks: int = 0
    blocked_tasks: int = 0
    progression: int = 0
