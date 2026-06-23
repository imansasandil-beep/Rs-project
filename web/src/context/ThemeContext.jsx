import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'rs.theme';

function readInitialTheme() {
  // index.html already resolved this before first paint; read back what it set
  // so the two can never disagree.
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Follow the OS only while the user has not made an explicit choice.
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    []
  );

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', setTheme, toggle }),
    [theme, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}
