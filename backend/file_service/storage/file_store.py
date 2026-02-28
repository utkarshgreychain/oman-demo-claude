import os
import uuid

from shared.config import get_settings
from shared.logger import get_logger

logger = get_logger(__name__)

settings = get_settings()


def _ensure_upload_dir() -> str:
    """Ensure the upload directory exists and return its path."""
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def save_file(file_data: bytes, filename: str) -> str:
    """Save file data to local storage.

    Args:
        file_data: The raw file bytes to save.
        filename: The original filename.

    Returns:
        The storage path where the file was saved.
    """
    upload_dir = _ensure_upload_dir()

    # Generate a unique filename to avoid collisions
    unique_id = str(uuid.uuid4())
    ext = os.path.splitext(filename)[1]
    storage_filename = f"{unique_id}{ext}"
    storage_path = os.path.join(upload_dir, storage_filename)

    with open(storage_path, "wb") as f:
        f.write(file_data)

    logger.info(f"Saved file '{filename}' to '{storage_path}'")
    return storage_path


def get_file(storage_path: str) -> bytes:
    """Read file data from local storage.

    Args:
        storage_path: The path where the file is stored.

    Returns:
        The raw file bytes.

    Raises:
        FileNotFoundError: If the file does not exist at the given path.
    """
    if not os.path.exists(storage_path):
        raise FileNotFoundError(f"File not found: {storage_path}")

    with open(storage_path, "rb") as f:
        return f.read()


def delete_file(storage_path: str) -> None:
    """Delete a file from local storage.

    Args:
        storage_path: The path where the file is stored.
    """
    if os.path.exists(storage_path):
        os.remove(storage_path)
        logger.info(f"Deleted file: {storage_path}")
    else:
        logger.warning(f"File not found for deletion: {storage_path}")
