"""Routes HTTP du microservice ClickUp.

Ces routes isolent l'API ClickUp derriere le backend. Le frontend passe par
l'API Gateway et ne manipule jamais le token ClickUp.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.clickup_schema import (
    ClickUpApiResponse,
    ClickUpConnectionResponse,
    ClickUpFolderResponse,
    ClickUpListResponse,
    ClickUpSpaceResponse,
    ClickUpStructureResponse,
    ClickUpSyncTaskResponse,
)
from app.schemas.clickup_sync_schema import ClickUpSyncCreate, ClickUpSyncResponse, ClickUpSyncUpdate
from app.services.clickup_service import (
    create_sync_log,
    get_clickup_structure,
    get_clickup_folders,
    get_clickup_lists,
    get_clickup_spaces,
    get_clickup_workspaces,
    get_sync_log,
    list_sync_logs,
    mark_failed,
    mark_success,
    sync_task_to_clickup,
    sync_tasks_placeholder,
    test_clickup_connection,
    update_sync_log,
)
from shared.exceptions import not_found


# Router dedie aux journaux de synchronisation stockes dans clickup_db.
router = APIRouter(prefix="/clickup/sync-logs", tags=["ClickUp"])

# Router principal pour les operations ClickUp : test connexion, structure, sync de tache.
placeholder_router = APIRouter(prefix="/clickup", tags=["ClickUp"])


@placeholder_router.get("/")
def clickup_status():
    """Indique que le module ClickUp est disponible."""
    # Route de diagnostic simple, utile pour verifier le proxy /api/clickup.
    return {
        "status": "ok",
        "service": "clickup_service",
        "message": "Service ClickUp disponible",
    }


@placeholder_router.post("/sync-tasks")
def sync_tasks():
    """Placeholder historique pour une future synchronisation globale."""
    # Cette route garde une compatibilite avec les premiers tests avant la sync reelle.
    return sync_tasks_placeholder()


@placeholder_router.post("/sync-task/{task_id}", response_model=ClickUpSyncTaskResponse)
def sync_task(task_id: str):
    """Synchronise une tache interne precise vers ClickUp."""
    # Orchestre : recuperation task_service -> creation ClickUp -> sauvegarde clickup_task_id.
    return sync_task_to_clickup(task_id)


@placeholder_router.get("/test-connection", response_model=ClickUpConnectionResponse)
def test_connection():
    """Teste la connexion a ClickUp avec le token configure cote backend."""
    # Le token reste dans le backend : seule une reponse ok/error est retournee.
    return test_clickup_connection()


@placeholder_router.get("/workspaces", response_model=ClickUpApiResponse)
def workspaces():
    """Retourne les workspaces accessibles par le token ClickUp."""
    # Cette route aide a identifier le CLICKUP_WORKSPACE_ID a placer dans .env.
    return get_clickup_workspaces()


@placeholder_router.get("/spaces", response_model=list[ClickUpSpaceResponse])
def spaces():
    """Retourne les espaces ClickUp du workspace configure."""
    # Reponse simplifiee pour alimenter un select ou une liste dans le frontend.
    return get_clickup_spaces()


@placeholder_router.get("/folders", response_model=list[ClickUpFolderResponse])
def folders(space_id: str | None = Query(default=None)):
    """Retourne les folders d'un espace ClickUp."""
    # space_id peut venir de la query; sinon le service utilise CLICKUP_SPACE_ID.
    return get_clickup_folders(space_id)


@placeholder_router.get("/lists", response_model=list[ClickUpListResponse])
def lists(folder_id: str | None = Query(default=None), space_id: str | None = Query(default=None)):
    """Retourne les listes ClickUp depuis un folder ou directement depuis un espace."""
    # folder_id est prioritaire; space_id sert pour les listes sans folder.
    return get_clickup_lists(folder_id=folder_id, space_id=space_id)


@placeholder_router.get("/structure", response_model=ClickUpStructureResponse)
def structure():
    """Retourne une arborescence simplifiee espaces -> folders -> listes."""
    # Cette route est pratique pour comprendre la structure ClickUp et preparer les prochaines synchronisations.
    return get_clickup_structure()


@router.get("/", response_model=list[ClickUpSyncResponse])
def list_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Liste les journaux de synchronisation ClickUp."""
    # Pagination simple pour consulter l'historique sans charger toute la table.
    return list_sync_logs(db, skip, limit)


@router.post("/", response_model=ClickUpSyncResponse)
def create(payload: ClickUpSyncCreate, db: Session = Depends(get_db)):
    """Cree un journal de synchronisation."""
    # Utile pour tracer manuellement ou automatiquement une tentative de synchronisation.
    return create_sync_log(db, payload)


@router.get("/{log_id}", response_model=ClickUpSyncResponse)
def get_one(log_id: str, db: Session = Depends(get_db)):
    """Retourne un journal de synchronisation par son id."""
    # On verifie l'existence pour retourner un 404 clair si le journal est absent.
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    return log


@router.put("/{log_id}", response_model=ClickUpSyncResponse)
def update(log_id: str, payload: ClickUpSyncUpdate, db: Session = Depends(get_db)):
    """Met a jour un journal de synchronisation."""
    # La logique de mise a jour est dans le service metier pour garder la route courte.
    return update_sync_log(db, log_id, payload)


@router.patch("/{log_id}/succes", response_model=ClickUpSyncResponse)
def success(log_id: str, db: Session = Depends(get_db)):
    """Marque un journal comme reussi."""
    # Endpoint de raccourci pour changer rapidement le statut du journal.
    return mark_success(db, log_id)


@router.patch("/{log_id}/echec", response_model=ClickUpSyncResponse)
def failed(log_id: str, message: str, db: Session = Depends(get_db)):
    """Marque un journal comme echoue avec un message."""
    # Le message explique la cause de l'echec pour faciliter le diagnostic.
    return mark_failed(db, log_id, message)
