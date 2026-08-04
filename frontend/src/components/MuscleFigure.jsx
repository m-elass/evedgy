/*
 * components/MuscleFigure.jsx — LA FIGURA ANATÓMICA
 * ─────────────────────────────────────────────────
 * Dibujo propio, sin librería externa. Cada músculo tiene su forma, así que
 * puede encenderse por separado: si un ejercicio trabaja la porción clavicular
 * del pectoral, se ilumina SOLO esa banda y el resto del pecho queda en reposo.
 *
 * Por qué está hecho a mano y no con la librería de antes:
 *   · La librería solo sabía pintar 16 regiones enteras ("pecho", "pierna").
 *     Aquí hay más de 60 músculos, incluidas porciones y cabezas.
 *   · La textura de fibra se hacía con un filtro SVG de 19 primitivas aplicado
 *     a un elemento HTML. En Safari de iPhone eso se rompía y rellenaba la zona
 *     con un bloque opaco (la "lámina azul"), además de ser lentísimo.
 *     Ahora el volumen se consigue con degradados reutilizados: 4 en total para
 *     toda la figura, sin filtros sobre HTML y sin carga diferida.
 *
 * Niveles de intensidad, de menos a más:
 *   reposo → asistente (ámbar) → principal (oro) → foco (oro incandescente)
 * El foco se usa cuando se conoce la carga relativa: el músculo más trabajado
 * de la semana brilla por encima de los demás.
 */
import React, { useMemo, useState } from "react";
import { FINE_TO_REGION } from "./muscleMap";

/* ── Paleta ─────────────────────────────────────────────────── */
const REST_A = "#7A4038";   // carne, luz
const REST_B = "#4A2622";   // carne, sombra
const SEC_A  = "#E09A52";   // asistente, luz
const SEC_B  = "#9C5A26";   // asistente, sombra
const PRI_A  = "#FFD873";   // principal, luz
const PRI_B  = "#C98F1E";   // principal, sombra
const FOC_A  = "#FFF6D5";   // foco, luz
const FOC_B  = "#F0B935";   // foco, sombra
const EDGE   = "#2A1512";   // separación entre músculos

/*
 * LAS FORMAS. Coordenadas del lado izquierdo del dibujo; el lado derecho se
 * genera reflejando (x → 200 − x, giro invertido). `m:false` = pieza central.
 * v: "a" = vista anterior (frente), "p" = posterior (espalda).
 */
