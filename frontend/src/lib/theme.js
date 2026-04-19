const KEY = 'luup.theme';

export function getTheme() {
  const stored = localStorage.getItem(KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme() {
  const t = getTheme();
  document.documentElement.setAttribute('data-theme', t);

  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  mq?.addEventListener?.('change', (e) => {
    if (!localStorage.getItem(KEY)) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}
