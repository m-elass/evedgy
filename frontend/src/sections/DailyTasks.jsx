/*
 * sections/DailyTasks.jsx
 * ───────────────────────
 * Habitos recurrentes. Cada uno se marca para HOY (completeDailyTask, upsert).
 * La racha se calcula contando dias consecutivos hacia atras con done=true,
 * usando el historial de completados (listCompletions).
 */
import React, { useEffect, useState } from "react";
import { Check, Flame, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_BODY } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";
import { HelpDot } from "../components/Help";

const todayStr = () => new Date().toISOString().slice(0, 10);

// Calcula la racha: dias seguidos terminados en hoy (o ayer) con done=true
function streakFrom(completions) {
  const done = new Set(completions.filter((c) => c.done).map((c) => c.date));
  let streak = 0;
  let d = new Date();
  // Si hoy no esta hecho, la racha puede venir de ayer; empezamos por hoy igual
  for (let i = 0; i < 400; i++) {
    const key = d.toISOString().slice(0, 10);
    if (done.has(key)) { streak++; d.setDate(d.getDate() - 1); }
    else if (i === 0) { d.setDate(d.getDate() - 1); } // permite que hoy aun no este hecho
    else break;
  }
  return streak;
}

export default function DailyTasks() {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const tasks = await api.listDailyTasks();
      // Para cada habito, traemos sus completados para saber racha y estado de hoy
      const enriched = await Promise.all(tasks.map(async (t) => {
        const comps = await api.listCompletions(t.id);
        const doneToday = comps.some((c) => c.date === todayStr() && c.done);
        return { ...t, streak: streakFrom(comps), doneToday };
      }));
      setItems(enriched);
    } catch { setItems([]); }
  }
  async function create() {
    if (!title.trim()) return;
    await api.createDailyTask({ title: title.trim() });
    setTitle(""); setAdding(false); load();
  }
  async function toggleToday(t) {
    await api.completeDailyTask(t.id, { date: todayStr(), done: !t.doneToday });
    load();
  }
  async function remove(id) { await api.deleteDailyTask(id); load(); }

  if (items === null) return (<><SectionHeader kicker="Hacer - Cada dia" title="Habitos diarios" /><Loading /></>);

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
          <button onClick={() => toggleToday(t)} style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0,
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
