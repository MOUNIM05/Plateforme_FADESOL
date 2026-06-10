"""Logique metier de l'integration ClickUp.

Ce module contient les appels HTTP vers ClickUp API, les appels internes vers
task_service et la gestion des journaux de synchronisation.
"""

import json
from datetime import date, datetime, time, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.clickup_sync_log import JournalSynchronisationClickUp
from app.schemas.clickup_sync_schema import ClickUpSyncCreate, ClickUpSyncUpdate
from shared.exceptions import bad_request, not_found


def _missing_clickup_value(value: str) -> bool:
    """Detecte une variable d'environnement absente ou encore en placeholder."""
    # Les valeurs vides ou "change_me" signifient que la configuration n'est pas prete.
    return value.strip() in {"", "change_me"}


def get_clickup_headers() -> dict:
    """Construit les headers HTTP obligatoires pour appeler ClickUp API."""
    # ClickUp personal token s'envoie directement dans Authorization, sans prefixe Bearer.
    if _missing_clickup_value(settings.CLICKUP_TOKEN):
        raise bad_request("Token ClickUp manquant.")

    # Le token n'est jamais retourne dans une reponse API ni affiche dans les logs.
    return {
        "Authorization": settings.CLICKUP_TOKEN,
        "Content-Type": "application/json",
    }


def _clickup_get(endpoint: str) -> dict:
    """Execute un GET vers ClickUp API et retourne la reponse JSON."""
    # L'endpoint est relatif a CLICKUP_API_BASE_URL, par exemple /team ou /space/{id}/folder.
    target_url = f"{settings.CLICKUP_API_BASE_URL}{endpoint}"

    # UrlRequest est utilise pour eviter d'ajouter une dependance externe comme requests.
    request = UrlRequest(
        target_url,
        headers=get_clickup_headers(),
        method="GET",
    )

    try:
        # Timeout court pour eviter qu'un appel ClickUp bloque le backend trop longtemps.
        with urlopen(request, timeout=10) as response:
            raw_body = response.read().decode("utf-8")
    except HTTPError as exc:
        # Les erreurs HTTP ClickUp sont converties en 400 avec un message clair.
        raise bad_request(f"Erreur HTTP ClickUp: {exc.code}.") from exc
    except (URLError, TimeoutError) as exc:
        # URLError/TimeoutError indiquent un probleme reseau ou une indisponibilite de l'API.
        raise bad_request("ClickUp API indisponible.") from exc

    try:
        # ClickUp renvoie du JSON; si le body est vide, on garde un objet vide.
        data = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError as exc:
        # Une reponse non JSON est traitee comme invalide pour ne pas casser le frontend.
        raise bad_request("Reponse ClickUp invalide.") from exc

    return data


def _json_request(url: str, method: str, payload: dict | None = None, headers: dict | None = None) -> dict:
    """Execute une requete JSON generique vers un service HTTP."""
    # payload est encode en JSON seulement lorsqu'il existe, ce qui permet aussi les GET.
    body = json.dumps(payload).encode("utf-8") if payload is not None else None

    # Les headers par defaut suffisent pour les appels internes sans token ClickUp.
    request = UrlRequest(
        url,
        data=body,
        headers=headers or {"Content-Type": "application/json"},
        method=method,
    )

    try:
        # Timeout de 15 secondes pour les appels de creation ClickUp ou les appels internes.
        with urlopen(request, timeout=15) as response:
            raw_body = response.read().decode("utf-8")
    except HTTPError as exc:
        # On conserve le code HTTP dans le message pour faciliter le diagnostic Postman.
        raise bad_request(f"Erreur HTTP {method}: {exc.code}.") from exc
    except (URLError, TimeoutError) as exc:
        # Erreur reseau generique : le service cible n'a pas repondu correctement.
        raise bad_request(f"Service indisponible pendant {method}.") from exc

    try:
        # Tous les services du projet sont censes retourner du JSON.
        return json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError as exc:
        raise bad_request("Reponse JSON invalide.") from exc


def _clickup_post(endpoint: str, payload: dict) -> dict:
    """Execute un POST vers ClickUp API avec les headers securises."""
    # Utilise pour creer une tache dans la liste ClickUp configuree.
    target_url = f"{settings.CLICKUP_API_BASE_URL}{endpoint}"
    return _json_request(target_url, "POST", payload, get_clickup_headers())


