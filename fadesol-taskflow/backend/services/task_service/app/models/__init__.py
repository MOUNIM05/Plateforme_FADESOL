"""Exports des modeles du service taches."""

from app.models.attachment import Attachment
from app.models.subtask import SousTache, SubTask
from app.models.task import Tache, Task

# Ces imports assurent que SQLAlchemy connait Task, SubTask et Attachment avant create_all.
