/*
 * sections/DailyTasks.jsx — HÁBITOS, en sus cuatro tipos
 * ──────────────────────────────────────────────────────
 * No todo lo que sostiene tus días es igual, así que aquí se separa:
 *   · Hábitos            — prácticas con su tiempo y su frecuencia.
 *   · Objetivos del día  — bloques largos de trabajo (Estudio 90 min).
 *   · Métricas           — cifras que se suman (agua, proteína, pasos, sueño).
 *   · Principios         — lo que marca el día («primero lo importante»).
 * Cada uno con sus minutos, cuántas veces por semana (o qué días) y su
 * prioridad. Arriba, el tiempo que tienes cada día de la semana y lo que
 * quieres conseguir: con eso se decide cada mañana «Tu plan de hoy».
 * «Pegar configuración» aplica de una vez una configuración sugerida.
 */
import React, { useMemo, useRef, useState } from "react";
import { Pencil, Trash2, Pause, Play, ClipboardPaste, Sparkles, ChevronRight } from "lucide-react";
import { api, ymd } from "../lib/api";
import { useApi, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { C, FONT_BODY, FONT_DISPLAY, GRAD } from "../lib/theme";
import { SectionHeader, AddBtn, SolidBtn, Empty, SURFACE } from "../components/ui";
import { HelpDot } from "../components/Help";
import { Casilla, FilaMetrica, useAccionesHabito, miniBtn, leerNumero } from "../components/Habitos";
import {
  TIPOS, TIPO, DIAS, PRIORIDADES, RESPUESTAS, lineaHabito, esSemanal, tiempo, num,
} from "../lib/habitos";

const HORAS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 420, 480, 540, 600, 720];
const horasCorto = (m) => (m === 0 ? "0" : m % 60 ? `${Math.floor(m / 60) || ""}½` : `${m / 60}`) + (m ? " h" : "");

