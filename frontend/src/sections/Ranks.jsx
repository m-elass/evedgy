/*
 * sections/Ranks.jsx
 * ──────────────────
 * Tus rangos de fuerza por ejercicio. Cada ejercicio con historial recibe una
 * insignia (Hierro→Maestro) según tu 1RM relativo a tu peso corporal, usando
 * estándares reales de la industria. Incluye el ajuste de peso y sexo, que el
 * cálculo necesita.
 */
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Field, SolidBtn, Loading, Empty } from "../components/ui";
import { HelpDot } from "../components/Help";
import RankBadge from "../components/RankBadge";

export default function Ranks() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bw, setBw] = useState("");
  const [sex, setSex] = useState("m");

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const p = await api.getProfile();
      setProfile(p); setBw(p.bodyweight ? String(p.bodyweight) : ""); setSex(p.sex || "m");
    } catch { setProfile({}); }
    try { setData(await api.allRanks()); } catch { setData({ ranks: [], needs_bodyweight: true }); }
  }
  async function saveProfile() {
    await api.updateProfile({ bodyweight: parseFloat(bw) || 0, sex });
    setEditing(false); load();
  }

  if (data === null) return (<><SectionHeader kicker="Cuerpo · Rangos" title="Tus rangos" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Cuerpo · Rangos" title="Tus rangos" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 16 }}>
        Tu nivel en cada ejercicio según tu fuerza relativa a tu peso, con estándares reales. Escala desde Hierro hasta Maestro.
      </p>

      {/* Ajuste de peso corporal y sexo */}
      {(data.needs_bodyweight || editing) ? (
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, marginBottom: 12 }}>
            {data.needs_bodyweight ? "Para calcular tus rangos, dinos tu peso y sexo:" : "Ajusta tu peso y sexo:"}
          </div>
          <Field label="Peso corporal (kg)" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="80" />
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.sepia, marginBottom: 8 }}>Sexo (para los estándares)</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["m", "Hombre"], ["f", "Mujer"]].map(([k, lab]) => (
              <button key={k} onClick={() => setSex(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                fontFamily: FONT_BODY, fontSize: 13, background: sex === k ? GRAD.gold : C.inkSoft,
                color: sex === k ? C.cream : C.sepia, border: `1px solid ${sex === k ? "transparent" : C.paperEdge}`,
                fontWeight: sex === k ? 600 : 400 }}>{lab}</button>
            ))}
          </div>
          <SolidBtn label="Guardar" onClick={saveProfile} />
        </div>
      ) : (
        <button onClick={() => setEditing(true)} style={{ background: "none", border: `1px solid ${C.paperEdge}`,
          borderRadius: 8, padding: "8px 14px", color: C.sepia, fontFamily: FONT_BODY, fontSize: 12.5,
          cursor: "pointer", marginBottom: 16 }}>
          Peso: {profile?.bodyweight}kg · {profile?.sex === "f" ? "Mujer" : "Hombre"} · Ajustar
        </button>
      )}

      {!data.needs_bodyweight && data.ranks.length === 0 && (
        <Empty text="Registra entrenamientos y aquí verás tu rango en cada ejercicio." />
      )}

      {/* Insignias */}
      {data.ranks.filter((r) => r.has_rank).map((r, i) => (
        <div key={r.exercise_id} style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`,
          padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
          <RankBadge color={r.badge.color} size={54} glow={r.badge.id === "oro"} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: C.sepiaInk, fontWeight: 600 }}>{r.exercise}</span>
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: r.badge.color, marginTop: 1 }}>
              {r.badge.name}{r.tier ? ` ${r.tier}` : ""}
              <HelpDot topic="rank_badge" size={13} label="¿Cómo se calcula el rango?" />
            </div>
            {/* Barra de progreso a la siguiente subdivisión o rango */}
            {r.next_badge && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 6, background: C.paperEdge, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(r.progress * 100)}%`, height: "100%",
                    background: `linear-gradient(90deg, ${r.badge.color}, ${r.next_badge.color})` }} />
                </div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia, marginTop: 4 }}>
                  {r.target_weight}kg para {r.next_badge.name}{r.next_tier ? ` ${r.next_tier}` : ""}
                </div>
              </div>
            )}
            {!r.next_badge && (
              <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia, marginTop: 4 }}>Rango máximo alcanzado</div>
            )}
          </div>
        </div>
      ))}

      {/* Escala de referencia */}
      {data.badges && !data.needs_bodyweight && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.sepia, marginBottom: 12 }}>La escala</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
            {data.badges.map((b) => (
              <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 60 }}>
                <RankBadge color={b.color} size={34} />
                <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: C.sepia }}>{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