def _task_service_url(path: str) -> str:
    """Construit une URL interne vers task_service."""
    # clickup_service communique avec task_service via HTTP, pas via une relation SQL directe.
    return f"{settings.TASK_SERVICE_URL.rstrip('/')}/api/tasks/{path.lstrip('/')}"


def _task_service_request(path: str, method: str, payload: dict | None = None) -> dict:
    """Execute une requete JSON vers task_service."""
    # Sert a recuperer la tache interne puis a sauvegarder l'id ClickUp apres synchronisation.
    body = json.dumps(payload).encode("utf-8") if payload is not None else None

    # On construit une requete HTTP interne au reseau Docker.
    request = UrlRequest(
        _task_service_url(path),
        data=body,
        headers={"Content-Type": "application/json"},
        method=method,
    )

    try:
        # task_service doit repondre rapidement car il lit la base task_db.
        with urlopen(request, timeout=15) as response:
            raw_body = response.read().decode("utf-8")
    except HTTPError as exc:
        # Un 404 de task_service signifie que la tache interne n'existe pas.
        if exc.code == 404:
            raise not_found("Tache interne introuvable.") from exc
        raise bad_request(f"Erreur task_service: {exc.code}.") from exc
    except (URLError, TimeoutError) as exc:
        # Si task_service est indisponible, la synchronisation ne peut pas continuer.
        raise bad_request("task_service indisponible.") from exc

    try:
        # La tache interne est retournee en JSON par task_service.
        return json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError as exc:
        raise bad_request("Reponse task_service invalide.") from exc


def _get_internal_task(task_id: str) -> dict:
    """Recupere une tache interne depuis task_service."""
    # Cette etape evite a clickup_service d'acceder directement a task_db.
    return _task_service_request(task_id, "GET")


def _mark_internal_task_synced(task_id: str, clickup_task_id: str) -> dict:
    """Informe task_service qu'une tache est synchronisee avec ClickUp."""
    # Payload minimal : l'id distant et le booleen de synchronisation.
    payload = {
        "clickup_task_id": clickup_task_id,
        "est_synchronisee_clickup": True,
    }

    # task_service se charge de mettre a jour source et date_synchronisation.
    return _task_service_request(f"{task_id}/clickup-sync", "PATCH", payload)


def _extract_items(data: dict, key: str) -> list[dict]:
    """Extrait une liste d'objets depuis une reponse ClickUp."""
    # ClickUp renvoie souvent les collections dans des cles comme spaces, folders ou lists.
    value = data.get(key, [])

    if not value:
        # Absence de donnees : on retourne une liste vide plutot que None.
        return []

    if isinstance(value, list):
        # On garde uniquement les elements JSON sous forme d'objet.
        return [item for item in value if isinstance(item, dict)]

    # Si ClickUp change le format, on evite de faire planter la route.
    return []


def _simplify_space(space: dict) -> dict:
    """Convertit un espace ClickUp brut en objet simple pour le frontend."""
    # Le frontend a seulement besoin de l'id et du nom.
    return {
        "id": str(space.get("id", "")),
        "name": space.get("name") or "Espace sans nom",
    }


def _simplify_folder(folder: dict, space_id: str | None = None) -> dict:
    """Convertit un folder ClickUp brut en objet simple."""
    # Certains objets ClickUp contiennent le space parent, mais on accepte aussi un space_id deja connu.
    folder_space = folder.get("space") or {}

    return {
        "id": str(folder.get("id", "")),
        "name": folder.get("name") or "Folder sans nom",
        "space_id": str(space_id or folder_space.get("id") or ""),
    }


def _simplify_list(clickup_list: dict, folder_id: str | None = None, space_id: str | None = None) -> dict:
    """Convertit une liste ClickUp brute en objet simple."""
    # folder_id et space_id permettent au frontend de comprendre le contexte de la liste.
    list_folder = clickup_list.get("folder") or {}
    list_space = clickup_list.get("space") or {}

    return {
        "id": str(clickup_list.get("id", "")),
        "name": clickup_list.get("name") or "Liste sans nom",
        "folder_id": str(folder_id or list_folder.get("id") or ""),
        "space_id": str(space_id or list_space.get("id") or ""),
    }


