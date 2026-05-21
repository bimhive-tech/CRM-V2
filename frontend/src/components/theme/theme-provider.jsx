"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "crm-theme";
const DEFAULT_THEME = "light";

const ThemeContext = createContext(null);

function normalizeTheme(value) {
  return value === "dark" ? "dark" : DEFAULT_THEME;
}

function readStoredTheme() {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  try {
    return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(nextTheme) {
    setThemeState((currentTheme) => {
      const resolvedTheme = normalizeTheme(typeof nextTheme === "function" ? nextTheme(currentTheme) : nextTheme);
      applyTheme(resolvedTheme);

      try {
        window.localStorage.setItem(STORAGE_KEY, resolvedTheme);
      } catch {}

      return resolvedTheme;
    });
  }

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
