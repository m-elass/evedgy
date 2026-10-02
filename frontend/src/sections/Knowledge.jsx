/*
 * sections/Knowledge.jsx — LA CONSTELACIÓN DEL SABER
 * ──────────────────────────────────────────────────
 * Tres estrellas con el mismo corazón:
 *   · Por leer      → libros y artículos
 *   · Por ver       → películas, series, documentales y vídeos
 *   · Por aprender  → cursos y podcasts
 * Cada cosa con su «por qué me interesa» (opcional), su prioridad y su
 * estado: pendiente → en curso → terminado (con lo que te llevaste).
 * Un libro, al empezarlo, pasa a Lecturas con su porqué como primera cosecha.
 */
import React, { useState } from "react";
import { Book, Newspaper, Film, Tv, Clapperboard, MonitorPlay, Headphones, GraduationCap,
  ExternalLink, Trash2, Play, Check, BookOpen, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useApi, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { C, FONT_BODY, FONT_DISPLAY, GRAD } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Empty } from "../components/ui";

export const TIPOS = {
  libro:      { label: "Libro",      Icon: Book,          color: "#E8B84B", quien: "Autor" },
  articulo:   { label: "Artículo",   Icon: Newspaper,     color: "#D9C08A", quien: "Autor o medio" },
  pelicula:   { label: "Película",   Icon: Film,          color: "#F0975C", quien: "Director" },
  serie:      { label: "Serie",      Icon: Tv,            color: "#F27E9D", quien: "Creador o plataforma" },
  documental: { label: "Documental", Icon: Clapperboard,  color: "#B79CFF", quien: "Director" },
  video:      { label: "Vídeo",      Icon: MonitorPlay,   color: "#7FE0F5", quien: "Canal" },
  curso:      { label: "Curso",      Icon: GraduationCap, color: "#8FD694", quien: "Profesor o plataforma" },
  podcast:    { label: "Podcast",    Icon: Headphones,    color: "#7FB4F5", quien: "Programa" },
};

const GRUPOS = {
  leer:     { titulo: "Por leer",     kicker: "Saber · Biblioteca", tipos: ["libro", "articulo"],
              vacio: "Apunta aquí los libros que quieres leer y por qué te llaman. Cuando empieces uno, pasará a Lecturas." },
  ver:      { titulo: "Por ver",      kicker: "Saber · La sala",    tipos: ["pelicula", "serie", "documental", "video"],
              vacio: "Películas, series, documentales y vídeos que quieres ver, cada uno con su porqué." },
  aprender: { titulo: "Por aprender", kicker: "Saber · El aula",    tipos: ["curso", "podcast"],
              vacio: "Cursos y podcasts que quieres empezar. Lo que se aprende, aquí se apunta." },
};
const PRIORIDAD = [["Algún día", 0], ["Pronto", 1], ["Imprescindible", 2]];
const ESTADOS = [["pendiente", "Pendientes"], ["en_curso", "En curso"], ["hecho", "Terminados"]];