export default function DailyTasks({ onNavigate }) {
  const hoy = ymd();
  const { data: base, gate } = useApi("habits", api.habitsAll, { params: [hoy] });
  const { data: ajustes } = useApi("planner", api.plannerSettings);
  const acc = useAccionesHabito(hoy);
  const refrescar = useRefrescar();
  const [ficha, setFicha] = useState(null);           // null · "nueva" · id del hábito que se edita
  const [importando, setImportando] = useState(false);
  const [verPausa, setVerPausa] = useState(false);

  const recargar = () => refrescar("habits", "today", "daily", "planner");

  if (gate) return (<><SectionHeader kicker="Hacer · Tu sistema" title="Hábitos" />{gate}</>);
  const activos = base.filter((h) => h.active);
  const pausados = base.filter((h) => !h.active);

  return (
    <div>
      <SectionHeader kicker="Hacer · Tu sistema" title="Hábitos" />

      <Planificacion ajustes={ajustes} onNavigate={onNavigate} onGuardado={recargar} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {ficha !== "nueva" && <AddBtn label="Nuevo" onClick={() => { setFicha("nueva"); setImportando(false); }} />}
        {!importando && (
          <button onClick={() => { setImportando(true); setFicha(null); }} style={{ ...ghost, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ClipboardPaste size={15} /> Pegar configuración
          </button>
        )}
      </div>

      {importando && <Importar actuales={base} onCerrar={() => setImportando(false)} onHecho={recargar} />}
      {ficha === "nueva" && <Ficha onCerrar={() => setFicha(null)} onGuardado={recargar} />}

      {base.length === 0 && ficha !== "nueva" && !importando && (
        <Empty text="Aún no hay nada. Crea un hábito, un objetivo del día, una métrica o un principio, o pega una configuración." />
      )}

      {TIPOS.map((t) => {
        const lista = activos.filter((h) => h.kind === t.id).sort((a, z) => (a.priority || 2) - (z.priority || 2) || a.id - z.id);
        if (!lista.length) return null;
        return (
          <div key={t.id} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span style={etiqueta}>{t.plural} · {lista.length}</span>
              {t.id === "bloque" && <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia }}>
                {tiempo(lista.reduce((s, h) => s + (h.minutes || 0) * (h.week_goal || 7), 0))} a la semana</span>}
            </div>
            <div style={{ ...SURFACE, borderRadius: 16, padding: "2px 16px" }}>
              {lista.map((h, i) => (
                ficha === h.id ? (
                  <div key={h.id} style={{ padding: "12px 0" }}>
                    <Ficha h={h} onCerrar={() => setFicha(null)} onGuardado={recargar} incrustada />
                  </div>
                ) : (
                  <Fila key={h.id} h={h} acc={acc} ultima={i === lista.length - 1} onEditar={() => { setFicha(h.id); setImportando(false); }} />
                )
              ))}
            </div>
          </div>
        );
      })}

      {pausados.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setVerPausa((v) => !v)} aria-expanded={verPausa}
            style={{ ...ghost, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 0" }}>
            <ChevronRight size={14} style={{ transform: verPausa ? "rotate(90deg)" : "none", transition: "transform .25s" }} />
            En pausa · {pausados.length}
          </button>
          {verPausa && pausados.map((h) => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 2px" }}>
              <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, color: C.sepia }}>
                {h.title} <span style={{ fontSize: 11.5 }}>· {TIPO[h.kind]?.nombre}</span>
              </span>
              <button style={miniBtn(true)} onClick={async () => {
                try { await api.updateDailyTask(h.id, { active: true }); recargar(); } catch (e) { avisar(e?.humano || "No se pudo reanudar."); }
              }}><Play size={12} style={{ marginRight: 4 }} />Reanudar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Una fila de la lista ─────────────────────────────── */

function Fila({ h, acc, ultima, onEditar }) {
  const lapiz = (
    <button onClick={onEditar} aria-label={`Editar ${h.title}`} style={{ background: "none", border: "none",
      cursor: "pointer", color: C.sepia, padding: 6, flexShrink: 0 }}><Pencil size={15} /></button>
  );
  if (h.kind === "metrica") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <FilaMetrica h={h} valor={acc.valor(h)} ultima={ultima}
            onSumar={(n) => acc.sumar(h, n)} onFijar={(v) => acc.fijarValor(h, v)} />
        </div>
        {lapiz}
      </div>
    );
  }
  if (h.kind === "principio") {
    const r = RESPUESTAS.find((x) => x.v === acc.valor(h));
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0",
        borderBottom: ultima ? "none" : `1px solid ${C.paperEdge}` }}>
        <span aria-hidden="true" style={{ color: "#CDBBFF", fontSize: 15, lineHeight: "22px" }}>◇</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk }}>{h.title}</div>
          {h.description && <div style={{ fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 14, color: C.sepia, marginTop: 2 }}>{h.description}</div>}
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, marginTop: 4 }}>
            {r ? `Hoy: ${r.dicho.toLowerCase()}` : "Sale en Hoy, uno cada día; por la noche te pregunta si lo viviste."}
          </div>
        </div>
        {lapiz}
      </div>
    );
  }
  const ok = acc.hecho(h);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
      borderBottom: ultima ? "none" : `1px solid ${C.paperEdge}` }}>
      <Casilla ok={ok} onClick={() => acc.marcar(h)} apagada={acc.ocupado(h)} label={ok ? `Desmarcar ${h.title}` : `Marcar ${h.title} hoy`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk, lineHeight: 1.35 }}>{h.title}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, marginTop: 2 }}>{lineaHabito(h)}</div>
      </div>
      {esSemanal(h) ? (
        <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: (h.week_done || 0) >= h.week_goal ? C.olive : C.sepia, textAlign: "right", flexShrink: 0 }}>
          {h.week_done || 0}/{h.week_goal}<br />semana
        </span>
      ) : h.streak > 0 ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.rust, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
          🔥 {h.streak}
        </span>
      ) : null}
      {lapiz}
    </div>
  );
}

