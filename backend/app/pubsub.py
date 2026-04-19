"""Redis pub/sub fan-out for WebSocket broadcast."""
from __future__ import annotations

import json
from typing import Any

from .redis_client import get_redis


def channel_for(session_id: str) -> str:
    return f"ws:{session_id}"


async def publish(session_id: str, event: dict[str, Any]) -> None:
    redis = get_redis()
    await redis.publish(channel_for(session_id), json.dumps(event))
