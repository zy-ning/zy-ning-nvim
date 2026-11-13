import { useState, useEffect, useCallback } from 'react';

type Theme = 'latte' | 'mocha';

export const useTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('theme') === 'latte' ? 'latte' : 'mocha'; }
    catch { return 'mocha'; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'mocha');
    document.documentElement.style.colorScheme = theme === 'mocha' ? 'dark' : 'light';
    try { localStorage.setItem('theme', theme); } catch { /* Theme works without storage. */ }
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme(previous => previous === 'latte' ? 'mocha' : 'latte'), []);
  return [theme, toggleTheme];
};
