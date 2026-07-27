/*
 * sections/Anatomy.jsx
 * ────────────────────
 * Tu semana, en tu cuerpo. Toma todo lo entrenado en los últimos 7 días y lo
 * pinta sobre el cuerpo anatómico: en oro pleno los grupos que más trabajaste,
 * en oro tenue los que tocaste de pasada, y en reposo lo que descansó.
 * De un vistazo ves qué has cubierto y qué te espera.
 */
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { SectionHeader, Loading, Empty } from "../components/ui";
import { HelpDot } from "../components/Help";
import BodyMap from "../components/BodyMap";

const NAMES = { pecho: "Pecho", hombros: "Hombros", biceps: "Bíceps", triceps: "Tríceps",
  antebrazo: "Antebrazos", abdomen: "Abdomen", oblicuos: "Oblicuos", cuadriceps: "Cuádriceps",
  femoral: "Femorales", gluteos: "Glúteos", gemelos: "Gemelos", trapecio: "Trapecio",
  dorsal: "Espalda alta", lumbar: "Lumbares", hombros_post: "Hombro posterior",
  aductores: "Aductores", abductores: "Abductores", cuello: "Cuello" };

export default function Anatomy() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.muscleWeek().then(setData).catch(() => setData({ has_data: false }));
  }, []);

  if (data === null) return (<><SectionHeader kicker="Cuerpo · Tu semana" title="Anatomía" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Cuerpo · Tu semana" title="Anatomía" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 16 }}>
        Los últimos 7 días de entrenamiento, pintados sobre tu cuerpo. Oro pleno donde más trabajaste; en reposo, lo que descansó.
      </p>

      {!data.has_data ? (
        <Empty text="Registra entrenamientos esta semana y aquí verás tu cuerpo iluminarse." />
      ) : (
        <div style={{ background: C.paper, border: `1px solid ${C.paperEdge}`, borderRadius: 16, padding: "16px 14px" }}>
          <BodyMap primary={data.primary} secondary={data.secondary} size={158} />

          {/* Desglose por grupo: barras de carga relativa */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".14em",
                textTransform: "uppercase", color: C.sepia, fontWeight: 700 }}>Carga por músculo</span>
              <HelpDot topic="muscle_week" size={14} label="¿Cómo se calcula la carga?" />
            </div>
            {Object.entries(data.loads).sort((a, b) => b[1] - a[1]).map(([m, v]) => {
              const max = Math.max(...Object.values(data.loads));
              const strong = data.primary.includes(m);
              return (
                <div key={m} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                  <span style={{ width: 92, fontFamily: FONT_BODY, fontSize: 12, color: C.sepiaInk }}>{(data.names && data.names[m]) || NAMES[m] || m}</span>
                  <div style={{ flex: 1, height: 6, background: C.paperEdge, borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ width: `${(v / max) * 100}%`, height: "100%",
                      background: strong ? GRAD.gold : "rgba(232,184,75,.4)" }} />
                  </div>
                  <span style={{ width: 30, textAlign: "right", fontFamily: FONT_BODY, fontSize: 11, color: C.sepia }}>{v}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia, marginTop: 10, lineHeight: 1.5 }}>
            La carga suma tus series (las de músculo principal cuentan doble). {data.sessions_count} {data.sessions_count === 1 ? "sesión" : "sesiones"} esta semana.
          </div>
        </div>
      )}
    </div>
  );
}
