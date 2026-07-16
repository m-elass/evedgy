/*
 * sections/Exercises.jsx
 * ──────────────────────
 * Biblioteca de ejercicios conectada al backend. Cada ejercicio se abre en un
 * desplegable y dentro puedes editar sus "notas de ejecución" (esa pestaña
 * técnica que querías). El guardado de notas llama a api.updateExercise.
 */
import React, { useEffect, useState } from "react";
import { NotebookPen, Trash2, PersonStanding } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_BODY, FONT_DISPLAY, GRAD } from "../lib/theme";
import { SectionHeader, Collapsible, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";
import BodyMap from "../components/BodyMap";

// Catálogo de músculos (id -> nombre) cargado una vez y compartido.
let MUSCLE_CATALOG = null;

export default function Exercises() {
  const [items, setItems] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try { setItems(await api.listExercises()); }
    catch { setItems([]); }
  }

  async function create() {
    if (!name.trim()) return;
    await api.createExercise({ name: name.trim(), notes: "" });
    setName(""); setAdding(false); load();
  }

  if (items === null) return (<><SectionHeader kicker="Cuerpo · Biblioteca" title="Ejercicios" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Cuerpo · Biblioteca" title="Ejercicios" />

      {adding ? (
        <div style={{ background: C.paper, borderRadius: 10, padding: 16, marginBottom: 14,
          border: `1px solid ${C.paperEdge}` }}>
          <Field label="Nombre del ejercicio" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Press banca" />
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Crear" onClick={create} />
            <button onClick={() => { setAdding(false); setName(""); }} style={ghost}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}><AddBtn label="Añadir ejercicio" onClick={() => setAdding(true)} /></div>
      )}

      {items.length === 0 && !adding && (
        <Empty text="Tu biblioteca está vacía. Añade el primer ejercicio para empezar a registrar series." />
      )}

      {items.map((ex) => (
        <ExerciseCard key={ex.id} ex={ex} onChanged={load} />
      ))}
    </div>
  );
}

function ExerciseCard({ ex, onChanged }) {
  const [notes, setNotes] = useState(ex.notes || "");
  const [saved, setSaved] = useState(true);
  const [showBody, setShowBody] = useState(false);
  const [catalog, setCatalog] = useState(MUSCLE_CATALOG);

  // Cargar el catálogo de músculos una vez (para mostrar nombres legibles)
  useEffect(() => {
    if (MUSCLE_CATALOG) { setCatalog(MUSCLE_CATALOG); return; }
    api.muscleCatalog().then((r) => { MUSCLE_CATALOG = r.muscles; setCatalog(r.muscles); }).catch(() => {});
  }, []);

  async function saveNotes() {
    await api.updateExercise(ex.id, { notes });
    setSaved(true);
  }
  async function remove() {
    await api.deleteExercise(ex.id);
    onChanged();
  }

  const primary = (ex.primary_muscles || "").split(",").filter(Boolean);
  const secondary = (ex.secondary_muscles || "").split(",").filter(Boolean);
  const hasMuscles = primary.length > 0 || secondary.length > 0;
  const nameOf = (id) => (catalog && catalog[id]) || id;

  return (
    <Collapsible title={ex.name} accent={C.olive}>
      <div style={{ background: "rgba(166,116,30,0.08)", borderRadius: 7, padding: "11px 13px",
        borderLeft: `3px solid ${C.olive}`, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <NotebookPen size={13} color={C.olive} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em",
            textTransform: "uppercase", color: C.olive, fontWeight: 600 }}>Notas de ejecución</span>
        </div>
        <Field value={notes} multiline
          placeholder="Apunta aquí cómo mejorar la técnica de este ejercicio…"
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SolidBtn label={saved ? "Guardado" : "Guardar notas"} onClick={saveNotes} disabled={saved} />
          <button onClick={remove} style={{ background: "none", border: "none", cursor: "pointer",
            color: C.sepia, padding: 4 }} aria-label="Borrar ejercicio"><Trash2 size={15} /></button>
        </div>
      </div>

      {/* Entrada pulsable: ver los músculos que trabaja */}
      {hasMuscles && (
        <div>
          <button onClick={() => setShowBody((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 9,
            width: "100%", background: C.inkSoft, border: `1px solid ${C.paperEdge}`, borderRadius: 9,
            padding: "11px 14px", cursor: "pointer", color: C.sepiaInk }}>
            <PersonStanding size={17} color={C.olive} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, flex: 1, textAlign: "left" }}>
              {showBody ? "Ocultar músculos" : "Ver músculos que trabaja"}
            </span>
            <span style={{ fontSize: 12, color: C.sepia }}>{showBody ? "▴" : "▾"}</span>
          </button>

          {showBody && (
            <div style={{ marginTop: 14 }}>
              <BodyMap primary={primary} secondary={secondary} size={260} />
              {/* leyenda */}
              <div style={{ marginTop: 12 }}>
                {primary.length > 0 && (
                  <MuscleRow color={C.olive} label="Principales" names={primary.map(nameOf)} glow />
                )}
                {secondary.length > 0 && (
                  <MuscleRow color="rgba(232,184,75,0.45)" label="Secundarios" names={secondary.map(nameOf)} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Collapsible>
  );
}

function MuscleRow({ color, label, names, glow }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0,
        boxShadow: glow ? "0 0 6px rgba(232,184,75,0.7)" : "none" }} />
      <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia, textTransform: "uppercase", letterSpacing: ".06em", minWidth: 78 }}>{label}</span>
      <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk }}>{names.join(", ")}</span>
    </div>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY,
  fontSize: 13.5, cursor: "pointer", padding: "10px 8px" };
