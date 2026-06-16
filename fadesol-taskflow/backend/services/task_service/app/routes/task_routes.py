"""Routes HTTP des taches principales et routes imbriquees des sous-taches."""

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.attachment_schema import AttachmentResponse
from app.schemas.subtask_schema import SubTaskAssign, SubTaskCreate, SubTaskResponse
from app.schemas.task_schema import (
    TaskAssign,
    TaskCreate,
    TaskProgressResponse,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services.attachment_service import (
    create_attachment,
    delete_attachment,
    list_subtask_attachments,
    list_task_attachments,
)
from app.services.subtask_service import (
    assign_subtask,
    calculate_task_progress,
    create_subtask,
    get_subtask_by_id,
    get_subtasks_by_task,
)
from app.services.task_service import (
    assign_task,
    assigner_task,
    changer_statut_task,
    create_task,
    delete_task,
    get_task_by_id,
    get_tasks,
    resolve_current_user_uuid,
    resolve_current_user_profile,
    scoped_task_filters,
    can_access_task,
    update_task,
    update_task_status,
)
from shared.enums import StatutTache
from shared.exceptions import not_found
from shared.responses import MessageResponse


router = APIRouter(prefix="/tasks", tags=["Tasks"])
legacy_router = APIRouter(prefix="/taches", tags=["Taches"])


@router.get("/", response_model=list[TaskResponse])
def list_all(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    priority: str | None = None,
    assigned_to: str | None = None,
    service_id: str | None = None,
    db: Session = Depends(get_db),
):
    """Retourne les taches avec filtres optionnels."""
    # Liste les taches avec filtres optionnels par statut, priorite et utilisateur assigne.
    assigned_filter, service_filter = scoped_task_filters(
        request.headers.get("authorization"),
        assigned_to=assigned_to,
        service_id=service_id,
    )

    return get_tasks(db, skip=skip, limit=limit, status=status, priority=priority, assigned_to=assigned_filter, service_id=service_filter)


@router.post("/", response_model=TaskResponse)
def create(payload: TaskCreate, db: Session = Depends(get_db)):
    """Cree une tache principale."""
    # Cree une tache locale dans la table taches.
    return create_task(db, payload)


@router.get("/{task_id}/progress", response_model=TaskProgressResponse)
def get_task_progress(task_id: str, db: Session = Depends(get_db)):
    """Retourne la progression calculee d'une tache."""
    # Retourne le pourcentage d'avancement calcule depuis les sous-taches terminees.
    return calculate_task_progress(db, task_id)


@router.get("/{task_id}/subtasks", response_model=list[SubTaskResponse])
def list_task_subtasks(task_id: str, db: Session = Depends(get_db)):
    """Liste les sous-taches d'une tache principale."""
    # Liste les sous-taches rattachees a une tache principale.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache principale introuvable.")

    return get_subtasks_by_task(db, task_id)


@router.post("/{task_id}/subtasks", response_model=SubTaskResponse)
def create_task_subtask(task_id: str, payload: SubTaskCreate, db: Session = Depends(get_db)):
    """Cree une sous-tache pour une tache principale."""
    # Cree une sous-tache en utilisant le task_id de l'URL pour garantir le lien avec la tache principale.
    return create_subtask(db, task_id, payload)


@router.patch("/{task_id}/subtasks/{subtask_id}/assign", response_model=SubTaskResponse)
def assign_task_subtask(task_id: str, subtask_id: str, payload: SubTaskAssign, db: Session = Depends(get_db)):
    """Affecte une sous-tache dans le contexte de sa tache principale."""
    # Affecte une sous-tache a un service et/ou un membre, en conservant le contexte de la tache principale.
    subtask = get_subtask_by_id(db, subtask_id)

    if not subtask or subtask.task_id != task_id:
        raise not_found("Sous-tache introuvable pour cette tache.")

    return assign_subtask(db, subtask_id, payload)


@router.post("/{task_id}/attachments", response_model=AttachmentResponse)
def upload_task_attachment(
    task_id: str,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Ajoute une piece jointe a une tache."""
    uploaded_by = None

    if request.headers.get("authorization"):
        uploaded_by = resolve_current_user_uuid(request.headers.get("authorization"))

    return create_attachment(db, file=file, task_id=task_id, uploaded_by=uploaded_by)


@router.get("/{task_id}/attachments", response_model=list[AttachmentResponse])
def get_task_attachments(task_id: str, db: Session = Depends(get_db)):
    """Liste les pieces jointes d'une tache."""
    return list_task_attachments(db, task_id)


@router.delete("/{task_id}/attachments/{attachment_id}", response_model=MessageResponse)
def remove_task_attachment(task_id: str, attachment_id: str, db: Session = Depends(get_db)):
    """Supprime une piece jointe de tache."""
    delete_attachment(db, task_id=task_id, attachment_id=attachment_id)
    return {"message": "Piece jointe supprimee avec succes."}


@router.post("/{task_id}/subtasks/{subtask_id}/attachments", response_model=AttachmentResponse)
def upload_subtask_attachment(
    task_id: str,
    subtask_id: str,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Ajoute une piece jointe a une sous-tache."""
    uploaded_by = None

    if request.headers.get("authorization"):
        uploaded_by = resolve_current_user_uuid(request.headers.get("authorization"))

    return create_attachment(db, file=file, task_id=task_id, subtask_id=subtask_id, uploaded_by=uploaded_by)


@router.get("/{task_id}/subtasks/{subtask_id}/attachments", response_model=list[AttachmentResponse])
def get_subtask_attachments(task_id: str, subtask_id: str, db: Session = Depends(get_db)):
    """Liste les pieces jointes d'une sous-tache."""
    return list_subtask_attachments(db, task_id, subtask_id)


@router.delete("/{task_id}/subtasks/{subtask_id}/attachments/{attachment_id}", response_model=MessageResponse)
def remove_subtask_attachment(task_id: str, subtask_id: str, attachment_id: str, db: Session = Depends(get_db)):
    """Supprime une piece jointe de sous-tache."""
    delete_attachment(db, task_id=task_id, subtask_id=subtask_id, attachment_id=attachment_id)
    return {"message": "Piece jointe supprimee avec succes."}


@router.get("/{task_id}", response_model=TaskResponse)
def get_one(task_id: str, request: Request, db: Session = Depends(get_db)):
    """Retourne une tache precise."""
    # Consultation d'une tache precise par son UUID.
    task = get_task_by_id(db, task_id)

    if not task:
        raise not_found("Tache introuvable.")

    profile = resolve_current_user_profile(request.headers.get("authorization"))
    if not can_access_task(task, profile):
        raise not_found("Tache introuvable.")

    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    """Met a jour une tache."""
    # Modifie les champs envoyes dans le payload sans changer les autres.
    return update_task(db, task_id, payload)


@router.patch("/{task_id}/assign", response_model=TaskResponse)
def assign_with_payload(task_id: str, payload: TaskAssign, db: Session = Depends(get_db)):
    """Affecte une tache a un utilisateur."""
    # Affecte la tache a un utilisateur identifie par UUID.
    return assign_task(db, task_id, payload)


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_status(task_id: str, payload: TaskStatusUpdate, db: Session = Depends(get_db)):
    """Met a jour uniquement le statut d'une tache."""
    # Endpoint specialise pour changer uniquement le statut d'une tache.
    return update_task_status(db, task_id, payload)


@router.delete("/{task_id}", response_model=MessageResponse)
def delete(task_id: str, db: Session = Depends(get_db)):
    """Supprime une tache."""
    # Supprime une tache de la base task_db.
    delete_task(db, task_id)
    return {"message": "Tache supprimee avec succes."}


@legacy_router.get("/", response_model=list[TaskResponse])
def legacy_list_all(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    statut: str | None = None,
    priorite: str | None = None,
    assignee_a: str | None = None,
    db: Session = Depends(get_db),
):
    """Liste les taches avec les noms de parametres historiques en francais."""
    # Routes historiques en francais gardees pour compatibilite avec l'ancien frontend ou les tests.
    assigned_filter = assignee_a

    if assignee_a == "me":
        assigned_filter = resolve_current_user_uuid(request.headers.get("authorization"))

    return get_tasks(db, skip=skip, limit=limit, status=statut, priority=priorite, assigned_to=assigned_filter)


@legacy_router.post("/", response_model=TaskResponse)
def legacy_create(payload: TaskCreate, db: Session = Depends(get_db)):
    """Cree une tache via l'ancienne route /taches."""
    return create_task(db, payload)


@legacy_router.get("/{task_id}", response_model=TaskResponse)
def legacy_get_one(task_id: str, request: Request, db: Session = Depends(get_db)):
    """Retourne une tache via l'ancienne route /taches."""
    return get_one(task_id, request, db)


@legacy_router.put("/{task_id}", response_model=TaskResponse)
def legacy_update(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    """Met a jour une tache via l'ancienne route /taches."""
    return update_task(db, task_id, payload)


@legacy_router.patch("/{task_id}/assigner/{utilisateur_id}", response_model=TaskResponse)
def legacy_assign(task_id: str, utilisateur_id: str, db: Session = Depends(get_db)):
    """Affecte une tache via l'ancienne route en francais."""
    return assigner_task(db, task_id, utilisateur_id)


@legacy_router.patch("/{task_id}/statut/{statut}", response_model=TaskResponse)
def change_status(task_id: str, statut: StatutTache, db: Session = Depends(get_db)):
    """Change le statut via l'ancienne route en francais."""
    return changer_statut_task(db, task_id, statut)


@legacy_router.delete("/{task_id}", response_model=MessageResponse)
def legacy_delete(task_id: str, db: Session = Depends(get_db)):
    """Supprime une tache via l'ancienne route /taches."""
    delete_task(db, task_id)
    return {"message": "Tache supprimee avec succes."}
