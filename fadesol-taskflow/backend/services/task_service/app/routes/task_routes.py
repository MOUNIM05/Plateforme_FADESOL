"""Routes HTTP des taches principales et routes imbriquees des sous-taches."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.subtask_schema import SubTaskAssign, SubTaskCreate, SubTaskResponse
from app.schemas.task_schema import (
    TaskAssign,
    TaskClickUpSync,
    TaskCreate,
    TaskImportFromClickUp,
    TaskProgressResponse,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
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
    mark_task_clickup_sync,
    resolve_current_user_uuid,
    synchroniser_clickup,
    update_task,
    update_task_status,
    upsert_task_from_clickup,
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
    db: Session = Depends(get_db),
):
    """Retourne les taches avec filtres optionnels."""
    # Liste les taches avec filtres optionnels par statut, priorite et utilisateur assigne.
    assigned_filter = assigned_to

    if assigned_to == "me":
        # Le filtre "me" est resolu via user_service a partir du token transmis dans les headers.
        assigned_filter = resolve_current_user_uuid(request.headers.get("authorization"))

    return get_tasks(db, skip=skip, limit=limit, status=status, priority=priority, assigned_to=assigned_filter)


@router.post("/", response_model=TaskResponse)
def create(payload: TaskCreate, db: Session = Depends(get_db)):
    """Cree une tache principale."""
    # Cree une tache locale dans la table taches.
    return create_task(db, payload)


@router.post("/import-clickup", response_model=TaskResponse)
def import_clickup(payload: TaskImportFromClickUp, db: Session = Depends(get_db)):
    """Importe ou met a jour une tache depuis ClickUp."""
    # Cree ou met a jour une tache provenant de ClickUp grace a son identifiant distant.
    return upsert_task_from_clickup(db, payload)


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


@router.get("/{task_id}", response_model=TaskResponse)
def get_one(task_id: str, db: Session = Depends(get_db)):
    """Retourne une tache precise."""
    # Consultation d'une tache precise par son UUID.
    task = get_task_by_id(db, task_id)

    if not task:
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


@router.patch("/{task_id}/clickup-sync", response_model=TaskResponse)
def mark_clickup_sync(task_id: str, payload: TaskClickUpSync, db: Session = Depends(get_db)):
    """Enregistre l'identifiant ClickUp d'une tache synchronisee."""
    # Endpoint interne appele par clickup_service apres creation de la tache dans ClickUp.
    return mark_task_clickup_sync(db, task_id, payload)


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
def legacy_get_one(task_id: str, db: Session = Depends(get_db)):
    """Retourne une tache via l'ancienne route /taches."""
    return get_one(task_id, db)


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


@legacy_router.patch("/{task_id}/clickup", response_model=TaskResponse)
def sync_clickup(task_id: str, clickup_task_id: str | None = None, db: Session = Depends(get_db)):
    """Marque une tache comme synchronisee avec ClickUp."""
    # Marque manuellement une tache comme synchronisee avec ClickUp.
    return synchroniser_clickup(db, task_id, clickup_task_id)


@legacy_router.delete("/{task_id}", response_model=MessageResponse)
def legacy_delete(task_id: str, db: Session = Depends(get_db)):
    """Supprime une tache via l'ancienne route /taches."""
    delete_task(db, task_id)
    return {"message": "Tache supprimee avec succes."}
