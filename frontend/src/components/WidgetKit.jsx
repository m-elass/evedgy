/*
 * components/WidgetKit.jsx — TUS WIDGETS DEL MÓVIL
 * ───────────────────────────────────────────────
 * Crea y revoca las llaves de solo lectura que usan los widgets, y entrega los
 * scripts para Scriptable (iPhone), con los pasos para ponerlos en la pantalla
 * de inicio o de bloqueo:
 *   · «Tu cuaderno»: el resumen (frase, hábitos, carta, misiones, tareas).
 *   · «Frases»: solo tus frases, en grande; puede ir cambiando a lo largo del
 *     día y avisarte cada mañana con la frase del día. Usa la misma llave.
 */
import React, { useState } from "react";
import { KeyRound, Copy, Trash2, Smartphone, Check, Quote } from "lucide-react";
import { api, BASE } from "../lib/api";
import { useApi, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { scriptWidget, scriptFrases } from "../lib/scriptable";
import { C, FONT_BODY, GRAD } from "../lib/theme";

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; }
  catch {
    const t = document.createElement("textarea");
    t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  }
}

function fecha(iso) {
  return iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function WidgetKit() {
  const { data: llaves, gate } = useApi("widget-tokens", api.widgetTokens);
  const refrescar = useRefrescar();
  const [nueva, setNueva] = useState(null);       // la llave recién creada (se muestra una vez)
  const [copiado, setCopiado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  // el widget de Frases: cada cuánto cambia y si avisa por la mañana
  const [cadaHoras, setCadaHoras] = useState(0);
  const [conAviso, setConAviso] = useState(true);
  const [horaAviso, setHoraAviso] = useState("08:30");

  async function crear() {
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await api.createWidgetToken(/iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : "Mi móvil");
      setNueva(r.token);
      refrescar("widget-tokens");
    } catch (e) { avisar(e?.humano || "No se pudo crear la llave."); }
    finally { setOcupado(false); }
  }
  async function revocar(id) {
    try { await api.revokeWidgetToken(id); refrescar("widget-tokens"); avisar("Llave revocada: ese widget deja de funcionar.", "ok"); }
    catch (e) { avisar(e?.humano || "No se pudo revocar."); }
  }
  async function copia(que, texto) {
    if (await copiar(texto)) { setCopiado(que); setTimeout(() => setCopiado(""), 2500); }
    else avisar("No se pudo copiar. Mantén pulsado el texto para copiarlo a mano.");
  }

  return (
    <div>
      <p style={parrafo}>
        Tu frase del día, tus hábitos, tus tareas y tu racha de cartas en la pantalla de inicio o de bloqueo del iPhone
        (más abajo, el widget que enseña solo tus frases).
        Se hace con <strong>Scriptable</strong>, una app gratuita de la App Store, y una llave de solo lectura:
        el widget puede mirar ese resumen, nada más (nunca tus cartas ni tus escritos).
      </p>

      <ol style={{ ...parrafo, paddingLeft: 18, margin: "0 0 14px" }}>
        <li>Instala <strong>Scriptable</strong> desde la App Store.</li>
        <li>Crea una llave aquí abajo y cópiala.</li>
        <li>Copia el script. En Scriptable, pulsa <strong>+</strong>, pégalo, ponle de nombre «Tu cuaderno» y ejecútalo (▶): te pedirá la llave.</li>
        <li>Pantalla de inicio: mantén pulsado → <strong>+</strong> → Scriptable → elige tamaño → toca el widget → Script: «Tu cuaderno».</li>
        <li>Pantalla de bloqueo: mantenla pulsada → Personalizar → Pantalla bloqueada → añade Scriptable → elige «Tu cuaderno».</li>
      </ol>

      {nueva && (
        <div style={{ background: "rgba(232,184,75,.1)", border: `1px solid ${C.olive}`, borderRadius: 12,
          padding: 12, marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepiaInk, fontWeight: 600, marginBottom: 6 }}>
            Tu llave (solo se muestra ahora):
          </div>
          <code style={{ display: "block", wordBreak: "break-all", fontSize: 12.5, color: C.oliveSoft,
            background: C.inkSoft, padding: "8px 10px", borderRadius: 8, marginBottom: 8, userSelect: "all" }}>{nueva}</code>
          <button onClick={() => copia("llave", nueva)} style={boton(true)}>
            {copiado === "llave" ? <Check size={14} /> : <Copy size={14} />} {copiado === "llave" ? "Copiada" : "Copiar llave"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={crear} disabled={ocupado || (llaves && llaves.length >= 3)} style={boton(!nueva)}>
          <KeyRound size={14} /> {ocupado ? "Creando…" : "Crear llave"}
        </button>
        <button onClick={() => copia("script", scriptWidget(BASE))} style={boton(!!nueva)}>
          {copiado === "script" ? <Check size={14} /> : <Smartphone size={14} />} {copiado === "script" ? "Script copiado" : "Copiar script"}
        </button>
      </div>

      {/* ── El widget de Frases ── */}
      <div style={{ borderTop: `1px solid ${C.paperEdge}`, paddingTop: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_BODY, fontSize: 13.5,
          color: C.sepiaInk, fontWeight: 700, marginBottom: 6 }}>
          <Quote size={15} color={C.olive} /> Widget de Frases
        </div>
        <p style={parrafo}>
          Solo tus frases, en grande: en la pantalla de inicio (pequeño, mediano o grande) o en la de bloqueo
          (el rectangular). Salen las que tienen el <strong>ojo abierto</strong> en la estrella Frases. Usa la misma
          llave, así que si ya tienes el otro widget no te la volverá a pedir.
        </p>
        <label style={etiqueta}>La frase
          <select value={cadaHoras} onChange={(e) => setCadaHoras(Number(e.target.value))} style={campo} aria-label="Cada cuánto cambia la frase">
            <option value={0}>una al día (la misma que en Hoy)</option>
            <option value={6}>cambia cada 6 horas</option>
            <option value={3}>cambia cada 3 horas</option>
            <option value={1}>cambia cada hora</option>
          </select>
        </label>
        <label style={{ ...etiqueta, flexWrap: "nowrap", alignItems: "flex-start", cursor: "pointer", marginBottom: 6 }}>
          <input type="checkbox" checked={conAviso} onChange={(e) => setConAviso(e.target.checked)} aria-label="Aviso de la frase cada mañana"
            style={{ width: 16, height: 16, marginTop: 1, flexShrink: 0, accentColor: "#E8B84B" }} />
          <span>Avisarme cada mañana con la frase del día</span>
        </label>
        <label style={{ ...etiqueta, marginLeft: 24, opacity: conAviso ? 1 : 0.5 }}>a las
          <input type="time" value={horaAviso} disabled={!conAviso} onChange={(e) => setHoraAviso(e.target.value || "08:30")} aria-label="Hora del aviso de la frase"
            style={{ ...campo, width: 120 }} />
        </label>
        <button onClick={() => {
          const [h, m] = horaAviso.split(":").map(Number);
          copia("frases", scriptFrases(BASE, { cadaHoras, aviso: conAviso ? { hora: h || 0, minuto: m || 0 } : null }));
        }} style={boton(true)}>
          {copiado === "frases" ? <Check size={14} /> : <Quote size={14} />} {copiado === "frases" ? "Script de Frases copiado" : "Copiar script de Frases"}
        </button>
        <ol style={{ ...parrafo, paddingLeft: 18, margin: "12px 0 0" }}>
          <li>En Scriptable, pulsa <strong>+</strong>, pega el script, ponle de nombre «Frases» y ejecútalo (▶). Si no tenías el otro widget, te pedirá la llave.</li>
          <li>Pantalla de bloqueo: mantenla pulsada → Personalizar → Pantalla bloqueada → añade Scriptable (el rectangular) → tócalo → Script: «Frases».</li>
          <li>Pantalla de inicio: mantén pulsado → <strong>+</strong> → Scriptable → elige tamaño → toca el widget → Script: «Frases».</li>
          <li>El aviso de la mañana lo manda Scriptable: la primera vez, acepta sus notificaciones.</li>
        </ol>
      </div>

      {gate ? null : llaves.length > 0 && (
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
            color: C.sepia, marginBottom: 6 }}>Llaves activas ({llaves.length}/3)</div>
          {llaves.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderTop: `1px solid ${C.paperEdge}` }}>
              <KeyRound size={14} color={C.sepia} />
              <div style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk, lineHeight: 1.4 }}>
                {l.name} · <span style={{ color: C.sepia }}>{l.prefix}…</span>
                <div style={{ fontSize: 11.5, color: C.sepia }}>
                  Caduca {fecha(l.expires_at)} · {l.last_used_at ? `usada ${fecha(l.last_used_at)}` : "sin usar aún"}
                </div>
              </div>
              <button onClick={() => revocar(l.id)} aria-label="Revocar llave"
                style={{ background: "none", border: "none", color: C.sepia, cursor: "pointer", padding: 6 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <p style={{ ...parrafo, fontSize: 11.5, marginTop: 8 }}>
            Cerrar sesión no revoca las llaves: si pierdes el móvil, revócala desde aquí.
          </p>
        </div>
      )}
    </div>
  );
}

const parrafo = { fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.55, margin: "0 0 12px" };
const etiqueta = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: FONT_BODY,
  fontSize: 13, color: C.sepiaInk, marginBottom: 10 };
const campo = { background: C.inkSoft, border: `1px solid ${C.paperEdge}`, color: C.sepiaInk, borderRadius: 8,
  padding: "6px 8px", fontFamily: FONT_BODY, fontSize: 13 };
const boton = (lleno) => ({ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
  padding: "9px 14px", borderRadius: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
  background: lleno ? GRAD.gold : C.inkSoft, color: lleno ? "#0B1B33" : C.sepiaInk,
  border: `1px solid ${lleno ? "transparent" : C.paperEdge}` });
