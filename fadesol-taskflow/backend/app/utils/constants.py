from enum import Enum

# Ce fichier contient les valeurs fixes utilisées dans la plateforme.
# On utilise Enum pour éviter les erreurs d'écriture dans les rôles, statuts et priorités.


class UserRole(str, Enum):
    # Les trois rôles principaux de l'application
    ADMIN = "Administrateur"
    MANAGER = "Manager"
    EMPLOYEE = "Employé"


class ProjectStatus(str, Enum):
    # Les statuts possibles pour un projet
    NEW = "Nouveau"
    IN_PROGRESS = "En cours"
    WAITING = "En attente"
    BLOCKED = "Bloqué"
    DONE = "Terminé"
    CANCELED = "Annulé"


class TaskStatus(str, Enum):
    # Les statuts possibles pour une tâche ou une sous-tâche
    NEW = "Nouveau"
    TODO = "À faire"
    IN_PROGRESS = "En cours"
    WAITING = "En attente"
    BLOCKED = "Bloqué"
    TO_VALIDATE = "À valider"
    DONE = "Terminé"
    CANCELED = "Annulé"


class Priority(str, Enum):
    # Les niveaux de priorité utilisés dans les projets et les tâches
    URGENT = "Urgente"
    HIGH = "Haute"
    NORMAL = "Normale"
    LOW = "Faible"