import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LIGHT_THEME, DARK_THEME, SPACING, RADII, TYPOGRAPHY } from "./tokens";

const THEME_STORAGE_KEY = "@nyaya_theme_mode";

const ThemeContext = createContext({
  theme: LIGHT_THEME,
  isDark: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
  spacing: SPACING,
  radii: RADII,
  typography: TYPOGRAPHY
});

export function ThemeProvider({ children }) {
  // Default to light mode (Warm Ivory luxury aesthetic)
  const [mode, setMode] = useState("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === "dark" || saved === "light") {
        setMode(saved);
      }
    }).catch(() => {});
  }, []);

  const setThemeMode = (newMode) => {
    setMode(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(() => {});
  };

  const toggleTheme = () => {
    const nextMode = mode === "light" ? "dark" : "light";
    setThemeMode(nextMode);
  };

  const theme = mode === "dark" ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: mode === "dark",
        setThemeMode,
        toggleTheme,
        spacing: SPACING,
        radii: RADII,
        typography: TYPOGRAPHY
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: LIGHT_THEME,
      isDark: false,
      setThemeMode: () => {},
      toggleTheme: () => {},
      spacing: SPACING,
      radii: RADII,
      typography: TYPOGRAPHY
    };
  }
  return context;
}
