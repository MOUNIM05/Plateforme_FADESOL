"""Exports des modeles du service taches."""

from app.models.subtask import SousTache, SubTask
from app.models.task import Tache, Task

# Ces imports assurent que SQLAlchemy connait Task et SubTask avant create_all.
