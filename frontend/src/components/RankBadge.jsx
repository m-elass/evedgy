/*
 * components/RankBadge.jsx
 * ────────────────────────
 * La insignia visual de un rango. Un escudo con degradado metálico según el
 * color del rango (de Hierro a Maestro). El oro (rango "Oro") brilla de verdad,
 * los demás llevan su propio metal. Tamaño configurable.
 */
import React from "react";

// Aclarar/oscurecer un hex para construir el degradado metálico de cada metal.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function RankBadge({ color = "#E8B84B", size = 56, glow = false }) {
  const light = shade(color, 60);
  const dark = shade(color, -50);
  const id = `g${color.replace("#", "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" style={glow ? { filter: `drop-shadow(0 0 6px ${color}aa)` } : undefined}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={dark} />
          <stop offset="0.45" stopColor={color} />
          <stop offset="0.6" stopColor={light} />
          <stop offset="0.8" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      {/* Escudo */}
      <path d="M28 4 L48 12 V28 C48 40 39 49 28 52 C17 49 8 40 8 28 V12 Z"
        fill={`url(#${id})`} stroke={light} strokeWidth="1" strokeOpacity="0.5" />
      {/* Brillo interior */}
      <path d="M28 9 L43 15 V28 C43 37 36 44 28 47"
        fill="none" stroke={light} strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Estrella central */}
      <path d="M28 19 l2.6 5.3 5.8 0.8 -4.2 4.1 1 5.8 -5.2 -2.7 -5.2 2.7 1 -5.8 -4.2 -4.1 5.8 -0.8 Z"
        fill={dark} fillOpacity="0.55" />
    </svg>
  );
}
