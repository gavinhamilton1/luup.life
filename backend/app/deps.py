from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Path

from . import sessions


async def _extract_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid auth header")
    return parts[1]


async def require_participant(
    session_id: str = Path(...),
    authorization: str | None = Header(default=None),
) -> dict:
    token = await _extract_token(authorization)
    session = await sessions.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "active":
        raise HTTPException(status_code=410, detail="Session ended")
    ok, nickname = await sessions.is_participant(session_id, token)
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid token")
    is_creator = await sessions.is_creator(session_id, token)
    return {
        "session": session,
        "nickname": nickname,
        "token": token,
        "is_creator": is_creator,
    }


async def require_creator(
    auth: dict = Depends(require_participant),
) -> dict:
    if not auth["is_creator"]:
        raise HTTPException(status_code=403, detail="Creator only")
    return auth
