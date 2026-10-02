/*
 * sections/Quotes.jsx — FRASES CON HONDURA
 * ────────────────────────────────────────
 * Las frases que te han marcado. Cada día aparece una en Hoy (las favoritas,
 * el triple de a menudo) y, si quieres, en el widget del móvil.
 */
import React, { useState } from "react";
import { Star, Eye, EyeOff, Trash2, Quote as QuoteIcon } from "lucide-react";
import { api } from "../lib/api";
import { useApi, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { C, FONT_BODY, FONT_DISPLAY } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Empty } from "../components/ui";

export default function Quotes() {
  const { data, gate } = useApi("quotes", api.listQuotes);
  const refrescar = useRefrescar();
  const [creando, setCreando] = useState(false);
  const [texto, setTexto] = useState("");
  const [autor, setAutor] = useState("");
  const [obra, setObra] = useState("");
  const [guardando, setGuardando] = useState(false);

  const recargar = () => refrescar("quotes", "today");

  async function crear() {
    if (!texto.trim() || guardando) return;
    setGuardando(true);
    try {
      await api.createQuote({ text: texto.trim(), author: autor.trim(), source: obra.trim() });
      setTexto(""); setAutor(""); setObra(""); setCreando(false); recargar();
    } catch (e) { avisar(e?.humano || "No se pudo guardar la frase."); }
    finally { setGuardando(false); }
  }
  async function cambiar(q, datos) {
    try { await api.updateQuote(q.id, datos); recargar(); }
    catch (e) { avisar(e?.humano || "No se pudo cambiar."); }
  }
  async function borrar(q) {
    try { await api.deleteQuote(q.id); recargar(); }
    catch (e) { avisar(e?.humano || "No se pudo borrar."); }
  }

  if (gate) return (<><SectionHeader kicker="Saber · Hondura" title="Frases" help="quotes" />{gate}</>);

  return (
    <div>
      <SectionHeader kicker="Saber · Hondura" title="Frases" help="quotes" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.55, margin: "-6px 0 16px" }}>
        Cada día aparece una en Hoy. Las que marques con estrella saldrán más a menudo.
      </p>

      {creando ? (
        <div style={{ background: C.paper, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
          <Field label="La frase" value={texto} onChange={(e) => setTexto(e.target.value)} multiline
            placeholder="«El obstáculo es el camino.»" />
          <Field label="Autor (opcional)" value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Marco Aurelio" />
          <Field label="Obra (opcional)" value={obra} onChange={(e) => setObra(e.target.value)} placeholder="Meditaciones" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label={guardando ? "Guardando…" : "Guardar"} onClick={crear} disabled={!texto.trim() || guardando} />
            <button onClick={() => setCreando(false)} style={fantasma}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16 }}><AddBtn label="Nueva frase" onClick={() => setCreando(true)} /></div>
      )}

      {data.length === 0 && !creando && (
        <Empty text="Guarda aquí las frases que te digan algo: de libros, de películas, de alguien que quieres. Volverán a ti cuando menos lo esperes." />
      )}

      {data.map((q) => (
        <figure key={q.id} style={{ margin: "0 0 12px", padding: "18px 18px 12px", borderRadius: 16, position: "relative",
          background: q.favorite ? "linear-gradient(160deg, rgba(232,184,75,.14), rgba(30,59,107,.5))" : C.paper,
          border: `1px solid ${q.favorite ? "rgba(232,184,75,.4)" : C.paperEdge}` }}>
          <QuoteIcon size={26} color="rgba(232,184,75,.2)" style={{ position: "absolute", right: 12, top: 10 }} />
          <blockquote style={{ margin: 0, fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 19.5,
            lineHeight: 1.45, color: C.sepiaInk, paddingRight: 18 }}>«{q.text}»</blockquote>
          <figcaption style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia }}>
              {q.author ? `— ${q.author}` : ""}{q.source ? `${q.author ? ", " : "— "}${q.source}` : ""}
            </span>
            <button onClick={() => cambiar(q, { favorite: !q.favorite })} aria-label={q.favorite ? "Quitar de favoritas" : "Favorita"}
              style={icono(q.favorite ? C.olive : C.sepia)}><Star size={16} fill={q.favorite ? "currentColor" : "none"} /></button>
            <button onClick={() => cambiar(q, { in_widget: !q.in_widget })}
              aria-label={q.in_widget ? "Ocultar en el widget" : "Mostrar en el widget"}
              title={q.in_widget ? "Puede salir en el widget del móvil" : "No sale en el widget"}
              style={icono(q.in_widget ? C.sepiaInk : C.sepia)}>{q.in_widget ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            <button onClick={() => borrar(q)} aria-label="Borrar frase" style={icono(C.sepia)}><Trash2 size={15} /></button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

const icono = (color) => ({ background: "none", border: "none", color, cursor: "pointer", padding: 6, display: "flex" });
const fantasma = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5,
  cursor: "pointer", padding: "10px 8px" };
