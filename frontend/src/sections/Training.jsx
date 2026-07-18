/*
 * sections/Training.jsx — EL ENTRENO POR DÍAS
 * ───────────────────────────────────────────
 * La semana desplegada en sus 7 días. Cada día es un desplegable con los
 * ejercicios de ESA sesión (los que dicta tu plantilla, o la excepción de
 * esta semana si la hay), y dentro registras las series de la sesión entera.
 *
 * La plantilla se configura en la estrella Ejercicios; aquí se ENTRENA.
 * Se conservan la sugerencia inteligente, el aviso de descarga, los discos,
 * el temporizador de descanso y la celebración de récords.
 */
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, ArrowLeft, Calendar, NotebookPen, Sparkles, Timer } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Collapsible, Field, SolidBtn, Loading, Empty } from "../components/ui";
import Celebration from "../components/Celebration";

// ── utilidades de fecha ───────────────────────────────────
function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x; }
function ymd(d) { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`; }
function fmtShort(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
const DOW = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function Training() {
  const [exercises, setExercises] = useState(null);  // biblioteca (para datos completos)
  const [routine, setRoutine] = useState(null);      // la semana resuelta (7 días)
  const [sessions, setSessions] = useState([]);
  const [progressOf, setProgressOf] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

  useEffect(() => { api.listExercises().then(setExercises).catch(() => setExercises([])); }, []);
  useEffect(() => { load(); }, [weekOffset]);
  async function load() {
    try {
      const [r, s] = await Promise.all([
        api.routineWeek(ymd(weekStart)),
        api.listSessions({ start: ymd(weekStart), end: ymd(weekEnd) }),
      ]);
      setRoutine(r); setSessions(s);
    } catch { setRoutine({ days: [] }); setSessions([]); }
  }

  if (progressOf) return <Progress ex={progressOf} onBack={() => setProgressOf(null)} />;
  if (exercises === null || routine === null)
    return (<><SectionHeader kicker="Cuerpo · Sesión" title="Entrenamiento" /><Loading /></>);

  const label = weekOffset === 0 ? "Esta semana"
    : weekOffset === -1 ? "Semana pasada"
    : weekOffset === 1 ? "Semana que viene"
    : weekOffset < 0 ? `Hace ${-weekOffset} semanas` : `Dentro de ${weekOffset} semanas`;
  const canLog = weekOffset === 0;                  // solo se registra la semana actual
  const todayIdx = (new Date().getDay() + 6) % 7;   // 0=lunes
  const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));

  return (
    <div>
      <SectionHeader kicker="Cuerpo · Sesión" title="Entrenamiento" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.inkSoft,
        borderRadius: 12, padding: "10px 12px", marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
        <button onClick={() => setWeekOffset(weekOffset - 1)} style={navArrow}><ChevronLeft size={18} /></button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk, fontWeight: 600 }}>{label}</div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, marginTop: 1 }}>{fmtShort(ymd(weekStart))} – {fmtShort(ymd(weekEnd))}</div>
        </div>
        <button onClick={() => setWeekOffset(weekOffset + 1)} style={navArrow}><ChevronRight size={18} /></button>
      </div>

      {!canLog && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, color: C.sepia, fontFamily: FONT_BODY, fontSize: 12.5 }}>
          <Calendar size={13} /> {weekOffset < 0 ? "Viendo una semana pasada" : "Viendo el plan de una semana futura"}
        </div>
      )}

      {exercises.length === 0 ? (
        <Empty text="Primero crea ejercicios y tu plantilla semanal en la estrella Ejercicios. Aquí registrarás cada sesión." />
      ) : (
        (routine.days || []).map((day) => {
          const dayDate = new Date(weekStart); dayDate.setDate(dayDate.getDate() + day.weekday);
          const iso = ymd(dayDate);
          const plan = day.exercises;
          const done = plan.filter((p) => sessions.some((s) => s.exercise_id === p.id && s.date === iso)).length;
          const isToday = weekOffset === 0 && day.weekday === todayIdx;
          const subtitle = plan.length === 0 ? "Descanso"
            : `${plan.length} ejercicio${plan.length > 1 ? "s" : ""} · ${done} hecho${done !== 1 ? "s" : ""}${day.overridden ? " · semana modificada" : ""}`;
          return (
            <Collapsible key={day.weekday}
              title={`${DOW[day.weekday]} ${dayDate.getDate()}${isToday ? " · hoy" : ""}`}
              subtitle={subtitle} defaultOpen={isToday}
              accent={plan.length === 0 ? C.paperEdge : done === plan.length ? C.olive : day.overridden ? C.rust : C.sepia}>
              {plan.length === 0 ? (
                <p style={{ margin: "2px 0 8px", fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.5 }}>
                  Día de descanso. Si quieres entrenar este día, configúralo en la estrella Ejercicios.
                </p>
              ) : (
                plan.map((p) => {
                  const ex = byId[p.id];
                  if (!ex) return null;
                  const sess = sessions.find((s) => s.exercise_id === p.id && s.date === iso);
                  return (
                    <ExerciseRow key={p.id} ex={ex} sess={sess} date={iso}
                      readOnly={!canLog} onSaved={load} onProgress={() => setProgressOf(ex)} />
                  );
                })
              )}
            </Collapsible>
          );
        })
      )}
    </div>
  );
}

function ExerciseRow({ ex, sess, date, readOnly, onSaved, onProgress }) {
  const initial = sess
    ? sess.sets.map((s) => ({ reps: s.reps, weight: s.weight }))
    : [{ reps: "", weight: "" }, { reps: "", weight: "" }, { reps: "", weight: "" }];
  const [sets, setSets] = useState(initial);
  const [feelings, setFeelings] = useState(sess ? sess.feelings : "");
  const [tip, setTip] = useState(null);
  const [deload, setDeload] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  const canSuggest = !sess && !readOnly;
  useEffect(() => {
    if (!canSuggest) return;
    api.nextSet(ex.id).then(setTip).catch(() => setTip(null));
    api.deload(ex.id).then(setDeload).catch(() => setDeload(null));
  }, [ex.id, canSuggest]);

  function setField(i, field, val) {
    setSets((prev) => prev.map((s, j) => (j === i ? { ...s, [field]: val } : s)));
  }
  function applySuggestion() {
    if (!tip?.suggestion) return;
    const { weight, reps } = tip.suggestion;
    setSets([{ reps, weight }, { reps, weight }, { reps, weight }]);
  }

  async function save() {
    const payload = {
      exercise_id: ex.id, date, feelings,
      sets: sets.map((s, idx) => ({ set_number: idx + 1, reps: parseInt(s.reps) || 0, weight: parseFloat(s.weight) || 0 })),
    };
    const res = await api.createSession(payload);
    if (res?.new_record) {
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
      setCelebrate({ exercise: res.exercise_name || ex.name, oneRm: res.record_1rm });
    } else { onSaved(); }
  }

  return (
    <Collapsible title={ex.name}
      subtitle={sess ? `Hecho · máx ${Math.max(...sess.sets.map((s) => s.weight))}kg` : readOnly ? "Planificado" : "Sin registrar"}
      accent={sess ? C.olive : C.paperEdge}>
      <Celebration show={!!celebrate} exercise={celebrate?.exercise} oneRm={celebrate?.oneRm}
        onClose={() => { setCelebrate(null); onSaved(); }} />

      {canSuggest && tip?.has_history && tip.suggestion && (
        <div style={{ background: "rgba(166,116,30,0.10)", borderRadius: 10, padding: "12px 14px",
          marginBottom: 14, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: GRAD.gold }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <Sparkles size={13} color={C.olive} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase",
              fontWeight: 700, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Sugerencia de hoy
            </span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.sepiaInk, fontWeight: 600, marginBottom: 2 }}>
            {tip.suggestion.weight} kg × {tip.suggestion.reps} reps
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginBottom: 10 }}>
            {tip.suggestion.reason} · La última vez: {tip.last.weight}kg × {tip.last.reps}
          </div>
          <button onClick={applySuggestion} style={{ background: GRAD.gold, color: C.cream, border: "none",
            borderRadius: 8, padding: "8px 14px", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600,
            cursor: "pointer", boxShadow: GLOW.gold }}>Usar esta sugerencia</button>
        </div>
      )}

      {canSuggest && deload?.suggest_deload && (
        <div style={{ background: "rgba(127,213,232,0.08)", borderRadius: 10, padding: "12px 14px",
          marginBottom: 14, borderLeft: `3px solid ${C.rust}` }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase",
            fontWeight: 700, color: C.rust, marginBottom: 5 }}>Quizá toca descargar</div>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, lineHeight: 1.5 }}>
            {deload.message} Prueba bajar a unos {deload.suggested_weight}kg esta semana.
          </p>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        {sets.map((s, j) => (
          <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 58, fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.sepia }}>Serie {j + 1}</div>
            <div style={{ flex: 1, display: "flex", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <input value={s.reps} onChange={(e) => setField(j, "reps", e.target.value)} readOnly={!!sess || readOnly} placeholder="–" style={inputData} />
                <span style={unitLabel}>reps</span>
              </div>
              <div style={{ flex: 1 }}>
                <input value={s.weight} onChange={(e) => setField(j, "weight", e.target.value)} readOnly={!!sess || readOnly} placeholder="–" style={inputData} />
                <span style={unitLabel}>kg</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Field label="Sensaciones" value={feelings} onChange={(e) => setFeelings(e.target.value)}
        readOnly={!!sess || readOnly} multiline placeholder="¿Cómo te has sentido en este ejercicio?" />

      {ex.notes && (
        <div style={{ background: "rgba(232,184,75,0.08)", borderRadius: 8, padding: "11px 13px", borderLeft: `3px solid ${C.olive}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <NotebookPen size={13} color={C.olive} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: C.olive, fontWeight: 600 }}>Notas de ejecución</span>
          </div>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk, lineHeight: 1.55 }}>{ex.notes}</p>
        </div>
      )}

      {!sess && !readOnly && <PlateCalc sets={sets} />}
      {!sess && !readOnly && <RestTimer />}
      {!sess && !readOnly && <div style={{ marginBottom: 12 }}><SolidBtn label="Guardar series" onClick={save} /></div>}

      <button onClick={onProgress} style={{ display: "inline-flex", alignItems: "center", gap: 7,
        background: C.inkSoft, color: C.sepiaInk, border: `1px solid ${C.paperEdge}`, borderRadius: 999, padding: "9px 15px",
        fontFamily: FONT_BODY, fontSize: 12.5, cursor: "pointer" }}>
        <TrendingUp size={14} /> Ver progreso
      </button>
    </Collapsible>
  );
}

