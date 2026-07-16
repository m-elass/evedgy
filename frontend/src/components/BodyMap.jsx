/*
 * components/BodyMap.jsx
 * ──────────────────────
 * Diagrama anatómico de los músculos trabajados, usando la librería
 * react-body-highlighter (cuerpos SVG dibujados por profesionales).
 *
 * Muestra vista frontal (anterior) y trasera (posterior). Los músculos
 * primarios se pintan en oro pleno y los secundarios en oro tenue, traducidos
 * desde los ids del backend con muscleMap.
 *
 * IMPORTANTE — instalación:
 *   La librería se carga de forma perezosa para que la app compile y funcione
 *   AUNQUE no esté instalada. Si no la tienes, verás un aviso pidiéndote
 *   instalarla con:  npm install react-body-highlighter
 *   Una vez instalada, el cuerpo anatómico aparece automáticamente, sin tocar
 *   nada más.
 */
import React, { Suspense, useState, useEffect } from "react";
import { C, FONT_BODY } from "../lib/theme";
import { MUSCLE_TO_SLUGS } from "./muscleMap";

// slug (librería) -> nombre en español, invirtiendo el mapa
const SLUG_TO_NAME = {};
const NAMES = { pecho:"Pecho", hombros:"Hombros", biceps:"Bíceps", triceps:"Tríceps", antebrazo:"Antebrazos", abdomen:"Abdomen", oblicuos:"Oblicuos", cuadriceps:"Cuádriceps", femoral:"Femorales", gluteos:"Glúteos", gemelos:"Gemelos", trapecio:"Trapecio", dorsal:"Dorsales", lumbar:"Lumbares" };
for (const [id, slugs] of Object.entries(MUSCLE_TO_SLUGS)) for (const sl of slugs) SLUG_TO_NAME[sl] = NAMES[id] || id;
import { toSlugs } from "./muscleMap";

// Carga perezosa: si el paquete no existe, capturamos el error y mostramos aviso.
const Model = React.lazy(() =>
  import("react-body-highlighter")
    .then((m) => ({ default: m.default }))
    .catch(() => ({ default: null }))
);

// Colores de relleno según frecuencia (la librería usa highlightedColors[freq-1]).
// freq 1 = secundario (oro tenue), freq 2 = primario (oro pleno).
const GOLD_SOFT = "#D9924E";   // ámbar cálido (secundarios)
const GOLD = "#F2C24C";        // oro vivo (principales)

export default function BodyMap({ primary = [], secondary = [], size = 150 }) {
  const [libOk, setLibOk] = useState(null); // null=comprobando, true/false
  const [tapped, setTapped] = useState(""); // músculo tocado (su nombre)

  useEffect(() => {
    let alive = true;
    import("react-body-highlighter")
      .then((m) => { if (alive) setLibOk(!!m.default); })
      .catch(() => { if (alive) setLibOk(false); });
    return () => { alive = false; };
  }, []);

  // Construimos el "data" que espera la librería: cada músculo con su frecuencia
  // (2 = primario, 1 = secundario). La librería pinta según highlightedColors.
  const primarySlugs = toSlugs(primary);
  const secondarySlugs = toSlugs(secondary);
  const data = [
    { name: "Principal", muscles: primarySlugs, frequency: 2 },
    { name: "Secundario", muscles: secondarySlugs, frequency: 1 },
  ];

  // Aviso si la librería no está instalada (entorno sin el paquete).
  if (libOk === false) {
    return (
      <div style={{ background: C.inkSoft, border: `1px dashed ${C.paperEdge}`, borderRadius: 12,
        padding: "16px 18px", textAlign: "center" }}>
        <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk, marginBottom: 6 }}>
          El cuerpo anatómico necesita una librería extra.
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, lineHeight: 1.5 }}>
          Instálala una vez con <code style={{ color: C.olive }}>npm install react-body-highlighter</code> y
          el diagrama aparecerá aquí automáticamente. Mientras, abajo tienes la lista de músculos.
        </div>
      </div>
    );
  }

  if (libOk === null) {
    return <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, padding: 12 }}>Cargando cuerpo…</div>;
  }

  const onTap = (d) => setTapped(SLUG_TO_NAME[d?.muscle] || "");

  return (
    <Suspense fallback={<div style={{ color: C.sepia, padding: 12, fontFamily: FONT_BODY, fontSize: 13 }}>Cargando cuerpo…</div>}>
      {/* El "espécimen": halo radial tras el cuerpo, como en una vitrina */}
      <div style={{ position: "relative", borderRadius: 14, padding: "14px 6px 8px",
        background: "radial-gradient(ellipse at 50% 22%, rgba(255,186,140,.10), transparent 58%), radial-gradient(ellipse at 50% 102%, rgba(0,0,0,.5), transparent 66%)" }}>

        {/* El taller del escultor: fibra muscular + volumen, tallados con luz.
            feTurbulence dibuja estrías verticales que se multiplican sobre la
            carne; dos biseles (luz arriba-izquierda, sombra abajo-derecha) dan
            relieve de músculo real. Se aplica a ambos cuerpos vía url(#muscleFx). */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <filter id="muscleFx" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="2" seed="7" result="n" />
              <feColorMatrix in="n" type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.35 0.35 0.35 0 0" result="na" />
              <feComposite in="na" in2="SourceAlpha" operator="in" result="fA" />
              <feFlood floodColor="#230a0a" floodOpacity="0.5" result="dk" />
              <feComposite in="dk" in2="fA" operator="in" result="fibras" />
              <feBlend in="SourceGraphic" in2="fibras" mode="multiply" result="tex" />
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="ba" />
              <feOffset in="ba" dx="1.6" dy="2.6" result="lo" />
              <feComposite in="SourceAlpha" in2="lo" operator="out" result="loM" />
              <feFlood floodColor="#140505" floodOpacity="0.6" result="shF" />
              <feComposite in="shF" in2="loM" operator="in" result="sombra" />
              <feOffset in="ba" dx="-1.4" dy="-2.2" result="hi" />
              <feComposite in="SourceAlpha" in2="hi" operator="out" result="hiM" />
              <feFlood floodColor="#FFD9BF" floodOpacity="0.5" result="rlF" />
              <feComposite in="rlF" in2="hiM" operator="in" result="luz" />
              <feMerge>
                <feMergeNode in="tex" /><feMergeNode in="sombra" /><feMergeNode in="luz" />
              </feMerge>
            </filter>
          </defs>
        </svg>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
          <BodyView data={data} type="anterior" size={size} label="Frente" onTap={onTap} />
          <BodyView data={data} type="posterior" size={size} label="Espalda" onTap={onTap} />
        </div>
        {/* Nombre del músculo tocado */}
        <div style={{ textAlign: "center", minHeight: 20, marginTop: 6, fontFamily: FONT_BODY,
          fontSize: 12.5, color: tapped ? C.olive : C.sepia, fontWeight: tapped ? 700 : 400 }}>
          {tapped || "Toca un músculo para ver su nombre"}
        </div>
      </div>
    </Suspense>
  );
}

function BodyView({ data, type, size, label, onTap }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ display: "block",
        filter: "url(#muscleFx) drop-shadow(0 9px 16px rgba(0,0,0,.5)) drop-shadow(0 0 12px rgba(242,194,76,.18))" }}>
      <Model
        data={data}
        type={type}
        style={{ width: size }}
        onClick={onTap}
        highlightedColors={[GOLD_SOFT, GOLD]}  /* [freq1, freq2] */
        bodyColor="#6E3A34"                     /* carne en reposo (rojo anatómico) */
      />
      </span>
      <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.sepia, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</span>
    </div>
  );
}
