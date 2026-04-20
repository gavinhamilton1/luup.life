// VAPID public keys come from the server as base64url strings.
// PushManager.subscribe() wants the raw bytes as a Uint8Array.
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Browser-side PushSubscription serializes into { endpoint, keys: { p256dh, auth } }
// via JSON.stringify already, but only when using its toJSON(). Extract it cleanly.
export function subscriptionToJson(sub) {
  if (!sub) return null;
  const json = sub.toJSON ? sub.toJSON() : sub;
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
  };
}
