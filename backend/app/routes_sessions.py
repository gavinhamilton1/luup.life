from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Request

from . import pubsub, r2, sessions
from .config import settings
from .deps import require_creator, require_participant
from .rate_limit import limit_session_create
from .schemas import (
    CreateSessionBody,
    CreateSessionResponse,
    ExtendResponse,
    JoinResponse,
    JoinSessionBody,
    SessionInfo,
    SessionPublicInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _join_url(session_id: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}/j/{session_id}"


@router.post("", response_model=CreateSessionResponse)
async def create(
    body: CreateSessionBody,
    request: Request,
):
    await limit_session_create(request)
    result = await sessions.create_session(body.type, body.nickname)
    return CreateSessionResponse(
        session_id=result["session_id"],
        token=result["token"],
        nickname=result["nickname"],
        type=result["type"],
        expires_at=result["expires_at"],
        join_url=_join_url(result["session_id"]),
    )


@router.get("/{session_id}/public", response_model=SessionPublicInfo)
async def public_info(session_id: str):
    s = await sessions.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionPublicInfo(
        session_id=s["session_id"],
        type=s["type"],
        status=s["status"],
        expires_at=s["expires_at"],
    )


@router.get("/{session_id}", response_model=SessionInfo)
async def info(session_id: str, auth: dict = Depends(require_participant)):
    s = auth["session"]
    participants = await sessions.list_participants(session_id)
    return SessionInfo(
        session_id=s["session_id"],
        type=s["type"],
        status=s["status"],
        created_at=s["created_at"],
        expires_at=s["expires_at"],
        participants=participants,
        is_creator=auth["is_creator"],
    )


@router.post("/{session_id}/join", response_model=JoinResponse)
async def join(session_id: str, body: JoinSessionBody):
    result = await sessions.join_session(session_id, body.nickname)
    participants = await sessions.list_participants(session_id)
    await pubsub.publish(
        session_id,
        {
            "type": "participant_joined",
            "nickname": result["nickname"],
            "participants": participants,
        },
    )
    return JoinResponse(
        session_id=session_id,
        token=result["token"],
        nickname=result["nickname"],
        type=result["type"],
        expires_at=result["expires_at"],
        participants=participants,
    )


@router.post("/{session_id}/leave")
async def leave(session_id: str, auth: dict = Depends(require_participant)):
    nickname = auth["nickname"]
    await sessions.leave_session(session_id, nickname)
    participants = await sessions.list_participants(session_id)
    await pubsub.publish(
        session_id,
        {
            "type": "participant_left",
            "nickname": nickname,
            "participants": participants,
        },
    )
    return {"ok": True}


@router.delete("/{session_id}")
async def terminate(session_id: str, auth: dict = Depends(require_participant)):
    session = auth["session"]
    # Photo session: creator only. Chat: any participant.
    if session["type"] == "photo" and not auth["is_creator"]:
        raise HTTPException(status_code=403, detail="Creator only")

    await pubsub.publish(
        session_id,
        {"type": "session_terminated", "by": auth["nickname"]},
    )
    await sessions.terminate_session(session_id)
    try:
        await r2.delete_prefix(f"sessions/{session_id}/")
    except Exception:
        # Orphans will be reaped by the bucket lifecycle rule.
        logger.warning("r2 cleanup failed for terminated session %s", session_id)
    await sessions.purge_session(session_id)
    return {"ok": True}


@router.patch("/{session_id}/extend", response_model=ExtendResponse)
async def extend(session_id: str, auth: dict = Depends(require_creator)):
    new_exp = await sessions.extend_session(session_id)
    await pubsub.publish(
        session_id,
        {"type": "session_extended", "expires_at": new_exp},
    )
    return ExtendResponse(expires_at=new_exp)
