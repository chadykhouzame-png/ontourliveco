import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, type ReactNode } from "react";

type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

interface ThemeContextValue {
  /** Currently applied theme (resolved from preference). */
  theme: Theme;
  /** User's stored preference, including "system". */
  preference: ThemePreference;
  /** Set the preference and persist to localStorage. */
  setPreference: (pref: ThemePreference) => void;
  /** Remove the saved preference and fall back to the OS setting. */
  clearPreference: () => void;
}

const STORAGE_KEY = "otl.theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system"; // No saved choice → follow OS
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(pref: ThemePreference): Theme {
  if (pref === "system") return systemPrefersDark() ? "dark" : "light";
  return pref;
}

// Keep these in sync with the media-scoped <meta name="theme-color"> tags
// in index.html so the browser chrome matches the resolved theme.
const THEME_COLORS: Record<Theme, string> = {
  dark: "#0F0D0A",
  light: "#F5F0E4",
};

function applyThemeColorMeta(theme: Theme) {
  if (typeof document === "undefined") return;
  const color = THEME_COLORS[theme];
  // Drop the static media-scoped tags (and any prior dynamic tag) so the
  // active tag isn't overridden by a `(prefers-color-scheme: ...)` match.
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.parentNode?.removeChild(el));
  const meta = document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", color);
  meta.setAttribute("data-dynamic-theme-color", "");
  document.head.appendChild(meta);
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  applyThemeColorMeta(theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [theme, setTheme] = useState<Theme>(() => resolve(readStoredPreference()));

  // Apply immediately on mount (layout effect avoids a paint flash) and whenever
  // the stored preference changes.
  useLayoutEffect(() => {
    const next = resolve(preference);
    setTheme(next);
    apply(next);
  }, [preference]);

  // Follow OS changes while "system" is selected.
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: Theme = mq.matches ? "dark" : "light";
      setTheme(next);
      apply(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, pref);
    setPreferenceState(pref);
  }, []);

  const clearPreference = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setPreferenceState("system");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, clearPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
