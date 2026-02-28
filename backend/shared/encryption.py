from cryptography.fernet import Fernet
from .config import get_settings


def _get_fernet() -> Fernet:
    """Return a Fernet instance initialised with the configured encryption key."""
    settings = get_settings()
    return Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_api_key(key: str) -> str:
    """Encrypt a plaintext API key and return the ciphertext as a string."""
    fernet = _get_fernet()
    return fernet.encrypt(key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """Decrypt an encrypted API key and return the plaintext."""
    fernet = _get_fernet()
    return fernet.decrypt(encrypted.encode()).decode()
