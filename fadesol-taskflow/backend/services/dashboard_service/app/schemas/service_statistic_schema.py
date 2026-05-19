from pydantic import BaseModel


class StatistiqueService(BaseModel):
    service_id: str
    nom_service: str
    nombre_membres: int = 0
    total_taches: int = 0
    taches_en_cours: int = 0
    taches_terminees: int = 0
    taches_en_retard: int = 0
    taches_bloquees: int = 0
    taux_avancement: float = 0.0

    def calculerChargeParMembre(self) -> float:
        if self.nombre_membres == 0:
            return 0.0
        return round(self.total_taches / self.nombre_membres, 2)

    def calculerAvancementService(self) -> float:
        if self.total_taches == 0:
            return 0.0
        return round((self.taches_terminees / self.total_taches) * 100, 2)
