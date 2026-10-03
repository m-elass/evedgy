/*
 * components/PlanDeHoy.jsx — «Tu plan de hoy», en la pantalla Hoy.
 * ─────────────────────────────────────────────────────────────────
 * Lo que toca hoy, no todos tus hábitos: cada mañana lo decide Claude con tu
 * suscripción (si lo conectaste en Ajustes) y, si no, el plan automático,
 * según la frecuencia de cada hábito, lo que te falta esta semana, su
 * prioridad y el tiempo que tienes ese día. Nunca se pasa de ese tiempo:
 * lo que no cabe queda en «Si te da tiempo».
 *
 *   · la nota de Claude (el foco del día)
 *   · el principio del día y, por la noche, «¿lo viviste?»
 *   · hábitos y objetivos del día, con su razón
 *   · métricas con botones rápidos y barra
 *   · «Si te da tiempo» y el resto de hábitos, plegados
 */
import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { C, FONT_BODY, FONT_DISPLAY, GRAD } from "../lib/theme";
import { esSemanal, tiempo } from "../lib/habitos";
import { HelpDot } from "./Help";
import { EstrellaAlada } from "./ornamentos";
import { Casilla, FilaMetrica, TarjetaPrincipio, useAccionesHabito } from "./Habitos";

export default function PlanDeHoy({ data, hoy, onNavigate }) {
  const acc = useAccionesHabito(hoy);
  const [verExtras, setVerExtras] = useState(false);
  const [verOtros, setVerOtros] = useState(false);
  // Si la memoria del móvil guarda un Hoy de la versión anterior (sin plan), se arma uno con lo que hay
  const plan = data.plan || { source: "auto", items: (data.habits || []).map((h) => ({ ...h, why: "" })),
    extras: [], metrics: [], others: [], principle: null, note: "", budget: 0, planned_minutes: 0 };
  const items = plan.items || [];
  const extras = plan.extras || [];
  const otros = plan.others || [];
  const metricas = plan.metrics || [];
  const nada = !items.length && !extras.length && !otros.length && !metricas.length && !plan.principle;
  const hechos = items.filter(acc.hecho);
  const minutosHechos = hechos.reduce((s, h) => s + (h.minutes || 0), 0);
  const claude = plan.source === "claude";

  if (nada) {
    return (
      <button onClick={() => onNavigate?.("daily")} style={emptyCard}>
        Aún no tienes hábitos. Crea el primero (o pega tu configuración) →
      </button>
    );
  }

  return (
    <div style={{ marginBottom: 22 }}>
      {/* cabecera */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, position: "relative" }}>
        <span style={{ ...etiqueta, flex: "0 1 auto" }}>
          Tu plan de hoy · {hechos.length}/{items.length}
        </span>
        <HelpDot topic="day_plan" size={13} label="¿Cómo se decide el plan de hoy?" />
        <span style={{ marginLeft: "auto", fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
          padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
          color: claude ? "#F2D58A" : C.sepia, border: `1px solid ${claude ? "rgba(232,184,75,.45)" : C.paperEdge}`,
          background: claude ? "rgba(232,184,75,.10)" : "transparent" }}>
          {claude ? "✦ Claude" : "Automático"}
        </span>
        {items.length > 0 && hechos.length === items.length && <EstrellaAlada size={52} className="orn-completo" />}
      </div>
      {plan.budget > 0 && (
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, marginBottom: 10 }}>
          Llevas {tiempo(minutosHechos)} de {tiempo(plan.planned_minutes)} · hoy tienes {tiempo(plan.budget)}
          {plan.missions_minutes ? ` (${tiempo(plan.missions_minutes)} de misiones)` : ""}
        </div>
      )}
      {claude && plan.note && (
        <p style={{ margin: "0 0 12px", padding: "2px 0 2px 12px", borderLeft: "2px solid rgba(232,184,75,.6)",
          fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 16, color: C.sepiaInk, lineHeight: 1.5 }}>
          {plan.note}
        </p>
      )}

      {plan.principle && (
        <TarjetaPrincipio h={plan.principle} valor={acc.valor(plan.principle)}
          onResponder={(v) => acc.responder(plan.principle, v)} />
      )}

      {items.length > 0 && (
        <div style={tarjeta}>
          {items.map((h, i) => <FilaPlan key={h.id} h={h} acc={acc} ultima={i === items.length - 1} />)}
        </div>
      )}

      {metricas.length > 0 && (
        <>
          <div style={{ ...etiqueta, margin: "16px 0 8px" }}>Métricas</div>
          <div style={tarjeta}>
            {metricas.map((h, i) => (
              <FilaMetrica key={h.id} h={h} valor={acc.valor(h)} ultima={i === metricas.length - 1}
                onSumar={(n) => acc.sumar(h, n)} onFijar={(v) => acc.fijarValor(h, v)} />
            ))}
          </div>
        </>
      )}

      {extras.length > 0 && (
        <Plegable abierto={verExtras} onClick={() => setVerExtras((v) => !v)}
          titulo={`Si te da tiempo · ${extras.length}`}>
          {extras.map((h, i) => <FilaPlan key={h.id} h={h} acc={acc} ultima={i === extras.length - 1} suave />)}
        </Plegable>
      )}
      {otros.length > 0 && (
        <Plegable abierto={verOtros} onClick={() => setVerOtros((v) => !v)}
          titulo={`Otros hábitos · ${otros.length}`} nota="No tocan hoy, pero puedes marcarlos si los haces.">
          {otros.map((h, i) => <FilaPlan key={h.id} h={h} acc={acc} ultima={i === otros.length - 1} suave sinRazon />)}
        </Plegable>
      )}
    </div>
  );
}

