import { getVapidPublicKey, unsubscribePush } from './api.js';
import { subscriptionToJson, urlBase64ToUint8Array } from './vapid.js';
import { listSessions } from './db.js';

export function supportsWebPush() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function currentPermission() {
  if (!supportsWebPush()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Request permission and create a browser-level push subscription.
 * Doesn't register with any specific session — that happens automatically
 * when the user next enters one (useWebPush picks up the existing sub).
 */
export async function enableNotifications() {
  if (!supportsWebPush()) return { ok: false, reason: 'unsupported' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: perm };

  try {
    const { public_key: key } = await getVapidPublicKey();
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    return { ok: true, subscription: subscriptionToJson(sub) };
  } catch (e) {
    console.warn('[luup] enable notifications failed:', e);
    return { ok: false, reason: 'failed' };
  }
}

/**
 * Drop the browser's push subscription AND tell every session we're
 * currently in about it so the backend stops pushing to us.
 */
export async function disableNotifications() {
  if (!supportsWebPush()) return false;
  try {
    // Unregister from every session we hold a token for.
    const sessions = await listSessions();
    await Promise.all(
      sessions.map((s) =>
        unsubscribePush(s.session_id, s.token).catch(() => null)
      )
    );
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    return true;
  } catch (e) {
    console.warn('[luup] disable notifications failed:', e);
    return false;
  }
}

export async function hasActiveSubscription() {
  if (!supportsWebPush()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
