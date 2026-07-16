/*
 * components/ui.jsx — EL SISTEMA DE DISEÑO, rediseñado.
 * ─────────────────────────────────────────────────────
 * Nueva lengua visual para toda la app (todas las secciones beben de aquí):
 *   PROFUNDIDAD: superficies con luz (gradiente sutil arriba), sombras en
 *     capas y un filo de luz interior. Nada de rectángulos planos con borde duro.
 *   AIRE: radios generosos (18px), más espacio entre piezas.
 *   FLUJO: el contenido de los desplegables entra animado; el chevrón vive en
 *     una cápsula que gira con un pequeño rebote.
 *   CARÁCTER: la cabecera de sección lleva un filamento de oro con el diamante
 *     del Iudex; los botones principales son píldoras doradas con brillo.
 */
import React, { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";

// La superficie con profundidad que comparten las tarjetas.
export const SURFACE = {
  background: `linear-gradient(165deg, rgba(216,232,245,.06), rgba(216,232,245,0) 42%), ${C.paper}`,
  borderRadius: 18,
  border: "none",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), 0 0 0 1px rgba(127,168,214,.10), 0 14px 34px -14px rgba(0,0,0,.6), 0 3px 10px rgba(0,0,0,.28)",
};

export function Collapsible({ title, subtitle, children, defaultOpen = false, accent = C.sepiaInk }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ ...SURFACE, marginBottom: 16, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex",
        alignItems: "center", gap: 13, padding: "16px 18px", background: "transparent",
        border: "none", cursor: "pointer", textAlign: "left" }}>
        {/* Chevrón en cápsula, gira con un pequeño rebote */}
        <span style={{ width: 30, height: 30, borderRadius: 12, background: C.inkSoft,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transform: open ? "rotate(90deg)" : "none",
          transition: "transform .35s cubic-bezier(.34,1.56,.64,1)" }}>
          <ChevronRight size={16} color={C.sepia} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.sepiaInk, fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {/* Gema de estado: brilla con su color */}
        <span style={{ width: 9, height: 9, borderRadius: 9, background: accent, flexShrink: 0,
          boxShadow: `0 0 10px ${accent}` }} />
      </button>
      {open && <div className="reveal" style={{ padding: "2px 18px 18px" }}>{children}</div>}
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, multiline, readOnly }) {
  const [focus, setFocus] = useState(false);
  const shared = { width: "100%", boxSizing: "border-box", background: C.inkSoft,
    border: `1px solid ${focus ? C.olive : "transparent"}`,
    boxShadow: focus ? "0 0 0 3px rgba(232,184,75,.14)" : "inset 0 1px 3px rgba(0,0,0,.25)",
    borderRadius: 12, padding: "12px 14px", fontFamily: FONT_BODY, fontSize: 14.5,
    color: C.sepiaInk, outline: "none", transition: "border-color .2s, box-shadow .2s" };
  const fx = { onFocus: () => setFocus(true), onBlur: () => setFocus(false) };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontFamily: FONT_BODY, fontSize: 11,
        letterSpacing: ".08em", textTransform: "uppercase", color: C.sepia, marginBottom: 6 }}>{label}</label>}
      {multiline ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3}
          readOnly={readOnly} {...fx} style={{ ...shared, resize: "vertical", lineHeight: 1.55 }} />
      ) : (
        <input value={value} onChange={onChange} placeholder={placeholder}
          readOnly={readOnly} {...fx} style={shared} />
      )}
    </div>
  );
}

export function SectionHeader({ kicker, title, right }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".2em",
            textTransform: "uppercase", fontWeight: 700, marginBottom: 7,
            background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text",
            color: "transparent", width: "fit-content" }}>{kicker}</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: C.sepiaInk, margin: 0,
            fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.08 }}>{title}</h1>
        </div>
        {right}
      </div>
      {/* Filamento de oro con el diamante del Iudex */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <svg width="9" height="12" viewBox="0 0 9 12" style={{ flexShrink: 0 }}>
          <path d="M4.5 0 L9 6 L4.5 12 L0 6 Z" fill={C.olive} opacity=".9" />
        </svg>
        <div style={{ flex: 1, height: 1, maxWidth: 190,
          background: "linear-gradient(90deg, rgba(232,184,75,.55), rgba(232,184,75,0))" }} />
      </div>
    </div>
  );
}

export function AddBtn({ label, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 9,
      marginTop: 4, background: C.inkSoft, border: `1px solid ${C.paperEdge}`, color: C.sepiaInk,
      borderRadius: 999, padding: "11px 18px 11px 12px", fontFamily: FONT_BODY, fontSize: 13.5,
      cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: GRAD.gold,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Plus size={14} color="#0B1B33" strokeWidth={3} />
      </span>
      {label}
    </button>
  );
}

export function SolidBtn({ label, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: GRAD.gold, color: C.cream,
      border: "none", borderRadius: 999, padding: "12px 22px", fontFamily: FONT_BODY, fontSize: 13.5,
      cursor: disabled ? "default" : "pointer", fontWeight: 700, opacity: disabled ? 0.55 : 1,
      boxShadow: disabled ? "none" : GLOW.gold }}>
      {label}
    </button>
  );
}

export function Loading() {
  return (
    <div aria-label="Cargando" style={{ padding: "8px 0" }}>
      <div className="skel" style={{ height: 86, marginBottom: 14, borderRadius: 18 }} />
      <div className="skel" style={{ height: 86, marginBottom: 14, borderRadius: 18, opacity: .75 }} />
      <div className="skel" style={{ height: 86, borderRadius: 18, opacity: .5 }} />
    </div>
  );
}

export function Empty({ text }) {
  // El vacío como invitación, no como hueco.
  return (
    <div style={{ border: `1.5px dashed ${C.paperEdge}`, borderRadius: 18, padding: "30px 22px",
      textAlign: "center" }}>
      <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 14, color: C.sepia, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}
