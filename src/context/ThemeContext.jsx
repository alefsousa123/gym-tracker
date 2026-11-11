
import {
  createContext,
  useContext,
  useEffect,
} from "react";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

// ==========================================
// THEME SETTINGS
// ==========================================

const STORAGE_KEY =
  "gym-tracker:theme:v1";

const DEFAULT_THEME = "light";

const ThemeContext = createContext(null);

function isValidTheme(value) {
  return (
    value === "light" ||
    value === "dark"
  );
}

// ==========================================
// THEME PROVIDER
// ==========================================

export function ThemeProvider({ children }) {
  const [theme, setTheme] = usePersistentState(
    STORAGE_KEY,
    DEFAULT_THEME,
    isValidTheme
  );

  // Update the HTML document whenever
  // the selected theme changes.
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme
    );

    document.documentElement.style.colorScheme =
      theme;
  }, [theme]);

  function changeTheme(nextTheme) {
    if (!isValidTheme(nextTheme)) {
      return;
    }

    setTheme(nextTheme);
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "light"
        ? "dark"
        : "light"
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        changeTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ==========================================
// CUSTOM HOOK
// ==========================================

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within a ThemeProvider."
    );
  }

  return context;
}
