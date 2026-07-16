/*
 * sections/Write.jsx
 * ──────────────────
 * Escritura seria. Dos vistas:
 *  - lista de documentos (versos / prosa)
 *  - editor de un documento (titulo + cuerpo), que guarda con updateDocument.
 */
import React, { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY } from "../lib/theme";
import { SectionHeader, AddBtn, SolidBtn, Loading, Empty } from "../components/ui";

export default function Write() {
  const [docs, setDocs] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setDocs(await api.listDocuments()); } catch { setDocs([]); }
  }
  async function createNew(type) {
    const d = await api.createDocument({ title: type === "verso" ? "Nuevo verso" : "Nueva prosa", type, body: "" });
    await load();
    setOpenId(d.id);
  }

  if (openId !== null) return <Editor id={openId} onBack={() => { setOpenId(null); load(); }} />;
  if (docs === null) return (<><SectionHeader kicker="Mente - En serio" title="Escritura" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Mente - En serio" title="Escritura" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <AddBtn label="Nuevo verso" onClick={() => createNew("verso")} />
        <AddBtn label="Nueva prosa" onClick={() => createNew("prosa")} />
      </div>

      {docs.length === 0 && <Empty text="Sin documentos aun. Empieza un verso o una prosa cuando quieras escribir en serio." />}

      {docs.map((d) => (
        <button key={d.id} onClick={() => setOpenId(d.id)} style={{ display: "block", width: "100%", textAlign: "left",
          background: C.paper, borderRadius: 10, padding: "16px 18px", marginBottom: 12,
          border: `1px solid ${C.paperEdge}`, cursor: "pointer" }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase",
            color: C.cream, background: d.type === "verso" ? C.rust : C.olive, padding: "2px 8px", borderRadius: 20 }}>{d.type}</span>
          <h3 style={{ margin: "8px 0 6px", fontFamily: FONT_DISPLAY, fontSize: 20, color: C.sepiaInk, fontWeight: 600 }}>{d.title}</h3>
          <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 14, color: C.sepia, lineHeight: 1.5, fontStyle: "italic",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.body || "Vacio…"}</p>
        </button>
      ))}
    </div>
  );
}

function Editor({ id, onBack }) {
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    api.getDocument(id).then((d) => { setDoc(d); setTitle(d.title); setBody(d.body); });
  }, [id]);

  async function save() {
    await api.updateDocument(id, { title, body });
    setSaved(true);
  }
  async function remove() {
    await api.deleteDocument(id);
    onBack();
  }

  if (!doc) return <Loading />;

  return (
    <div>
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none",
        border: "none", color: C.sepia, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, marginBottom: 14, padding: 0 }}>
        <ArrowLeft size={16} /> Volver a documentos
      </button>

      <input value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
        style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none",
          fontFamily: FONT_DISPLAY, fontSize: 26, color: C.paper, fontWeight: 600, marginBottom: 14, padding: 0 }} />

      <textarea value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }}
        placeholder="Escribe…" rows={16} style={{ width: "100%", boxSizing: "border-box", background: C.paper,
          border: `1px solid ${C.paperEdge}`, borderRadius: 10, padding: "16px 18px", fontFamily: FONT_DISPLAY,
          fontSize: 16, color: C.sepiaInk, lineHeight: 1.7, resize: "vertical" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <SolidBtn label={saved ? "Guardado" : "Guardar"} onClick={save} disabled={saved} />
        <button onClick={remove} style={{ background: "none", border: "none", cursor: "pointer", color: C.sepia, padding: 6 }} aria-label="Borrar documento">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