function Progress({ ex, onBack }) {
  const [metric, setMetric] = useState("max");
  const [data, setData] = useState(null);

  useEffect(() => { api.exerciseProgress(ex.id).then(setData).catch(() => setData({ points: [] })); }, [ex.id]);
  if (!data) return <Loading />;

  const chart = data.points.map((p) => ({ fecha: fmtShort(p.date), valor: p[metric] }));
  const unit = metric === "volume" ? "kg·reps" : "kg";
  const mlabel = { max: "Peso máximo", avg: "Peso medio", volume: "Volumen total" }[metric];

  return (
    <div>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none",
        border: "none", color: C.sepia, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, marginBottom: 14, padding: 0 }}>
        <ArrowLeft size={16} /> Volver a la semana
      </button>
      <SectionHeader kicker="Progreso" title={ex.name} />

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["max", "Máximo"], ["avg", "Medio"], ["volume", "Volumen"]].map(([k, l]) => (
          <button key={k} onClick={() => setMetric(k)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer",
            fontFamily: FONT_BODY, fontSize: 12.5, background: metric === k ? C.olive : C.inkSoft,
            color: metric === k ? "#0B1B33" : C.sepia, border: `1px solid ${metric === k ? C.olive : C.paperEdge}`,
            fontWeight: metric === k ? 700 : 400 }}>{l}</button>
        ))}
      </div>

      {chart.length === 0 ? (
        <Empty text="Aún no hay sesiones de este ejercicio. Registra alguna y verás aquí tu progreso." />
      ) : (
        <div style={{ background: C.paper, borderRadius: 14, padding: "16px 12px 12px", border: `1px solid ${C.paperEdge}` }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, marginBottom: 10, paddingLeft: 6 }}>{mlabel} ({unit}) · {chart.length} sesiones</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chart} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={C.paperEdge} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: C.sepia }} stroke={C.paperEdge} />
              <YAxis tick={{ fontSize: 11, fill: C.sepia }} stroke={C.paperEdge} />
              <Tooltip contentStyle={{ background: C.inkSoft, border: "none", borderRadius: 8, fontSize: 12, color: C.sepiaInk }} labelStyle={{ color: C.oliveSoft }} />
              <Line type="monotone" dataKey="valor" stroke={C.olive} strokeWidth={2.5} dot={{ fill: C.olive, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const navArrow = { background: "transparent", border: "none", color: C.sepiaInk, cursor: "pointer", padding: 8, display: "flex", alignItems: "center" };
const inputData = { width: "100%", boxSizing: "border-box", background: C.inkSoft, border: `1px solid ${C.paperEdge}`,
  borderRadius: 8, padding: "9px 11px", fontFamily: FONT_BODY, fontSize: 16, color: C.sepiaInk, textAlign: "center", fontWeight: 600 };
const unitLabel = { display: "block", textAlign: "center", fontFamily: FONT_BODY, fontSize: 10, color: C.sepia, marginTop: 3, letterSpacing: ".05em", textTransform: "uppercase" };

/* RestTimer — el descanso entre series, medido. */
function RestTimer() {
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => {
      const next = left - 1;
      setLeft(next);
      if (next === 0 && navigator.vibrate) navigator.vibrate([80, 60, 80]);
    }, 1000);
    return () => clearTimeout(t);
  }, [left]);

  const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const running = left > 0;
  const done = total > 0 && left === 0;

  return (
    <div style={{ background: C.inkSoft, border: `1px solid ${running ? C.olive : C.paperEdge}`,
      borderRadius: 10, padding: "11px 14px", marginBottom: 14,
      animation: running ? "pulseGold 2s ease infinite" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: running || done ? 10 : 0 }}>
        <Timer size={14} color={running ? C.olive : C.sepia} />
        <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em",
          textTransform: "uppercase", color: running ? C.olive : C.sepia, fontWeight: 600, flex: 1 }}>
          {running ? "Descansando" : done ? "¡A por la siguiente!" : "Descanso entre series"}
        </span>
        {running && (
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.sepiaInk }}>{mmss(left)}</span>
        )}
      </div>
      {running ? (
        <>
          <div style={{ height: 5, background: C.paperEdge, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${(left / total) * 100}%`, height: "100%", background: GRAD.gold,
              transition: "width 1s linear" }} />
          </div>
          <button onClick={() => { setLeft(0); setTotal(0); }} style={{ background: "none", border: "none",
            color: C.sepia, fontFamily: FONT_BODY, fontSize: 11.5, cursor: "pointer", padding: "8px 0 0" }}>Cancelar</button>
        </>
      ) : (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[60, 90, 120, 180].map((n) => (
            <button key={n} onClick={() => { setTotal(n); setLeft(n); }} style={{ flex: 1, padding: "8px 0",
              borderRadius: 8, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600,
              background: C.paper, color: C.sepiaInk, border: `1px solid ${C.paperEdge}` }}>{mmss(n)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* PlateCalc — qué discos poner a cada lado de una barra de 20kg. */
function PlateCalc({ sets }) {
  const target = Math.max(...sets.map((s) => parseFloat(s.weight) || 0));
  if (!target || target <= 20) return null;
  const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
  let perSide = (target - 20) / 2;
  const used = [];
  for (const p of PLATES) {
    while (perSide >= p - 1e-9) { used.push(p); perSide -= p; }
  }
  const exact = perSide < 1e-9;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.inkSoft,
      border: `1px solid ${C.paperEdge}`, borderRadius: 10, padding: "9px 13px", marginBottom: 12 }}>
      <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em",
        textTransform: "uppercase", color: C.sepia, fontWeight: 600, flexShrink: 0 }}>Discos por lado</span>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
        {used.length === 0 ? (
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia }}>solo la barra</span>
        ) : used.map((p, i) => (
          <span key={i} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700,
            background: p >= 15 ? GRAD.gold : C.paper, color: p >= 15 ? "#0B1B33" : C.sepiaInk,
            border: p >= 15 ? "none" : `1px solid ${C.paperEdge}`, borderRadius: 6, padding: "3px 8px" }}>{p}</span>
        ))}
        {!exact && <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.rust, alignSelf: "center" }}>≈ (barra 20kg)</span>}
      </div>
    </div>
  );
}
