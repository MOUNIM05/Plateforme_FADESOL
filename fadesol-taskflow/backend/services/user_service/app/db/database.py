"""Connexion SQLAlchemy du service utilisateur."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings


# Engine SQLAlchemy connecte user_service a sa base dediee aux profils utilisateurs.
engine = create_engine(settings.DATABASE_URL)

# SessionLocal fournit une session isolee par requete.
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Base regroupe les modeles ORM de ce microservice.
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Fournit une session de base a chaque requete FastAPI."""
    # Dependency FastAPI qui garantit la fermeture de la session meme en cas d'erreur.
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
