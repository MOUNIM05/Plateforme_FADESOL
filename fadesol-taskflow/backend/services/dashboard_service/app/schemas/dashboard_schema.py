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
