/*
 * components/BodyMap.jsx — EL CUERPO
 * ──────────────────────────────────
 * Muestra las dos vistas (frente y espalda) de la figura anatómica y pone
 * nombre a lo que tocas.
 *
 * Reescrito para arreglar un fallo real: antes cargaba una librería externa
 * de forma diferida y le aplicaba un filtro SVG de 19 primitivas sobre un
 * elemento HTML. En Safari de iPhone ese filtro se rompía y tapaba la zona
 * con un bloque opaco, y además iba lento. Ahora el dibujo es propio, sin
 * carga diferida y sin filtros sobre HTML: aparece al instante y no se rompe.
 */
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { C, FONT_BODY } from "../lib/theme";
import MuscleFigure from "./MuscleFigure";

let NAMES_CACHE = null;   // el catálogo de nombres se pide una sola vez

export default function BodyMap({ primary = [], secondary = [], intensity = null, size = 150 }) {
  const [names, setNames] = useState(NAMES_CACHE);
  const [tapped, setTapped] = useState("");

  useEffect(() => {
    if (NAMES_CACHE) return;
    api.muscleCatalog()
      .then((r) => { NAMES_CACHE = r.muscles; setNames(r.muscles); })
      .catch(() => {});
  }, []);

  const onTap = (id, nombre) => setTapped(nombre || id);

  return (
    <div style={{ position: "relative", borderRadius: 14, padding: "12px 4px 6px",
      background: "radial-gradient(ellipse at 50% 18%, rgba(255,186,140,.10), transparent 58%), radial-gradient(ellipse at 50% 104%, rgba(0,0,0,.45), transparent 62%)" }}>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        {[["a", "Frente"], ["p", "Espalda"]].map(([v, label]) => (
          <div key={v} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <MuscleFigure view={v} primary={primary} secondary={secondary}
              intensity={intensity} size={size} names={names} onTap={onTap} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 10, letterSpacing: ".14em",
              textTransform: "uppercase", color: C.sepia }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", minHeight: 34, marginTop: 8, padding: "0 8px",
        fontFamily: FONT_BODY, fontSize: 12.5, lineHeight: 1.4,
        color: tapped ? C.olive : C.sepia, fontWeight: tapped ? 700 : 400 }}>
        {tapped || "Toca un músculo para ver su nombre"}
      </div>
    </div>
  );
}
