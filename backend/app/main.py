from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import persistence
from .config import settings
from .redis_client import close_redis, get_redis
from .routes_photos import router as photos_router
from .routes_push import router as push_router
from .routes_sessions import router as sessions_router
from .routes_ws import router as ws_router

logging.basicConfig(level=logging.INFO)
_log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the redis connection.
    try:
        await get_redis().ping()
    except Exception:
        _log.exception("redis ping failed on startup")
    # Replay any R2 session snapshots into Redis so a Redis wipe doesn't
    # destroy active luups. Safe to run on every boot — idempotent per session.
    try:
        await persistence.restore_all()
    except Exception:
        _log.exception("session recovery failed on startup")
    # Start the background flusher: dirty sessions get one R2 write per
    # FLUSH_INTERVAL tick, regardless of message rate.
    persistence.start_flush_loop()
    try:
        yield
    finally:
        # Drain any buffered snapshots on the way out so we don't lose
        # the last minute of activity on graceful shutdowns.
        await persistence.stop_flush_loop()
        await close_redis()


app = FastAPI(title="LUUP API", lifespan=lifespan)


_allowed_origins = [
    settings.frontend_url,
    "https://luup.life",
    "https://www.luup.life",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# Deduplicate while preserving order.
_seen = set()
allowed_origins = [o for o in _allowed_origins if not (o in _seen or _seen.add(o))]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(sessions_router)
app.include_router(photos_router)
app.include_router(push_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    redis_status = "error"
    try:
        pong = await get_redis().ping()
        redis_status = "connected" if pong else "error"
    except Exception:
        redis_status = "error"
    return {"status": "ok", "redis": redis_status}