const SHAPES = [
  // ═══════════ SILUETA (no es músculo: da forma al cuerpo) ═══════════
  { id: "_", v: "ab", cx: 100, cy: 27, rx: 17, ry: 20, m: false },   // cabeza
  { id: "_", v: "ab", cx: 100, cy: 50, rx: 9,  ry: 11, m: false },   // cuello
  { id: "_", v: "ab", cx: 100, cy: 88, rx: 37, ry: 30, m: false },   // tórax
  { id: "_", v: "ab", cx: 100, cy: 140, rx: 26, ry: 34, m: false },  // abdomen
  { id: "_", v: "ab", cx: 100, cy: 190, rx: 25, ry: 22, m: false },  // pelvis
  { id: "_", v: "ab", cx: 63, cy: 115, rx: 11, ry: 31, rot: -4 },    // brazo
  { id: "_", v: "ab", cx: 54, cy: 160, rx: 9,  ry: 27, rot: -7 },    // antebrazo
  { id: "_", v: "ab", cx: 48, cy: 188, rx: 5.5, ry: 8, rot: -7 },    // mano
  { id: "_", v: "ab", cx: 86, cy: 236, rx: 15, ry: 46 },             // muslo
  { id: "_", v: "ab", cx: 88, cy: 288, rx: 10, ry: 11 },             // rodilla
  { id: "_", v: "ab", cx: 88, cy: 332, rx: 10, ry: 36 },             // pierna
  { id: "_", v: "ab", cx: 86, cy: 379, rx: 7,  ry: 8 },              // pie

  // ═══════════ VISTA ANTERIOR ═══════════
  { id: "ecom", v: "a", cx: 93, cy: 52, rx: 4.5, ry: 9, rot: 8 },
  { id: "trap_sup", v: "a", cx: 82, cy: 62, rx: 12, ry: 6, rot: -12 },
  { id: "pec_menor", v: "a", cx: 78, cy: 80, rx: 6, ry: 4, rot: -20 },
  { id: "delt_ant", v: "a", cx: 69, cy: 78, rx: 11, ry: 14, rot: -12 },
  { id: "delt_lat", v: "a", cx: 59, cy: 82, rx: 7.5, ry: 13, rot: -18 },
  { id: "pec_sup", v: "a", cx: 85, cy: 73, rx: 14, ry: 6, rot: -6 },
  { id: "pec_med", v: "a", cx: 84, cy: 85, rx: 15, ry: 8, rot: -3 },
  { id: "pec_inf", v: "a", cx: 85, cy: 96, rx: 13.5, ry: 5.5, rot: 2 },
  { id: "serrato", v: "a", cx: 73, cy: 106, rx: 5, ry: 3, rot: 25 },
  { id: "serrato", v: "a", cx: 75, cy: 113, rx: 5, ry: 3, rot: 25 },
  { id: "serrato", v: "a", cx: 77, cy: 120, rx: 4.5, ry: 2.8, rot: 25 },
  { id: "coracobraq", v: "a", cx: 72, cy: 96, rx: 4, ry: 7, rot: -8 },
  { id: "biceps_largo", v: "a", cx: 62, cy: 107, rx: 6.5, ry: 15, rot: -6 },
  { id: "biceps_corto", v: "a", cx: 70, cy: 110, rx: 5, ry: 13, rot: -4 },
  { id: "braquial", v: "a", cx: 65, cy: 127, rx: 5.5, ry: 7 },
  { id: "supinador", v: "a", cx: 61, cy: 141, rx: 3.5, ry: 5, rot: -10 },
  { id: "braquiorr", v: "a", cx: 58, cy: 143, rx: 5.5, ry: 11, rot: -10 },
  { id: "pronador", v: "a", cx: 57, cy: 150, rx: 4, ry: 6, rot: -10 },
  { id: "flex_ante", v: "a", cx: 52, cy: 162, rx: 6.5, ry: 17, rot: -8 },
  { id: "transverso", v: "a", cx: 100, cy: 168, rx: 17, ry: 6, m: false },
  { id: "recto_abd_sup", v: "a", cx: 93, cy: 114, rx: 6.5, ry: 6.5 },
  { id: "recto_abd_sup", v: "a", cx: 93, cy: 128, rx: 6.5, ry: 6.5 },
  { id: "recto_abd_inf", v: "a", cx: 93, cy: 142, rx: 6.5, ry: 6.5 },
  { id: "recto_abd_inf", v: "a", cx: 93, cy: 156, rx: 6, ry: 6.5 },
  { id: "oblicuo_ext", v: "a", cx: 81, cy: 138, rx: 7, ry: 18, rot: 8 },
  { id: "oblicuo_int", v: "a", cx: 84, cy: 154, rx: 5.5, ry: 12, rot: 8 },
  { id: "psoas", v: "a", cx: 92, cy: 180, rx: 4.5, ry: 9, rot: 10 },
  { id: "tfl", v: "a", cx: 77, cy: 190, rx: 5.5, ry: 8, rot: 12 },
  { id: "gluteo_medio", v: "a", cx: 72, cy: 186, rx: 5, ry: 7, rot: 10 },
  { id: "aductores_c", v: "a", cx: 98, cy: 212, rx: 5, ry: 15 },
  { id: "aductor_mayor", v: "a", cx: 97, cy: 234, rx: 5.5, ry: 22 },
  { id: "gracil", v: "a", cx: 100, cy: 246, rx: 3, ry: 26 },
  { id: "sartorio", v: "a", cx: 90, cy: 228, rx: 3, ry: 34, rot: 10 },
  { id: "recto_fem", v: "a", cx: 86, cy: 224, rx: 7.5, ry: 30 },
  { id: "vastos", v: "a", cx: 76, cy: 227, rx: 7.5, ry: 30, rot: 3 },
  { id: "vastos", v: "a", cx: 92, cy: 262, rx: 6, ry: 14, rot: -6 },
  { id: "tibial_ant", v: "a", cx: 88, cy: 332, rx: 4.5, ry: 25, rot: 2 },
  { id: "peroneos", v: "a", cx: 80, cy: 334, rx: 3.5, ry: 20, rot: 2 },

  // ═══════════ VISTA POSTERIOR ═══════════
  { id: "cervical_post", v: "p", cx: 100, cy: 50, rx: 8, ry: 8, m: false },
  { id: "elevador", v: "p", cx: 92, cy: 58, rx: 4, ry: 7, rot: -10 },
  { id: "trap_sup", v: "p", cx: 86, cy: 64, rx: 13, ry: 9, rot: -12 },
  { id: "supraesp", v: "p", cx: 85, cy: 70, rx: 8, ry: 4.5, rot: -8 },
  { id: "delt_post", v: "p", cx: 68, cy: 79, rx: 11, ry: 14, rot: -12 },
  { id: "subescap", v: "p", cx: 87, cy: 84, rx: 6, ry: 5, rot: -8 },
  { id: "trap_med", v: "p", cx: 89, cy: 88, rx: 13, ry: 11, rot: -3 },
  { id: "infraesp", v: "p", cx: 82, cy: 92, rx: 9, ry: 8, rot: -8 },
  { id: "romboides", v: "p", cx: 92, cy: 97, rx: 6, ry: 11, rot: -12 },
  { id: "redondo_menor", v: "p", cx: 77, cy: 100, rx: 5.5, ry: 3.5, rot: -12 },
  { id: "redondo_mayor", v: "p", cx: 79, cy: 108, rx: 7, ry: 4.5, rot: -14 },
  { id: "trap_inf", v: "p", cx: 95, cy: 113, rx: 8, ry: 13, rot: -12 },
  { id: "tri_lat", v: "p", cx: 55, cy: 109, rx: 5.5, ry: 15, rot: -8 },
  { id: "tri_larga", v: "p", cx: 64, cy: 110, rx: 6.5, ry: 17, rot: -5 },
  { id: "tri_med", v: "p", cx: 60, cy: 130, rx: 4.5, ry: 8 },
  { id: "anconeo", v: "p", cx: 57, cy: 142, rx: 3, ry: 4 },
  { id: "ext_ante", v: "p", cx: 49, cy: 161, rx: 6.5, ry: 17, rot: -8 },
  { id: "dorsal_ancho", v: "p", cx: 81, cy: 127, rx: 13, ry: 25, rot: -10 },
  { id: "dorsal_inf", v: "p", cx: 89, cy: 152, rx: 8, ry: 11, rot: -22 },
  { id: "erectores", v: "p", cx: 95, cy: 152, rx: 4.5, ry: 28 },
  { id: "cuadrado_l", v: "p", cx: 90, cy: 166, rx: 4.5, ry: 11 },
  { id: "multifidos", v: "p", cx: 97, cy: 176, rx: 3, ry: 16 },
  { id: "gluteo_medio", v: "p", cx: 78, cy: 187, rx: 7, ry: 9, rot: -12 },
  { id: "gluteo_menor", v: "p", cx: 80, cy: 192, rx: 4.5, ry: 5.5 },
  { id: "rotadores_cad", v: "p", cx: 85, cy: 196, rx: 5.5, ry: 3.5, rot: -8 },
  { id: "gluteo_mayor", v: "p", cx: 87, cy: 202, rx: 12, ry: 16, rot: -4 },
  { id: "aductor_mayor", v: "p", cx: 99, cy: 232, rx: 5, ry: 17 },
  { id: "isq_bf_larga", v: "p", cx: 82, cy: 250, rx: 6.5, ry: 28, rot: 2 },
  { id: "isq_semitend", v: "p", cx: 95, cy: 250, rx: 5, ry: 27 },
  { id: "isq_semimem", v: "p", cx: 98, cy: 264, rx: 4.5, ry: 20 },
  { id: "isq_bf_corta", v: "p", cx: 83, cy: 278, rx: 5, ry: 12, rot: 2 },
  { id: "gastro_lat", v: "p", cx: 85, cy: 318, rx: 5.5, ry: 19, rot: 2 },
  { id: "gastro_med", v: "p", cx: 95, cy: 320, rx: 6, ry: 20, rot: -2 },
  { id: "tibial_post", v: "p", cx: 92, cy: 338, rx: 3, ry: 11 },
  { id: "soleo", v: "p", cx: 89, cy: 348, rx: 6.5, ry: 16 },
  { id: "peroneos", v: "p", cx: 82, cy: 340, rx: 3, ry: 13 },
];

