from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import push
from .deps import require_participant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["push"])


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionBody(BaseModel):
    endpoint: str
    keys: PushKeys


@router.get("/push/vapid-public-key")
async def vapid_public_key():
    if not push.is_enabled():
        raise HTTPException(status_code=503, detail="Push not configured")
    return {"public_key": push.public_key()}


@router.post("/sessions/{session_id}/push/subscribe")
async def subscribe(
    session_id: str,
    body: PushSubscriptionBody,
    auth: dict = Depends(require_participant),
):
    if not push.is_enabled():
        raise HTTPException(status_code=503, detail="Push not configured")
    await push.save_subscription(
        session_id,
        auth["nickname"],
        {
            "endpoint": body.endpoint,
            "keys": body.keys.model_dump(),
        },
        expires_at=auth["session"]["expires_at"],
    )
    return {"ok": True}


@router.delete("/sessions/{session_id}/push/subscribe")
async def unsubscribe(
    session_id: str,
    auth: dict = Depends(require_participant),
):
    await push.delete_subscription(session_id, auth["nickname"])
    return {"ok": True}
