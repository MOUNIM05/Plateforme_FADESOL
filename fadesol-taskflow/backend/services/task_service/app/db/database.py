"""Connexion SQLAlchemy du service taches."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


# Engine SQLAlchemy connecte task_service a sa base dediee aux taches.
engine = create_engine(settings.DATABASE_URL)

# SessionLocal cree des sessions courtes, une par requete ou operation metier.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base sert de point commun a Task et SubTask pour la creation des tables.
Base = declarative_base()


def get_db():
    """Fournit une session SQLAlchemy aux routes FastAPI."""
    # Dependency FastAPI : ouvre la session, la fournit a la route, puis la ferme proprement.
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
