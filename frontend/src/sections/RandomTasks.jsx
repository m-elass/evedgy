/*
 * sections/RandomTasks.jsx — TAREAS, CLASIFICADAS A TU MANERA
 * ──────────────────────────────────────────────────────────
 * Las cosas puntuales que hay que hacer, agrupadas en las secciones que tú
 * inventes ("Casa", "Papeleo", "Trabajo"…), cada una con su color.
 *
 * Dos ideas de diseño:
 *   · Clasificar nunca es obligatorio. Una tarea sin sección vive en "Sin
 *     clasificar" y funciona igual: apuntar rápido no debe costar decisiones.
 *   · Se puede clasificar en cualquier momento, también tareas viejas: cada
 *     tarea lleva un selector para moverla de sección con un toque.
 */
import React, { useEffect, useState } from "react";
import { Check, Trash2, Tag, Plus, X, Pencil } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_BODY, FONT_DISPLAY, GRAD } from "../lib/theme";
import { SectionHeader, AddBtn, Field, SolidBtn, Loading, Empty } from "../components/ui";
import { HelpDot } from "../components/Help";

/* Colores propuestos al crear una sección */
const PALETA = ["#E8B84B", "#7FE0F5", "#B79CFF", "#F0975C", "#8FD694", "#F27E9D"];

