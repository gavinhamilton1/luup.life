/* global self, clients */
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache the app shell (injected by vite-plugin-pwa at build time).
precacheAndRoute(self.__WB_MANIFEST || []);

// R2 photo URLs — cache-first, one-week expiry.
registerRoute(
  ({ url }) => /\.r2\.cloudflarestorage\.com/.test(url.hostname),
  new CacheFirst({
    cacheName: 'luup-photos',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  })
);

// API calls — network-first with a short fallback.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'luup-api',
    networkTimeoutSeconds: 5,
  })
);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// -------------------------------------------------------------------------
// Web Push
// -------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(handlePush(payload));
});

async function handlePush(payload) {
  const sessionId = payload.session_id;
  const sessionPath = sessionId ? `/s/${sessionId}` : null;

  // If any LUUP window is open on THIS session and focused, don't notify —
  // the user is already watching and the WebSocket has delivered the update.
  try {
    const wins = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    const activeHere = wins.find(
      (c) =>
        c.focused &&
        c.visibilityState === 'visible' &&
        sessionPath &&
        c.url.includes(sessionPath)
    );
    if (activeHere) {
      // Let the page know so it can surface a tiny in-app cue if it wants.
      activeHere.postMessage({ kind: 'luup-push', payload });
      return;
    }
  } catch {
    // fall through to showing a notification
  }

  const title = payload.title || 'LUUP';
  const body = payload.body || '';
  const tag = sessionId ? `luup-${sessionId}` : 'luup';

  await self.registration.showNotification(title, {
    body,
    tag,
    renotify: false,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { sessionPath },
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.sessionPath || '/';
  event.waitUntil(focusOrOpen(targetPath));
});

async function focusOrOpen(path) {
  const wins = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const c of wins) {
    try {
      const url = new URL(c.url);
      if (url.pathname === path) {
        return c.focus();
      }
    } catch {
      // ignore
    }
  }
  // No matching window — open a new one.
  return self.clients.openWindow(path);
}
