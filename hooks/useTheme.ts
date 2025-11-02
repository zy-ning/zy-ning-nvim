
import { useState, useEffect, useCallback } from 'react';

type Theme = 'latte' | 'mocha';

export const useTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>('mocha');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'mocha' : 'latte';
    const initialTheme = storedTheme || preferredTheme;
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (theme === 'mocha') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'latte' ? 'mocha' : 'latte'));
  }, []);

  return [theme, toggleTheme];
};
