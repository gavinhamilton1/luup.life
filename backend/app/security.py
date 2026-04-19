import hashlib
import secrets


def generate_session_id() -> str:
    return secrets.token_urlsafe(12)


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_photo_id() -> str:
    return secrets.token_urlsafe(12)
