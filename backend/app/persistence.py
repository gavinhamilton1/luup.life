"""Session snapshot + restore against R2.

## How it works

Mutations mark sessions "dirty" in memory. A background task wakes every
FLUSH_INTERVAL seconds and writes one snapshot per dirty session to R2 at
`recovery/sessions/{id}.json`. On startup, the API replays every snapshot
into Redis before accepting traffic, so a Redis wipe doesn't destroy live
luups.

## Trade-offs

  * Up to FLUSH_INTERVAL seconds of chat / join / leave activity can be
    lost if Redis crashes between flushes. Acceptable for an ephemeral chat
    app.
  * Write volume is bounded to at most one R2 PUT per active session per
    interval, regardless of message rate.
  * Session creation bypasses the dirty queue and snapshots immediately,
    so a new luup is recoverable the moment it exists.
  * Session termination bypasses the queue and deletes the snapshot
    immediately so we don't resurrect dead sessions on the next boot.
  * Single-instance only: the dirty set lives in process memory. At multi-
    instance scale, move it to a Redis SADD on `recovery:dirty` and have
    one worker flush it.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Optional

from . import r2
from .config import settings
from .redis_client import get_redis

logger = logging.getLogger(__name__)

SNAPSHOT_PREFIX = "recovery/sessions/"
FLUSH_INTERVAL = 60  # seconds between background flushes
MAX_RESTORE_CONCURRENCY = 10
MAX_FLUSH_CONCURRENCY = 5

# Session IDs that have changed since the last flush. Flushed every
# FLUSH_INTERVAL seconds by the background task started in start_flush_loop().
_dirty: set[str] = set()
_dirty_lock = asyncio.Lock()
_flush_task: Optional[asyncio.Task] = None


def _snapshot_key(session_id: str) -> str:
    return f"{SNAPSHOT_PREFIX}{session_id}.json"


def mark_dirty(session_id: str) -> None:
    """Queue a session for the next background R2 flush.

    Synchronous and zero-latency — does not block the request path.
    """
    _dirty.add(session_id)


async def snapshot_session(session_id: str) -> None:
    """Immediately write the session's state to R2 (bypasses the queue).

    Used for session creation so a brand-new luup is recoverable before the
    first background flush tick fires.
    """
    await _flush_one(session_id)
    _dirty.discard(session_id)


async def delete_snapshot(session_id: str) -> None:
    _dirty.discard(session_id)
    try:
        await r2.delete_object(_snapshot_key(session_id))
    except Exception:
        # Missing key is fine; we only care about leaks, not double-deletes.
        pass


async def _flush_one(session_id: str) -> bool:
    """Dump Redis state for one session to R2. Returns True on success."""
    redis = get_redis()
    session_data = await redis.hgetall(f"session:{session_id}")
    if not session_data:
        # Session disappeared from Redis (expired, terminated). Tidy up R2 too.
        await delete_snapshot(session_id)
        return False

    participants = await redis.hgetall(f"session:{session_id}:participants")
    raw_messages = await redis.lrange(f"session:{session_id}:messages", 0, -1)
    raw_photos = await redis.zrange(f"session:{session_id}:photos", 0, -1)

    messages: list[dict] = []
    for m in raw_messages:
        try:
            messages.append(json.loads(m))
        except Exception:
            continue

    photos: list[dict] = []
    for p in raw_photos:
        try:
            photos.append(json.loads(p))
        except Exception:
            continue

    snapshot = {
        "session_id": session_id,
        "session": session_data,
        "participants": participants,
        "messages": messages,
        "photos": photos,
        "snapshot_at": int(time.time()),
    }

    try:
        await r2.put_object(
            _snapshot_key(session_id),
            json.dumps(snapshot).encode("utf-8"),
            "application/json",
        )
        return True
    except Exception as e:
        logger.warning("snapshot flush failed for %s: %s", session_id, e)
        return False


async def flush_now() -> dict:
    """Flush every session currently marked dirty. Used at shutdown."""
    async with _dirty_lock:
        pending = list(_dirty)
        _dirty.clear()

    if not pending:
        return {"flushed": 0}

    sem = asyncio.Semaphore(MAX_FLUSH_CONCURRENCY)
    results: list[bool] = []

    async def _one(sid: str) -> None:
        async with sem:
            results.append(await _flush_one(sid))

    await asyncio.gather(*(_one(s) for s in pending), return_exceptions=False)
    flushed = sum(1 for r in results if r)
    if flushed:
        logger.info("recovery: flushed %d / %d dirty sessions", flushed, len(pending))
    return {"flushed": flushed, "total": len(pending)}


async def _flush_loop() -> None:
    """Background task: periodically flush dirty sessions to R2."""
    try:
        while True:
            await asyncio.sleep(FLUSH_INTERVAL)
            try:
                await flush_now()
            except Exception as e:
                logger.warning("flush loop iteration failed: %s", e)
    except asyncio.CancelledError:
        # Final flush on shutdown happens in stop_flush_loop()
        raise


def start_flush_loop() -> None:
    global _flush_task
    if _flush_task is not None and not _flush_task.done():
        return
    _flush_task = asyncio.create_task(_flush_loop())


async def stop_flush_loop() -> None:
    global _flush_task
    task = _flush_task
    _flush_task = None
    if task is not None:
        task.cancel()
        try:
            await task
        except (asyncio.CancelledError, Exception):
            pass
    # Make sure anything buffered gets out before process exit.
    try:
        await flush_now()
    except Exception as e:
        logger.warning("final flush failed: %s", e)


# ---------------------------------------------------------------------------
# Restore path (startup)
# ---------------------------------------------------------------------------

async def _list_snapshot_keys() -> list[str]:
    def _list() -> list[str]:
        from .r2 import get_r2

        client = get_r2()
        paginator = client.get_paginator("list_objects_v2")
        keys: list[str] = []
        for page in paginator.paginate(
            Bucket=settings.r2_bucket_name, Prefix=SNAPSHOT_PREFIX
        ):
            for obj in page.get("Contents") or []:
                keys.append(obj["Key"])
        return keys

    try:
        return await asyncio.to_thread(_list)
    except Exception as e:
        logger.warning("snapshot list failed: %s", e)
        return []


async def _read_snapshot(key: str) -> Optional[dict]:
    def _get() -> bytes:
        from .r2 import get_r2

        obj = get_r2().get_object(Bucket=settings.r2_bucket_name, Key=key)
        return obj["Body"].read()

    try:
        data = await asyncio.to_thread(_get)
        return json.loads(data)
    except Exception as e:
        logger.warning("snapshot read failed %s: %s", key, e)
        return None


async def _restore_one(key: str) -> bool:
    snap = await _read_snapshot(key)
    if not snap:
        return False

    session_id = snap.get("session_id")
    session = snap.get("session") or {}
    if not session_id or not session:
        return False

    try:
        expires_at = int(session.get("expires_at") or 0)
    except (TypeError, ValueError):
        expires_at = 0
    if expires_at <= int(time.time()):
        logger.info("discarding expired snapshot: %s", session_id)
        try:
            await r2.delete_object(key)
        except Exception:
            pass
        return False

    redis = get_redis()
    pipe = redis.pipeline()

    s_key = f"session:{session_id}"
    p_key = f"session:{session_id}:participants"
    m_key = f"session:{session_id}:messages"
    ph_key = f"session:{session_id}:photos"

    pipe.delete(s_key, p_key, m_key, ph_key)

    pipe.hset(s_key, mapping=session)
    pipe.expireat(s_key, expires_at)

    participants = snap.get("participants") or {}
    if participants:
        pipe.hset(p_key, mapping=participants)
        pipe.expireat(p_key, expires_at)

    messages = snap.get("messages") or []
    if messages:
        pipe.rpush(m_key, *[json.dumps(m) for m in messages])
        pipe.expireat(m_key, expires_at)

    photos = snap.get("photos") or []
    if photos:
        mapping = {json.dumps(p): int(p.get("timestamp") or 0) for p in photos}
        pipe.zadd(ph_key, mapping)
        pipe.expireat(ph_key, expires_at)

    await pipe.execute()
    return True


async def restore_all() -> dict:
    """Replay every snapshot from R2 into Redis. Called at backend startup."""
    if not settings.r2_bucket_name:
        logger.info("recovery: R2 not configured; skipping restore")
        return {"restored": 0, "skipped": 0, "total": 0}

    keys = await _list_snapshot_keys()
    if not keys:
        logger.info("recovery: no snapshots found")
        return {"restored": 0, "skipped": 0, "total": 0}

    sem = asyncio.Semaphore(MAX_RESTORE_CONCURRENCY)
    results: list[bool] = []

    async def _one(k: str) -> None:
        async with sem:
            results.append(await _restore_one(k))

    await asyncio.gather(*(_one(k) for k in keys))
    restored = sum(1 for r in results if r)
    skipped = len(results) - restored
    logger.info(
        "recovery: restored=%d skipped=%d total=%d", restored, skipped, len(keys)
    )
    return {"restored": restored, "skipped": skipped, "total": len(keys)}