def _configured_value(value: str) -> str | None:
    """Retourne une valeur configuree ou None si elle est absente."""
    # Evite de traiter "change_me" comme un vrai identifiant ClickUp.
    if _missing_clickup_value(value):
        return None

    return value


def test_clickup_connection() -> dict:
    """Teste si le token ClickUp peut acceder aux workspaces."""
    # Le test utilise /team car c'est un endpoint simple et peu destructif.
    try:
        get_clickup_workspaces()
    except HTTPException:
        # On retourne une erreur metier lisible au lieu de propager un 500.
        return {
            "status": "error",
            "message": "Connexion ClickUp echouee",
        }

    # Le token est valide et ClickUp a repondu correctement.
    return {
        "status": "ok",
        "message": "Connexion ClickUp reussie",
    }


def _parse_due_date(value) -> int | None:
    """Convertit une date interne en timestamp millisecondes attendu par ClickUp."""
    # ClickUp attend due_date en millisecondes Unix.
    if not value:
        return None

    if isinstance(value, datetime):
        # Si la valeur est deja un datetime, on l'utilise directement.
        due_datetime = value
    elif isinstance(value, date):
        # Une date sans heure est convertie au debut de journee.
        due_datetime = datetime.combine(value, time.min)
    elif isinstance(value, str):
        try:
            # Premier essai : format ISO complet.
            due_datetime = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            try:
                # Deuxieme essai : seulement la partie date YYYY-MM-DD.
                due_datetime = datetime.combine(date.fromisoformat(value[:10]), time.min)
            except ValueError:
                # Si la date est invalide, on ignore due_date plutot que bloquer la sync.
                return None
    else:
        # Type non gere : pas de due_date envoyee a ClickUp.
        return None

    if due_datetime.tzinfo is None:
        # On force UTC pour obtenir un timestamp stable.
        due_datetime = due_datetime.replace(tzinfo=timezone.utc)

    return int(due_datetime.timestamp() * 1000)


def _map_priority(value) -> int | None:
    """Traduit une priorite interne vers le format numerique ClickUp."""
    # ClickUp accepte 1 urgent, 2 high, 3 normal, 4 low.
    if not value:
        return None

    priority_map = {
        "Urgente": 1,
        "urgent": 1,
        "Haute": 2,
        "high": 2,
        "Normale": 3,
        "normal": 3,
        "Faible": 4,
        "low": 4,
    }

    # Si la priorite n'est pas reconnue, on ne l'envoie pas.
    return priority_map.get(str(value), None)


def map_internal_task_to_clickup(task: dict) -> dict:
    """Transforme une tache Fadesol en payload compatible ClickUp."""
    # Le titre est obligatoire dans ClickUp; on prevoit une valeur de secours.
    name = task.get("title") or task.get("titre") or "Tache Fadesol"

    # La description est optionnelle, mais envoyer une chaine vide reste compatible.
    description = task.get("description") or ""

    # Les champs optionnels sont convertis seulement s'ils sont exploitables.
    due_date = _parse_due_date(task.get("due_date") or task.get("date_limite"))
    priority = _map_priority(task.get("priority") or task.get("priorite"))

    # Payload minimal accepte par ClickUp pour creer une tache.
    payload = {
        "name": name,
        "description": description,
    }

    if due_date:
        # due_date est ajoute seulement si la conversion a reussi.
        payload["due_date"] = due_date

    if priority:
        # priority est ajoutee seulement si elle correspond a un niveau ClickUp.
        payload["priority"] = priority

    return payload


