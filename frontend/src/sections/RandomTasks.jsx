/*
 * sections/RandomTasks.jsx
 * ────────────────────────
 * Tareas sueltas de accion. Mismo patron que Notes: cargar / crear / actualizar / borrar.
 * Aqui ademas se marca hecha (patch con done) y se tacha visualmente.
 */
import React, { useEffect, useState } from "react";
import { Check, Circle, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_BODY } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

export default function RandomTasks() {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await api.listRandomTasks()); } catch { setItems([]); }
  }
  async function create() {
    if (!draft.trim()) return;
    await api.createRandomTask({ content: draft.trim() });
    setDraft(""); setAdding(false); load();
  }
  async function toggle(t) {
    await api.updateRandomTask(t.id, { done: !t.done });
    load();
  }
  async function remove(id) { await api.deleteRandomTask(id); load(); }

  if (items === null) return (<><SectionHeader kicker="Hacer - Ocurrencias" title="Tareas sueltas" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Hacer - Ocurrencias" title="Tareas sueltas" />

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 10, padding: 16, marginBottom: 14, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Nueva tarea" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Algo que se te ha ocurrido hacer…" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Apuntar" onClick={create} />
            <button onClick={() => { setAdding(false); setDraft(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Apuntar tarea" onClick={() => setAdding(true)} /></div>
      )}

      {items.length === 0 && !adding && <Empty text="Sin tareas pendientes. Cuando se te ocurra algo, apuntalo aqui." />}

      {items.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 13, background: C.paper,
          borderRadius: 10, padding: "13px 16px", marginBottom: 9, border: `1px solid ${C.paperEdge}`,
          opacity: t.done ? 0.55 : 1 }}>
          <button onClick={() => toggle(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            {t.done ? <Check size={19} color={C.olive} strokeWidth={2.5} /> : <Circle size={19} color={C.sepia} />}
          </button>
          <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk,
            textDecoration: t.done ? "line-through" : "none" }}>{t.content}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar tarea">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
