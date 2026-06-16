"""Schemas API des pieces jointes."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AttachmentResponse(BaseModel):
    """Representation API d'une piece jointe."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str | None = None
    subtask_id: str | None = None
    filename: str
    original_filename: str
    file_path: str
    content_type: str | None = None
    size: int
    uploaded_by: str | None = None
    created_at: datetime
