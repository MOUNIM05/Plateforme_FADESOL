"""Logique metier des pieces jointes."""

import os
import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attachment import Attachment
from app.models.subtask import SubTask
from app.models.task import Task
from shared.exceptions import not_found


def _safe_original_filename(filename: str | None) -> str:
    cleaned = Path(filename or "fichier").name.strip()
    return cleaned or "fichier"


def _extension(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    return suffix


def _stored_filename(original_filename: str) -> str:
    stem = Path(original_filename).stem
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "-", stem).strip(".-") or "piece-jointe"
    extension = _extension(original_filename)
    return f"{uuid4()}-{stem}.{extension}"


def _ensure_upload_dir() -> Path:
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _validate_parent(db: Session, task_id: str, subtask_id: str | None = None) -> None:
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise not_found("Tache introuvable.")

    if subtask_id:
        subtask = db.query(SubTask).filter(SubTask.id == subtask_id, SubTask.task_id == task_id).first()

        if not subtask:
            raise not_found("Sous-tache introuvable pour cette tache.")


def _validate_upload(file: UploadFile) -> str:
    original_filename = _safe_original_filename(file.filename)
    extension = _extension(original_filename)

    if extension not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type de fichier non autorise.",
        )

    return original_filename


def create_attachment(
    db: Session,
    file: UploadFile,
    task_id: str,
    subtask_id: str | None = None,
    uploaded_by: str | None = None,
) -> Attachment:
    """Stocke un fichier et cree son enregistrement en base."""
    _validate_parent(db, task_id, subtask_id)
    original_filename = _validate_upload(file)
    upload_dir = _ensure_upload_dir()
    stored_filename = _stored_filename(original_filename)
    target_path = upload_dir / stored_filename
    size = 0

    try:
        with target_path.open("wb") as destination:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > settings.MAX_UPLOAD_SIZE_BYTES:
                    destination.close()
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Fichier trop grand. Taille maximale autorisee : 10 MB.",
                    )
                destination.write(chunk)
    finally:
        file.file.close()

    attachment = Attachment(
        task_id=task_id,
        subtask_id=subtask_id,
        filename=stored_filename,
        original_filename=original_filename,
        file_path=str(target_path),
        content_type=file.content_type,
        size=size,
        uploaded_by=uploaded_by,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment


def list_task_attachments(db: Session, task_id: str) -> list[Attachment]:
    _validate_parent(db, task_id)
    return db.query(Attachment).filter(Attachment.task_id == task_id, Attachment.subtask_id.is_(None)).all()


def list_subtask_attachments(db: Session, task_id: str, subtask_id: str) -> list[Attachment]:
    _validate_parent(db, task_id, subtask_id)
    return db.query(Attachment).filter(Attachment.task_id == task_id, Attachment.subtask_id == subtask_id).all()


def delete_attachment(db: Session, task_id: str, attachment_id: str, subtask_id: str | None = None) -> None:
    _validate_parent(db, task_id, subtask_id)

    query = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.task_id == task_id)

    if subtask_id:
        query = query.filter(Attachment.subtask_id == subtask_id)
    else:
        query = query.filter(Attachment.subtask_id.is_(None))

    attachment = query.first()

    if not attachment:
        raise not_found("Piece jointe introuvable.")

    file_path = Path(attachment.file_path)
    db.delete(attachment)
    db.commit()

    if file_path.exists():
        try:
            os.remove(file_path)
        except OSError:
            pass