/* ── El formulario: crear o editar ────────────────────── */

function inicial(h) {
  if (!h) return { kind: "habito", title: "", minutes: 15, freq: "diario", per_week: 3, days: [], priority: 2,
    entreno: false, target: "", unit: "", step: "", sueno: false, description: "" };
  return {
    kind: h.kind, title: h.title, minutes: h.minutes || 0,
    freq: h.days?.length ? "dias" : (h.per_week || 7) >= 7 ? "diario" : "semana",
    per_week: (h.per_week || 7) >= 7 ? 3 : h.per_week, days: h.days || [], priority: h.priority || 2,
    entreno: h.link === "entreno", target: h.target ?? "", unit: h.unit || "", step: h.step ?? "",
    sueno: h.link === "sueno", description: h.description || "",
  };
}

function Ficha({ h, onCerrar, onGuardado, incrustada }) {
  const [f, setF] = useState(() => inicial(h));
  const [ocupado, setOcupado] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const conTiempo = f.kind === "habito" || f.kind === "bloque";
  const n = (v) => leerNumero(v);            // «10.000» = diez mil; «3,5» = tres y medio

  function cuerpo() {
    const b = { title: f.title.trim(), kind: f.kind };
    if (conTiempo) {
      Object.assign(b, {
        minutes: Math.max(0, Math.min(720, Math.round(n(f.minutes) || 0))), priority: f.priority,
        per_week: f.freq === "diario" ? 7 : f.freq === "semana" ? f.per_week : Math.max(1, f.days.length),
        days: f.freq === "dias" ? f.days : [], link: f.entreno ? "entreno" : "",
      });
    } else if (f.kind === "metrica") {
      Object.assign(b, { target: n(f.target), unit: f.unit.trim(), step: n(f.step) || null,
        link: f.sueno ? "sueno" : "", per_week: 7, days: [], minutes: 0 });
    } else {
      Object.assign(b, { description: f.description.trim(), per_week: 7, days: [], minutes: 0, link: "" });
    }
    return b;
  }
  const error = !f.title.trim() ? "Ponle un nombre."
    : f.kind === "metrica" && !(n(f.target) > 0) ? "La métrica necesita un objetivo (p. ej. 3,5)."
      : conTiempo && f.freq === "dias" && !f.days.length ? "Elige al menos un día." : null;

  async function guardar() {
    if (error) { avisar(error); return; }
    setOcupado(true);
    try {
      if (h) await api.updateDailyTask(h.id, cuerpo());
      else await api.createDailyTask(cuerpo());
      onGuardado(); onCerrar();
    } catch (e) {
      avisar(e?.humano || "No se pudo guardar.");
    } finally { setOcupado(false); }
  }
  async function pausar() {
    setOcupado(true);
    try { await api.updateDailyTask(h.id, { active: false }); onGuardado(); onCerrar(); }
    catch (e) { avisar(e?.humano || "No se pudo pausar."); } finally { setOcupado(false); }
  }
  async function eliminar() {
    if (!borrar) { setBorrar(true); return; }
    setOcupado(true);
    try { await api.deleteDailyTask(h.id); onGuardado(); onCerrar(); }
    catch (e) { avisar(e?.humano || "No se pudo borrar."); } finally { setOcupado(false); }
  }

  return (
    <div style={incrustada ? {} : { ...SURFACE, padding: 16, marginBottom: 18 }}>
      <div style={{ ...etiqueta, marginBottom: 10 }}>{h ? "Editar" : "Nuevo"}</div>
      {/* tipo */}
      <div role="radiogroup" aria-label="Tipo" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
        {TIPOS.map((t) => (
          <button key={t.id} role="radio" aria-checked={f.kind === t.id} onClick={() => set("kind", t.id)}
            style={chip(f.kind === t.id, { padding: "9px 10px", borderRadius: 12 })}>{t.nombre}</button>
        ))}
      </div>
      <p style={{ margin: "0 0 14px", fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, lineHeight: 1.45 }}>{TIPO[f.kind].desc}</p>

      <Campo label="Nombre">
        <input value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={120} aria-label="Nombre"
          placeholder={{ habito: "Meditar", bloque: "Estudiar", metrica: "Agua", principio: "Primero lo importante" }[f.kind]}
          style={entrada} />
      </Campo>

      {conTiempo && (
        <>
          <Campo label="Minutos que suele llevar">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <input inputMode="numeric" value={f.minutes} onChange={(e) => set("minutes", e.target.value.replace(/[^\d]/g, ""))}
                aria-label="Minutos" style={{ ...entrada, width: 76 }} />
              {[0, 10, 20, 30, 45, 60, 90].map((m) => (
                <button key={m} onClick={() => set("minutes", m)} style={chip(Number(f.minutes) === m)}>{m}</button>
              ))}
            </div>
          </Campo>
          <Campo label="¿Cada cuánto?">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {[["diario", "Cada día"], ["semana", "Veces por semana"], ["dias", "Días fijos"]].map(([id, txt]) => (
                <button key={id} onClick={() => set("freq", id)} style={chip(f.freq === id)} aria-pressed={f.freq === id}>{txt}</button>
              ))}
            </div>
            {f.freq === "semana" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5, 6].map((k) => (
                  <button key={k} onClick={() => set("per_week", k)} style={chip(f.per_week === k, { minWidth: 38 })}
                    aria-label={`${k} veces por semana`}>{k}×</button>
                ))}
                <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia }}>por semana, el día que mejor venga</span>
              </div>
            )}
            {f.freq === "dias" && (
              <div style={{ display: "flex", gap: 6 }}>
                {DIAS.map((d, i) => {
                  const on = f.days.includes(i);
                  return (
                    <button key={d} aria-pressed={on} aria-label={["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][i]}
                      onClick={() => set("days", on ? f.days.filter((x) => x !== i) : [...f.days, i].sort())}
                      style={chip(on, { width: 38, padding: "8px 0" })}>{d}</button>
                  );
                })}
              </div>
            )}
          </Campo>
          <Campo label="Prioridad">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRIORIDADES.map((p) => (
                <button key={p.id} onClick={() => set("priority", p.id)} style={chip(f.priority === p.id)} aria-pressed={f.priority === p.id}>{p.nombre}</button>
              ))}
            </div>
          </Campo>
          <Check on={f.entreno} onChange={() => set("entreno", !f.entreno)}
            texto="Se marca solo cuando registras un entreno (Entrenamiento)" />
        </>
      )}

      {f.kind === "metrica" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <Campo label="Objetivo"><input inputMode="decimal" value={f.target} onChange={(e) => set("target", e.target.value)} aria-label="Objetivo" placeholder="3,5" style={entrada} /></Campo>
            <Campo label="Unidad"><input value={f.unit} onChange={(e) => set("unit", e.target.value)} maxLength={16} aria-label="Unidad" placeholder="L" style={entrada} /></Campo>
            <Campo label="Botón +"><input inputMode="decimal" value={f.step} onChange={(e) => set("step", e.target.value)} aria-label="Lo que suma el botón" placeholder="0,25" style={entrada} /></Campo>
          </div>
          <Check on={f.sueno} onChange={() => set("sueno", !f.sueno)} texto="Es el sueño: lee las horas de Sueño (y apunta allí lo que escribas)" />
        </>
      )}

      {f.kind === "principio" && (
        <Campo label="Qué significa vivirlo (opcional)">
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={600} rows={2}
            aria-label="Qué significa vivirlo" placeholder="80 % de lo que como, limpio y nutritivo; 20 %, flexible y sin culpa."
            style={{ ...entrada, resize: "vertical", lineHeight: 1.5 }} />
        </Campo>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
        <SolidBtn label={ocupado ? "Guardando…" : h ? "Guardar" : "Crear"} onClick={guardar} disabled={ocupado} />
        <button onClick={onCerrar} style={ghost}>Cancelar</button>
        {h && (
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
            <button onClick={pausar} disabled={ocupado} style={{ ...ghost, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Pause size={14} /> Pausar
            </button>
            <button onClick={eliminar} disabled={ocupado} style={{ ...ghost, color: borrar ? "#FF9C9C" : C.sepia, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Trash2 size={14} /> {borrar ? "¿Seguro? Se borra su historial" : "Borrar"}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Tu tiempo cada día + lo que quieres conseguir ────── */

function Planificacion({ ajustes, onNavigate, onGuardado }) {
  const [editando, setEditando] = useState(false);
  const [presu, setPresu] = useState(null);
  const [brief, setBrief] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const b = ajustes?.budget || [180, 180, 180, 180, 180, 180, 180];
  function abrir() { setPresu([...b]); setBrief(ajustes?.brief || ""); setEditando(true); }
  async function guardar() {
    setOcupado(true);
    try {
      await api.savePlannerSettings({ budget: presu, brief });
      avisar("Guardado: el plan de cada día se ajustará a este tiempo.", "ok");
      setEditando(false); onGuardado();
    } catch (e) { avisar(e?.humano || "No se pudo guardar."); } finally { setOcupado(false); }
  }
  return (
    <div style={{ ...SURFACE, padding: "14px 16px", marginBottom: 18, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={etiqueta}>Tu tiempo cada día</span>
        <HelpDot topic="day_plan" size={13} label="¿Cómo se decide el plan de hoy?" />
        {!editando && <button onClick={abrir} style={{ ...ghost, marginLeft: "auto", padding: "2px 4px" }}>Cambiar</button>}
      </div>
      {editando ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 12 }}>
            {DIAS.map((d, i) => (
              <label key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                fontFamily: FONT_BODY, fontSize: 12, color: C.sepia }}>
                {d}
                <select value={presu[i]} aria-label={`Tiempo el ${["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"][i]}`}
                  onChange={(e) => setPresu((p) => p.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                  style={{ width: "100%", minWidth: 0, background: C.inkSoft, color: C.sepiaInk, border: `1px solid ${C.paperEdge}`,
                    borderRadius: 8, padding: "6px 0", fontFamily: FONT_BODY, fontSize: 12.5, textAlign: "center" }}>
                  {[...new Set([...HORAS, presu[i]])].sort((a, z) => a - z).map((m) => <option key={m} value={m}>{horasCorto(m)}</option>)}
                </select>
              </label>
            ))}
          </div>
          <label style={{ display: "block", fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: C.sepia, marginBottom: 6 }}>
            Lo que quieres conseguir (Claude lo lee cada mañana)
          </label>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} maxLength={1500} rows={4} aria-label="Lo que quieres conseguir"
            placeholder="Qué te importa más, qué quieres sostener cada día, qué metas tienes ahora…"
            style={{ ...entrada, resize: "vertical", lineHeight: 1.5, marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label={ocupado ? "Guardando…" : "Guardar"} onClick={guardar} disabled={ocupado} />
            <button onClick={() => setEditando(false)} style={ghost}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {DIAS.map((d, i) => (
              <span key={d} style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepiaInk, padding: "4px 8px",
                borderRadius: 999, background: C.inkSoft, whiteSpace: "nowrap" }}>
                <b style={{ color: C.sepia, fontWeight: 600 }}>{d}</b> {horasCorto(b[i])}
              </span>
            ))}
          </div>
          {ajustes && !ajustes.budget_set && (
            <p style={{ margin: "8px 0 0", fontFamily: FONT_BODY, fontSize: 12, color: C.sepia }}>
              Aún no lo has dicho: se cuentan 3 h al día. Ajústalo para que el plan sea realista.
            </p>
          )}
          <button onClick={() => onNavigate?.("settings")} style={{ ...ghost, display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 0 0", color: ajustes?.connected ? "#F2D58A" : C.sepia }}>
            <Sparkles size={14} />
            {ajustes?.connected ? "Claude decide tu plan cada mañana" : "Plan automático · Conecta a Claude en Ajustes →"}
          </button>
        </>
      )}
    </div>
  );
}

/* ── Pegar una configuración sugerida ─────────────────── */

const norm = (t) => String(t || "").toLowerCase().split(/\s+/).filter(Boolean).join(" ");

function Importar({ actuales, onCerrar, onHecho }) {
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const archivo = useRef(null);
  const leido = useMemo(() => {
    if (!texto.trim()) return null;
    try {
      const j = JSON.parse(texto);
      if (!j || !Array.isArray(j.habits)) return { error: "No es una configuración de hábitos (falta «habits»)." };
      if (j.budget != null && !(Array.isArray(j.budget) && j.budget.length === 7 && j.budget.every((m) => Number.isFinite(m))))
        return { error: "El tiempo por día («budget») debe ser una lista de 7 cifras en minutos, de lunes a domingo." };
      if (j.brief != null && typeof j.brief !== "string") return { error: "«brief» debe ser un texto." };
      if (j.habits.some((it) => !it || typeof it !== "object" || (it.days != null && !Array.isArray(it.days))))
        return { error: "Algún hábito está mal escrito (los días van como lista, p. ej. [0, 1, 3, 4])." };
      const porId = Object.fromEntries(actuales.map((h) => [h.id, h]));
      const filas = j.habits.map((it) => {
        if (it.id == null) return { it, estado: "nuevo" };
        const h = porId[it.id];
        const validos = [it.match_title, it.title].filter(Boolean).map(norm);
        return { it, h, estado: h && (!validos.length || validos.includes(norm(h.title))) ? "cambia" : "salta" };
      });
      return { j, filas };
    } catch {
      return { error: "El texto no es JSON válido. Cópialo entero, desde la primera { hasta la última }." };
    }
  }, [texto, actuales]);

  async function elegir(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 200_000) { avisar("Ese archivo es demasiado grande para ser una configuración."); return; }
    setTexto(await f.text());
  }
  async function aplicar() {
    if (!leido?.j) return;
    setOcupado(true);
    try {
      const { habits, budget, brief } = leido.j;
      const r = await api.importHabits({ habits, ...(budget ? { budget } : {}), ...(brief != null ? { brief } : {}) });
      avisar(`Listo: ${r.updated} actualizados${r.created ? `, ${r.created} nuevos` : ""}${r.skipped.length ? `, ${r.skipped.length} sin tocar` : ""}.`, "ok");
      onHecho(); onCerrar();
    } catch (e) {
      avisar(e?.humano || "No se pudo aplicar la configuración.");
    } finally { setOcupado(false); }
  }

  const cuantos = (e) => leido?.filas?.filter((x) => x.estado === e).length || 0;
  return (
    <div style={{ ...SURFACE, padding: 16, marginBottom: 18 }}>
      <div style={{ ...etiqueta, marginBottom: 8 }}>Pegar configuración</div>
      <p style={{ margin: "0 0 10px", fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, lineHeight: 1.5 }}>
        Pega aquí una configuración sugerida (o elige el archivo .json). Antes de aplicarla verás qué cambia.
        Solo toca los hábitos cuyo nombre coincide; tus registros no se pierden.
      </p>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} aria-label="Configuración"
        placeholder='{ "habits": [ … ] }' style={{ ...entrada, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 4px", flexWrap: "wrap" }}>
        <input ref={archivo} type="file" accept=".json,application/json,text/plain" onChange={elegir} style={{ display: "none" }} />
        <button onClick={() => archivo.current?.click()} style={miniBtn(false)}>Elegir archivo</button>
        {texto && <button onClick={() => setTexto("")} style={ghost}>Vaciar</button>}
      </div>
      {leido?.error && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#FF9C9C" }}>{leido.error}</p>}
      {leido?.filas && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, marginBottom: 6 }}>
            {cuantos("cambia")} se actualizan · {cuantos("nuevo")} nuevos{cuantos("salta") ? ` · ${cuantos("salta")} no coinciden (se saltan)` : ""}
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 10, background: C.inkSoft, padding: "4px 10px" }}>
            {leido.filas.map(({ it, h, estado }, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", fontFamily: FONT_BODY, fontSize: 12.5,
                color: estado === "salta" ? C.sepia : C.sepiaInk, borderBottom: i < leido.filas.length - 1 ? `1px solid ${C.paperEdge}` : "none" }}>
                <span style={{ width: 14, flexShrink: 0, color: estado === "salta" ? "#FF9C9C" : C.olive }}>{estado === "salta" ? "✕" : estado === "nuevo" ? "+" : "✓"}</span>
                <span style={{ flex: 1 }}>
                  {h && it.title && norm(it.title) !== norm(h.title) ? <>{h.title} → <b>{it.title}</b></> : <b>{it.title || h?.title || it.match_title}</b>}
                  <span style={{ color: C.sepia }}> · {resumenImport(it)}</span>
                </span>
              </div>
            ))}
          </div>
          {leido.j.budget && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 8 }}>
              Tiempo por día: {leido.j.budget.map((m, i) => `${DIAS[i]} ${horasCorto(m)}`).join(" · ")}
            </div>
          )}
          {leido.j.brief && (
            <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 6, lineHeight: 1.45 }}>
              Lo que quieres conseguir: «{leido.j.brief}»
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <SolidBtn label={ocupado ? "Aplicando…" : "Aplicar"} onClick={aplicar} disabled={ocupado || !leido?.j} />
        <button onClick={onCerrar} style={ghost}>Cancelar</button>
      </div>
    </div>
  );
}

function resumenImport(it) {
  const t = TIPO[it.kind]?.nombre;
  if (it.kind === "metrica") return [t, it.target != null ? `objetivo ${num(it.target)} ${it.unit || ""}`.trim() : null].filter(Boolean).join(", ");
  if (it.kind === "principio") return t;
  const partes = [t, it.minutes != null ? `${it.minutes} min` : null,
    it.days?.length ? it.days.map((d) => DIAS[d]).join("·") : it.per_week ? (it.per_week >= 7 ? "cada día" : `${it.per_week}× semana`) : null,
    it.priority === 1 ? "imprescindible" : it.priority === 3 ? "si da tiempo" : null];
  return partes.filter(Boolean).join(", ") || "cambios";
}

/* ── Piezas pequeñas ──────────────────────────────────── */

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: C.sepia, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Check({ on, onChange, texto }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 14, cursor: "pointer",
      fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, lineHeight: 1.4 }}>
      <input type="checkbox" checked={on} onChange={onChange} style={{ width: 17, height: 17, marginTop: 1, accentColor: "#E8B84B" }} />
      {texto}
    </label>
  );
}

function chip(on, extra = {}) {
  return {
    padding: "8px 12px", borderRadius: 999, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13,
    border: on ? "1px solid rgba(232,184,75,.6)" : `1px solid ${C.paperEdge}`,
    background: on ? "rgba(232,184,75,.16)" : "transparent", color: on ? "#F2D58A" : C.sepiaInk,
    fontWeight: on ? 700 : 500, ...extra,
  };
}

const entrada = { width: "100%", boxSizing: "border-box", background: C.inkSoft, border: "1px solid transparent",
  boxShadow: "inset 0 1px 3px rgba(0,0,0,.25)", borderRadius: 12, padding: "11px 13px", fontFamily: FONT_BODY,
  fontSize: 14.5, color: C.sepiaInk, outline: "none" };
const etiqueta = { fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
  fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text",
  color: "transparent", width: "fit-content" };
const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