def sync_task_to_clickup(task_id: str) -> dict:
    """Synchronise une tache interne vers ClickUp sans creer de doublon."""
    # Verifie la presence du token avant tout appel externe.
    if _missing_clickup_value(settings.CLICKUP_TOKEN):
        raise bad_request("Token ClickUp manquant.")

    # CLICKUP_LIST_ID determine dans quelle liste ClickUp la tache sera creee.
    if _missing_clickup_value(settings.CLICKUP_LIST_ID):
        raise bad_request("CLICKUP_LIST_ID manquant.")

    # Recuperation de la tache interne via task_service.
    task = _get_internal_task(task_id)
    existing_clickup_id = task.get("clickup_task_id")

    if existing_clickup_id:
        # Anti-doublon : si un id ClickUp existe deja, on ne cree pas une nouvelle tache.
        return {
            "status": "already_synced",
            "message": "Tache deja synchronisee avec ClickUp",
            "task_id": task_id,
            "clickup_task_id": existing_clickup_id,
        }

    # Conversion de la tache interne vers le payload attendu par ClickUp.
    clickup_payload = map_internal_task_to_clickup(task)

    # Creation reelle de la tache dans la liste ClickUp configuree.
    clickup_response = _clickup_post(f"/list/{settings.CLICKUP_LIST_ID}/task", clickup_payload)
    clickup_task_id = clickup_response.get("id")

    if not clickup_task_id:
        # Sans id distant, on ne peut pas marquer la tache comme synchronisee.
        raise bad_request("Reponse ClickUp sans id de tache.")

    # Sauvegarde de l'id ClickUp dans task_service pour garder l'etat interne coherent.
    _mark_internal_task_synced(task_id, clickup_task_id)

    return {
        "status": "ok",
        "message": "Tache synchronisee avec ClickUp",
        "task_id": task_id,
        "clickup_task_id": clickup_task_id,
    }


def get_clickup_workspaces() -> dict:
    """Recupere les workspaces accessibles avec le token ClickUp."""
    # Endpoint ClickUp officiel : GET /team.
    return _clickup_get("/team")


def get_spaces() -> list[dict]:
    """Recupere les espaces du workspace configure."""
    # Le workspace id est obligatoire pour lister les spaces.
    if _missing_clickup_value(settings.CLICKUP_WORKSPACE_ID):
        raise bad_request("CLICKUP_WORKSPACE_ID manquant.")

    # Endpoint ClickUp officiel : GET /team/{workspace_id}/space.
    data = _clickup_get(f"/team/{settings.CLICKUP_WORKSPACE_ID}/space")
    return [_simplify_space(space) for space in _extract_items(data, "spaces")]


def get_folders(space_id: str | None = None) -> list[dict]:
    """Recupere les folders d'un espace ClickUp."""
    # Le space peut venir de la query param ou de CLICKUP_SPACE_ID dans .env.
    selected_space_id = space_id or _configured_value(settings.CLICKUP_SPACE_ID)

    if not selected_space_id:
        raise bad_request("space_id ou CLICKUP_SPACE_ID est necessaire pour recuperer les folders.")

    # Endpoint ClickUp officiel : GET /space/{space_id}/folder.
    data = _clickup_get(f"/space/{selected_space_id}/folder")
    return [_simplify_folder(folder, selected_space_id) for folder in _extract_items(data, "folders")]


def get_lists_by_folder(folder_id: str) -> list[dict]:
    """Recupere les listes contenues dans un folder ClickUp."""
    # Endpoint ClickUp officiel : GET /folder/{folder_id}/list.
    data = _clickup_get(f"/folder/{folder_id}/list")
    return [_simplify_list(clickup_list, folder_id=folder_id) for clickup_list in _extract_items(data, "lists")]


def get_folderless_lists(space_id: str) -> list[dict]:
    """Recupere les listes d'un espace qui ne sont pas dans un folder."""
    # Endpoint ClickUp officiel : GET /space/{space_id}/list.
    data = _clickup_get(f"/space/{space_id}/list")
    return [_simplify_list(clickup_list, space_id=space_id) for clickup_list in _extract_items(data, "lists")]


def get_lists(folder_id: str | None = None, space_id: str | None = None) -> list[dict]:
    """Recupere les listes selon folder_id, space_id ou les variables .env."""
    # Priorite 1 : folder_id explicite ou configure.
    selected_folder_id = folder_id or _configured_value(settings.CLICKUP_FOLDER_ID)

    if selected_folder_id:
        return get_lists_by_folder(selected_folder_id)

    # Priorite 2 : space_id explicite ou configure pour les listes sans folder.
    selected_space_id = space_id or _configured_value(settings.CLICKUP_SPACE_ID)

    if selected_space_id:
        return get_folderless_lists(selected_space_id)

    # Aucun contexte suffisant : on retourne une erreur 400 claire.
    raise bad_request("folder_id ou space_id est necessaire pour recuperer les listes.")


