/*
 * sections/Readings.jsx
 * ─────────────────────
 * Lecturas con cosecha. No guardas el libro, guardas lo que EXTRAES de él:
 * frases, ideas, desacuerdos. Cada lectura tiene un estado (por leer / leyendo /
 * leído) y sus cosechas dentro. La biblioteca de lo que te llevaste, no de lo que tienes.
 */
import React, { useEffect, useState } from "react";
import { Trash2, BookText, Quote, Lightbulb, MessageCircleWarning } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { SectionHeader, Collapsible, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

const STATUSES = [["por_leer", "Por leer"], ["leyendo", "Leyendo"], ["leido", "Leído"]];
const KINDS = [["frase", "Frase", Quote], ["idea", "Idea", Lightbulb], ["desacuerdo", "Desacuerdo", MessageCircleWarning]];

export default function Readings() {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await api.listReadings()); } catch { setItems([]); }
  }
  async function create() {
    if (!title.trim()) return;
    await api.createReading({ title: title.trim(), author: author.trim(), status: "leyendo" });
    setTitle(""); setAuthor(""); setAdding(false); load();
  }

  if (items === null) return (<><SectionHeader kicker="Mente · Cosecha" title="Lecturas" /><Loading /></>);

  const totalHarvests = items.reduce((a, r) => a + r.harvests.length, 0);

  return (
    <div>
      <SectionHeader kicker="Mente · Cosecha" title="Lecturas" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 18 }}>
        No guardas el libro, guardas lo que te llevaste de él. {totalHarvests > 0 && `${totalHarvests} ideas cosechadas hasta ahora.`}
      </p>

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, marginBottom: 14, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meditaciones" />
          <Field label="Autor (opcional)" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Marco Aurelio" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Añadir" onClick={create} />
            <button onClick={() => { setAdding(false); setTitle(""); setAuthor(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Nueva lectura" onClick={() => setAdding(true)} /></div>
      )}

      {items.length === 0 && !adding && (
        <Empty text="Aún no hay lecturas. Añade lo que estés leyendo y cosecha sus mejores ideas." />
      )}

      {items.map((r) => <ReadingCard key={r.id} r={r} onChanged={load} />)}
    </div>
  );
}

function ReadingCard({ r, onChanged }) {
  const [harvesting, setHarvesting] = useState(false);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState("idea");

  async function addHarvest() {
    if (!content.trim()) return;
    await api.addHarvest(r.id, { content: content.trim(), kind });
    setContent(""); setHarvesting(false); onChanged();
  }
  async function removeHarvest(hid) { await api.deleteHarvest(hid); onChanged(); }
  async function setStatus(s) { await api.updateReading(r.id, { status: s }); onChanged(); }
  async function remove() { await api.deleteReading(r.id); onChanged(); }

  const statusLabel = STATUSES.find(([k]) => k === r.status)?.[1] || r.status;
  const subtitle = `${r.author ? r.author + " · " : ""}${statusLabel} · ${r.harvests.length} cosecha${r.harvests.length === 1 ? "" : "s"}`;

  return (
    <Collapsible title={r.title} subtitle={subtitle} accent={r.status === "leido" ? C.olive : C.paperEdge}>
      {/* Estado */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {STATUSES.map(([k, lab]) => (
          <button key={k} onClick={() => setStatus(k)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, cursor: "pointer",
            fontFamily: FONT_BODY, fontSize: 12, background: r.status === k ? GRAD.gold : C.inkSoft,
            color: r.status === k ? C.cream : C.sepia, border: `1px solid ${r.status === k ? "transparent" : C.paperEdge}`,
            fontWeight: r.status === k ? 600 : 400 }}>{lab}</button>
        ))}
      </div>

      {/* Cosechas */}
      {r.harvests.map((h) => {
        const KindIcon = KINDS.find(([k]) => k === h.kind)?.[2] || Lightbulb;
        return (
          <div key={h.id} style={{ display: "flex", gap: 10, borderRadius: 8,
            padding: "11px 13px", marginBottom: 8, alignItems: "flex-start",
            background: "rgba(127,213,232,0.06)" }}>
            <KindIcon size={15} color={C.rust} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ flex: 1, margin: 0, fontFamily: FONT_DISPLAY, fontSize: 15, color: C.sepiaInk,
              lineHeight: 1.5, fontStyle: h.kind === "frase" ? "italic" : "normal" }}>{h.content}</p>
            <button onClick={() => removeHarvest(h.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 2, flexShrink: 0 }} aria-label="Borrar cosecha">
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}

      {/* Añadir cosecha */}
      {harvesting ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {KINDS.map(([k, lab, Icon]) => (
              <button key={k} onClick={() => setKind(k)} style={{ flex: 1, display: "flex", alignItems: "center",
                justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 7, cursor: "pointer",
                fontFamily: FONT_BODY, fontSize: 12, background: kind === k ? C.paper : C.inkSoft,
                color: kind === k ? C.sepiaInk : C.sepia, border: `1px solid ${kind === k ? C.rust : C.paperEdge}` }}>
                <Icon size={13} /> {lab}
              </button>
            ))}
          </div>
          <Field value={content} onChange={(e) => setContent(e.target.value)} multiline
            placeholder={kind === "frase" ? "Una frase que quieras conservar…" : kind === "desacuerdo" ? "Algo con lo que no estás de acuerdo…" : "Una idea que te llevas…"} />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Cosechar" onClick={addHarvest} />
            <button onClick={() => setHarvesting(false)} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <SolidBtn label="Cosechar una idea" onClick={() => setHarvesting(true)} />
          <button onClick={remove} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar lectura">
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </Collapsible>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
