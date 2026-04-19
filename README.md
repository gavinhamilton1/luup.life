# LUUP — luup.life

Ephemeral proximity chat and photo sharing. Create a session, show a QR, people scan, everyone's connected for up to 48 hours. No accounts.

## Repo layout

```
backend/    FastAPI, Redis, Cloudflare R2, WebSocket
frontend/   React PWA (Vite) deployed to Cloudflare Pages
design_handoff_luup/   Design reference mockups (not shipped)
```

## Local development

### 1. Start Redis

```bash
docker compose up -d redis
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in R2 credentials if using photo sessions
uvicorn app.main:app --reload --port 8000
```

Photo sessions require real R2 credentials. Chat sessions work without R2.

### 3. Frontend (Vite)

```bash
cd frontend
npm install
npm run dev                 # opens http://localhost:5173
```

The Vite dev server proxies `/api` and `/ws` to `http://localhost:8000`.

## Deployment

### Backend — Render

The repo ships `backend/render.yaml` for blueprint deployment. From the Render dashboard:

1. Point a new Blueprint at this repo.
2. Render creates a `luup-api` web service and a `luup-redis` instance.
3. Fill the R2 credentials in the service env vars (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT_URL`), and set `FRONTEND_URL=https://luup.life`.
4. On the R2 bucket, set a lifecycle rule deleting `sessions/` objects older than 48 hours.

### Frontend — Cloudflare Pages

```
Build command:     cd frontend && npm install && npm run build
Build output:      frontend/dist
Environment:       VITE_API_URL=https://<your-render-service>.onrender.com
```

`public/_redirects` handles SPA fallback for Pages.

## Architecture notes

- **Session IDs**: `secrets.token_urlsafe(12)` — short enough to QR, wide enough to be unguessable.
- **Participant tokens**: `secrets.token_urlsafe(32)`, hashed with SHA-256 before storage. The raw token is held only on the client.
- **Redis keys** (all TTL'd to session expiry):
  - `session:{id}` — hash with type, creator hash, timestamps, status
  - `session:{id}:participants` — `nickname → token_hash`
  - `session:{id}:messages` — list capped at 500 JSON entries
  - `session:{id}:photos` — sorted set keyed by upload timestamp
- **Photos**: uploaded multipart, resized to 1600px max edge, converted to JPEG @ q=85 (progressive, optimized), EXIF stripped, stored on R2 at `sessions/{id}/{photo_id}.jpg`. HEIC inputs supported via `pillow-heif`. RGBA (PNGs with transparency) are flattened onto white. Clients get 15-minute presigned URLs.
- **Real-time**: WebSocket per client, Redis pub/sub fan-out on `ws:{session_id}` so the backend can scale horizontally.
- **Client storage**: IndexedDB stores session tokens and a local blob cache for photos so offline viewing and "republish" flows work.

## Environment variables

### Backend

| Var | Purpose |
|---|---|
| `REDIS_URL` | Redis connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET_NAME` | Bucket that holds `sessions/` prefix |
| `R2_ENDPOINT_URL` | e.g. `https://<account>.r2.cloudflarestorage.com` |
| `FRONTEND_URL` | Used for CORS + join-URL generation |
| `SECRET_KEY` | Reserved for HMAC signing if needed |
| `SESSION_TTL_SECONDS` | Default 172800 (48h) |

### Frontend

| Var | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend. Leave empty in dev (proxy handles it). |

## API surface

| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/sessions` | none |
| `GET` | `/api/sessions/{id}/public` | none |
| `GET` | `/api/sessions/{id}` | participant |
| `POST` | `/api/sessions/{id}/join` | none |
| `POST` | `/api/sessions/{id}/leave` | participant |
| `DELETE` | `/api/sessions/{id}` | participant (photo: creator only) |
| `PATCH` | `/api/sessions/{id}/extend` | creator |
| `GET` | `/api/sessions/{id}/photos` | participant |
| `POST` | `/api/sessions/{id}/photos` | participant |
| `DELETE` | `/api/sessions/{id}/photos/{photo_id}` | participant |
| `GET` | `/api/sessions/{id}/photos/{photo_id}/download` | participant |
| `WS` | `/ws/{session_id}?token=…` | token validated on connect |

## Rate limits

- Session creation: 10 per IP per hour
- Photo upload: 50 per session per participant per hour
