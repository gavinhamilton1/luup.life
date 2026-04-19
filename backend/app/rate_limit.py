from __future__ import annotations

from fastapi import HTTPException, Request

from .config import settings
from .redis_client import get_redis

# Loopback addresses bypass rate limiting so local testing isn't throttled.
_DEV_IPS = {"127.0.0.1", "::1", "localhost"}


async def check_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    redis = get_redis()
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds)
    count, _ = await pipe.execute()
    if int(count) > limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def limit_session_create(request: Request) -> None:
    ip = client_ip(request)
    if ip in _DEV_IPS:
        return
    await check_rate_limit(f"rl:create:{ip}", limit=30, window_seconds=3600)


async def limit_photo_upload(session_id: str, nickname: str) -> None:
    key = f"rl:photo:{session_id}:{nickname}"
    await check_rate_limit(key, limit=200, window_seconds=3600)