export default function RandomTasks() {
  const [tasks, setTasks] = useState(null);
  const [secciones, setSecciones] = useState([]);
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState("");        // sección de la tarea nueva
  const [gestionar, setGestionar] = useState(false); // panel de secciones

  useEffect(() => { cargar(); }, []);
  async function cargar() {
    try {
      const [t, s] = await Promise.all([api.listRandomTasks(), api.listTaskSections()]);
      setTasks(t); setSecciones(s);
    } catch { setTasks([]); setSecciones([]); }
  }

  async function crear() {
    if (!texto.trim()) return;
    await api.createRandomTask({
      content: texto.trim(),
      section_id: destino ? parseInt(destino) : null,
    });
    setTexto(""); cargar();
  }
  async function alternar(t) { await api.updateRandomTask(t.id, { done: !t.done }); cargar(); }
  async function borrar(id) { await api.deleteRandomTask(id); cargar(); }
  async function mover(id, valor) {
    await api.updateRandomTask(id, valor ? { section_id: parseInt(valor) } : { clear_section: true });
    cargar();
  }

  if (tasks === null) return (<><SectionHeader kicker="Hacer · Pendientes" title="Tareas" /><Loading /></>);

  // Cada sección con sus tareas, y al final las que no tienen sección
  const grupos = [
    ...secciones.map((s) => ({ ...s, tareas: tasks.filter((t) => t.section_id === s.id) })),
    { id: null, name: "Sin clasificar", color: C.paperEdge,
      tareas: tasks.filter((t) => !t.section_id) },
  ].filter((g) => g.id !== null || g.tareas.length > 0);

  return (
    <div>
      <SectionHeader kicker="Hacer · Pendientes" title="Tareas" />

      {/* Alta rápida: escribir y, si quieres, elegir sección */}
      <div style={{ marginBottom: 16 }}>
        <Field value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué hay que hacer?" />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <SolidBtn label="Añadir" onClick={crear} disabled={!texto.trim()} />
          {secciones.length > 0 && (
            <select value={destino} onChange={(e) => setDestino(e.target.value)}
              style={selectStyle}>
              <option value="">Sin clasificar</option>
              {secciones.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          )}
        </div>
      </div>

      {/* Gestión de secciones */}
      <button onClick={() => setGestionar((v) => !v)} style={{ display: "inline-flex",
        alignItems: "center", gap: 8, background: "none", border: `1px solid ${C.paperEdge}`,
        color: C.sepia, borderRadius: 999, padding: "9px 15px", fontFamily: FONT_BODY,
        fontSize: 12.5, cursor: "pointer", marginBottom: 16 }}>
        <Tag size={13} /> {gestionar ? "Ocultar secciones" : "Gestionar secciones"}
        <HelpDot topic="task_sections" size={13} />
      </button>

      {gestionar && <PanelSecciones secciones={secciones} onCambio={cargar} />}

      {tasks.length === 0 ? (
        <Empty text="Sin tareas pendientes. Apunta lo que tengas en la cabeza y déjala libre." />
      ) : (
        grupos.map((g) => (
          <div key={g.id ?? "sin"} style={{ marginBottom: 22 }}>
            {/* Cabecera de la sección, con su color */}
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color,
                boxShadow: g.id ? `0 0 8px ${g.color}` : "none", flexShrink: 0 }} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, letterSpacing: ".14em",
                textTransform: "uppercase", fontWeight: 700,
                color: g.id ? C.sepiaInk : C.sepia }}>{g.name}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia }}>
                {g.tareas.filter((t) => !t.done).length} pendientes
              </span>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${g.color}55, transparent)` }} />
            </div>

            {g.tareas.length === 0 ? (
              <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia,
                padding: "6px 4px 10px" }}>Nada aquí todavía.</div>
            ) : (
              g.tareas.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 11,
                  background: C.paper, borderLeft: `3px solid ${g.color}`,
                  borderRadius: 10, padding: "11px 12px", marginBottom: 8 }}>
                  <button onClick={() => alternar(t)} aria-label={t.done ? "Marcar pendiente" : "Completar"}
                    style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, cursor: "pointer",
                      border: t.done ? "none" : `2px solid ${C.paperEdge}`,
                      background: t.done ? GRAD.gold : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {t.done && <Check size={14} color="#0B1B33" strokeWidth={3} />}
                  </button>
                  <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14.5, color: C.sepiaInk,
                    textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.55 : 1 }}>
                    {t.content}
                  </span>
                  {/* Clasificar en cualquier momento, también tareas antiguas */}
                  <select value={t.section_id || ""} onChange={(e) => mover(t.id, e.target.value)}
                    aria-label="Sección de la tarea" style={{ ...selectStyle, padding: "5px 7px", fontSize: 11.5 }}>
                    <option value="">— sin sección —</option>
                    {secciones.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                  <button onClick={() => borrar(t.id)} aria-label="Borrar tarea"
                    style={{ background: "none", border: "none", color: C.sepia, cursor: "pointer", padding: 4 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ── Crear, renombrar, recolorear y borrar secciones ─────────────── */
function PanelSecciones({ secciones, onCambio }) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState(PALETA[0]);
  const [editando, setEditando] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState("");

  async function crear() {
    if (!nombre.trim()) return;
    await api.createTaskSection({ name: nombre.trim(), color });
    setNombre(""); onCambio();
  }
  async function renombrar(id) {
    if (!nuevoNombre.trim()) return setEditando(null);
    await api.updateTaskSection(id, { name: nuevoNombre.trim() });
    setEditando(null); onCambio();
  }
  async function recolorear(id, c) { await api.updateTaskSection(id, { color: c }); onCambio(); }
  async function borrar(id) { await api.deleteTaskSection(id); onCambio(); }

  return (
    <div style={{ background: C.paper, border: `1px solid ${C.paperEdge}`, borderRadius: 14,
      padding: "14px 15px", marginBottom: 20 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: C.sepiaInk,
        fontWeight: 600, marginBottom: 10 }}>Tus secciones</div>

      {secciones.map((s) => (
        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
          {editando === s.id ? (
            <>
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && renombrar(s.id)} autoFocus
                style={{ flex: 1, background: C.inkSoft, border: `1px solid ${C.olive}`,
                  borderRadius: 8, padding: "6px 9px", color: C.sepiaInk,
                  fontFamily: FONT_BODY, fontSize: 13.5, outline: "none" }} />
              <button onClick={() => renombrar(s.id)} style={iconBtn} aria-label="Guardar"><Check size={15} /></button>
              <button onClick={() => setEditando(null)} style={iconBtn} aria-label="Cancelar"><X size={15} /></button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk }}>{s.name}</span>
              <div style={{ display: "flex", gap: 3 }}>
                {PALETA.map((c) => (
                  <button key={c} onClick={() => recolorear(s.id, c)} aria-label={`Color ${c}`}
                    style={{ width: 14, height: 14, borderRadius: 4, background: c, cursor: "pointer",
                      border: s.color === c ? `2px solid ${C.sepiaInk}` : "none", padding: 0 }} />
                ))}
              </div>
              <button onClick={() => { setEditando(s.id); setNuevoNombre(s.name); }}
                style={iconBtn} aria-label="Renombrar"><Pencil size={14} /></button>
              <button onClick={() => borrar(s.id)} style={iconBtn} aria-label="Borrar sección"><Trash2 size={14} /></button>
            </>
          )}
        </div>
      ))}

      {secciones.length === 0 && (
        <p style={{ margin: "0 0 12px", fontFamily: FONT_BODY, fontSize: 12.5,
          color: C.sepia, lineHeight: 1.5 }}>
          Todavía no tienes secciones. Crea las que necesites: los nombres los eliges tú.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && crear()} placeholder="Nombre de la sección"
          style={{ flex: 1, minWidth: 130, background: C.inkSoft, border: `1px solid ${C.paperEdge}`,
            borderRadius: 10, padding: "9px 11px", color: C.sepiaInk,
            fontFamily: FONT_BODY, fontSize: 13.5, outline: "none" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {PALETA.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={`Elegir color ${c}`}
              style={{ width: 18, height: 18, borderRadius: 5, background: c, cursor: "pointer",
                border: color === c ? `2px solid ${C.sepiaInk}` : "none", padding: 0 }} />
          ))}
        </div>
        <AddBtn label="Crear" onClick={crear} />
      </div>
    </div>
  );
}

const selectStyle = {
  background: C.inkSoft, border: `1px solid ${C.paperEdge}`, color: C.sepia,
  borderRadius: 8, padding: "8px 10px", fontFamily: FONT_BODY, fontSize: 12.5, cursor: "pointer",
};
const iconBtn = { background: "none", border: "none", color: C.sepia, cursor: "pointer", padding: 4 };
