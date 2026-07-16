/*
 * sections/Goals.jsx
 * ──────────────────
 * Objetivos y visiones futuras. Se crean como "pendiente" y se revisan luego.
 * Al marcar cumplido/no cumplido, el backend sella la fecha de revision.
 */
import React, { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

export default function Goals() {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await api.listGoals()); } catch { setItems([]); }
  }
  async function create() {
    if (!desc.trim()) return;
    await api.createGoal({ description: desc.trim(), target_date: target || null });
    setDesc(""); setTarget(""); setAdding(false); load();
  }
  async function setStatus(g, status) {
    await api.updateGoal(g.id, { status });
    load();
  }
  async function remove(id) { await api.deleteGoal(id); load(); }

  if (items === null) return (<><SectionHeader kicker="Futuro - Vision" title="Objetivos" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Futuro - Vision" title="Objetivos" />

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 10, padding: 16, marginBottom: 14, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Objetivo" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Press banca a 80kg" />
          <Field label="Para cuando (opcional)" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="2026-09-01" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Crear" onClick={create} />
            <button onClick={() => { setAdding(false); setDesc(""); setTarget(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Nueva vision" onClick={() => setAdding(true)} /></div>
      )}

      {items.length === 0 && !adding && <Empty text="Sin objetivos aun. Escribe una vision a futuro y revisala con el tiempo." />}

      {items.map((g) => {
        const done = g.status === "cumplido";
        return (
          <div key={g.id} style={{ background: C.paper, borderRadius: 10, padding: "16px 18px",
            marginBottom: 11, border: `1px solid ${C.paperEdge}`,
            borderLeft: `4px solid ${done ? C.olive : C.paperEdge}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <button onClick={() => setStatus(g, done ? "pendiente" : "cumplido")}
                style={{ background: done ? C.olive : "transparent", border: `2px solid ${done ? C.olive : C.sepia}`,
                  width: 24, height: 24, borderRadius: 24, flexShrink: 0, cursor: "pointer", marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Marcar cumplido">
                {done && <Check size={14} color={C.cream} strokeWidth={3} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16.5, color: C.sepiaInk, fontWeight: 600,
                  textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>{g.description}</div>
                {g.target_date && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 3 }}>Para {g.target_date}</div>}
              </div>
              <button onClick={() => remove(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar objetivo">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
