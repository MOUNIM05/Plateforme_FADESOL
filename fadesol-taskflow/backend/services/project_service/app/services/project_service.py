from sqlalchemy.orm import Session

from app.models.project import Projet
from app.schemas.project_schema import ProjetCreate, ProjetUpdate
from shared.enums import StatutProjet
from shared.exceptions import not_found


def list_projects(db: Session, skip: int = 0, limit: int = 100) -> list[Projet]:
    return db.query(Projet).offset(skip).limit(limit).all()


def get_project(db: Session, project_id: str) -> Projet | None:
    return db.query(Projet).filter(Projet.id == project_id).first()


def create_project(db: Session, payload: ProjetCreate) -> Projet:
    data = payload.model_dump()
    data["statut"] = payload.statut.value
    data["priorite"] = payload.priorite.value
    project = Projet(**data)
    db.add(project)
    db.commit()
    db.refresh(project)

    return project


def update_project(db: Session, project_id: str, payload: ProjetUpdate) -> Projet:
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
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    db.delete(project)
    db.commit()


def assigner_responsable(db: Session, project_id: str, utilisateur_id: str) -> Projet:
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    project.assignerResponsable(utilisateur_id)
    db.commit()
    db.refresh(project)

    return project


def changer_statut(db: Session, project_id: str, statut: StatutProjet) -> Projet:
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    project.changerStatut(statut)
    db.commit()
    db.refresh(project)

    return project


def archiver_project(db: Session, project_id: str) -> Projet:
    project = get_project(db, project_id)

    if not project:
        raise not_found("Projet introuvable.")

    project.archiver()
    db.commit()
    db.refresh(project)

    return project
