"""Logique metier du service projets.

Les fonctions manipulent les projets locaux : creation, mise a jour,
affectation du responsable, changement de statut et archivage.
"""

from sqlalchemy.orm import Session

from app.models.project import Projet
from app.schemas.project_schema import ProjetCreate, ProjetUpdate
from shared.enums import StatutProjet
from shared.exceptions import not_found


def list_projects(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    service_id: str | None = None,
    status: str | None = None,
    service_ids: list[str] | None = None,
) -> list[Projet]:
    """Liste les projets avec filtres optionnels par service et statut."""
    query = db.query(Projet)

    if service_ids is not None:
        service_values = [str(value) for value in service_ids if value not in {None, ""}]
        if not service_values:
            return []
        query = query.filter(Projet.service_id.in_(service_values))
    elif service_id:
        query = query.filter(Projet.service_id == service_id)

    if status:
        query = query.filter(Projet.statut == status)

    return query.offset(skip).limit(limit).all()


def get_project(db: Session, project_id: str) -> Projet | None:
    """Retourne un projet par UUID."""
    return db.query(Projet).filter(Projet.id == project_id).first()


def create_project(db: Session, payload: ProjetCreate) -> Projet:
    """Cree un projet en normalisant les enums Pydantic."""
    data = payload.model_dump()
    data["statut"] = payload.statut.value
    data["priorite"] = payload.priorite.value
    project = Projet(**data)
    db.add(project)
    db.commit()
    db.refresh(project)

    return project


def update_project(db: Session, project_id: str, payload: ProjetUpdate) -> Projet:
    """Met a jour uniquement les champs envoyes."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in {"statut", "priorite"} and value is not None:
            value = value.value
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return project


def delete_project(db: Session, project_id: str) -> None:
    """Supprime un projet existant."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    db.delete(project)
    db.commit()


def assigner_responsable(db: Session, project_id: str, utilisateur_id: str) -> Projet:
    """Affecte un responsable au projet."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    project.assignerResponsable(utilisateur_id)
    db.commit()
    db.refresh(project)

    return project


def changer_statut(db: Session, project_id: str, statut: StatutProjet) -> Projet:
    """Change le statut fonctionnel d'un projet."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    project.changerStatut(statut)
    db.commit()
    db.refresh(project)

    return project


def archiver_project(db: Session, project_id: str) -> Projet:
    """Archive un projet sans le supprimer de la base."""
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    project.archiver()
    db.commit()
    db.refresh(project)

    return project
