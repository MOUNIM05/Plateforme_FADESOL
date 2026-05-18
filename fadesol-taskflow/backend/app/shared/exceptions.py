from fastapi import HTTPException, status


def not_found(detail: str = "Ressource introuvable.") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def forbidden(detail: str = "Accès refusé.") -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)
