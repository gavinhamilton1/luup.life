from __future__ import annotations

import logging
import time
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Path, UploadFile

from . import images, persistence, pubsub, push, r2, sessions
from .deps import require_participant
from .rate_limit import limit_photo_upload
from .schemas import PhotoListResponse, PhotoMeta, UploadResponse
from .security import generate_photo_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions/{session_id}/photos", tags=["photos"])


def _r2_key(session_id: str, photo_id: str) -> str:
    return f"sessions/{session_id}/{photo_id}.jpg"


@router.post("", response_model=UploadResponse)
async def upload(
    session_id: str,
    file: UploadFile = File(...),
    auth: dict = Depends(require_participant),
):
    if auth["session"]["type"] != "photo":
        raise HTTPException(status_code=400, detail="Not a photo session")

    await limit_photo_upload(session_id, auth["nickname"])

    raw = await file.read()
    logger.info(
        "photo upload: session=%s nickname=%s content_type=%s size=%d filename=%s",
        session_id,
        auth["nickname"],
        file.content_type,
        len(raw),
        file.filename,
    )
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    try:
        processed, width, height = await images.process_image(raw)
    except Exception as e:
        logger.exception("image processing failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    photo_id = generate_photo_id()
    key = _r2_key(session_id, photo_id)
    try:
        await r2.put_object(key, processed, content_type="image/jpeg")
    except Exception as e:
        logger.exception("r2 upload failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Storage error: {e}")

    meta = {
        "photo_id": photo_id,
        "r2_key": key,
        "uploader_nickname": auth["nickname"],
        "width": width,
        "height": height,
        "timestamp": int(time.time()),
    }
    await sessions.add_photo(session_id, meta)
    persistence.mark_dirty(session_id)
    signed = await r2.presign_url(key, expires=900)

    await pubsub.publish(
        session_id,
        {
            "type": "photo_added",
            "photo": {
                "photo_id": photo_id,
                "uploader_nickname": meta["uploader_nickname"],
                "width": width,
                "height": height,
                "timestamp": meta["timestamp"],
                "signed_url": signed,
            },
        },
    )
    push.dispatch_background(
        session_id,
        payload={
            "type": "photo",
            "title": f"{auth['nickname']} added a photo",
            "body": "Tap to view",
            "session_id": session_id,
        },
        exclude_nicknames={auth["nickname"]},
    )

    return UploadResponse(
        photo_id=photo_id,
        width=width,
        height=height,
        timestamp=meta["timestamp"],
        signed_url=signed,
    )


@router.get("", response_model=PhotoListResponse)
async def list_photos(
    session_id: str,
    auth: dict = Depends(require_participant),
):
    metas = await sessions.list_photos_meta(session_id)
    out: list[PhotoMeta] = []
    for m in metas:
        signed = await r2.presign_url(m["r2_key"], expires=900)
        out.append(
            PhotoMeta(
                photo_id=m["photo_id"],
                uploader_nickname=m["uploader_nickname"],
                width=m["width"],
                height=m["height"],
                timestamp=m["timestamp"],
                signed_url=signed,
            )
        )
    return PhotoListResponse(photos=out)


@router.delete("/{photo_id}")
async def remove(
    session_id: str,
    photo_id: str,
    auth: dict = Depends(require_participant),
):
    meta = await sessions.remove_photo(session_id, photo_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Photo not found")
    logger.info(
        "remove photo: session=%s photo=%s key=%s by=%s",
        session_id,
        photo_id,
        meta.get("r2_key"),
        auth["nickname"],
    )
    try:
        await r2.delete_object(meta["r2_key"])
    except Exception:
        # Metadata is already gone from Redis; R2 object is orphaned until the
        # bucket lifecycle rule cleans it. Don't re-raise — the user-visible
        # removal already succeeded.
        logger.warning("r2 delete failed; orphan key: %s", meta.get("r2_key"))
    persistence.mark_dirty(session_id)
    await pubsub.publish(
        session_id,
        {"type": "photo_removed", "photo_id": photo_id},
    )
    return {"ok": True}


@router.get("/{photo_id}/download")
async def download_url(
    session_id: str,
    photo_id: str,
    auth: dict = Depends(require_participant),
):
    metas = await sessions.list_photos_meta(session_id)
    meta = next((m for m in metas if m["photo_id"] == photo_id), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Photo not found")
    filename = f"luup-{photo_id}.jpg"
    signed = await r2.presign_url(
        meta["r2_key"], expires=900, download_filename=filename
    )
    return {"signed_url": signed, "filename": filename}
