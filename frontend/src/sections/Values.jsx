/*
 * sections/Values.jsx
 * ───────────────────
 * Brújula de valores. Defines tus principios y, periódicamente, valoras del 1 al 5
 * cuánto los honraste. La media reciente te espeja sin juzgar.
 */
import React, { useEffect, useState } from "react";
import { Trash2, Compass } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { SectionHeader, Collapsible, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Values() {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const values = await api.listValues();
      const enriched = await Promise.all(values.map(async (v) => {
        const checkins = await api.listValueCheckins(v.id);
        const recent = checkins.slice(0, 4);
        const avg = recent.length ? (recent.reduce((a, c) => a + c.score, 0) / recent.length) : null;
        return { ...v, checkins, avg };
      }));
      setItems(enriched);
    } catch { setItems([]); }
  }
  async function create() {
    if (!title.trim()) return;
    await api.createValue({ title: title.trim(), description: desc.trim() });
    setTitle(""); setDesc(""); setAdding(false); load();
  }

  if (items === null) return (<><SectionHeader kicker="Vida · Brújula" title="Valores" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Vida · Brújula" title="Valores" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 18 }}>
        Tus principios. Valora cada cierto tiempo cuánto los honraste; no para juzgarte, para verte con claridad.
      </p>

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Valor" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Disciplina" />
          <Field label="Qué significa para ti" value={desc} onChange={(e) => setDesc(e.target.value)} multiline
            placeholder="Hacer lo que dije que haría, aunque no me apetezca." />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Crear" onClick={create} />
            <button onClick={() => { setAdding(false); setTitle(""); setDesc(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Nuevo valor" onClick={() => setAdding(true)} /></div>
      )}

      {items.length === 0 && !adding && <Empty text="Aún no has definido tus valores. Empieza por el que más te importe." />}

      {items.map((v) => <ValueCard key={v.id} v={v} onChanged={load} />)}
    </div>
  );
}

function ValueCard({ v, onChanged }) {
  const [score, setScore] = useState(4);
  const [note, setNote] = useState("");
  const [checking, setChecking] = useState(false);

  async function saveCheckin() {
    await api.valueCheckin(v.id, { date: todayStr(), score, note });
    setNote(""); setChecking(false); onChanged();
  }
  async function remove() { await api.deleteValue(v.id); onChanged(); }

  const subtitle = v.avg !== null
    ? `Honor reciente: ${v.avg.toFixed(1)}/5`
    : "Sin valoraciones aún";

  return (
    <Collapsible title={v.title} subtitle={subtitle} accent={C.olive}>
      {v.description && (
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: 15, color: C.sepiaInk, fontStyle: "italic",
          lineHeight: 1.5, marginBottom: 14 }}>{v.description}</p>
      )}

      {/* Barra de honor reciente */}
      {v.avg !== null && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 8, background: C.paperEdge, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ width: `${(v.avg / 5) * 100}%`, height: "100%", background: GRAD.gold }} />
          </div>
        </div>
      )}

      {checking ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase",
            color: C.sepia, marginBottom: 8 }}>¿Cuánto lo honraste?</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setScore(n)} style={{ flex: 1, padding: "10px 0", borderRadius: 8,
                cursor: "pointer", fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600,
                background: score === n ? GRAD.gold : C.inkSoft, color: score === n ? C.cream : C.sepia,
                border: `1px solid ${score === n ? "transparent" : C.paperEdge}` }}>{n}</button>
            ))}
          </div>
          <Field value={note} onChange={(e) => setNote(e.target.value)} placeholder="Una nota (opcional)" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Guardar valoración" onClick={saveCheckin} />
            <button onClick={() => setChecking(false)} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SolidBtn label="Valorar hoy" onClick={() => setChecking(true)} />
          <button onClick={remove} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar valor">
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </Collapsible>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
