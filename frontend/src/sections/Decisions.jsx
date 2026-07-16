/*
 * sections/Decisions.jsx
 * ──────────────────────
 * Decisiones razonadas. Registras una decisión importante con tu razonamiento
 * del momento y una fecha para revisarla. Cuando llega, la app te la devuelve
 * para que juzgues si acertaste. Entrenas tu propio criterio viendo tu historial.
 */
import React, { useEffect, useState } from "react";
import { Trash2, Scale, CheckCircle2, XCircle, CircleDot } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { SectionHeader, Collapsible, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

const todayStr = () => new Date().toISOString().slice(0, 10);
function fmt(iso) { return iso ? new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : ""; }

export default function Decisions() {
  const [items, setItems] = useState(null);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ title: "", context: "", reasoning: "", expected: "", decided_option: "", review_date: "" });

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await api.listDecisions()); } catch { setItems([]); }
  }
  async function create() {
    if (!form.title.trim()) return;
    await api.createDecision({ ...form, review_date: form.review_date || null });
    setForm({ title: "", context: "", reasoning: "", expected: "", decided_option: "", review_date: "" });
    setWriting(false); load();
  }

  if (items === null) return (<><SectionHeader kicker="Vida · Criterio" title="Decisiones" /><Loading /></>);

  // Decisiones cuya fecha de revisión ya llegó y aún sin revisar: las destacamos.
  const pendingReview = items.filter((d) => !d.reviewed_at && d.review_date && d.review_date <= todayStr());

  return (
    <div>
      <SectionHeader kicker="Vida · Criterio" title="Decisiones" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 18 }}>
        Registra tus decisiones con su porqué. Al revisarlas con el tiempo, aprendes cómo razonas y afinas tu criterio.
      </p>

      {pendingReview.length > 0 && (
        <div style={{ background: "rgba(166,116,30,0.10)", borderRadius: 10, padding: "11px 14px", marginBottom: 16,
          borderLeft: `3px solid ${C.olive}` }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk }}>
            Tienes {pendingReview.length} {pendingReview.length === 1 ? "decisión lista" : "decisiones listas"} para revisar.
          </span>
        </div>
      )}

      {writing ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 18, marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
          <Field label="La decisión" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="¿Cambio de trabajo?" />
          <Field label="Contexto" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} multiline placeholder="La situación tal como la veo hoy." />
          <Field label="Qué decidí" value={form.decided_option} onChange={(e) => setForm({ ...form, decided_option: e.target.value })} placeholder="Aceptar la oferta" />
          <Field label="Mi razonamiento" value={form.reasoning} onChange={(e) => setForm({ ...form, reasoning: e.target.value })} multiline placeholder="Por qué decido esto." />
          <Field label="Qué espero que pase" value={form.expected} onChange={(e) => setForm({ ...form, expected: e.target.value })} multiline placeholder="El resultado que anticipo." />
          <Field label="Revisar el" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} placeholder="2026-12-01" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Guardar decisión" onClick={create} />
            <button onClick={() => setWriting(false)} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}><AddBtn label="Nueva decisión" onClick={() => setWriting(true)} /></div>
      )}

      {items.length === 0 && !writing && (
        <Empty text="Aún no has registrado decisiones. La próxima vez que dudes mucho, anótala aquí con tu porqué." />
      )}

      {items.map((d) => <DecisionCard key={d.id} d={d} onChanged={load} />)}
    </div>
  );
}

function DecisionCard({ d, onChanged }) {
  const [reviewing, setReviewing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [wasRight, setWasRight] = useState("si");

  const reviewable = !d.reviewed_at && d.review_date && d.review_date <= todayStr();
  const statusIcon = d.reviewed_at
    ? (d.was_right === "si" ? <CheckCircle2 size={16} color={C.olive} />
       : d.was_right === "no" ? <XCircle size={16} color={C.rust} />
       : <CircleDot size={16} color={C.sepia} />)
    : <Scale size={16} color={C.sepia} />;

  const subtitle = d.reviewed_at
    ? `Revisada · ${d.was_right === "si" ? "Acerté" : d.was_right === "no" ? "Me equivoqué" : "A medias"}`
    : reviewable ? "Lista para revisar"
    : d.review_date ? `Revisar el ${fmt(d.review_date)}` : "Sin fecha de revisión";

  async function saveReview() {
    await api.reviewDecision(d.id, { outcome, was_right: wasRight });
    setReviewing(false); onChanged();
  }
  async function remove() { await api.deleteDecision(d.id); onChanged(); }

  return (
    <Collapsible title={d.title} subtitle={subtitle} accent={d.reviewed_at ? C.olive : C.paperEdge}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>{statusIcon}
        <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia }}>Decidida el {fmt(d.created_at.slice(0, 10))}</span>
      </div>

      {d.decided_option && <Block label="Qué decidí" text={d.decided_option} />}
      {d.context && <Block label="Contexto" text={d.context} />}
      {d.reasoning && <Block label="Mi razonamiento" text={d.reasoning} />}
      {d.expected && <Block label="Qué esperaba" text={d.expected} />}

      {/* Resultado, si ya se revisó */}
      {d.reviewed_at && (
        <div style={{ background: "rgba(166,116,30,0.08)", borderRadius: 8, padding: "11px 13px", marginTop: 6,
          borderLeft: `3px solid ${C.olive}` }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase",
            fontWeight: 600, marginBottom: 4, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", width: "fit-content" }}>
            Qué pasó de verdad
          </div>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk, lineHeight: 1.5 }}>{d.outcome}</p>
        </div>
      )}

      {/* Revisión, si toca y no se hizo */}
      {reviewable && !reviewing && (
        <div style={{ marginTop: 12 }}><SolidBtn label="Revisar ahora" onClick={() => setReviewing(true)} /></div>
      )}
      {reviewing && (
        <div style={{ marginTop: 12 }}>
          <Field label="¿Qué pasó de verdad?" value={outcome} onChange={(e) => setOutcome(e.target.value)} multiline placeholder="El resultado real, visto con perspectiva." />
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.sepia, marginBottom: 8 }}>¿Acerté?</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["si", "Acerté"], ["parcial", "A medias"], ["no", "Me equivoqué"]].map(([k, lab]) => (
              <button key={k} onClick={() => setWasRight(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                fontFamily: FONT_BODY, fontSize: 12.5, background: wasRight === k ? GRAD.gold : C.inkSoft,
                color: wasRight === k ? C.cream : C.sepia, border: `1px solid ${wasRight === k ? "transparent" : C.paperEdge}`,
                fontWeight: wasRight === k ? 600 : 400 }}>{lab}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Guardar revisión" onClick={saveReview} />
            <button onClick={() => setReviewing(false)} style={ghost}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={remove} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar">
          <Trash2 size={15} />
        </button>
      </div>
    </Collapsible>
  );
}

function Block({ label, text }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: C.sepia, marginBottom: 3 }}>{label}</div>
      <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
