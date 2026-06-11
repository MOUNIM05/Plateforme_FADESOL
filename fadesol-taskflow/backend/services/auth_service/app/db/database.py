"""Connexion SQLAlchemy du service auth.

Chaque microservice possede sa propre connexion et sa propre session de base.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.core.config import settings


connect_args = {}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Engine SQLAlchemy connecte ce microservice a sa propre base d'authentification.
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# SessionLocal fabrique une session par requete FastAPI.
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Base sert de classe mere aux modeles ORM de ce service.
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Fournit une session SQLAlchemy a une route FastAPI."""
    # Dependency FastAPI : ouvre une session, la fournit a la route, puis la ferme proprement.
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
