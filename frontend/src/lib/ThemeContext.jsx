/*
 * lib/ThemeContext.jsx
 * ────────────────────
 * Reparte el TEMA ACTIVO a toda la app y permite cambiarlo en caliente.
 * Al cambiar, escribe las variables CSS (applyThemeToDOM): toda la interfaz
 * se actualiza al instante sin recargar.
 *
 * Persistencia: el tema elegido se guarda en el navegador del usuario
 * (localStorage). Asi, al volver a abrir la app, recuerda su tema. Es una
 * preferencia visual del dispositivo, por eso va en el navegador y no en el
 * backend (no necesita viajar entre dispositivos ni ocupar la base de datos).
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { DEFAULT_THEME, sanitizeTheme, applyThemeToDOM } from "./theme";

const ThemeContext = createContext(null);
const STORAGE_KEY = "cuaderno.theme";

// Lee el tema guardado, si existe y es valido. Si no, usa el por defecto.
function loadSavedTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitizeTheme(JSON.parse(raw));
  } catch {
    // localStorage no disponible o JSON corrupto: usamos el por defecto
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadSavedTheme);

  // Aplica el tema (el guardado o el por defecto) al montar
  useEffect(() => { applyThemeToDOM(theme); }, []);

  function applyTheme(raw) {
    const clean = sanitizeTheme(raw);
    applyThemeToDOM(clean);
    setTheme(clean);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); }
    catch { /* si no se puede guardar, al menos se aplica en esta sesion */ }
  }

  const value = useMemo(() => ({ theme, applyTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
