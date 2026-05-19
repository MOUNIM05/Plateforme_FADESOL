from enum import Enum


class UserRole(str, Enum):
    ADMIN = "Admin"
    MANAGER = "Manager"
    EMPLOYEE = "Employee"


class RoleUtilisateur(str, Enum):
    ADMINISTRATEUR = "Administrateur"
    MANAGER = "Manager"
    EMPLOYE = "Employe"


class FadesolService(str, Enum):
    COMMERCIAL = "Commercial"
    TECHNIQUE = "Technique"
    ACHAT = "Achat"
    MAGASIN_STOCK = "MagasinStock"
    COMPTABILITE_MANAGEMENT = "ComptabiliteManagement"
    DIRECTION_RH_ADMINISTRATION = "DirectionRHAdministration"


class ServiceFadesol(str, Enum):
    COMMERCIAL = "Commercial"
    TECHNIQUE = "Technique"
    ACHAT = "Achat"
    MAGASIN_STOCK = "MagasinStock"
    COMPTABILITE_MANAGEMENT = "ComptabiliteManagement"
    DIRECTION_RH_ADMINISTRATION = "DirectionRHAdministration"


class StatutProjet(str, Enum):
    NOUVEAU = "Nouveau"
    EN_COURS = "EnCours"
    EN_ATTENTE = "EnAttente"
    BLOQUE = "Bloque"
    TERMINE = "Termine"
    ANNULE = "Annule"


class StatutTache(str, Enum):
    NOUVEAU = "Nouveau"
    A_FAIRE = "AFaire"
    EN_COURS = "EnCours"
    EN_ATTENTE = "EnAttente"
    BLOQUE = "Bloque"
    VALIDEE = "Validee"
    TERMINE = "Termine"
    ANNULE = "Annule"


class Priorite(str, Enum):
    URGENTE = "Urgente"
    HAUTE = "Haute"
    NORMALE = "Normale"
    FAIBLE = "Faible"


class StatutSynchronisation(str, Enum):
    EN_ATTENTE = "EnAttente"
    SUCCES = "Succes"
    ECHEC = "Echec"


# Compatibility aliases for existing English naming conventions.
ProjectStatus = StatutProjet
TaskStatus = StatutTache
Priority = Priorite
SyncStatus = StatutSynchronisation
