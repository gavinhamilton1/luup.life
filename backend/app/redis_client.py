import redis.asyncio as aioredis

from .config import settings

_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _client


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


def keys_for_session(session_id: str) -> list[str]:
    return [
        f"session:{session_id}",
        f"session:{session_id}:participants",
        f"session:{session_id}:messages",
        f"session:{session_id}:photos",
    ]
