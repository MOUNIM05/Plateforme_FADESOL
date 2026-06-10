"""Configuration SQLAlchemy de clickup_service."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings


# Engine SQLAlchemy : point d'entree vers la base clickup_db.
engine = create_engine(settings.DATABASE_URL)

# SessionLocal fabrique une session par requete FastAPI.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base est la classe mere de tous les modeles ORM du service.
Base = declarative_base()


def get_db():
    """Fournit une session de base de donnees puis la ferme apres la requete."""
    # FastAPI appelle ce generateur avec Depends(get_db) dans les routes.
    db = SessionLocal()

    try:
        # La session est transmise a la route ou au service metier.
        yield db
    finally:
        # Fermeture systematique pour eviter les connexions ouvertes.
        db.close()
