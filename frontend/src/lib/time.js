export function formatRemaining(expiresAt) {
  if (!expiresAt) return '';
  const secs = expiresAt - Math.floor(Date.now() / 1000);
  if (secs <= 0) return 'Expired';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h >= 1) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m >= 1) return `${m}m`;
  return `${secs}s`;
}

export function isExpiring(expiresAt, thresholdSeconds = 2 * 60 * 60) {
  if (!expiresAt) return false;
  const secs = expiresAt - Math.floor(Date.now() / 1000);
  return secs > 0 && secs <= thresholdSeconds;
}

export function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return expiresAt <= Math.floor(Date.now() / 1000);
}

export function formatTimeOfDay(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function shouldShowSeparator(prev, cur) {
  if (!prev) return true;
  return cur - prev > 15 * 60;
}
