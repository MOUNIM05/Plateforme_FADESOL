from enum import Enum


class UserRole(str, Enum):
    ADMIN = "Administrateur"
    MANAGER = "Manager"
    EMPLOYEE = "Employé"


class ProjectStatus(str, Enum):
    NEW = "Nouveau"
    IN_PROGRESS = "En cours"
    WAITING = "En attente"
    BLOCKED = "Bloqué"
    DONE = "Terminé"
    CANCELED = "Annulé"


class TaskStatus(str, Enum):
    NEW = "Nouveau"
    TODO = "À faire"
    IN_PROGRESS = "En cours"
    WAITING = "En attente"
    BLOCKED = "Bloqué"
    TO_VALIDATE = "À valider"
    DONE = "Terminé"
    CANCELED = "Annulé"


class Priority(str, Enum):
    URGENT = "Urgente"
    HIGH = "Haute"
    NORMAL = "Normale"
    LOW = "Faible"
