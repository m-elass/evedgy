/*
 * sections/Exercises.jsx — EL TALLER DE TU RUTINA
 * ───────────────────────────────────────────────
 * Dos partes:
 *
 * 1. PLANTILLA SEMANAL: qué ejercicios tocan cada día. Es lo que la estrella
 *    Entreno mostrará por defecto. Las semanas también pasan aquí:
 *      · Interruptor "Cambios permanentes" APAGADO → tus cambios valen SOLO
 *        para la semana que estás viendo (una excepción).
 *      · Encendido → editas la plantilla de todas las semanas.
 *      · Si una semana tiene excepciones, un botón permite convertirlas en
 *        la nueva plantilla por defecto.
 *
 * 2. BIBLIOTECA: tus ejercicios, con notas técnicas y el detalle muscular
 *    fino (dorsal ancho, deltoides lateral, sóleo…) sobre el cuerpo.
 */
import React, { useEffect, useState } from "react";
import { NotebookPen, Trash2, PersonStanding, ChevronLeft, ChevronRight, RefreshCw, X, Crown, Search, Check } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_BODY, FONT_DISPLAY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Collapsible, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";
import { HelpDot } from "../components/Help";
import BodyMap from "../components/BodyMap";

function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function ymd(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; }
function fmtShort(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
const DOW = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

let MUSCLE_CATALOG = null;

export default function Exercises() {
  const [items, setItems] = useState(null);        // biblioteca
  const [routine, setRoutine] = useState(null);    // semana resuelta
  const [weekOffset, setWeekOffset] = useState(0);
  const [permanent, setPermanent] = useState(false); // el interruptor
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [known, setKnown] = useState([]);      // catálogo que la app reconoce
  const [preview, setPreview] = useState(null); // músculos detectados al escribir
  const [rebuilding, setRebuilding] = useState(false);

  const weekStart = startOfWeek(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const wsISO = ymd(weekStart);

  useEffect(() => { loadLib(); }, []);
  // El catálogo de ejercicios reconocidos (para sugerir mientras escribes)
  useEffect(() => { api.knownCatalog().then((r) => setKnown(r.exercises || [])).catch(() => {}); }, []);
  // Vista previa de los músculos: se consulta al dejar de teclear
  useEffect(() => {
    if (!adding || name.trim().length < 3) { setPreview(null); return; }
    const t = setTimeout(() => {
      api.analyzeName(name.trim()).then(setPreview).catch(() => setPreview(null));
    }, 350);
    return () => clearTimeout(t);
  }, [name, adding]);
  useEffect(() => { loadRoutine(); }, [weekOffset]);
  async function loadLib() { try { setItems(await api.listExercises()); } catch { setItems([]); } }
  async function loadRoutine() { try { setRoutine(await api.routineWeek(wsISO)); } catch { setRoutine({ days: [] }); } }

  async function create() {
    if (!name.trim()) return;
    await api.createExercise({ name: name.trim(), notes: "" });
    setName(""); setAdding(false); loadLib();
  }

  // Guardar los ejercicios de un día: en la plantilla o solo esta semana
  async function saveDay(weekday, ids) {
    if (permanent) {
      await api.setTemplateDay(weekday, ids);
      await api.clearWeekDay(wsISO, weekday);  // que lo que ves sea la plantilla
    } else {
      await api.setWeekDay(wsISO, weekday, ids);
    }
    loadRoutine();
  }
  async function restoreDay(weekday) { await api.clearWeekDay(wsISO, weekday); loadRoutine(); }
  async function promote() { await api.promoteWeek(wsISO); loadRoutine(); }
  async function rebuildMuscles() {
    setRebuilding(true);
    try { await api.reanalyzeAll(); await loadLib(); } finally { setRebuilding(false); }
  }

  if (items === null || routine === null)
    return (<><SectionHeader kicker="Cuerpo · Taller" title="Ejercicios" /><Loading /></>);

  const label = weekOffset === 0 ? "Esta semana" : weekOffset === -1 ? "Semana pasada"
    : weekOffset === 1 ? "Semana que viene"
    : weekOffset < 0 ? `Hace ${-weekOffset} semanas` : `Dentro de ${weekOffset} semanas`;
  const anyOverridden = (routine.days || []).some((d) => d.overridden);

  return (
    <div>
      <SectionHeader kicker="Cuerpo · Taller" title="Ejercicios" />

      {/* ═══ 1. LA PLANTILLA SEMANAL ═══ */}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
        fontWeight: 700, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text",
        color: "transparent", width: "fit-content" }}>Tu semana de entrenamiento</div>
      <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 10, marginTop: -4 }}>
        <HelpDot topic="week_template" size={15} label="¿Qué es la plantilla semanal?" />
        <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia }}>qué es esto</span>
      </div>

      {/* El interruptor de cambios permanentes */}
      <button onClick={() => setPermanent(!permanent)} style={{ width: "100%", display: "flex", alignItems: "center",
        gap: 12, background: permanent ? "rgba(232,184,75,.12)" : C.inkSoft,
        border: `1px solid ${permanent ? C.olive : C.paperEdge}`, borderRadius: 12, padding: "12px 14px",
        marginBottom: 12, cursor: "pointer", textAlign: "left", transition: "all .25s" }}>
        <span style={{ width: 40, height: 22, borderRadius: 22, background: permanent ? GRAD.gold : C.paperEdge,
          position: "relative", flexShrink: 0, transition: "background .25s" }}>
          <span style={{ position: "absolute", top: 2, left: permanent ? 20 : 2, width: 18, height: 18,
            borderRadius: "50%", background: "#FFF", transition: "left .25s",
            boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700,
            color: permanent ? C.olive : C.sepiaInk }}>Cambios permanentes {permanent ? "activados" : "desactivados"}
            <HelpDot topic="permanent_switch" size={14} label="¿Qué hace este interruptor?" /></span>
          <span style={{ display: "block", fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, marginTop: 2, lineHeight: 1.45 }}>
            {permanent ? "Lo que edites cambia la plantilla de TODAS las semanas."
              : "Lo que edites vale solo para la semana que estás viendo."}
          </span>
        </span>
      </button>

      {/* Navegación de semanas */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.inkSoft,
        borderRadius: 12, padding: "10px 12px", marginBottom: 14, border: `1px solid ${C.paperEdge}` }}>
        <button onClick={() => setWeekOffset(weekOffset - 1)} style={navArrow}><ChevronLeft size={18} /></button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk, fontWeight: 600 }}>{label}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, marginTop: 1 }}>{fmtShort(ymd(weekStart))} – {fmtShort(ymd(weekEnd))}</div>
        </div>
        <button onClick={() => setWeekOffset(weekOffset + 1)} style={navArrow}><ChevronRight size={18} /></button>
      </div>

      {/* Convertir las excepciones de esta semana en la nueva plantilla */}
      {anyOverridden && (
        <button onClick={promote} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
          background: GRAD.gold, border: "none", borderRadius: 12, padding: "13px 16px", marginBottom: 14,
          cursor: "pointer", boxShadow: GLOW.gold }}>
          <Crown size={17} color="#0B1B33" />
          <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", color: "#0B1B33" }}>
            <HelpDot topic="promote_week" size={15} label="¿Qué hace este botón?" />
          </span>
          <span style={{ flex: 1, textAlign: "left" }}>
            <span style={{ display: "block", fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: "#0B1B33" }}>
              Hacer de esta semana la nueva plantilla
            </span>
            <span style={{ display: "block", fontFamily: FONT_BODY, fontSize: 11, color: "rgba(11,27,51,.75)", marginTop: 1 }}>
              Los cambios de esta semana pasarán a ser lo de siempre
            </span>
          </span>
        </button>
      )}

      {items.length === 0 ? (
        <Empty text="Crea primero tus ejercicios en la biblioteca (abajo) y luego repártelos en los días de la semana." />
      ) : (
        (routine.days || []).map((day) => (
          <DayEditor key={day.weekday} day={day} library={items}
            onSave={(ids) => saveDay(day.weekday, ids)}
            onRestore={() => restoreDay(day.weekday)} permanent={permanent} />
        ))
      )}

      {/* ═══ 2. LA BIBLIOTECA ═══ */}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
        fontWeight: 700, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text",
        color: "transparent", width: "fit-content", margin: "26px 0 10px" }}>Tu biblioteca</div>

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 14, padding: 16, marginBottom: 14,
          border: `1px solid ${C.paperEdge}` }}>
          <label style={{ display: "block", fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em",
            textTransform: "uppercase", color: C.sepia, marginBottom: 6 }}>Nombre del ejercicio</label>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={15} color={C.sepia} style={{ position: "absolute", left: 13, top: 14 }} />
            <input list="known-exercises" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Escribe o elige: jalón, katana, hip thrust…" autoFocus
              style={{ width: "100%", boxSizing: "border-box", background: C.inkSoft,
                border: `1px solid ${C.paperEdge}`, borderRadius: 12, padding: "12px 14px 12px 36px",
                fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk, outline: "none" }} />
            <datalist id="known-exercises">
              {known.map((k) => (<option key={k.name} value={k.name} />))}
            </datalist>
          </div>

          {/* Vista previa: qué músculos ha reconocido, antes de crear nada */}
          {preview && (
            <div style={{ background: preview.recognized ? "rgba(232,184,75,.10)" : C.inkSoft,
              border: `1px solid ${preview.recognized ? "rgba(232,184,75,.35)" : C.paperEdge}`,
              borderRadius: 12, padding: "11px 13px", marginBottom: 12 }}>
              {preview.recognized ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <Check size={13} color={C.olive} />
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".1em",
                      textTransform: "uppercase", fontWeight: 700, color: C.olive }}>Ejercicio reconocido</span>
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk, lineHeight: 1.55 }}>
                    {preview.primary_names.join(" · ")}
                  </div>
                  {preview.secondary_names.length > 0 && (
                    <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, lineHeight: 1.5, marginTop: 4 }}>
                      También: {preview.secondary_names.join(" · ")}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, lineHeight: 1.5 }}>
                  No reconozco ese nombre todavía. Puedes crearlo igual y asignar los músculos a mano.
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Crear" onClick={create} />
            <button onClick={() => { setAdding(false); setName(""); setPreview(null); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <AddBtn label="Añadir ejercicio" onClick={() => setAdding(true)} />
          {items.length > 0 && (
            <button onClick={rebuildMuscles} disabled={rebuilding} style={{ display: "inline-flex",
              alignItems: "center", gap: 7, background: "none", border: `1px solid ${C.paperEdge}`,
              color: C.sepia, borderRadius: 999, padding: "10px 15px", fontFamily: FONT_BODY,
              fontSize: 12.5, cursor: rebuilding ? "default" : "pointer" }}>
              <RefreshCw size={13} /> {rebuilding ? "Recalculando…" : "Recalcular músculos"}
            </button>
          )}
          {items.length > 0 && (
            <HelpDot topic="reanalyze" size={15} label="¿Qué hace recalcular músculos?" />
          )}
        </div>
      )}

      {items.length === 0 && !adding && (
        <Empty text="Tu biblioteca está vacía. Añade el primer ejercicio; sus músculos se detectan solos." />
      )}

      {items.map((ex) => (
        <ExerciseCard key={ex.id} ex={ex} onChanged={loadLib} />
      ))}
    </div>
  );
}

