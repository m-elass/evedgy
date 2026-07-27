/*
 * components/Help.jsx — EL ICONO QUE EXPLICA
 * ──────────────────────────────────────────
 * Un punto de interrogación discreto junto a cada título y cada herramienta.
 * Al tocarlo, sube una hoja con la explicación rigurosa de esa parte concreta:
 * para qué sirve, cómo funciona y por qué está ahí.
 *
 * Piezas:
 *   HelpProvider — envuelve la app; guarda qué sección se está viendo (para
 *                  que la cabecera muestre su icono sola) y qué ayuda está
 *                  abierta. Solo existe UNA hoja en toda la app.
 *   HelpDot      — el icono. Recibe el tema: <HelpDot topic="rest_timer" />
 *   useSectionHelp — lo usa SectionHeader para saber qué sección explicar.
 *
 * Decisión de diseño: la ayuda nunca interrumpe. No hay tutoriales, ni avisos,
 * ni globos que aparezcan solos. La explicación está siempre a un toque, y
 * solo aparece si el usuario la pide.
 */
import React, { createContext, useContext, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { getHelp } from "../lib/help";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";

const HelpCtx = createContext({ section: null, open: () => {} });

export function HelpProvider({ section, children }) {
  const [topic, setTopic] = useState(null);
  const entry = topic ? getHelp(topic) : null;

  return (
    <HelpCtx.Provider value={{ section, open: setTopic }}>
      {children}
      {entry && <HelpSheet entry={entry} onClose={() => setTopic(null)} />}
    </HelpCtx.Provider>
  );
}

/** La sección que se está viendo, para que su cabecera muestre el icono. */
export function useSectionHelp() {
  return useContext(HelpCtx);
}

/**
 * El icono de ayuda. `size` permite hacerlo aún más pequeño junto a una
 * herramienta que junto a un título.
 */
export function HelpDot({ topic, size = 17, label }) {
  const { open } = useContext(HelpCtx);
  if (!getHelp(topic)) return null;      // sin texto no se dibuja nada
  return (
    <button
      onClick={(e) => { e.stopPropagation(); open(topic); }}
      aria-label={label || "¿Para qué sirve esto?"}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "none", border: "none", padding: 3, cursor: "pointer",
        color: C.olive, opacity: 0.75, flexShrink: 0, verticalAlign: "middle",
      }}
    >
      <HelpCircle size={size} />
    </button>
  );
}

function HelpSheet({ entry, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(4,10,20,.6)", backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)" }} />
      <div role="dialog" aria-label={entry.title} className="help-sheet"
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 61,
          maxWidth: 560, margin: "0 auto", maxHeight: "86vh", overflowY: "auto",
          background: C.inkSoft, borderTopLeftRadius: 30, borderTopRightRadius: 30,
          padding: "14px 22px 34px", boxShadow: "0 -20px 60px rgba(0,0,0,.55)",
          WebkitOverflowScrolling: "touch" }}>

        <div style={{ width: 40, height: 4, borderRadius: 4, background: C.paperEdge,
          margin: "0 auto 18px" }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".2em",
              textTransform: "uppercase", fontWeight: 700, marginBottom: 6,
              background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text",
              color: "transparent", width: "fit-content" }}>Para qué sirve</div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 27, color: C.sepiaInk,
              margin: 0, fontWeight: 700, lineHeight: 1.12 }}>{entry.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: C.paper,
            border: "none", borderRadius: 999, width: 34, height: 34, cursor: "pointer",
            color: C.sepia, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0 }}>
            <X size={17} />
          </button>
        </div>

        {/* Filamento de oro con el diamante, como en las cabeceras */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 16px" }}>
          <svg width="9" height="12" viewBox="0 0 9 12" style={{ flexShrink: 0 }}>
            <path d="M4.5 0 L9 6 L4.5 12 L0 6 Z" fill={C.olive} opacity=".9" />
          </svg>
          <div style={{ flex: 1, height: 1, maxWidth: 190,
            background: "linear-gradient(90deg, rgba(232,184,75,.55), rgba(232,184,75,0))" }} />
        </div>

        <p style={{ margin: "0 0 18px", fontFamily: FONT_BODY, fontSize: 15,
          color: C.sepiaInk, lineHeight: 1.65 }}>{entry.lead}</p>

        {entry.points?.length > 0 && (
          <div style={{ marginBottom: entry.note ? 18 : 6 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".16em",
              textTransform: "uppercase", color: C.sepia, fontWeight: 700, marginBottom: 10 }}>
              Cómo funciona
            </div>
            {entry.points.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 11, marginBottom: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: 6, background: C.olive,
                  flexShrink: 0, marginTop: 7, boxShadow: `0 0 6px ${C.olive}` }} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk,
                  lineHeight: 1.6 }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {entry.note && (
          <div style={{ background: "rgba(232,184,75,.09)", borderRadius: 12,
            padding: "13px 15px", borderLeft: `3px solid ${C.olive}` }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".14em",
              textTransform: "uppercase", color: C.olive, fontWeight: 700, marginBottom: 6 }}>
              Por qué
            </div>
            <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16,
              color: C.sepiaInk, lineHeight: 1.55, fontStyle: "italic" }}>{entry.note}</p>
          </div>
        )}
      </div>
    </>
  );
}
