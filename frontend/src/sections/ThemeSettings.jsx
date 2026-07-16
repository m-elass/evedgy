/*
 * sections/ThemeSettings.jsx
 * ──────────────────────────
 * Donde el usuario hace suya la app. Dos formas:
 *  1. Elegir uno de los temas base (se aplica al instante).
 *  2. Escribir palabras y generar un tema con IA ("dorados, azul agua, etereo").
 * El cambio se ve en vivo porque todo usa variables CSS.
 */
import React, { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, BASE_THEMES } from "../lib/theme";
import { useTheme } from "../lib/ThemeContext";
import { generateTheme } from "../lib/themeGenerator";
import { SectionHeader, Field, SolidBtn } from "../components/ui";

export default function ThemeSettings() {
  const { theme, applyTheme } = useTheme();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    if (!prompt.trim()) return;
    setBusy(true); setMsg("");
    try {
      const t = await generateTheme(prompt.trim());
      applyTheme(t);
      setMsg(`Tema "${t.name}" aplicado.`);
    } catch (e) {
      setMsg("No se pudo generar ahora mismo. Prueba un tema base o intentalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader kicker="Tu espacio" title="Apariencia" />

      <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.sepia, lineHeight: 1.6, marginBottom: 20 }}>
        Elige un tema o describe el tuyo con unas palabras. El cambio se aplica al momento.
      </p>

      {/* Generador con palabras */}
      <div style={{ background: C.paper, borderRadius: 12, padding: 18, marginBottom: 24,
        border: `1px solid ${C.paperEdge}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={16} color={C.olive} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, letterSpacing: ".08em",
            textTransform: "uppercase", color: C.olive, fontWeight: 600 }}>Crea tu tema</span>
        </div>
        <Field value={prompt} onChange={(e) => setPrompt(e.target.value)} multiline
          placeholder="Ej: dorados suaves, azules de agua profunda, blancos, sensacion eterea y elegante" />
        <SolidBtn label={busy ? "Creando…" : "Generar tema"} onClick={generate} disabled={busy} />
        {msg && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, marginTop: 12 }}>{msg}</p>}
      </div>

      {/* Temas base */}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em",
        textTransform: "uppercase", color: C.sepia, marginBottom: 12 }}>Temas base</div>
      {BASE_THEMES.map((t) => {
        const active = theme.id === t.id;
        return (
          <button key={t.id} onClick={() => applyTheme(t)} style={{ display: "flex", alignItems: "center",
            gap: 14, width: "100%", textAlign: "left", background: C.paper, borderRadius: 12,
            padding: "14px 16px", marginBottom: 10, cursor: "pointer",
            border: `1px solid ${active ? C.olive : C.paperEdge}` }}>
            {/* Muestra de colores del tema */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {["ink", "paper", "olive", "rust"].map((role) => (
                <div key={role} style={{ width: 18, height: 32, borderRadius: 4,
                  background: t.colors[role], border: `1px solid ${C.paperEdge}` }} />
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.sepiaInk, fontWeight: 600 }}>{t.name}</div>
            </div>
            {active && <Check size={18} color={C.olive} />}
          </button>
        );
      })}
    </div>
  );
}