/* ── Editor de un día de la semana ─────────────────────────────────── */
function DayEditor({ day, library, onSave, onRestore, permanent }) {
  const ids = day.exercises.map((e) => e.id);
  const available = library.filter((e) => !ids.includes(e.id));

  return (
    <Collapsible title={DOW[day.weekday]}
      subtitle={day.exercises.length === 0 ? "Descanso"
        : `${day.exercises.length} ejercicio${day.exercises.length > 1 ? "s" : ""}${day.overridden ? " · modificada esta semana" : ""}`}
      accent={day.overridden ? C.rust : day.exercises.length > 0 ? C.olive : C.paperEdge}>

      {day.overridden && !permanent && (
        <button onClick={onRestore} style={{ display: "inline-flex", alignItems: "center", gap: 6,
          background: "none", border: `1px solid ${C.rust}`, color: C.rust, borderRadius: 999,
          padding: "6px 12px", fontFamily: FONT_BODY, fontSize: 11.5, cursor: "pointer", marginBottom: 12 }}>
          <RefreshCw size={12} /> Restaurar la plantilla de este día
        </button>
      )}

      {day.exercises.map((e) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.inkSoft,
          border: `1px solid ${C.paperEdge}`, borderRadius: 10, padding: "10px 8px 10px 14px", marginBottom: 8 }}>
          <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk }}>{e.name}</span>
          <button onClick={() => onSave(ids.filter((i) => i !== e.id))} aria-label={`Quitar ${e.name}`}
            style={{ background: "none", border: "none", color: C.sepia, cursor: "pointer", padding: 6 }}>
            <X size={15} />
          </button>
        </div>
      ))}

      {available.length > 0 && (
        <select value="" onChange={(e) => { if (e.target.value) onSave([...ids, parseInt(e.target.value)]); }}
          style={{ width: "100%", background: C.inkSoft, border: `1.5px dashed ${C.paperEdge}`, color: C.sepia,
            borderRadius: 10, padding: "11px 12px", fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer" }}>
          <option value="">＋ Añadir ejercicio a este día…</option>
          {available.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
        </select>
      )}
    </Collapsible>
  );
}

/* ── Ficha de biblioteca: notas + músculos finos sobre el cuerpo ───── */
function ExerciseCard({ ex, onChanged }) {
  const [notes, setNotes] = useState(ex.notes || "");
  const [saved, setSaved] = useState(true);
  const [showBody, setShowBody] = useState(false);
  const [catalog, setCatalog] = useState(MUSCLE_CATALOG);

  useEffect(() => {
    if (MUSCLE_CATALOG) { setCatalog(MUSCLE_CATALOG); return; }
    api.muscleCatalog().then((r) => { MUSCLE_CATALOG = r.muscles; setCatalog(r.muscles); }).catch(() => {});
  }, []);

  async function saveNotes() { await api.updateExercise(ex.id, { notes }); setSaved(true); }
  async function remove() { await api.deleteExercise(ex.id); onChanged(); }
  async function reanalyze() { await api.reanalyzeExercise(ex.id); onChanged(); }

  const primary = (ex.primary_muscles || "").split(",").filter(Boolean);
  const secondary = (ex.secondary_muscles || "").split(",").filter(Boolean);
  const hasMuscles = primary.length > 0 || secondary.length > 0;
  const nameOf = (id) => (catalog && catalog[id]) || id;

  return (
    <Collapsible title={ex.name} accent={C.olive}>
      <div style={{ background: "rgba(166,116,30,0.08)", borderRadius: 8, padding: "11px 13px",
        borderLeft: `3px solid ${C.olive}`, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <NotebookPen size={13} color={C.olive} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em",
            textTransform: "uppercase", color: C.olive, fontWeight: 600 }}>Notas de ejecución</span>
          <HelpDot topic="exercise_notes" size={13} />
        </div>
        <Field value={notes} multiline
          placeholder="Apunta aquí cómo mejorar la técnica de este ejercicio…"
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SolidBtn label={saved ? "Guardado" : "Guardar notas"} onClick={saveNotes} disabled={saved} />
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={reanalyze} title="Recalcular músculos" aria-label="Recalcular músculos"
              style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 6 }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={remove} style={{ background: "none", border: "none", cursor: "pointer",
              color: C.sepia, padding: 6 }} aria-label="Borrar ejercicio"><Trash2 size={15} /></button>
          </div>
        </div>
      </div>

      {hasMuscles && (
        <div>
          <button onClick={() => setShowBody((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 9,
            width: "100%", background: C.inkSoft, border: `1px solid ${C.paperEdge}`, borderRadius: 10,
            padding: "11px 14px", cursor: "pointer", color: C.sepiaInk }}>
            <PersonStanding size={17} color={C.olive} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, flex: 1, textAlign: "left" }}>
              {showBody ? "Ocultar músculos" : "Ver músculos que trabaja"}
            </span>
            <HelpDot topic="muscle_body" size={14} label="¿De dónde salen estos músculos?" />
            <span style={{ fontSize: 12, color: C.sepia }}>{showBody ? "▴" : "▾"}</span>
          </button>

          {showBody && (
            <div style={{ marginTop: 14 }}>
              <BodyMap primary={primary} secondary={secondary} size={260} />
              <div style={{ marginTop: 12 }}>
                {primary.length > 0 && (
                  <MuscleRow color={C.olive} label="Principales" names={primary.map(nameOf)} glow />
                )}
                {secondary.length > 0 && (
                  <MuscleRow color="rgba(232,184,75,0.45)" label="Secundarios" names={secondary.map(nameOf)} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Collapsible>
  );
}

function MuscleRow({ color, label, names, glow }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0, marginTop: 2,
        boxShadow: glow ? "0 0 6px rgba(232,184,75,0.7)" : "none" }} />
      <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia, textTransform: "uppercase", letterSpacing: ".06em", minWidth: 78, marginTop: 1 }}>{label}</span>
      <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, lineHeight: 1.5, flex: 1 }}>{names.join(" · ")}</span>
    </div>
  );
}

const navArrow = { background: "transparent", border: "none", color: C.sepiaInk, cursor: "pointer", padding: 8, display: "flex", alignItems: "center" };
const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY,
  fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
