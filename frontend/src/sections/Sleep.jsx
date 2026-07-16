/*
 * sections/Sleep.jsx
 * ──────────────────
 * Horas dormidas por dia. Usa setSleep (PUT, upsert por fecha) para registrar,
 * y listSleep para pintar la semana. La grafica de barras se calcula de los
 * ultimos 7 dias con datos.
 */
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY } from "../lib/theme";
import { SectionHeader, Field, SolidBtn, Loading } from "../components/ui";

export default function Sleep() {
  const [logs, setLogs] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState("");

  useEffect(() => { load(); }, []);
  async function load() {
    try { setLogs(await api.listSleep()); } catch { setLogs([]); }
  }
  async function save() {
    const h = parseFloat(hours);
    if (isNaN(h)) return;
    await api.setSleep({ date, hours: h });
    setHours(""); load();
  }

  if (logs === null) return (<><SectionHeader kicker="Cuerpo - Descanso" title="Sueno" /><Loading /></>);

  // Ultimos 7 registros, en orden cronologico para la grafica
  const recent = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const avg = recent.length ? (recent.reduce((a, l) => a + l.hours, 0) / recent.length).toFixed(1) : "—";
  const max = 10;

  return (
    <div>
      <SectionHeader kicker="Cuerpo - Descanso" title="Sueno" />

      <div style={{ background: C.paper, borderRadius: 10, padding: 18, border: `1px solid ${C.paperEdge}`, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: C.sepiaInk, fontWeight: 600 }}>{avg}{avg !== "—" && "h"}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia }}>media reciente</span>
        </div>
        {recent.length > 0 ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {recent.map((l, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: `${(l.hours / max) * 100}%`,
                  background: l.hours >= 7 ? C.olive : C.paperEdge, borderRadius: "5px 5px 0 0", minHeight: 4 }} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.sepia }}>
                  {new Date(l.date + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short" }).slice(0, 1).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.sepia }}>Registra tu primera noche abajo.</p>
        )}
      </div>

      <div style={{ background: C.paper, borderRadius: 10, padding: 16, border: `1px solid ${C.paperEdge}` }}>
        <Field label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} />
        <Field label="Horas dormidas" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="7.5" />
        <SolidBtn label="Guardar noche" onClick={save} />
      </div>
    </div>
  );
}
