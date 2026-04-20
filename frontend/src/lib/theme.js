const KEY = 'luup.theme';
// Preference values: 'light' | 'dark' | 'system'. 'system' is represented
// by the absence of a stored value (or an explicit 'system'), so the UI
// follows prefers-color-scheme.

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemTheme();
}

export function getThemePreference() {
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'system';
}

export function setThemePreference(preference) {
  if (preference === 'system') {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, preference);
  }
  document.documentElement.setAttribute('data-theme', resolveTheme(preference));
}

export function initTheme() {
  const pref = getThemePreference();
  document.documentElement.setAttribute('data-theme', resolveTheme(pref));

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  mq?.addEventListener?.('change', (e) => {
    if (getThemePreference() === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

// Legacy — kept only to support the old "tap brand wordmark to toggle"
// interaction, if any call-sites still rely on it. New UI should use
// setThemePreference instead.
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setThemePreference(current === 'dark' ? 'light' : 'dark');
}
