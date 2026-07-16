/*
 * sections/Records.jsx
 * ────────────────────
 * Récords personales. Por cada ejercicio, tu peso máximo y tu mejor 1RM estimado
 * (fuerza máxima teórica). Cada uno luce un sello dorado: el oro de Iudex celebra
 * el logro. Ordenados por fuerza, para ver tus cimas de un vistazo.
 */
import React, { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Loading, Empty } from "../components/ui";

export default function Records() {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    api.records().then((r) => setRecords(r.records)).catch(() => setRecords([]));
  }, []);

  if (records === null) return (<><SectionHeader kicker="Cuerpo · Cimas" title="Récords" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Cuerpo · Cimas" title="Récords" />
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 18 }}>
        Tus mejores marcas. El 1RM es tu fuerza máxima teórica: permite comparar series de distinto peso y repeticiones.
      </p>

      {records.length === 0 && (
        <Empty text="Aún no hay récords. Registra entrenamientos y aquí aparecerán tus cimas, selladas en oro." />
      )}

      {records.map((r, i) => (
        <div key={r.exercise_id} style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`,
          padding: "16px 18px", marginBottom: 12, position: "relative", overflow: "hidden" }}>
          {/* La cima absoluta (primera de la lista) lleva borde dorado */}
          {i === 0 && <div style={{ position: "absolute", inset: 0, borderRadius: 14, padding: 1,
            background: GRAD.gold, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none", opacity: 0.7 }} />}

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Sello dorado */}
            <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: GRAD.gold,
              boxShadow: GLOW.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={22} color={C.cream} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: C.sepiaInk, fontWeight: 600 }}>{r.exercise}</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 2 }}>
                Máximo {r.max_weight}kg · 1RM est. {r.best_1rm}kg
                {r.pr_date && ` · ${new Date(r.pr_date + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
