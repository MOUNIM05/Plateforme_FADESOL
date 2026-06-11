from pathlib import Path
import sys


SERVICE_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = SERVICE_ROOT.parents[1]
sys.path.insert(0, str(SERVICE_ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.database import Base, SessionLocal, engine  # noqa: E402
from app.models.service_model import Service  # noqa: E402


BASE_SERVICES = [
    {
        "name": "Commercial",
        "description": "Gestion commerciale, clients, devis et suivi des opportunités.",
    },
    {
        "name": "Technique",
        "description": "Études techniques, interventions, installation et support terrain.",
    },
    {
        "name": "Achat",
        "description": "Achats, fournisseurs, commandes et approvisionnements.",
    },
    {
        "name": "Magasin / Stock",
        "description": "Gestion du magasin, stock, entrées, sorties et disponibilité matériel.",
    },
    {
        "name": "Comptabilité & Management",
        "legacy_name": "Comptabilite & Management",
        "description": "Comptabilité, pilotage financier, suivi administratif et management.",
    },
    {
        "name": "Direction / RH / Administration",
        "description": "Direction, ressources humaines, administration générale et gouvernance.",
    },
]


def seed_services() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        for base_payload in BASE_SERVICES:
            payload = base_payload.copy()
            legacy_name = payload.pop("legacy_name", None)
            exists = db.query(Service).filter(Service.name == payload["name"]).first()

            if not exists and legacy_name:
                exists = db.query(Service).filter(Service.name == legacy_name).first()

                if exists:
                    exists.name = payload["name"]
                    exists.description = payload["description"]
                    print(f"updated: {legacy_name} -> {payload['name']}")
                    continue

            if exists:
                print(f"exists: {payload['name']}")
                continue

            db.add(Service(**payload))
            print(f"created: {payload['name']}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_services()
