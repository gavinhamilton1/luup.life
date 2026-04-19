"""Session CRUD + Redis key management."""
from __future__ import annotations

import json
import time
from typing import Literal, Optional

from fastapi import HTTPException

from .config import settings
from .redis_client import get_redis, keys_for_session
from .security import generate_session_id, generate_token, hash_token

SessionType = Literal["chat", "photo"]
MESSAGE_LIMIT = 500


def _session_key(session_id: str) -> str:
    return f"session:{session_id}"


def _participants_key(session_id: str) -> str:
    return f"session:{session_id}:participants"


def _messages_key(session_id: str) -> str:
    return f"session:{session_id}:messages"


def _photos_key(session_id: str) -> str:
    return f"session:{session_id}:photos"


async def create_session(type_: SessionType, nickname: str) -> dict:
    now = int(time.time())
    expires_at = now + settings.session_ttl_seconds
    session_id = generate_session_id()
    token = generate_token()
    token_h = hash_token(token)

    redis = get_redis()
    pipe = redis.pipeline()
    pipe.hset(
        _session_key(session_id),
        mapping={
            "type": type_,
            "creator_token_hash": token_h,
            "creator_nickname": nickname,
            "created_at": str(now),
            "expires_at": str(expires_at),
            "status": "active",
        },
    )
    pipe.expireat(_session_key(session_id), expires_at)
    pipe.hset(_participants_key(session_id), nickname, token_h)
    pipe.expireat(_participants_key(session_id), expires_at)
    # Pre-create the other keys with TTL so EXPIREAT is set on all.
    pipe.rpush(_messages_key(session_id), json.dumps({
        "system": True,
        "text": f"{nickname} started the luup",
        "timestamp": now,
    }))
    pipe.ltrim(_messages_key(session_id), -MESSAGE_LIMIT, -1)
    pipe.expireat(_messages_key(session_id), expires_at)
    # Photos sorted set — touch it so expireat works.
    pipe.zadd(_photos_key(session_id), {"__init__": 0})
    pipe.zrem(_photos_key(session_id), "__init__")
    pipe.expireat(_photos_key(session_id), expires_at)
    await pipe.execute()

    return {
        "session_id": session_id,
        "token": token,
        "nickname": nickname,
        "type": type_,
        "created_at": now,
        "expires_at": expires_at,
    }


async def get_session(session_id: str) -> Optional[dict]:
    redis = get_redis()
    data = await redis.hgetall(_session_key(session_id))
    if not data:
        return None
    return {
        "session_id": session_id,
        "type": data["type"],
        "created_at": int(data["created_at"]),
        "expires_at": int(data["expires_at"]),
        "status": data.get("status", "active"),
        "creator_token_hash": data.get("creator_token_hash"),
        "creator_nickname": data.get("creator_nickname"),
    }


async def list_participants(session_id: str) -> list[str]:
    redis = get_redis()
    return sorted(await redis.hkeys(_participants_key(session_id)))


async def is_participant(session_id: str, token: str) -> tuple[bool, Optional[str]]:
    """Returns (is_participant, nickname)."""
    redis = get_redis()
    token_h = hash_token(token)
    members = await redis.hgetall(_participants_key(session_id))
    for nick, h in members.items():
        if h == token_h:
            return True, nick
    return False, None


async def is_creator(session_id: str, token: str) -> bool:
    redis = get_redis()
    token_h = hash_token(token)
    creator_h = await redis.hget(_session_key(session_id), "creator_token_hash")
    return creator_h is not None and creator_h == token_h


async def join_session(session_id: str, nickname: str) -> dict:
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "active":
        raise HTTPException(status_code=410, detail="Session ended")

    redis = get_redis()
    nickname = nickname.strip()
    if not nickname:
        raise HTTPException(status_code=400, detail="Nickname required")

    # Check for nickname collision.
    existing = await redis.hexists(_participants_key(session_id), nickname)
    if existing:
        raise HTTPException(status_code=409, detail="Nickname taken")

    token = generate_token()
    token_h = hash_token(token)
    # HSETNX ensures atomic insertion; re-check after insert in case of race.
    added = await redis.hsetnx(_participants_key(session_id), nickname, token_h)
    if not added:
        raise HTTPException(status_code=409, detail="Nickname taken")

    return {
        "session_id": session_id,
        "token": token,
        "nickname": nickname,
        "type": session["type"],
        "expires_at": session["expires_at"],
    }


async def leave_session(session_id: str, nickname: str) -> None:
    redis = get_redis()
    await redis.hdel(_participants_key(session_id), nickname)


async def extend_session(session_id: str) -> int:
    """Extends by another session_ttl_seconds from now. Returns new expires_at."""
    redis = get_redis()
    new_expires = int(time.time()) + settings.session_ttl_seconds
    pipe = redis.pipeline()
    pipe.hset(_session_key(session_id), "expires_at", str(new_expires))
    for k in keys_for_session(session_id):
        pipe.expireat(k, new_expires)
    await pipe.execute()
    return new_expires


async def terminate_session(session_id: str) -> None:
    redis = get_redis()
    pipe = redis.pipeline()
    pipe.hset(_session_key(session_id), "status", "terminated")
    pipe.expire(_session_key(session_id), 60)  # Keep briefly for WS cleanup.
    await pipe.execute()


async def purge_session(session_id: str) -> None:
    redis = get_redis()
    pipe = redis.pipeline()
    for k in keys_for_session(session_id):
        pipe.delete(k)
    await pipe.execute()


async def append_message(session_id: str, nickname: str, text: str) -> dict:
    redis = get_redis()
    msg = {
        "nickname": nickname,
        "text": text,
        "timestamp": int(time.time()),
    }
    pipe = redis.pipeline()
    pipe.rpush(_messages_key(session_id), json.dumps(msg))
    pipe.ltrim(_messages_key(session_id), -MESSAGE_LIMIT, -1)
    await pipe.execute()
    return msg


async def recent_messages(session_id: str, limit: int = 50) -> list[dict]:
    redis = get_redis()
    raw = await redis.lrange(_messages_key(session_id), -limit, -1)
    out = []
    for r in raw:
        try:
            out.append(json.loads(r))
        except Exception:
            continue
    return out


async def add_photo(session_id: str, meta: dict) -> None:
    redis = get_redis()
    await redis.zadd(_photos_key(session_id), {json.dumps(meta): meta["timestamp"]})


async def list_photos_meta(session_id: str) -> list[dict]:
    redis = get_redis()
    raw = await redis.zrange(_photos_key(session_id), 0, -1)
    out = []
    for r in raw:
        try:
            out.append(json.loads(r))
        except Exception:
            continue
    return out


async def remove_photo(session_id: str, photo_id: str) -> Optional[dict]:
    redis = get_redis()
    raw = await redis.zrange(_photos_key(session_id), 0, -1)
    for r in raw:
        try:
            meta = json.loads(r)
        except Exception:
            continue
        if meta.get("photo_id") == photo_id:
            await redis.zrem(_photos_key(session_id), r)
            return meta
    return None