export default function Knowledge({ grupo = "leer", onNavigate }) {
  const G = GRUPOS[grupo];
  const { data, gate } = useApi("knowledge", api.listKnowledge);
  const refrescar = useRefrescar();
  const [filtro, setFiltro] = useState("pendiente");
  const [creando, setCreando] = useState(false);

  if (gate) return (<><SectionHeader kicker={G.kicker} title={G.titulo} help="knowledge" />{gate}</>);

  const mios = data.filter((i) => G.tipos.includes(i.kind));
  const cuenta = (e) => mios.filter((i) => i.status === e).length;
  const lista = mios.filter((i) => i.status === filtro);

  return (
    <div>
      <SectionHeader kicker={G.kicker} title={G.titulo} help="knowledge" />

      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: C.inkSoft, padding: 4,
        borderRadius: 14, border: `1px solid ${C.paperEdge}` }}>
        {ESTADOS.map(([e, l]) => (
          <button key={e} onClick={() => setFiltro(e)} style={{ flex: 1, padding: "9px 6px", borderRadius: 11,
            border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600,
            background: filtro === e ? GRAD.gold : "transparent", color: filtro === e ? C.cream : C.sepia }}>
            {l} <span style={{ opacity: .7, fontWeight: 400 }}>{cuenta(e)}</span>
          </button>
        ))}
      </div>

      {creando ? (
        <Formulario tipos={G.tipos} onListo={() => { setCreando(false); setFiltro("pendiente"); refrescar("knowledge"); }}
          onCancelar={() => setCreando(false)} />
      ) : (
        <div style={{ marginBottom: 16 }}>
          <AddBtn label={`Añadir a ${G.titulo.toLowerCase()}`} onClick={() => setCreando(true)} />
        </div>
      )}

      {lista.length === 0 ? (
        <Empty text={filtro === "pendiente" ? G.vacio : filtro === "en_curso" ? "Nada en curso ahora mismo." : "Aún no has terminado nada de aquí."} />
      ) : (
        lista.map((i) => <Elemento key={i.id} item={i} onCambio={() => refrescar("knowledge", "readings")} onNavigate={onNavigate} />)
      )}
    </div>
  );
}

function Formulario({ tipos, onListo, onCancelar }) {
  const [kind, setKind] = useState(tipos[0]);
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [why, setWhy] = useState("");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState(0);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!title.trim() || guardando) return;
    setGuardando(true);
    try {
      await api.createKnowledge({ kind, title: title.trim(), creator: creator.trim(), why: why.trim(),
        link: link.trim(), priority });
      onListo();
    } catch (e) {
      avisar(e?.humano || "No se pudo guardar.");
    } finally { setGuardando(false); }
  }

  return (
    <div style={{ background: C.paper, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {tipos.map((t) => {
          const T = TIPOS[t];
          const on = kind === t;
          return (
            <button key={t} onClick={() => setKind(t)} style={{ display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5,
              border: `1px solid ${on ? T.color : C.paperEdge}`, background: on ? `${T.color}22` : "transparent",
              color: on ? C.sepiaInk : C.sepia }}>
              <T.Icon size={14} color={T.color} /> {T.label}
            </button>
          );
        })}
      </div>
      <Field label="Título" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === "libro" ? "Meditaciones" : kind === "pelicula" ? "Interstellar" : "Título"} />
      <Field label={TIPOS[kind].quien + " (opcional)"} value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="" />
      <Field label="¿Por qué te interesa? (opcional)" value={why} onChange={(e) => setWhy(e.target.value)} multiline
        placeholder="Lo que esperas encontrar, quién te lo recomendó, qué pregunta te responde…" />
      <Field label="Enlace (opcional)" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase",
        color: C.sepia, marginBottom: 6 }}>Prioridad</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {PRIORIDAD.map(([l, v]) => (
          <button key={v} onClick={() => setPriority(v)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10,
            cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12,
            border: `1px solid ${priority === v ? C.olive : C.paperEdge}`,
            background: priority === v ? "rgba(232,184,75,.14)" : "transparent",
            color: priority === v ? C.sepiaInk : C.sepia }}>
            {"✦".repeat(v)}{v ? " " : ""}{l}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <SolidBtn label={guardando ? "Guardando…" : "Guardar"} onClick={guardar} disabled={!title.trim() || guardando} />
        <button onClick={onCancelar} style={fantasma}>Cancelar</button>
      </div>
    </div>
  );
}

