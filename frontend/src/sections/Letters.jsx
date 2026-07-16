/*
 * sections/Letters.jsx
 * ────────────────────
 * Cartas a tu yo futuro. Escribes hoy, eliges una fecha, y la carta queda
 * SELLADA hasta entonces: no puedes leerla antes (el backend lo impide de verdad).
 * Cuando llega el día, se abre y recibes tu propia voz del pasado.
 *
 * El detalle importa: una carta cerrada se ve como un sobre lacrado, con la
 * cuenta atrás. La emoción está en la espera.
 */
import React, { useEffect, useState } from "react";
import { Lock, Mail, MailOpen, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

const todayStr = () => new Date().toISOString().slice(0, 10);

function daysUntil(iso) {
  const target = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}
function fmtLong(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export default function Letters() {
  const [items, setItems] = useState(null);
  const [writing, setWriting] = useState(false);
  const [reading, setReading] = useState(null);   // carta abierta a pantalla completa
  const [body, setBody] = useState("");
  const [openDate, setOpenDate] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await api.listLetters()); } catch { setItems([]); }
  }
  async function send() {
    if (!body.trim() || !openDate) return;
    await api.createLetter({ body: body.trim(), open_date: openDate });
    setBody(""); setOpenDate(""); setWriting(false); load();
  }
  async function openOne(id) {
    try {
      const full = await api.openLetter(id);   // backend valida la fecha
      setReading(full);
      load();   // refrescar estado "abierta"
    } catch {
      // no debería pasar (solo dejamos abrir las que tocan), pero por si acaso
    }
  }

  if (reading) return <LetterReader letter={reading} onBack={() => setReading(null)} />;
  if (items === null) return (<><SectionHeader kicker="Futuro · Voz" title="Cartas" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Futuro · Voz" title="Cartas a tu yo futuro" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 18 }}>
        Escribe a quien serás. La carta queda sellada hasta la fecha que elijas; ni tú podrás leerla antes.
      </p>

      {writing ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 18, marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Tu carta" value={body} onChange={(e) => setBody(e.target.value)} multiline
            placeholder="Querido yo del futuro…" />
          <Field label="Se abrirá el" value={openDate} onChange={(e) => setOpenDate(e.target.value)} placeholder="2027-01-01" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Sellar y enviar" onClick={send} />
            <button onClick={() => { setWriting(false); setBody(""); setOpenDate(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}><AddBtn label="Escribir una carta" onClick={() => setWriting(true)} /></div>
      )}

      {items.length === 0 && !writing && (
        <Empty text="Aún no has escrito ninguna carta. La primera puede ser para dentro de un año." />
      )}

      {items.map((l) => <LetterCard key={l.id} l={l} onOpen={() => openOne(l.id)} />)}
    </div>
  );
}

function LetterCard({ l, onOpen }) {
  const dleft = daysUntil(l.open_date);

  if (l.can_open) {
    // Carta lista para abrir (o ya abierta): invita a leerla, en oro.
    return (
      <button onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%",
        textAlign: "left", background: C.paper, borderRadius: 14, padding: "16px 18px", marginBottom: 12,
        border: `1px solid ${C.olive}`, cursor: "pointer" }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: GRAD.gold,
          boxShadow: GLOW.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {l.opened ? <MailOpen size={20} color={C.cream} /> : <Mail size={20} color={C.cream} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.sepiaInk, fontWeight: 600 }}>
            {l.opened ? "Vuelve a leerla" : "Una carta te espera"}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 2 }}>
            Escrita el {fmtLong(l.created_at.slice(0, 10))}
          </div>
        </div>
      </button>
    );
  }

  // Carta sellada: sobre lacrado con cuenta atrás. No revela nada.
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: C.inkSoft, borderRadius: 14,
      padding: "16px 18px", marginBottom: 12, border: `1px solid ${C.paperEdge}`, opacity: 0.85 }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0, background: "transparent",
        border: `1.5px solid ${C.sepia}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Lock size={18} color={C.sepia} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, color: C.sepiaInk, fontWeight: 600 }}>Carta sellada</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 2 }}>
          Se abrirá el {fmtLong(l.open_date)} · faltan {dleft} {dleft === 1 ? "día" : "días"}
        </div>
      </div>
    </div>
  );
}

function LetterReader({ letter, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none",
        border: "none", color: C.sepia, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, marginBottom: 18, padding: 0 }}>
        <ArrowLeft size={16} /> Volver a las cartas
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <MailOpen size={20} color={C.olive} />
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase",
            fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Tu voz del pasado
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 2 }}>
            Escrita el {fmtLong(letter.created_at.slice(0, 10))}
          </div>
        </div>
      </div>

      <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`, padding: "22px 22px",
        boxShadow: `0 4px 24px rgba(0,0,0,0.25)` }}>
        <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 18, color: C.sepiaInk, lineHeight: 1.75,
          whiteSpace: "pre-wrap" }}>{letter.body}</p>
      </div>
    </div>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
