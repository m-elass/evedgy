/*
 * lib/theme.js
 * ────────────
 * Sistema de temas basado en VARIABLES CSS.
 *
 * C, FONT_DISPLAY, FONT_BODY no contienen valores fijos sino referencias a
 * variables CSS (var(--ink), etc.). El tema activo se aplica escribiendo esas
 * variables en el documento (lo hace applyThemeToDOM). Asi, cambiar de tema =
 * cambiar valores; las secciones no se tocan.
 *
 * Un TEMA ahora puede tener, ademas de colores planos:
 *   gradients: degradados (p.ej. el oro metalico)  -> var(--grad-gold)
 *   glow:      sombras de brillo                    -> var(--glow-gold)
 * Son opcionales: un tema sin ellos sigue siendo valido (se rellenan con neutros).
 */

// Lo que importan las secciones (referencias a variables CSS):
export const C = {
  ink: "var(--ink)",
  inkSoft: "var(--inkSoft)",
  paper: "var(--paper)",
  paperEdge: "var(--paperEdge)",
  sepia: "var(--sepia)",
  sepiaInk: "var(--sepiaInk)",
  olive: "var(--olive)",
  oliveSoft: "var(--oliveSoft)",
  rust: "var(--rust)",
  cream: "var(--cream)",
};
// Extras "ricos" para efectos (oro metalico, brillos):
export const GRAD = { gold: "var(--grad-gold)", goldSoft: "var(--grad-gold-soft)" };
export const GLOW = { gold: "var(--glow-gold)" };
export const FONT_DISPLAY = "var(--fontDisplay)";
export const FONT_BODY = "var(--fontBody)";

// ── TEMA POR DEFECTO: "Iudex" (muy Neuvillette: azul profundo + oro metalico) ──
export const THEME_IUDEX = {
  id: "iudex",
  name: "Iudex",
  colors: {
    ink: "#102647",        // azul marea: profundo pero LUMINOSO
    inkSoft: "#1A3560",    // superficie elevada
    paper: "#1E3B6B",      // tarjetas con luz propia
    paperEdge: "#3A5E9E",  // borde de agua clara
    sepia: "#A9C2E6",      // texto secundario, mas claro
    sepiaInk: "#F0F6FF",   // texto principal casi blanco
    olive: "#E8B84B",      // acento de logro (oro pleno, como color base)
    oliveSoft: "#FBF0C8",  // oro luminoso (punto de luz)
    rust: "#B79CFF",       // violeta de nebulosa (el cielo de estrellas)
    cream: "#0B1B33",      // texto sobre superficies doradas (oscuro, contrasta)
  },
  gradients: {
    gold: "linear-gradient(135deg, #A6741E 0%, #E8B84B 42%, #FBF0C8 60%, #E8B84B 78%, #A6741E 100%)",
    goldSoft: "linear-gradient(135deg, #8A5E18 0%, #C99A38 100%)",
  },
  glow: { gold: "0 0 12px rgba(232,184,75,0.45)" },
  fontDisplay: "'Cormorant Garamond', 'Georgia', serif",
  fontBody: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
};

// ── Tema claro alternativo: "Tribunal de agua" ──
export const THEME_TRIBUNAL = {
  id: "tribunal",
  name: "Tribunal de agua",
  colors: {
    ink: "#F4F7FB", inkSoft: "#FBFCFE", paper: "#FFFFFF", paperEdge: "#DDE6F0",
    sepia: "#5B7595", sepiaInk: "#1B3A5B", olive: "#C8A24B", oliveSoft: "#DFC585",
    rust: "#5B8AB8", cream: "#FFFFFF",
  },
  gradients: {
    gold: "linear-gradient(135deg, #B8902E 0%, #E8C46B 50%, #F5E4A8 100%)",
    goldSoft: "linear-gradient(135deg, #C8A24B 0%, #DFC585 100%)",
  },
  glow: { gold: "0 0 10px rgba(200,162,75,0.3)" },
  fontDisplay: "'Cormorant Garamond', 'Georgia', serif",
  fontBody: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
};

export const DEFAULT_THEME = THEME_IUDEX;

// ── Tema "Soberano": la evolución de Iudex a partir del arte del propio Iudex ──
// Paleta tomada de las imágenes: el abismo azul-verdoso del agua profunda, el
// oro de rayos más vivo, la plata del cabello como texto, y el VIOLETA
// dracónico del ojo (pupila de diamante) como acento secundario.
export const THEME_SOBERANO = {
  id: "soberano",
  name: "Soberano",
  colors: {
    ink: "#081426",        // abismo profundo (agua oscura de la escena)
    inkSoft: "#0F2140",
    paper: "#122442",
    paperEdge: "#2A4677",
    sepia: "#8CA6CC",
    sepiaInk: "#E9F1FB",   // plata del cabello
    olive: "#F2C94C",      // oro de rayos, más vivo
    oliveSoft: "#FFF3C7",
    rust: "#B79CFF",       // violeta dracónico (el ojo)
    cream: "#081426",
  },
  gradients: {
    gold: "linear-gradient(135deg, #9A6A14 0%, #F2C94C 40%, #FFF7D6 58%, #F2C94C 76%, #9A6A14 100%)",
    goldSoft: "linear-gradient(135deg, #8A5E18 0%, #D9AE3E 100%)",
  },
  glow: { gold: "0 0 14px rgba(242,201,76,0.5)" },
  fontDisplay: "'Cormorant Garamond', 'Georgia', serif",
  fontBody: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
};

export const BASE_THEMES = [THEME_IUDEX, THEME_SOBERANO, THEME_TRIBUNAL];

const ROLES = Object.keys(DEFAULT_THEME.colors);

// Valida un tema recibido (p.ej. generado por IA); rellena lo que falte.
export function sanitizeTheme(raw) {
  const colors = {};
  for (const role of ROLES) {
    const v = raw?.colors?.[role];
    colors[role] = (typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v)) ? v : DEFAULT_THEME.colors[role];
  }
  // Degradados y brillo: si el tema no los trae, derivamos uno simple del acento.
  const gradients = {
    gold: raw?.gradients?.gold || `linear-gradient(135deg, ${colors.olive} 0%, ${colors.oliveSoft} 100%)`,
    goldSoft: raw?.gradients?.goldSoft || `linear-gradient(135deg, ${colors.olive} 0%, ${colors.oliveSoft} 100%)`,
  };
  const glow = { gold: raw?.glow?.gold || "none" };
  return {
    id: raw?.id || "custom",
    name: raw?.name || "Mi tema",
    colors, gradients, glow,
    fontDisplay: raw?.fontDisplay || DEFAULT_THEME.fontDisplay,
    fontBody: raw?.fontBody || DEFAULT_THEME.fontBody,
  };
}

// Escribe las variables CSS del tema en la raiz (toda la app las hereda).
export function applyThemeToDOM(theme) {
  const root = document.documentElement;
  for (const [role, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${role}`, value);
  }
  root.style.setProperty("--grad-gold", theme.gradients?.gold || "none");
  root.style.setProperty("--grad-gold-soft", theme.gradients?.goldSoft || "none");
  root.style.setProperty("--glow-gold", theme.glow?.gold || "none");
  root.style.setProperty("--fontDisplay", theme.fontDisplay);
  root.style.setProperty("--fontBody", theme.fontBody);
}
