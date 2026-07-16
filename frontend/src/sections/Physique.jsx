/*
 * sections/Physique.jsx
 * ─────────────────────
 * La cuenta atrás al físico deseado (deseo 3). Una barra que se llena según
 * pasan los días hacia tu fecha objetivo, y una racha que crece cada semana que
 * cumples tus entrenos. La constancia hecha impulso.
 */
import React, { useEffect, useState } from "react";
import { Flame, Target, Calendar } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Field, SolidBtn, Loading } from "../components/ui";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Physique() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [weekly, setWeekly] = useState(3);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setData(await api.getPhysiqueGoal()); } catch { setData({ has_goal: false }); }
  }
  async function save() {
    if (!target) return;
    await api.setPhysiqueGoal({ description: desc.trim(), start_date: todayStr(), target_date: target, weekly_target: weekly });
    setEditing(false); setDesc(""); setTarget(""); load();
  }
  async function remove() { await api.deletePhysiqueGoal(); setData({ has_goal: false }); }

  if (data === null) return (<><SectionHeader kicker="Cuerpo · Meta" title="Tu cuenta atrás" /><Loading /></>);

  // Formulario (sin meta o editando)
  if (!data.has_goal || editing) {
    return (
      <div>
        <SectionHeader kicker="Cuerpo · Meta" title="Tu cuenta atrás" />
        <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 18 }}>
          Fija una meta con fecha. La barra se llenará día a día, y tu racha crecerá cada semana que cumplas tus entrenos.
        </p>
        <div style={{ background: C.paper, borderRadius: 12, padding: 18, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Tu meta" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Verano en forma, -5kg, primer pull-up…" />
          <Field label="Fecha objetivo" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="2026-09-01" />
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.sepia, marginBottom: 8 }}>Entrenos por semana</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setWeekly(n)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer",
                fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, background: weekly === n ? GRAD.gold : C.inkSoft,
                color: weekly === n ? C.cream : C.sepia, border: `1px solid ${weekly === n ? "transparent" : C.paperEdge}` }}>{n}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <SolidBtn label="Empezar la cuenta atrás" onClick={save} />
            {editing && <button onClick={() => setEditing(false)} style={ghost}>Cancelar</button>}
          </div>
        </div>
      </div>
    );
  }

  const g = data.goal;
  const pct = Math.round(data.progress * 100);
  const targetFmt = new Date(g.target_date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <SectionHeader kicker="Cuerpo · Meta" title="Tu cuenta atrás" />

      {/* Días restantes, grande */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 700, lineHeight: 1,
          background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          {data.remaining_days}
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, marginTop: 4 }}>
          {data.remaining_days === 1 ? "día para" : "días para"} {g.description || "tu meta"}
        </div>
      </div>

      {/* Barra de progreso de la cuenta atrás */}
      <div style={{ margin: "20px 0 8px" }}>
        <div style={{ height: 14, background: C.paperEdge, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: GRAD.gold, boxShadow: GLOW.gold,
            transition: "width 0.6s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia }}>Día {data.elapsed_days} de {data.total_days}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.olive, fontWeight: 600 }}>{pct}%</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.sepia, marginBottom: 24 }}>
        <Calendar size={13} />
        <span style={{ fontFamily: FONT_BODY, fontSize: 12.5 }}>Meta: {targetFmt}</span>
      </div>

      {/* Racha creciente */}
      <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${data.streak_weeks > 0 ? C.olive : C.paperEdge}`,
        padding: "18px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <Flame size={40} color={data.streak_weeks > 0 ? C.olive : C.sepia}
            fill={data.streak_weeks > 0 ? C.olive : "none"}
            style={data.streak_weeks > 0 ? { filter: `drop-shadow(0 0 8px ${C.olive}88)` } : undefined} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, color: C.sepiaInk }}>{data.streak_weeks}</span>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.sepia }}>{data.streak_weeks === 1 ? "semana" : "semanas"} de racha</span>
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 2 }}>
            Esta semana: {data.this_week_sessions}/{g.weekly_target} entrenos
            {data.this_week_done ? " · ¡cumplida!" : ""}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { setEditing(true); setDesc(g.description); setWeekly(g.weekly_target); }} style={ghost}>Cambiar meta</button>
        <button onClick={remove} style={ghost}>Borrar</button>
      </div>
    </div>
  );
}

const ghost = { background: "none", border: "none", color: C.sepia, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", padding: "10px 4px" };
