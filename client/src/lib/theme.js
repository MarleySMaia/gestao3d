import { useEffect, useState } from 'react';

const KEY = 'gestao3d-theme';

/** tema salvo ou, na primeira vez, o tema do sistema */
export const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'light' ? '#f4f4f5' : '#09090b');
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}
