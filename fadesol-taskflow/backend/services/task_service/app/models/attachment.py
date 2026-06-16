"""Modele ORM des pieces jointes de taches et sous-taches."""

from uuid import uuid4

from sqlalchemy import BigInteger, Column, DateTime, String
from sqlalchemy.sql import func

from app.db.database import Base


class Attachment(Base):
    """Piece jointe rattachee a une tache ou une sous-tache."""

    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()), index=True)
    task_id = Column(String(36), nullable=True, index=True)
    subtask_id = Column(String(36), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    content_type = Column(String(120), nullable=True)
    size = Column(BigInteger, nullable=False)
    uploaded_by = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
