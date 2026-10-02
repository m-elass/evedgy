/*
 * sections/DailyTasks.jsx
 * ───────────────────────
 * Habitos recurrentes. Cada uno se marca para HOY (completeDailyTask, upsert).
 * La racha se calcula contando dias consecutivos hacia atras con done=true,
 * usando el historial de completados (listCompletions).
 */
import React, { useState } from "react";
import { Check, Flame, Trash2 } from "lucide-react";
import { api, ymd } from "../lib/api";
import { useApi, useFijarCache, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { C, FONT_BODY } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Empty } from "../components/ui";
import { HelpDot } from "../components/Help";

export default function DailyTasks() {
  const hoy = ymd();
  // Hábitos con su estado de hoy y su racha, ya calculados en el servidor
  const { data: base, gate } = useApi("daily", api.dailyToday, { params: [hoy] });
  const [pend, setPend] = useState({});
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const fijar = useFijarCache();
  const refrescar = useRefrescar();

  async function create() {
    if (!title.trim()) return;
    await api.createDailyTask({ title: title.trim() });
    setTitle(""); setAdding(false); refrescar("daily", "today");
  }
  async function toggleToday(t) {
    if (pend[t.id] !== undefined) return;
    const nuevo = !t.doneToday;
    setPend((p) => ({ ...p, [t.id]: nuevo }));
    try {
      await api.completeDailyTask(t.id, { date: hoy, done: nuevo });
      fijar("daily", [hoy], (d) => d && d.map((x) => (x.id === t.id ? { ...x, done_today: nuevo } : x)));
      refrescar("daily", "today");
    } catch (e) {
      avisar(e?.humano || "No se pudo marcar el hábito.");
    } finally {
      setPend((p) => { const r = { ...p }; delete r[t.id]; return r; });
    }
  }
  async function remove(id) { await api.deleteDailyTask(id); refrescar("daily", "today"); }

  if (gate) return (<><SectionHeader kicker="Hacer - Cada dia" title="Habitos diarios" />{gate}</>);
  const items = base.map((t) => ({ ...t, doneToday: pend[t.id] !== undefined ? pend[t.id] : t.done_today }));

  return (
    <div>
      <SectionHeader kicker="Hacer - Cada dia" title="Habitos diarios" />

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 10, padding: 16, marginBottom: 14, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Nuevo habito" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Beber 2L de agua" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Crear" onClick={create} />
            <button onClick={() => { setAdding(false); setTitle(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Nuevo habito" onClick={() => setAdding(true)} /></div>
      )}

      {items.length === 0 && !adding && <Empty text="Sin habitos todavia. Crea uno y marcalo cada dia para construir tu racha." />}

      {items.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, background: C.paper,
          borderRadius: 10, padding: "14px 16px", marginBottom: 10, border: `1px solid ${C.paperEdge}` }}>
          <button onClick={() => toggleToday(t)} data-estrella={t.doneToday ? "hecho" : "marcar"} style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: t.doneToday ? C.olive : "transparent", border: `2px solid ${t.doneToday ? C.olive : C.sepia}`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Marcar hoy">
            {t.doneToday && <Check size={16} color={C.cream} strokeWidth={3} />}
          </button>
          <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk }}>{t.title}</span>
          {t.streak > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.rust }}>
              <Flame size={14} />
              <HelpDot topic="streak" size={12} label="¿Cómo funciona la racha?" />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600 }}>{t.streak}</span>
            </div>
          )}
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar habito">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
