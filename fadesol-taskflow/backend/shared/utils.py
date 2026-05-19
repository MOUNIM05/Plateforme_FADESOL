from pathlib import Path
import sys


def ensure_backend_on_path(current_file: str) -> Path:
    backend_dir = Path(current_file).resolve().parents[3]

    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    return backend_dir