function Elemento({ item, onCambio, onNavigate }) {
  const T = TIPOS[item.kind] || TIPOS.libro;
  const [abierto, setAbierto] = useState(false);
  const [cerrando, setCerrando] = useState(false);   // pidiendo «qué te llevas»
  const [nota, setNota] = useState(item.note || "");
  const [ocupado, setOcupado] = useState(false);

  async function hacer(fn, ok) {
    if (ocupado) return;
    setOcupado(true);
    try { await fn(); onCambio(); if (ok) avisar(ok, "ok"); return true; }
    catch (e) { avisar(e?.humano || "No se pudo completar."); return false; }
    finally { setOcupado(false); }
  }

  return (
    <div style={{ display: "flex", background: C.paper, borderRadius: 14, marginBottom: 10, overflow: "hidden",
      border: `1px solid ${C.paperEdge}`, boxShadow: "0 6px 16px rgba(0,0,0,.18)" }}>
      {/* el lomo: color e icono del tipo */}
      <div style={{ width: 38, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 14, gap: 8, background: `linear-gradient(180deg, ${T.color}40, ${T.color}14)`,
        borderRight: `1px solid ${T.color}55` }}>
        <T.Icon size={17} color={T.color} />
        {item.priority > 0 && <span style={{ color: T.color, fontSize: 10, letterSpacing: -1 }}>{"✦".repeat(item.priority)}</span>}
      </div>
      <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, color: C.sepiaInk, lineHeight: 1.2 }}>{item.title}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, marginTop: 2 }}>
              {T.label}{item.creator ? ` · ${item.creator}` : ""}
            </div>
          </div>
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label="Abrir enlace"
              style={{ color: C.sepia, padding: 4 }}><ExternalLink size={15} /></a>
          )}
        </div>

        {item.why && (
          <button onClick={() => setAbierto((v) => !v)} style={{ display: "block", width: "100%", textAlign: "left",
            background: "none", border: "none", borderLeft: `2px solid ${C.olive}`, padding: "2px 0 2px 10px",
            margin: "10px 0 2px", cursor: "pointer", fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 15.5,
            color: C.sepiaInk, lineHeight: 1.45, opacity: .92,
            ...(abierto ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }) }}>
            {item.why}
          </button>
        )}

        {item.status === "hecho" && item.note && (
          <div style={{ marginTop: 8, fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, lineHeight: 1.5 }}>
            <Sparkles size={12} color={C.olive} /> {item.note}
          </div>
        )}

        {cerrando ? (
          <div style={{ marginTop: 10 }}>
            <Field label="¿Qué te llevas? (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} multiline placeholder="Una idea, una escena, una frase…" />
            <div style={{ display: "flex", gap: 8 }}>
              <SolidBtn label="Terminado" onClick={() => hacer(() => api.updateKnowledge(item.id, { status: "hecho", note: nota.trim() }), "¡Terminado! ✦")} />
              <button onClick={() => setCerrando(false)} style={fantasma}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            {item.status === "pendiente" && item.kind === "libro" && (
              <button onClick={() => hacer(() => api.startReading(item.id), "Pasa a Lecturas: ¡buena lectura!").then((hecho) => hecho && onNavigate?.("readings"))} style={accion}>
                <BookOpen size={13} /> Empezar a leer
              </button>
            )}
            {item.status === "pendiente" && item.kind !== "libro" && (
              <button onClick={() => hacer(() => api.updateKnowledge(item.id, { status: "en_curso" }))} style={accion}>
                <Play size={13} /> Empezar
              </button>
            )}
            {item.status !== "hecho" && (
              <button onClick={() => setCerrando(true)} style={accion}><Check size={13} /> Terminado</button>
            )}
            {item.status === "hecho" && (
              <button onClick={() => hacer(() => api.updateKnowledge(item.id, { status: "pendiente" }))} style={accion}>Volver a pendientes</button>
            )}
            <span style={{ flex: 1 }} />
            <button onClick={() => hacer(() => api.deleteKnowledge(item.id))} aria-label="Borrar"
              style={{ background: "none", border: "none", color: C.sepia, cursor: "pointer", padding: 4 }}>
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const accion = { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 999,
  border: `1px solid ${C.paperEdge}`, background: "transparent", color: C.sepiaInk, cursor: "pointer",
  fontFamily: FONT_BODY, fontSize: 12.5 };
const fantasma = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5,
  cursor: "pointer", padding: "10px 8px" };

export const PorLeer = (p) => <Knowledge grupo="leer" {...p} />;
export const PorVer = (p) => <Knowledge grupo="ver" {...p} />;
export const PorAprender = (p) => <Knowledge grupo="aprender" {...p} />;
