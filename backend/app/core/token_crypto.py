"""Symmetric encryption for OAuth tokens stored in the database.

Uses Fernet (AES-128-CBC + HMAC-SHA256). The key lives in the
TOKEN_ENCRYPTION_KEY env var and must be a url-safe base64 32-byte string.
Generate one with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


@lru_cache(maxsize=1)
def _cipher() -> Fernet:
    settings = get_settings()
    return Fernet(settings.token_encryption_key.encode())


def encrypt(plaintext: str) -> str:
    return _cipher().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    try:
        return _cipher().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Cannot decrypt token — key mismatch or corrupted ciphertext") from exc
