"""Web Push (VAPID) dispatch + subscription storage.

Subscriptions are stored in Redis under the session's TTL so they vanish
with the session. Delivery happens via `pywebpush`, which talks to the
browser's push service endpoint (FCM / Mozilla autopush / etc).

We track which participants are currently connected over WebSocket (in-
process set — single-instance assumption) so push only goes to absent
participants. Foreground clients still get their updates through the WS.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from pywebpush import WebPushException, webpush

from .config import settings
from .redis_client import get_redis

logger = logging.getLogger(__name__)

# session_id → set of nicknames whose WebSocket is currently open on this
# process. Used to exclude foreground participants from push dispatch.
_active_ws: dict[str, set[str]] = {}


def _subs_key(session_id: str) -> str:
    return f"session:{session_id}:push"


def is_enabled() -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def public_key() -> str:
    return settings.vapid_public_key


def mark_ws_open(session_id: str, nickname: str) -> None:
    _active_ws.setdefault(session_id, set()).add(nickname)


def mark_ws_closed(session_id: str, nickname: str) -> None:
    present = _active_ws.get(session_id)
    if not present:
        return
    present.discard(nickname)
    if not present:
        _active_ws.pop(session_id, None)


def is_foreground(session_id: str, nickname: str) -> bool:
    return nickname in _active_ws.get(session_id, set())


async def save_subscription(
    session_id: str, nickname: str, subscription: dict, expires_at: int
) -> None:
    """Persist a single nickname's subscription. Expires with the session."""
    redis = get_redis()
    pipe = redis.pipeline()
    pipe.hset(_subs_key(session_id), nickname, json.dumps(subscription))
    pipe.expireat(_subs_key(session_id), expires_at)
    await pipe.execute()


async def delete_subscription(session_id: str, nickname: str) -> None:
    redis = get_redis()
    await redis.hdel(_subs_key(session_id), nickname)


async def list_subscriptions(session_id: str) -> dict[str, dict]:
    """nickname → subscription JSON."""
    redis = get_redis()
    raw = await redis.hgetall(_subs_key(session_id))
    out: dict[str, dict] = {}
    for nick, blob in raw.items():
        try:
            out[nick] = json.loads(blob)
        except Exception:
            continue
    return out


def _send_sync(subscription: dict, payload: dict) -> int:
    """Blocking push dispatch. Returns HTTP status from the push service."""
    resp = webpush(
        subscription_info=subscription,
        data=json.dumps(payload),
        vapid_private_key=settings.vapid_private_key,
        vapid_claims={"sub": settings.vapid_subject},
        ttl=60,
    )
    return getattr(resp, "status_code", 0)


async def _send_one(
    session_id: str, nickname: str, subscription: dict, payload: dict
) -> None:
    try:
        await asyncio.to_thread(_send_sync, subscription, payload)
    except WebPushException as e:
        # 404 / 410 → endpoint is dead, drop the subscription.
        status = getattr(e.response, "status_code", None) if e.response else None
        if status in (404, 410):
            logger.info(
                "push subscription expired, removing: session=%s nickname=%s",
                session_id,
                nickname,
            )
            await delete_subscription(session_id, nickname)
        else:
            logger.warning(
                "push send failed: session=%s nickname=%s status=%s err=%s",
                session_id,
                nickname,
                status,
                e,
            )
    except Exception as e:
        logger.warning("push dispatch error: %s", e)


async def dispatch(
    session_id: str,
    *,
    payload: dict[str, Any],
    exclude_nicknames: set[str],
) -> int:
    """Send a push to every subscriber for the session except `exclude_nicknames`.

    Returns the number of push attempts made. No-op if push isn't configured.
    """
    if not is_enabled():
        return 0

    subs = await list_subscriptions(session_id)
    if not subs:
        return 0

    targets = [
        (nick, sub)
        for nick, sub in subs.items()
        if nick not in exclude_nicknames
        and not is_foreground(session_id, nick)
    ]
    if not targets:
        return 0

    # Fire all pushes concurrently. We don't await in the request path; the
    # caller should schedule this as a background task.
    await asyncio.gather(
        *(_send_one(session_id, nick, sub, payload) for nick, sub in targets),
        return_exceptions=True,
    )
    return len(targets)


def dispatch_background(
    session_id: str,
    *,
    payload: dict[str, Any],
    exclude_nicknames: set[str],
) -> None:
    """Fire-and-forget wrapper — schedules dispatch without awaiting."""
    if not is_enabled():
        return
    asyncio.create_task(
        dispatch(
            session_id,
            payload=payload,
            exclude_nicknames=exclude_nicknames,
        )
    )
