/*
 * sections/Tapestry.jsx
 * ─────────────────────
 * El tapiz de constancia, tejido como hebras. Cada semana del año es una hebra
 * que ondula de izquierda a derecha; cada día con actividad la tensa y la
 * enciende en oro, con nudos luminosos en los días más intensos. En calma, la
 * hebra descansa en azul. Ver el año entero tejido es la recompensa de la constancia.
 *
 * Los datos (intensidad por día) vienen de /insights/tapestry, que suma señales
 * de entrenos, hábitos cumplidos y prácticas.
 */
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { SectionHeader, Loading } from "../components/ui";

function ymd(d) { return d.toISOString().slice(0, 10); }

export default function Tapestry() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.tapestry().then(setData).catch(() => setData({ days: {}, active_days: 0, total_signals: 0 }));
  }, []);

  if (data === null) return (<><SectionHeader kicker="Tu año · Constancia" title="El tapiz" /><Loading /></>);

  // ── Organizar los días reales en semanas (hebras) ──
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));  // al lunes

  const weeks = [];
  let cursor = new Date(start);
  let activeWeeks = 0;
  while (cursor <= today) {
    const row = [];
    let weekHasActivity = false;
    for (let d = 0; d < 7; d++) {
      const intensity = cursor <= today ? (data.days[ymd(cursor)] || 0) : 0;
      if (intensity > 0) weekHasActivity = true;
      row.push(intensity);
      cursor = new Date(cursor); cursor.setDate(cursor.getDate() + 1);
    }
    if (weekHasActivity) activeWeeks++;
    weeks.push(row);
  }

  // ── Geometría del telar ──
  const W = 420, padX = 14, padY = 16;
  const COLS = 7;
  const rowH = 14;
  const H = padY * 2 + rowH * weeks.length;
  const stepX = (W - padX * 2) / (COLS - 1);

  function strandPoints(w) {
    const y0 = padY + rowH * w + rowH / 2;
    const pts = [];
    for (let c = 0; c < COLS; c++) {
      const x = padX + stepX * c;
      const wob = Math.sin(w * 0.9 + c * 0.85) * (rowH * 0.34);
      pts.push([x, y0 + wob, weeks[w][c]]);
    }
    return pts;
  }
  const pathFrom = (pts) => "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  const sw = (i) => (i >= 3 ? 3.4 : i === 2 ? 2.6 : 1.8);
  const op = (i) => (i >= 3 ? 1 : i === 2 ? 0.9 : 0.7);

  return (
    <div>
      <SectionHeader kicker="Tu año · Constancia" title="El tapiz" />

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <Stat value={data.active_days} label="días tejidos" />
        <Stat value={activeWeeks} label="semanas vivas" />
      </div>

      <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.55, marginBottom: 16 }}>
        Cada semana es una hebra; cada día que te mueves la tensa y la hace brillar. Tu año, tejido.
      </p>

      <div style={{ background: "linear-gradient(180deg,#0a1830,#0d1f3c)", border: `1px solid ${C.paperEdge}`,
        borderRadius: 16, padding: "8px 8px", boxShadow: "inset 0 1px 0 rgba(127,213,232,.06), 0 6px 24px rgba(0,0,0,.35)" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="tapGold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#A6741E" /><stop offset="0.5" stopColor="#E8B84B" /><stop offset="1" stopColor="#FBF0C8" />
            </linearGradient>
            <filter id="tapGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {[0, 1, 2, 3, 4, 5, 6].map((c) => (
            <line key={c} x1={padX + stepX * c} y1={padY * 0.4} x2={padX + stepX * c} y2={H - padY * 0.4}
              stroke="#7FD5E8" strokeWidth="0.5" opacity="0.08" />
          ))}

          {weeks.map((_, w) => {
            const pts = strandPoints(w);
            return (
              <g key={w}>
                <path d={pathFrom(pts)} fill="none" stroke="#24426e" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                {pts.slice(0, -1).map(([x1, y1, i1], c) => {
                  if (i1 === 0) return null;
                  const [x2, y2] = pts[c + 1];
                  return (
                    <path key={c} d={`M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`}
                      fill="none" stroke="url(#tapGold)" strokeLinecap="round"
                      strokeWidth={sw(i1)} opacity={op(i1)} filter={i1 >= 2 ? "url(#tapGlow)" : undefined} />
                  );
                })}
                {pts.map(([x, y, i], c) => i >= 3 ? (
                  // Nudo de oro con forma de DIAMANTE (la pupila del Iudex)
                  <path key={c} d={`M ${x} ${(y - 3.4).toFixed(1)} L ${(x + 2.4).toFixed(1)} ${y.toFixed(1)} L ${x} ${(y + 3.4).toFixed(1)} L ${(x - 2.4).toFixed(1)} ${y.toFixed(1)} Z`}
                    fill="#FBF0C8" filter="url(#tapGlow)" />
                ) : null)}
              </g>
            );
          })}
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
          <LegendItem color="#24426e" label="en calma" />
          <LegendItem gradient label="hilo activo" />
          <LegendItem color="#FBF0C8" glow label="nudo de oro" />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div style={{ flex: 1, background: C.paper, borderRadius: 12, border: `1px solid ${C.paperEdge}`, padding: "13px 15px" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600,
        background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", width: "fit-content" }}>{value}</div>
      <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function LegendItem({ color, gradient, glow, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 22, height: 4, borderRadius: 3,
        background: gradient ? "linear-gradient(90deg,#A6741E,#E8B84B)" : color,
        boxShadow: glow ? "0 0 6px #E8B84B" : "none" }} />
      <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: C.sepia }}>{label}</span>
    </span>
  );
}
