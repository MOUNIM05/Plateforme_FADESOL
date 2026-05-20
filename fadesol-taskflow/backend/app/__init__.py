"""Compatibility package for running the API Gateway from backend/.

The real FastAPI application for port 8000 lives in services/api_gateway/app.
This package lets `uvicorn app.main:app --reload --port 8000` work when
launched from backend/.
"""

from pathlib import Path
import sys


BACKEND_DIR = Path(__file__).resolve().parents[1]
SERVICE_DIR = BACKEND_DIR / "services" / "api_gateway"
SERVICE_APP_DIR = SERVICE_DIR / "app"

for path in (BACKEND_DIR, SERVICE_DIR):
    path_value = str(path)
    if path_value not in sys.path:
        sys.path.insert(0, path_value)

__path__ = [str(SERVICE_APP_DIR), str(Path(__file__).resolve().parent)]