function FilaPlan({ h, acc, ultima, suave, sinRazon }) {
  const ok = acc.hecho(h);
  const semanal = esSemanal(h);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0",
      borderBottom: ultima ? "none" : `1px solid ${C.paperEdge}` }}>
      <div style={{ paddingTop: 1 }}>
        <Casilla ok={ok} onClick={() => acc.marcar(h)} apagada={acc.ocupado(h)}
          label={ok ? `Desmarcar ${h.title}` : `Marcar ${h.title}`} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk, opacity: suave && !ok ? 0.85 : 1,
          lineHeight: 1.35 }}>{h.title}</div>
        {!sinRazon && h.why && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, marginTop: 2, lineHeight: 1.4 }}>{h.why}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        {h.minutes > 0 && (
          <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 600, color: C.sepiaInk, opacity: .8,
            padding: "2px 8px", borderRadius: 999, background: C.inkSoft }}>{tiempo(h.minutes)}</span>
        )}
        {semanal ? (
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: (h.week_done || 0) >= h.week_goal ? C.olive : C.sepia }}>
            {h.week_done || 0}/{h.week_goal} semana
          </span>
        ) : h.streak > 1 ? (
          <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.rust, fontWeight: 600 }}>🔥 {h.streak}</span>
        ) : null}
      </div>
    </div>
  );
}

function Plegable({ abierto, onClick, titulo, nota, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={onClick} aria-expanded={abierto} style={{ display: "flex", alignItems: "center", gap: 6,
        background: "none", border: "none", padding: "4px 0", cursor: "pointer" }}>
        <ChevronRight size={14} color={C.sepia} style={{ transform: abierto ? "rotate(90deg)" : "none", transition: "transform .25s" }} />
        <span style={{ ...etiqueta, background: "none", WebkitTextFillColor: C.sepia, color: C.sepia }}>{titulo}</span>
      </button>
      {abierto && (
        <div className="reveal">
          {nota && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, margin: "2px 0 8px" }}>{nota}</div>}
          <div style={{ ...tarjeta, opacity: 0.95 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

const etiqueta = { fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
  fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text",
  color: "transparent", width: "fit-content" };
const tarjeta = { background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`, padding: "2px 16px" };
const emptyCard = { display: "block", width: "100%", textAlign: "left", background: C.paper,
  border: `1px dashed ${C.sepia}`, borderRadius: 14, padding: "16px 18px", marginBottom: 18,
  fontFamily: FONT_BODY, fontSize: 14, color: C.sepia, cursor: "pointer" };
