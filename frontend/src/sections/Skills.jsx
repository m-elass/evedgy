/*
 * sections/Skills.jsx
 * ───────────────────
 * Aprendizajes que cultivas (idioma, instrumento, disciplina). Cada uno con su
 * nivel (0-100), registro de práctica (fecha + minutos + nota) y minutos totales.
 */
import React, { useEffect, useState } from "react";
import { Trash2, Clock } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Collapsible, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Skills() {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const skills = await api.listSkills();
      const enriched = await Promise.all(skills.map(async (s) => {
        const logs = await api.listSkillLogs(s.id);
        const totalMin = logs.reduce((a, l) => a + l.minutes, 0);
        return { ...s, logs, totalMin };
      }));
      setItems(enriched);
    } catch { setItems([]); }
  }
  async function create() {
    if (!name.trim()) return;
    await api.createSkill({ name: name.trim(), description: desc.trim() });
    setName(""); setDesc(""); setAdding(false); load();
  }

  if (items === null) return (<><SectionHeader kicker="Vida · Cultivo" title="Aprendizajes" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Vida · Cultivo" title="Aprendizajes" />

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Qué quieres cultivar" value={name} onChange={(e) => setName(e.target.value)} placeholder="Piano" />
          <Field label="Detalle (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Repertorio clásico" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Crear" onClick={create} />
            <button onClick={() => { setAdding(false); setName(""); setDesc(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Nuevo aprendizaje" onClick={() => setAdding(true)} /></div>
      )}

      {items.length === 0 && !adding && <Empty text="Sin aprendizajes activos. Elige algo que quieras dominar y riégalo cada día." />}

      {items.map((s) => <SkillCard key={s.id} s={s} onChanged={load} />)}
    </div>
  );
}

function SkillCard({ s, onChanged }) {
  const [logging, setLogging] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [level, setLevel] = useState(s.level);

  async function saveLog() {
    const m = parseInt(minutes) || 0;
    await api.logSkill(s.id, { date: todayStr(), minutes: m, note });
    setMinutes(""); setNote(""); setLogging(false); onChanged();
  }
  async function bumpLevel(delta) {
    const next = Math.max(0, Math.min(100, level + delta));
    setLevel(next);
    await api.updateSkill(s.id, { level: next });
    onChanged();
  }
  async function remove() { await api.deleteSkill(s.id); onChanged(); }

  const hours = Math.floor(s.totalMin / 60);
  const mins = s.totalMin % 60;
  const subtitle = `Nivel ${s.level} · ${hours}h ${mins}m practicadas`;

  return (
    <Collapsible title={s.name} subtitle={subtitle} accent={C.olive}>
      {s.description && <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, marginBottom: 14 }}>{s.description}</p>}

      {/* Barra de nivel */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ height: 10, background: C.paperEdge, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ width: `${level}%`, height: "100%", background: GRAD.gold, boxShadow: GLOW.gold }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => bumpLevel(-5)} style={levelBtn}>−5</button>
        <button onClick={() => bumpLevel(5)} style={levelBtn}>+5</button>
        <span style={{ marginLeft: "auto", fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, alignSelf: "center" }}>Nivel {level}/100</span>
      </div>

      {logging ? (
        <div>
          <Field label="Minutos practicados" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="45" />
          <Field label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escalas, estudio nº3…" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Guardar práctica" onClick={saveLog} />
            <button onClick={() => setLogging(false)} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SolidBtn label="Registrar práctica" onClick={() => setLogging(true)} />
          <button onClick={remove} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar">
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {/* Últimas prácticas */}
      {s.logs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: C.sepia, marginBottom: 8 }}>Últimas prácticas</div>
          {s.logs.slice(0, 3).map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Clock size={12} color={C.sepia} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia }}>
                {new Date(l.date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · {l.minutes} min{l.note ? ` · ${l.note}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
const levelBtn = { background: C.inkSoft, color: C.sepiaInk, border: `1px solid ${C.paperEdge}`, borderRadius: 7, padding: "7px 14px", fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", fontWeight: 600 };
