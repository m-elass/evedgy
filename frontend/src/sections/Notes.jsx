/*
 * sections/Notes.jsx
 * ──────────────────
 * Primera sección conectada al backend de VERDAD. Sirve de plantilla mental:
 * - Al montarse, pide las notas a la API (useEffect + api.listNotes).
 * - Para crear, llama a api.createNote y recarga.
 * - Para borrar, llama a api.deleteNote y recarga.
 * Este ciclo (cargar / crear / borrar / recargar) se repite en todas las secciones.
 */
import React, { useEffect, useState } from "react";
import { Quote, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";

export default function Notes() {
  const [notes, setNotes] = useState(null);   // null = aún cargando
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  // Cargar al entrar
  useEffect(() => { load(); }, []);
  async function load() {
    try { setNotes(await api.listNotes()); }
    catch { setNotes([]); }
  }

  async function save() {
    if (!draft.trim()) return;
    await api.createNote({ content: draft.trim() });
    setDraft(""); setAdding(false);
    load();
  }

  async function remove(id) {
    await api.deleteNote(id);
    load();
  }

  if (notes === null) return (<><SectionHeader kicker="Mente · Fugaz" title="Destellos" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Mente · Fugaz" title="Destellos" />

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 10, padding: 16, marginBottom: 14,
          border: `1px solid ${C.paperEdge}` }}>
          <Field label="Nuevo destello" value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Un verso, una frase, una idea fugaz…" multiline />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Guardar" onClick={save} />
            <button onClick={() => { setAdding(false); setDraft(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Anotar un destello" onClick={() => setAdding(true)} /></div>
      )}

      {notes.length === 0 && !adding && (
        <Empty text="Aún no hay destellos. Lo primero que se te ocurra, guárdalo aquí." />
      )}

      {notes.map((n) => (
        <div key={n.id} style={{ background: C.paper, borderRadius: 10, padding: "16px 18px",
          marginBottom: 11, border: `1px solid ${C.paperEdge}`, position: "relative" }}>
          <Quote size={16} color={C.oliveSoft} style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16, color: C.sepiaInk,
            lineHeight: 1.55, fontStyle: "italic" }}>{n.content}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia }}>
              {new Date(n.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </span>
            <button onClick={() => remove(n.id)} style={{ background: "none", border: "none",
              cursor: "pointer", color: C.sepia, padding: 4 }} aria-label="Borrar destello">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY,
  fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