/* Un músculo genérico enciende sus porciones */
const ALIAS = {
  recto_abd: ["recto_abd_sup", "recto_abd_inf"],
  gastro: ["gastro_med", "gastro_lat"],
  isquios: ["isq_bf_larga", "isq_bf_corta", "isq_semitend", "isq_semimem"],
  biceps_braq: ["biceps_largo", "biceps_corto"],
  rot_ext: ["infraesp", "redondo_menor"],
  aductores_m: ["aductor_mayor", "aductores_c", "gracil"],
};

/** Expande ids: alias, y regiones enteras ("dorsal" → todos sus músculos). */
function expand(ids = []) {
  const out = new Set();
  for (const raw of ids) {
    if (ALIAS[raw]) { ALIAS[raw].forEach((m) => out.add(m)); continue; }
    if (FINE_TO_REGION[raw]) { out.add(raw); continue; }
    // ¿es una región? entonces entran todos los músculos que la componen
    let esRegion = false;
    for (const [fine, region] of Object.entries(FINE_TO_REGION)) {
      if (region === raw) { out.add(fine); esRegion = true; }
    }
    if (!esRegion) out.add(raw);
  }
  return out;
}

export default function MuscleFigure({
  view = "a", primary = [], secondary = [], intensity = null,
  size = 150, names = null, onTap = null,
}) {
  const [tapped, setTapped] = useState(null);

  const pri = useMemo(() => expand(primary), [primary]);
  const sec = useMemo(() => expand(secondary), [secondary]);

  // El foco: si conocemos las cargas, el músculo más trabajado brilla más
  const topLoad = useMemo(() => {
    if (!intensity) return 0;
    const vals = Object.values(intensity);
    return vals.length ? Math.max(...vals) : 0;
  }, [intensity]);

  function levelOf(id) {
    if (pri.has(id)) {
      if (intensity && topLoad > 0) {
        const v = intensity[id] || 0;
        return v >= topLoad * 0.999 ? 3 : 2;      // el más cargado, incandescente
      }
      return 2;
    }
    if (sec.has(id)) return 1;
    return 0;
  }

  const shapes = SHAPES.filter((s) => s.v === view || s.v === "ab");

  return (
    <svg viewBox="0 0 200 430" width={size} height={size * 2.15}
      style={{ display: "block", overflow: "visible" }}
      role="img" aria-label={`Vista ${view === "a" ? "anterior" : "posterior"}`}>
      <defs>
        {/* Cuatro degradados para toda la figura: volumen sin coste */}
        {[["gRest", REST_A, REST_B], ["gSec", SEC_A, SEC_B],
          ["gPri", PRI_A, PRI_B], ["gFoc", FOC_A, FOC_B]].map(([id, a, b]) => (
          <linearGradient key={id} id={`${id}-${view}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        ))}
        {/* Un único resplandor, interno al SVG (seguro en iOS, dos primitivas) */}
        <filter id={`glow-${view}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Se dibuja por niveles: primero lo apagado, encima lo encendido */}
      {[0, 1, 2, 3].map((lvl) => {
        const piezas = shapes.filter((s) =>
          s.id === "_" ? lvl === 0 : levelOf(s.id) === lvl);
        if (!piezas.length) return null;
        const fill = lvl === 0 ? `url(#gRest-${view})`
          : lvl === 1 ? `url(#gSec-${view})`
          : lvl === 2 ? `url(#gPri-${view})` : `url(#gFoc-${view})`;
        return (
          <g key={lvl} filter={lvl >= 2 ? `url(#glow-${view})` : undefined}>
            {piezas.map((s, i) => {
              const lados = s.m === false ? [s] : [s, { ...s, cx: 200 - s.cx, rot: -(s.rot || 0) }];
              return lados.map((sh, j) => (
                <ellipse key={`${i}-${j}`} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry}
                  transform={sh.rot ? `rotate(${sh.rot} ${sh.cx} ${sh.cy})` : undefined}
                  fill={fill} stroke={EDGE} strokeWidth={s.id === "_" ? 0 : 0.7}
                  strokeOpacity={0.55}
                  opacity={s.id === "_" ? 0.95 : 1}
                  style={{ cursor: s.id === "_" ? "default" : "pointer" }}
                  onClick={s.id === "_" ? undefined : () => {
                    setTapped(s.id);
                    onTap && onTap(s.id, (names && names[s.id]) || s.id);
                  }} />
              ));
            })}
          </g>
        );
      })}

      {/* Contorno tenue del cuerpo, para que la figura se lea como una silueta */}
      <ellipse cx="100" cy="27" rx="17" ry="20" fill="none"
        stroke="rgba(255,220,190,.14)" strokeWidth="0.8" />
    </svg>
  );
}