def get_clickup_structure() -> dict:
    """Construit l'arborescence complete des spaces, folders et listes."""
    # Structure simplifiee consommee par le frontend et utile pour preparer les futures synchronisations.
    spaces = []

    for space in get_spaces():
        # Pour chaque espace, on charge ses folders et ses listes sans folder.
        folders = get_folders(space["id"])
        folderless_lists = get_folderless_lists(space["id"])
        enriched_folders = []

        for folder in folders:
            # Chaque folder est enrichi avec ses listes internes.
            enriched_folders.append(
                {
                    **folder,
                    "lists": get_lists_by_folder(folder["id"]),
                }
            )

        # L'espace final contient ses folders enrichis et les listes directement rattachees a l'espace.
        spaces.append(
            {
                **space,
                "folders": enriched_folders,
                "folderless_lists": folderless_lists,
            }
        )

    return {"spaces": spaces}


def get_clickup_spaces() -> list[dict]:
    """Alias public utilise par les routes pour recuperer les spaces."""
    return get_spaces()


def get_clickup_folders(space_id: str | None = None) -> list[dict]:
    """Alias public utilise par les routes pour recuperer les folders."""
    return get_folders(space_id)


def get_clickup_lists(folder_id: str | None = None, space_id: str | None = None) -> list[dict]:
    """Alias public utilise par les routes pour recuperer les listes."""
    return get_lists(folder_id, space_id)


def sync_tasks_placeholder() -> dict:
    """Reponse temporaire pour l'ancienne route de synchronisation globale."""
    # La synchronisation globale n'est pas encore implementee; la synchronisation unitaire existe via sync-task.
    return {
        "status": "not_configured",
        "message": "ClickUp synchronization will be implemented later",
    }


def list_sync_logs(db: Session, skip: int = 0, limit: int = 100) -> list[JournalSynchronisationClickUp]:
    """Liste les journaux de synchronisation avec pagination."""
    # Requete simple sur clickup_db pour afficher l'historique.
    return db.query(JournalSynchronisationClickUp).offset(skip).limit(limit).all()


def get_sync_log(db: Session, log_id: str) -> JournalSynchronisationClickUp | None:
    """Recupere un journal de synchronisation par id."""
    # Retourne None si le journal n'existe pas; la route transforme ensuite en 404.
    return db.query(JournalSynchronisationClickUp).filter(JournalSynchronisationClickUp.id == log_id).first()


def create_sync_log(db: Session, payload: ClickUpSyncCreate) -> JournalSynchronisationClickUp:
    """Cree un journal de synchronisation en base."""
    # Conversion Pydantic -> dict avant creation du modele SQLAlchemy.
    data = payload.model_dump()

    # L'enum est converti en valeur texte pour etre stocke dans PostgreSQL.
    data["statut_synchronisation"] = payload.statut_synchronisation.value

    # Creation et persistance du journal.
    log = JournalSynchronisationClickUp(**data)
    db.add(log)
    db.commit()
    db.refresh(log)

    return log


def update_sync_log(db: Session, log_id: str, payload: ClickUpSyncUpdate) -> JournalSynchronisationClickUp:
    """Met a jour partiellement un journal de synchronisation."""
    # On recupere d'abord le journal existant.
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    # Seuls les champs fournis dans le payload sont modifies.
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "statut_synchronisation" and value is not None:
            # Conversion de l'enum en texte avant stockage.
            value = value.value
        setattr(log, field, value)

    db.commit()
    db.refresh(log)

    return log


def mark_success(db: Session, log_id: str) -> JournalSynchronisationClickUp:
    """Marque un journal de synchronisation comme reussi."""
    # Raccourci metier pour ne pas manipuler directement les libelles de statut dans la route.
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    log.marquerSucces()
    db.commit()
    db.refresh(log)

    return log


def mark_failed(db: Session, log_id: str, message: str) -> JournalSynchronisationClickUp:
    """Marque un journal de synchronisation comme echoue."""
    # Le message fourni explique la raison de l'echec.
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    log.marquerEchec(message)
    db.commit()
    db.refresh(log)

    return log
