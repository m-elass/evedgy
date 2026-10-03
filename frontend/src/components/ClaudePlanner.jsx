/*
 * components/ClaudePlanner.jsx — «Claude planifica tu día» (en Ajustes)
 * ──────────────────────────────────────────────────────────────────────
 * Cada mañana, un flujo de GitHub Actions de tu propio repositorio le encarga
 * a Claude (con TU suscripción, `claude setup-token`) el plan del día y los
 * planes de misiones «a medida». Aquí: el estado, la llave del planificador
 * (tcp_…, se muestra una vez) y los pasos para dejarlo funcionando.
 */
import React, { useState } from "react";
import { KeyRound, Copy, Check, Trash2, Sparkles, RotateCcw } from "lucide-react";
import { api, BASE, ymd } from "../lib/api";
import { useApi, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
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
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "—");
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "");

export default function ClaudePlanner() {
  const { data: a, gate } = useApi("planner", api.plannerSettings);
  const refrescar = useRefrescar();
  const [nueva, setNueva] = useState(null);
  const [copiado, setCopiado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const hoy = ymd();

  async function copia(que, texto) {
    if (await copiar(texto)) { setCopiado(que); setTimeout(() => setCopiado(""), 2500); }
    else avisar("No se pudo copiar. Mantén pulsado el texto para copiarlo a mano.");
  }
  async function crear() {
    if (ocupado) return;
    setOcupado(true);
    try { const r = await api.createPlannerKey(); setNueva(r.token); refrescar("planner", "skills"); }
    catch (e) { avisar(e?.humano || "No se pudo crear la llave."); }
    finally { setOcupado(false); }
  }
  async function revocar(id) {
    try {
      await api.revokePlannerKey(id);
      refrescar("planner");
      avisar("Llave revocada: el flujo de GitHub ya no podrá planificar con ella.", "ok");
    } catch (e) { avisar(e?.humano || "No se pudo revocar."); }
  }
  async function descartar() {
    try { await api.discardDayPlan(hoy); refrescar("today", "planner"); avisar("Hoy vuelve al plan automático.", "ok"); }
    catch (e) { avisar(e?.humano || "No se pudo descartar."); }
  }

  if (gate) return gate;
  const usada = a.keys.some((k) => k.last_used_at);
  const ultimoUso = a.keys.map((k) => k.last_used_at).filter(Boolean).sort().pop();
  const planHoy = a.last_plan && a.last_plan.date === hoy;

  return (
    <div>
      {/* estado */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, marginBottom: 12,
        background: a.connected && usada ? "rgba(232,184,75,.10)" : C.inkSoft,
        border: `1px solid ${a.connected && usada ? "rgba(232,184,75,.4)" : C.paperEdge}` }}>
        <Sparkles size={16} color={a.connected && usada ? C.olive : C.sepia} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, lineHeight: 1.5 }}>
          {!a.keys.length ? "Ahora Hoy usa el plan automático. Sigue los pasos para que lo decida Claude."
            : !usada ? "La llave está creada, pero Claude aún no se ha conectado: termina los pasos de abajo y pruébalo."
              : !a.connected ? `Claude no se conecta desde el ${fecha(ultimoUso)}: mira en GitHub → Actions si el flujo «Plan del día con Claude» está en rojo o desactivado. Mientras, Hoy usa el plan automático.`
              : a.last_plan ? <>Conectado. Último plan: {a.last_plan.date === hoy ? "hoy" : fecha(a.last_plan.date)}
                {a.last_plan.made_at ? ` a las ${hora(a.last_plan.made_at)}` : ""}{a.last_plan.model ? ` (${a.last_plan.model})` : ""}.</>
                : "Conectado. Aún no ha hecho ningún plan: el primero llega mañana a las 7:05 (o lánzalo tú en GitHub)."}
          {a.queued_skill_plans > 0 && (
            <div style={{ color: C.sepia, fontSize: 12.5 }}>
              {a.queued_skill_plans === 1 ? "1 plan de misiones en cola" : `${a.queued_skill_plans} planes de misiones en cola`}: Claude los diseña en su próxima ronda (cada 2 horas de día).
            </div>
          )}
        </div>
      </div>
      {planHoy && (
        <button onClick={descartar} style={{ ...boton(false), marginBottom: 12 }}>
          <RotateCcw size={14} /> Descartar el plan de Claude de hoy
        </button>
      )}

      <p style={parrafo}>
        Cada mañana Claude mira tus hábitos (tipo, minutos, frecuencia y prioridad), lo que llevas esta semana, el tiempo
        que tienes hoy, lo que quieres conseguir, tus objetivos, valores y habilidades, y decide qué sale en Hoy, en qué
        orden y por qué. También diseña los planes de misiones «a medida» de tus habilidades.
      </p>
      <p style={parrafo}>
        Lo hace con <strong>tu suscripción de Claude</strong>: gasta los límites de tu plan, sin pagar nada aparte. Se ejecuta en
        GitHub Actions de tu propio repositorio. Nunca recibe tus cartas, escritos, notas, frases ni amigos, y no puede
        hacer nada más que responder. Si un día falla, Hoy usa el plan automático.
      </p>

      <div style={{ fontFamily: FONT_BODY, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: C.sepia, margin: "4px 0 6px" }}>
        Se configura una vez (unos 10 minutos)
      </div>
      <ol style={{ ...parrafo, paddingLeft: 18, margin: "0 0 14px" }}>
        <li style={li}>
          En tu ordenador, abre <strong>PowerShell</strong> (en Windows: tecla Windows → escribe «PowerShell») y pega esto para
          instalar Claude Code:
          <Codigo texto="irm https://claude.ai/install.ps1 | iex" que="inst" copiado={copiado} copia={copia} />
          En Mac, en Terminal: <Codigo texto="curl -fsSL https://claude.ai/install.sh | bash" que="mac" copiado={copiado} copia={copia} />
        </li>
        <li style={li}>
          Cierra y vuelve a abrir la ventana, y escribe:
          <Codigo texto="claude setup-token" que="token" copiado={copiado} copia={copia} />
          Se abrirá el navegador para entrar con tu cuenta de Claude. Al terminar te enseña un <strong>token</strong> largo
          (dura un año). Cópialo: solo sale esa vez.
        </li>
        <li style={li}>
          En GitHub, abre tu repositorio → <strong>Settings</strong> → <strong>Secrets and variables</strong> → <strong>Actions</strong> →
          <strong> New repository secret</strong>. Nombre: <Codigo texto="CLAUDE_CODE_OAUTH_TOKEN" que="n1" copiado={copiado} copia={copia} enLinea />,
          valor: el token.
        </li>
        <li style={li}>
          Aquí abajo, pulsa <strong>Crear llave</strong> y cópiala. En GitHub, otro secreto con el nombre
          <Codigo texto="PLANNER_KEY" que="n2" copiado={copiado} copia={copia} enLinea /> y la llave como valor.
        </li>
        <li style={li}>
          En la pestaña <strong>Variables</strong> de esa misma página debe estar <strong>API_URL</strong> (la usa ya el aviso de la carta).
          Si no está, créala con este valor: <Codigo texto={BASE} que="api" copiado={copiado} copia={copia} enLinea />
        </li>
        <li style={li}>
          Pruébalo: GitHub → <strong>Actions</strong> → «Plan del día con Claude» → <strong>Run workflow</strong> (marca «Rehacer el plan
          de hoy»). En un par de minutos, en Hoy verás <strong>✦ Claude</strong>.
        </li>
      </ol>
      <p style={{ ...parrafo, fontSize: 12 }}>
        Por defecto planifica con Sonnet, que gasta poco de tu plan. Si prefieres Opus, crea la variable
        <strong> PLANNER_MODEL</strong> con el valor <strong>opus</strong>. Los registros de cada ejecución nunca muestran tus datos.
      </p>

      {nueva && (
        <div style={{ background: "rgba(232,184,75,.1)", border: `1px solid ${C.olive}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepiaInk, fontWeight: 600, marginBottom: 6 }}>
            Tu llave del planificador (solo se muestra ahora). Pégala en GitHub como PLANNER_KEY:
          </div>
          <code style={{ display: "block", wordBreak: "break-all", fontSize: 12.5, color: C.oliveSoft,
            background: C.inkSoft, padding: "8px 10px", borderRadius: 8, marginBottom: 8, userSelect: "all" }}>{nueva}</code>
          <button onClick={() => copia("llave", nueva)} style={boton(true)}>
            {copiado === "llave" ? <Check size={14} /> : <Copy size={14} />} {copiado === "llave" ? "Copiada" : "Copiar llave"}
          </button>
        </div>
      )}
      <button onClick={crear} disabled={ocupado || a.keys.length >= 2} style={{ ...boton(!nueva), marginBottom: 12, opacity: a.keys.length >= 2 ? 0.55 : 1 }}>
        <KeyRound size={14} /> {ocupado ? "Creando…" : "Crear llave"}
      </button>

      {a.keys.length > 0 && (
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
            color: C.sepia, marginBottom: 6 }}>Llaves del planificador ({a.keys.length}/2)</div>
          {a.keys.map((k) => (
            <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${C.paperEdge}` }}>
              <KeyRound size={14} color={C.sepia} />
              <div style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk, lineHeight: 1.4 }}>
                <span style={{ color: C.sepia }}>{k.prefix}…</span>
                <div style={{ fontSize: 11.5, color: C.sepia }}>
                  Caduca {fecha(k.expires_at)} · {k.last_used_at ? `usada ${fecha(k.last_used_at)}` : "sin usar aún"}
                </div>
              </div>
              <button onClick={() => revocar(k.id)} aria-label="Revocar llave del planificador"
                style={{ background: "none", border: "none", color: C.sepia, cursor: "pointer", padding: 6 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Codigo({ texto, que, copiado, copia, enLinea }) {
  return (
    <span style={{ display: enLinea ? "inline-flex" : "flex", alignItems: "center", gap: 6, margin: enLinea ? "0 2px" : "6px 0",
      maxWidth: "100%", verticalAlign: "middle" }}>
      <code style={{ fontSize: 12, color: C.oliveSoft, background: C.inkSoft, padding: "4px 8px", borderRadius: 6,
        wordBreak: "break-all", userSelect: "all" }}>{texto}</code>
      <button onClick={() => copia(que, texto)} aria-label={`Copiar ${texto}`}
        style={{ background: "none", border: "none", cursor: "pointer", color: copiado === que ? C.olive : C.sepia, padding: 2, flexShrink: 0 }}>
        {copiado === que ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </span>
  );
}

const parrafo = { fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.55, margin: "0 0 12px" };
const li = { marginBottom: 8 };
const boton = (lleno) => ({ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
  padding: "9px 14px", borderRadius: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
  background: lleno ? GRAD.gold : C.inkSoft, color: lleno ? "#0B1B33" : C.sepiaInk,
  border: `1px solid ${lleno ? "transparent" : C.paperEdge}` });
