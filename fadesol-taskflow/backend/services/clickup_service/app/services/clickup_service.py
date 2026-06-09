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
    return value.strip() in {"", "change_me"}


def get_clickup_headers() -> dict:
    if _missing_clickup_value(settings.CLICKUP_TOKEN):
        raise bad_request("Token ClickUp manquant.")

    return {
        "Authorization": settings.CLICKUP_TOKEN,
        "Content-Type": "application/json",
    }


def _clickup_get(endpoint: str) -> dict:
    target_url = f"{settings.CLICKUP_API_BASE_URL}{endpoint}"
    request = UrlRequest(
        target_url,
        headers=get_clickup_headers(),
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            raw_body = response.read().decode("utf-8")
    except HTTPError as exc:
        raise bad_request(f"Erreur HTTP ClickUp: {exc.code}.") from exc
    except (URLError, TimeoutError) as exc:
        raise bad_request("ClickUp API indisponible.") from exc

    try:
        data = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError as exc:
        raise bad_request("Reponse ClickUp invalide.") from exc

    return data


def _json_request(url: str, method: str, payload: dict | None = None, headers: dict | None = None) -> dict:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = UrlRequest(
        url,
        data=body,
        headers=headers or {"Content-Type": "application/json"},
        method=method,
    )

    try:
        with urlopen(request, timeout=15) as response:
            raw_body = response.read().decode("utf-8")
    except HTTPError as exc:
        raise bad_request(f"Erreur HTTP {method}: {exc.code}.") from exc
    except (URLError, TimeoutError) as exc:
        raise bad_request(f"Service indisponible pendant {method}.") from exc

    try:
        return json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError as exc:
        raise bad_request("Reponse JSON invalide.") from exc


def _clickup_post(endpoint: str, payload: dict) -> dict:
    target_url = f"{settings.CLICKUP_API_BASE_URL}{endpoint}"
    return _json_request(target_url, "POST", payload, get_clickup_headers())


def _task_service_url(path: str) -> str:
    return f"{settings.TASK_SERVICE_URL.rstrip('/')}/api/tasks/{path.lstrip('/')}"


def _task_service_request(path: str, method: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = UrlRequest(
        _task_service_url(path),
        data=body,
        headers={"Content-Type": "application/json"},
        method=method,
    )

    try:
        with urlopen(request, timeout=15) as response:
            raw_body = response.read().decode("utf-8")
    except HTTPError as exc:
        if exc.code == 404:
            raise not_found("Tache interne introuvable.") from exc
        raise bad_request(f"Erreur task_service: {exc.code}.") from exc
    except (URLError, TimeoutError) as exc:
        raise bad_request("task_service indisponible.") from exc

    try:
        return json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError as exc:
        raise bad_request("Reponse task_service invalide.") from exc


def _get_internal_task(task_id: str) -> dict:
    return _task_service_request(task_id, "GET")


def _mark_internal_task_synced(task_id: str, clickup_task_id: str) -> dict:
    payload = {
        "clickup_task_id": clickup_task_id,
        "est_synchronisee_clickup": True,
    }
    return _task_service_request(f"{task_id}/clickup-sync", "PATCH", payload)


def _extract_items(data: dict, key: str) -> list[dict]:
    value = data.get(key, [])

    if not value:
        return []

    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]

    return []


def _simplify_space(space: dict) -> dict:
    return {
        "id": str(space.get("id", "")),
        "name": space.get("name") or "Espace sans nom",
    }


def _simplify_folder(folder: dict, space_id: str | None = None) -> dict:
    folder_space = folder.get("space") or {}

    return {
        "id": str(folder.get("id", "")),
        "name": folder.get("name") or "Folder sans nom",
        "space_id": str(space_id or folder_space.get("id") or ""),
    }


def _simplify_list(clickup_list: dict, folder_id: str | None = None, space_id: str | None = None) -> dict:
    list_folder = clickup_list.get("folder") or {}
    list_space = clickup_list.get("space") or {}

    return {
        "id": str(clickup_list.get("id", "")),
        "name": clickup_list.get("name") or "Liste sans nom",
        "folder_id": str(folder_id or list_folder.get("id") or ""),
        "space_id": str(space_id or list_space.get("id") or ""),
    }


def _configured_value(value: str) -> str | None:
    if _missing_clickup_value(value):
        return None

    return value


def test_clickup_connection() -> dict:
    try:
        get_clickup_workspaces()
    except HTTPException:
        return {
            "status": "error",
            "message": "Connexion ClickUp echouee",
        }

    return {
        "status": "ok",
        "message": "Connexion ClickUp reussie",
    }


def _parse_due_date(value) -> int | None:
    if not value:
        return None

    if isinstance(value, datetime):
        due_datetime = value
    elif isinstance(value, date):
        due_datetime = datetime.combine(value, time.min)
    elif isinstance(value, str):
        try:
            due_datetime = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            try:
                due_datetime = datetime.combine(date.fromisoformat(value[:10]), time.min)
            except ValueError:
                return None
    else:
        return None

    if due_datetime.tzinfo is None:
        due_datetime = due_datetime.replace(tzinfo=timezone.utc)

    return int(due_datetime.timestamp() * 1000)


def _map_priority(value) -> int | None:
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

    return priority_map.get(str(value), None)


def map_internal_task_to_clickup(task: dict) -> dict:
    name = task.get("title") or task.get("titre") or "Tache Fadesol"
    description = task.get("description") or ""
    due_date = _parse_due_date(task.get("due_date") or task.get("date_limite"))
    priority = _map_priority(task.get("priority") or task.get("priorite"))

    payload = {
        "name": name,
        "description": description,
    }

    if due_date:
        payload["due_date"] = due_date

    if priority:
        payload["priority"] = priority

    return payload


def sync_task_to_clickup(task_id: str) -> dict:
    if _missing_clickup_value(settings.CLICKUP_TOKEN):
        raise bad_request("Token ClickUp manquant.")

    if _missing_clickup_value(settings.CLICKUP_LIST_ID):
        raise bad_request("CLICKUP_LIST_ID manquant.")

    task = _get_internal_task(task_id)
    existing_clickup_id = task.get("clickup_task_id")

    if existing_clickup_id:
        return {
            "status": "already_synced",
            "message": "Tache deja synchronisee avec ClickUp",
            "task_id": task_id,
            "clickup_task_id": existing_clickup_id,
        }

    clickup_payload = map_internal_task_to_clickup(task)
    clickup_response = _clickup_post(f"/list/{settings.CLICKUP_LIST_ID}/task", clickup_payload)
    clickup_task_id = clickup_response.get("id")

    if not clickup_task_id:
        raise bad_request("Reponse ClickUp sans id de tache.")

    _mark_internal_task_synced(task_id, clickup_task_id)

    return {
        "status": "ok",
        "message": "Tache synchronisee avec ClickUp",
        "task_id": task_id,
        "clickup_task_id": clickup_task_id,
    }


def get_clickup_workspaces() -> dict:
    return _clickup_get("/team")


def get_spaces() -> list[dict]:
    if _missing_clickup_value(settings.CLICKUP_WORKSPACE_ID):
        raise bad_request("CLICKUP_WORKSPACE_ID manquant.")

    data = _clickup_get(f"/team/{settings.CLICKUP_WORKSPACE_ID}/space")
    return [_simplify_space(space) for space in _extract_items(data, "spaces")]


def get_folders(space_id: str | None = None) -> list[dict]:
    selected_space_id = space_id or _configured_value(settings.CLICKUP_SPACE_ID)

    if not selected_space_id:
        raise bad_request("space_id ou CLICKUP_SPACE_ID est necessaire pour recuperer les folders.")

    data = _clickup_get(f"/space/{selected_space_id}/folder")
    return [_simplify_folder(folder, selected_space_id) for folder in _extract_items(data, "folders")]


def get_lists_by_folder(folder_id: str) -> list[dict]:
    data = _clickup_get(f"/folder/{folder_id}/list")
    return [_simplify_list(clickup_list, folder_id=folder_id) for clickup_list in _extract_items(data, "lists")]


def get_folderless_lists(space_id: str) -> list[dict]:
    data = _clickup_get(f"/space/{space_id}/list")
    return [_simplify_list(clickup_list, space_id=space_id) for clickup_list in _extract_items(data, "lists")]


def get_lists(folder_id: str | None = None, space_id: str | None = None) -> list[dict]:
    selected_folder_id = folder_id or _configured_value(settings.CLICKUP_FOLDER_ID)

    if selected_folder_id:
        return get_lists_by_folder(selected_folder_id)

    selected_space_id = space_id or _configured_value(settings.CLICKUP_SPACE_ID)

    if selected_space_id:
        return get_folderless_lists(selected_space_id)

    raise bad_request("folder_id ou space_id est necessaire pour recuperer les listes.")


def get_clickup_structure() -> dict:
    spaces = []

    for space in get_spaces():
        folders = get_folders(space["id"])
        folderless_lists = get_folderless_lists(space["id"])
        enriched_folders = []

        for folder in folders:
            enriched_folders.append(
                {
                    **folder,
                    "lists": get_lists_by_folder(folder["id"]),
                }
            )

        spaces.append(
            {
                **space,
                "folders": enriched_folders,
                "folderless_lists": folderless_lists,
            }
        )

    return {"spaces": spaces}


def get_clickup_spaces() -> list[dict]:
    return get_spaces()


def get_clickup_folders(space_id: str | None = None) -> list[dict]:
    return get_folders(space_id)


def get_clickup_lists(folder_id: str | None = None, space_id: str | None = None) -> list[dict]:
    return get_lists(folder_id, space_id)


def sync_tasks_placeholder() -> dict:
    return {
        "status": "not_configured",
        "message": "ClickUp synchronization will be implemented later",
    }


def list_sync_logs(db: Session, skip: int = 0, limit: int = 100) -> list[JournalSynchronisationClickUp]:
    return db.query(JournalSynchronisationClickUp).offset(skip).limit(limit).all()


def get_sync_log(db: Session, log_id: str) -> JournalSynchronisationClickUp | None:
    return db.query(JournalSynchronisationClickUp).filter(JournalSynchronisationClickUp.id == log_id).first()


def create_sync_log(db: Session, payload: ClickUpSyncCreate) -> JournalSynchronisationClickUp:
    data = payload.model_dump()
    data["statut_synchronisation"] = payload.statut_synchronisation.value
    log = JournalSynchronisationClickUp(**data)
    db.add(log)
    db.commit()
    db.refresh(log)

    return log


def update_sync_log(db: Session, log_id: str, payload: ClickUpSyncUpdate) -> JournalSynchronisationClickUp:
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "statut_synchronisation" and value is not None:
            value = value.value
        setattr(log, field, value)

    db.commit()
    db.refresh(log)

    return log


def mark_success(db: Session, log_id: str) -> JournalSynchronisationClickUp:
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    log.marquerSucces()
    db.commit()
    db.refresh(log)

    return log


def mark_failed(db: Session, log_id: str, message: str) -> JournalSynchronisationClickUp:
    log = get_sync_log(db, log_id)

    if not log:
        raise not_found("Journal de synchronisation introuvable.")

    log.marquerEchec(message)
    db.commit()
    db.refresh(log)

    return log
