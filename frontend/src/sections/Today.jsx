/*
 * sections/Today.jsx
 * ──────────────────
 * La pantalla de inicio. Reúne en un vistazo lo que importa hoy:
 *  - saludo según la hora
 *  - hábitos de hoy con su estado
 *  - un destello del pasado (una nota antigua que reaparece)
 *  - acceso rápido a la revisión si es domingo
 * Lee de varios módulos a la vez; cada bloque falla en silencio si su API no responde.
 */
import React, { useEffect, useState } from "react";
import { Check, Quote, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Loading } from "../components/ui";
import { HelpDot } from "../components/Help";

const todayStr = () => new Date().toISOString().slice(0, 10);

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default function Today({ onNavigate }) {
  const [habits, setHabits] = useState(null);
  const [spark, setSpark] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    // Hábitos + estado de hoy
    try {
      const tasks = await api.listDailyTasks();
      const enriched = await Promise.all(tasks.map(async (t) => {
        const comps = await api.listCompletions(t.id);
        return { ...t, doneToday: comps.some((c) => c.date === todayStr() && c.done) };
      }));
      setHabits(enriched);
    } catch { setHabits([]); }
    // Un destello del pasado al azar
    try {
      const notes = await api.listNotes();
      if (notes.length) setSpark(notes[Math.floor(Math.random() * notes.length)]);
    } catch { /* sin destellos, no pasa nada */ }
    // Resumen de la semana (solo si es fin de semana, para no recargar a diario)
    try {
      const day = new Date().getDay();
      if (day === 0 || day === 6) {
        const s = await api.weekSummary();
        if (s?.summary) setSummary(s);
      }
    } catch { /* sin resumen, no pasa nada */ }
  }

  async function toggleHabit(t) {
    await api.completeDailyTask(t.id, { date: todayStr(), done: !t.doneToday });
    load();
  }

  const isSunday = new Date().getDay() === 0;
  const doneCount = habits ? habits.filter((h) => h.doneToday).length : 0;

  if (habits === null) return (<><SectionHeader kicker="Tu cuaderno" title="Hoy" /><Loading /></>);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: C.sepiaInk, fontWeight: 600, margin: 0 }}>{greeting()}</h1>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, marginTop: 4 }}>Esto es lo que importa hoy.</p>
      </div>

      {/* Resumen de la semana (fines de semana) */}
      {summary && (
        <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`,
          padding: "16px 18px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: GRAD.gold }} />
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase",
            fontWeight: 600, marginBottom: 8, background: GRAD.gold, WebkitBackgroundClip: "text",
            backgroundClip: "text", color: "transparent", width: "fit-content" }}>
            Tu semana{" "}<HelpDot topic="weekly_summary" size={13} />
          </div>
          <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 17, color: C.sepiaInk, lineHeight: 1.6 }}>{summary.summary}</p>
        </div>
      )}

      {/* Ritual de domingo */}
      {isSunday && (
        <button onClick={() => onNavigate?.("reviews")} style={{ width: "100%", textAlign: "left",
          background: GRAD.gold, border: "none", borderRadius: 14, padding: "16px 18px", marginBottom: 16,
          boxShadow: GLOW.gold, cursor: "pointer" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
            color: C.cream, fontWeight: 700, opacity: .8 }}>Es domingo</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.cream, fontWeight: 600, marginTop: 2 }}>Cierra tu semana →</div>
        </button>
      )}

      {/* Hábitos de hoy */}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
        marginBottom: 10, fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text",
        backgroundClip: "text", color: "transparent", width: "fit-content" }}>
        Hábitos de hoy · {doneCount}/{habits.length}
      </div>
      {habits.length === 0 ? (
        <button onClick={() => onNavigate?.("daily")} style={emptyCard}>
          Aún no tienes hábitos. Crea el primero →
        </button>
      ) : (
        <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`, padding: "4px 16px", marginBottom: 22 }}>
          {habits.map((t, i) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0",
              borderBottom: i < habits.length - 1 ? `1px solid ${C.paperEdge}` : "none" }}>
              <button onClick={() => toggleHabit(t)} style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                background: t.doneToday ? GRAD.gold : "transparent",
                boxShadow: t.doneToday ? GLOW.gold : "none",
                outline: t.doneToday ? "none" : `2px solid ${C.sepia}`, outlineOffset: -2 }}>
                {t.doneToday && <Check size={14} color={C.cream} strokeWidth={3} />}
              </button>
              <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk }}>{t.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Destello del pasado */}
      {spark && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <Sparkles size={13} color={C.olive} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
              fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Un destello del pasado{" "}<HelpDot topic="flashback" size={13} />
            </span>
          </div>
          <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`, padding: "16px 18px" }}>
            <Quote size={16} color={C.oliveSoft} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16, color: C.sepiaInk, lineHeight: 1.55, fontStyle: "italic" }}>{spark.content}</p>
            <span style={{ display: "block", marginTop: 10, fontFamily: FONT_BODY, fontSize: 11, color: C.sepia }}>
              {new Date(spark.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

const emptyCard = { display: "block", width: "100%", textAlign: "left", background: C.paper,
  border: `1px dashed ${C.sepia}`, borderRadius: 14, padding: "16px 18px", marginBottom: 22,
  fontFamily: FONT_BODY, fontSize: 14, color: C.sepia, cursor: "pointer" };
