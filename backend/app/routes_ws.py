from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from . import pubsub, r2, sessions

logger = logging.getLogger(__name__)

router = APIRouter()

PING_INTERVAL = 30


@router.websocket("/ws/{session_id}")
async def ws_endpoint(websocket: WebSocket, session_id: str, token: str = Query(...)):
    try:
        await websocket.accept()
    except Exception:
        return

    async def safe_close(code: int) -> None:
        try:
            await websocket.close(code=code)
        except Exception:
            pass

    session = await sessions.get_session(session_id)
    if not session:
        await safe_close(4004)
        return
    if session["status"] != "active":
        await safe_close(4004)
        return
    ok, nickname = await sessions.is_participant(session_id, token)
    if not ok:
        await safe_close(4001)
        return

    # Send initial state to just this client.
    participants = await sessions.list_participants(session_id)
    initial: dict = {
        "type": "init",
        "session_id": session_id,
        "session_type": session["type"],
        "nickname": nickname,
        "participants": participants,
        "expires_at": session["expires_at"],
    }
    if session["type"] == "chat":
        initial["messages"] = await sessions.recent_messages(session_id, limit=50)
    else:
        metas = await sessions.list_photos_meta(session_id)
        photos = []
        for m in metas:
            signed = await r2.presign_url(m["r2_key"], expires=900)
            photos.append(
                {
                    "photo_id": m["photo_id"],
                    "uploader_nickname": m["uploader_nickname"],
                    "width": m["width"],
                    "height": m["height"],
                    "timestamp": m["timestamp"],
                    "signed_url": signed,
                }
            )
        initial["photos"] = photos
    try:
        await websocket.send_json(initial)
    except WebSocketDisconnect:
        logger.info("client disconnected before init complete: %s", session_id)
        return
    except Exception as e:
        logger.warning("init send failed: %s", e)
        return

    # Subscribe to pubsub channel.
    from .redis_client import get_redis

    redis = get_redis()
    pubsub_conn = redis.pubsub()
    await pubsub_conn.subscribe(pubsub.channel_for(session_id))

    stop = asyncio.Event()

    async def reader():
        """Forward pubsub events to the WebSocket."""
        try:
            while not stop.is_set():
                msg = await pubsub_conn.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if msg is None:
                    continue
                data = msg.get("data")
                if not data:
                    continue
                try:
                    event = json.loads(data) if isinstance(data, str) else data
                except Exception:
                    continue
                await websocket.send_json(event)
                if event.get("type") == "session_terminated":
                    stop.set()
                    break
        except WebSocketDisconnect:
            stop.set()
        except Exception as e:
            logger.exception("reader error: %s", e)
            stop.set()

    async def pinger():
        try:
            while not stop.is_set():
                await asyncio.sleep(PING_INTERVAL)
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    stop.set()
                    break
        except asyncio.CancelledError:
            pass

    reader_task = asyncio.create_task(reader())
    ping_task = asyncio.create_task(pinger())

    try:
        while not stop.is_set():
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                continue
            t = data.get("type")
            if t == "message" and session["type"] == "chat":
                text = (data.get("text") or "").strip()
                if not text:
                    continue
                if len(text) > 2000:
                    text = text[:2000]
                msg = await sessions.append_message(session_id, nickname, text)
                await pubsub.publish(
                    session_id,
                    {
                        "type": "message",
                        "nickname": msg["nickname"],
                        "text": msg["text"],
                        "timestamp": msg["timestamp"],
                    },
                )
            elif t == "pong":
                continue
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("ws error: %s", e)
    finally:
        stop.set()
        reader_task.cancel()
        ping_task.cancel()
        try:
            await pubsub_conn.unsubscribe(pubsub.channel_for(session_id))
            await pubsub_conn.close()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass
