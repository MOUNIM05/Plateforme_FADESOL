"""Appels inter-services utilises par task_service."""

import json
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest
from urllib.request import urlopen

from fastapi import HTTPException, status

from app.core.config import settings
from shared.exceptions import not_found


def _read_json(url: str, headers: dict[str, str] | None = None) -> dict:
    request = UrlRequest(url, headers=headers or {}, method="GET")

    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code == status.HTTP_404_NOT_FOUND:
            raise not_found("Ressource liee introuvable.") from exc

        detail = "Service lie indisponible."
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            detail = payload.get("detail", detail)
        except (json.JSONDecodeError, UnicodeDecodeError):
            pass

        raise HTTPException(status_code=exc.code, detail=detail) from exc
    except (URLError, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Service lie indisponible.",
        ) from exc


def normalize_optional_uuid(value: str | None) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None


def validate_user_exists(user_uuid: str | None) -> str | None:
    user_uuid = normalize_optional_uuid(user_uuid)

    if not user_uuid:
        return None

    url = f"{settings.USER_SERVICE_URL.rstrip('/')}/api/users/internal/uuid/{user_uuid}"
    headers = {"X-Internal-Service-Secret": settings.INTERNAL_SERVICE_SECRET}
    _read_json(url, headers=headers)

    return user_uuid


def validate_project_exists(project_id: str | None) -> str | None:
    project_id = normalize_optional_uuid(project_id)

    if not project_id:
        return None

    url = f"{settings.PROJECT_SERVICE_URL.rstrip('/')}/api/projets/{project_id}"
    try:
        _read_json(url)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            raise not_found("Projet introuvable.") from exc
        raise

    return project_id
