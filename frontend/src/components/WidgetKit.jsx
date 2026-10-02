/*
 * components/WidgetKit.jsx — TUS WIDGETS DEL MÓVIL
 * ───────────────────────────────────────────────
 * Crea y revoca las llaves de solo lectura que usan los widgets, y entrega el
 * script para Scriptable (iPhone), con los pasos para ponerlo en la pantalla
 * de inicio o de bloqueo.
 */
import React, { useState } from "react";
import { KeyRound, Copy, Trash2, Smartphone, Check } from "lucide-react";
import { api, BASE } from "../lib/api";
import { useApi, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { scriptWidget } from "../lib/scriptable";
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
        Tu frase del día, tus hábitos, tus tareas y tu racha de cartas en la pantalla de inicio o de bloqueo del iPhone.
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
const boton = (lleno) => ({ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
  padding: "9px 14px", borderRadius: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
  background: lleno ? GRAD.gold : C.inkSoft, color: lleno ? "#0B1B33" : C.sepiaInk,
  border: `1px solid ${lleno ? "transparent" : C.paperEdge}` });
