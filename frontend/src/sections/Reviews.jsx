/*
 * sections/Reviews.jsx
 * ────────────────────
 * El ritual de cierre. Un guion en cuatro tiempos para no vivir en piloto
 * automático: qué hice, qué aprendí, qué suelto, qué siembro.
 */
import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

const todayStr = () => new Date().toISOString().slice(0, 10);

const PROMPTS = [
  { key: "did", label: "Qué hice", ph: "Lo que ocurrió, lo que logré y lo que no." },
  { key: "learned", label: "Qué aprendí", ph: "Una lección, un patrón, algo que ahora veo distinto." },
  { key: "release", label: "Qué suelto", ph: "Lo que dejo atrás: una carga, una prisa, un rencor." },
  { key: "seed", label: "Qué siembro", ph: "La intención para el próximo ciclo." },
];

export default function Reviews() {
  const [items, setItems] = useState(null);
  const [writing, setWriting] = useState(false);
  const [period, setPeriod] = useState("semanal");
  const [form, setForm] = useState({ did: "", learned: "", release: "", seed: "" });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await api.listReviews()); } catch { setItems([]); }
  }
  async function save() {
    await api.createReview({ period, date: todayStr(), ...form });
    setForm({ did: "", learned: "", release: "", seed: "" }); setWriting(false); load();
  }
  async function remove(id) { await api.deleteReview(id); load(); }

  if (items === null) return (<><SectionHeader kicker="Vida · Ritual" title="Revisión" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Vida · Ritual" title="Revisión" />

      {writing ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 18, marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["semanal", "mensual"].map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, padding: "9px 0", borderRadius: 8,
                cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, textTransform: "capitalize",
                background: period === p ? GRAD.gold : C.inkSoft, color: period === p ? C.cream : C.sepia,
                border: `1px solid ${period === p ? "transparent" : C.paperEdge}`, fontWeight: period === p ? 600 : 400 }}>{p}</button>
            ))}
          </div>
          {PROMPTS.map((p) => (
            <Field key={p.key} label={p.label} value={form[p.key]} multiline placeholder={p.ph}
              onChange={(e) => setForm({ ...form, [p.key]: e.target.value })} />
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Cerrar el ciclo" onClick={save} />
            <button onClick={() => setWriting(false)} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}><AddBtn label="Nueva revisión" onClick={() => setWriting(true)} /></div>
      )}

      {items.length === 0 && !writing && (
        <Empty text="Aún no has cerrado ningún ciclo. La revisión es el hábito que ordena todos los demás." />
      )}

      {items.map((r) => (
        <div key={r.id} style={{ background: C.paper, borderRadius: 12, padding: "16px 18px", marginBottom: 12, border: `1px solid ${C.paperEdge}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.sepiaInk, fontWeight: 600, textTransform: "capitalize" }}>
              {r.period} · {new Date(r.date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
            </span>
            <button onClick={() => remove(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar">
              <Trash2 size={15} />
            </button>
          </div>
          {PROMPTS.map((p) => r[p.key] && (
            <div key={p.key} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase",
                fontWeight: 600, marginBottom: 3, background: GRAD.gold, WebkitBackgroundClip: "text",
                backgroundClip: "text", color: "transparent", width: "fit-content" }}>{p.label}</div>
              <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk, lineHeight: 1.5 }}>{r[p.key]}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
