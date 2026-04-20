const BASE = import.meta.env.VITE_API_URL || '';

function url(path) {
  return `${BASE}${path}`;
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore
    }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function createSession({ type, nickname }) {
  const res = await fetch(url('/api/sessions'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, nickname }),
  });
  return handle(res);
}

export async function getSessionPublic(sessionId) {
  const res = await fetch(url(`/api/sessions/${sessionId}/public`));
  return handle(res);
}

export async function getSession(sessionId, token) {
  const res = await fetch(url(`/api/sessions/${sessionId}`), {
    headers: { ...authHeader(token) },
  });
  return handle(res);
}

export async function joinSession(sessionId, nickname) {
  const res = await fetch(url(`/api/sessions/${sessionId}/join`), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  return handle(res);
}

export async function leaveSession(sessionId, token) {
  const res = await fetch(url(`/api/sessions/${sessionId}/leave`), {
    method: 'POST',
    headers: { ...authHeader(token) },
  });
  return handle(res);
}

export async function terminateSession(sessionId, token) {
  const res = await fetch(url(`/api/sessions/${sessionId}`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  });
  return handle(res);
}

export async function extendSession(sessionId, token) {
  const res = await fetch(url(`/api/sessions/${sessionId}/extend`), {
    method: 'PATCH',
    headers: { ...authHeader(token) },
  });
  return handle(res);
}

export async function listPhotos(sessionId, token) {
  const res = await fetch(url(`/api/sessions/${sessionId}/photos`), {
    headers: { ...authHeader(token) },
  });
  return handle(res);
}

export async function uploadPhoto(sessionId, token, file) {
  const fd = new FormData();
  fd.append('file', file);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(url(`/api/sessions/${sessionId}/photos`), {
      method: 'POST',
      headers: { ...authHeader(token) },
      body: fd,
      signal: controller.signal,
    });
    return await handle(res);
  } finally {
    clearTimeout(timeout);
  }
}

export async function removePhoto(sessionId, token, photoId) {
  const res = await fetch(url(`/api/sessions/${sessionId}/photos/${photoId}`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  });
  return handle(res);
}

export async function downloadPhotoUrl(sessionId, token, photoId) {
  const res = await fetch(
    url(`/api/sessions/${sessionId}/photos/${photoId}/download`),
    { headers: { ...authHeader(token) } }
  );
  return handle(res);
}

export async function getVapidPublicKey() {
  const res = await fetch(url('/api/push/vapid-public-key'));
  return handle(res);
}

export async function subscribePush(sessionId, token, subscription) {
  const res = await fetch(url(`/api/sessions/${sessionId}/push/subscribe`), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...authHeader(token),
    },
    body: JSON.stringify(subscription),
  });
  return handle(res);
}

export async function unsubscribePush(sessionId, token) {
  const res = await fetch(url(`/api/sessions/${sessionId}/push/subscribe`), {
    method: 'DELETE',
    headers: { ...authHeader(token) },
  });
  return handle(res);
}

export function wsUrl(sessionId, token) {
  const base = BASE
    ? BASE.replace(/^http/, 'ws')
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  return `${base}/ws/${sessionId}?token=${encodeURIComponent(token)}`;
}
