import { openDB } from 'idb';

const DB_NAME = 'luup';
const DB_VERSION = 1;

export function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'session_id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        const store = db.createObjectStore('photos', { keyPath: 'key' });
        store.createIndex('by_session', 'session_id');
      }
    },
  });
}

export async function saveSession(record) {
  const db = await getDb();
  await db.put('sessions', record);
}

export async function loadSession(sessionId) {
  const db = await getDb();
  return db.get('sessions', sessionId);
}

export async function listSessions() {
  const db = await getDb();
  return db.getAll('sessions');
}

export async function deleteSession(sessionId) {
  const db = await getDb();
  await db.delete('sessions', sessionId);
  // Also wipe photos for that session.
  const tx = db.transaction('photos', 'readwrite');
  const idx = tx.store.index('by_session');
  let cursor = await idx.openCursor(sessionId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function cachePhoto({ session_id, photo_id, blob, width, height, uploader_nickname, timestamp }) {
  const db = await getDb();
  await db.put('photos', {
    key: `${session_id}:${photo_id}`,
    session_id,
    photo_id,
    blob,
    width,
    height,
    uploader_nickname,
    timestamp,
  });
}

export async function getCachedPhoto(session_id, photo_id) {
  const db = await getDb();
  return db.get('photos', `${session_id}:${photo_id}`);
}

export async function getCachedPhotosForSession(session_id) {
  const db = await getDb();
  return db.getAllFromIndex('photos', 'by_session', session_id);
}

export async function deleteCachedPhoto(session_id, photo_id) {
  const db = await getDb();
  await db.delete('photos', `${session_id}:${photo_id}`);
}

export async function purgeExpiredSessions() {
  const sessions = await listSessions();
  const now = Math.floor(Date.now() / 1000);
  for (const s of sessions) {
    if (s.expires_at && s.expires_at < now) {
      await deleteSession(s.session_id);
    }
  }
}

export async function wipeAllLocalData() {
  const db = await getDb();
  const tx = db.transaction(['sessions', 'photos'], 'readwrite');
  await Promise.all([tx.objectStore('sessions').clear(), tx.objectStore('photos').clear()]);
  await tx.done;
}
