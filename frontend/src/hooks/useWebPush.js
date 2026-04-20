import { useCallback, useEffect, useState } from 'react';
import { getVapidPublicKey, subscribePush, unsubscribePush } from '../lib/api.js';
import { subscriptionToJson, urlBase64ToUint8Array } from '../lib/vapid.js';

const DISMISSED_KEY = 'luup.push.dismissed';

function supportsWebPush() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Manage web-push subscription lifecycle for a session.
 *
 * Returns:
 *  - supported: boolean
 *  - permission: 'default' | 'granted' | 'denied'
 *  - subscribed: boolean
 *  - promptable: whether we should show the "turn on notifications" UI
 *  - enable(): request permission + subscribe
 *  - disable(): unsubscribe locally + tell the backend to forget us
 *  - dismiss(): hide the prompt for this session (persists)
 */
export function useWebPush({ sessionId, token, enabled = true }) {
  const [permission, setPermission] = useState(() =>
    supportsWebPush() ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const supported = supportsWebPush();

  // On mount: check whether we already have a subscription for this browser.
  useEffect(() => {
    if (!supported || !enabled || !sessionId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (existing) {
          setSubscribed(true);
          // Re-register server-side every mount so an expired/rotated session
          // picks up the current subscription again.
          try {
            await subscribePush(sessionId, token, subscriptionToJson(existing));
          } catch {
            // ignore — server may be unreachable
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, enabled, sessionId, token]);

  const enable = useCallback(async () => {
    if (!supported || !sessionId || !token) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const { public_key: key } = await getVapidPublicKey();
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        });
      }
      await subscribePush(sessionId, token, subscriptionToJson(sub));
      setSubscribed(true);
      try {
        localStorage.removeItem(DISMISSED_KEY);
      } catch {
        // ignore
      }
      setDismissed(false);
      return true;
    } catch (e) {
      console.warn('[luup] push enable failed:', e);
      return false;
    }
  }, [supported, sessionId, token]);

  const disable = useCallback(async () => {
    if (!supported || !sessionId || !token) return;
    try {
      await unsubscribePush(sessionId, token).catch(() => {});
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setSubscribed(false);
    } catch (e) {
      console.warn('[luup] push disable failed:', e);
    }
  }, [supported, sessionId, token]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  }, []);

  const promptable =
    supported &&
    enabled &&
    permission === 'default' &&
    !subscribed &&
    !dismissed;

  return {
    supported,
    permission,
    subscribed,
    promptable,
    enable,
    disable,
    dismiss,
  };
}
