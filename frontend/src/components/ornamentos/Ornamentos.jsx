/*
 * ornamentos/Ornamentos.jsx — el SISTEMA ORNAMENTAL de las páginas internas.
 * ──────────────────────────────────────────────────────────────────────────
 * Componentes paramétricos reconstruidos con geometría propia (SVG + CSS),
 * inspirados en la lámina «Elementos de diseño — inspirados en Neuvillette».
 * La lámina es solo referencia: aquí no hay imágenes, recortes ni sprites.
 *
 *   FontaineDiamond · WaterDrop · LiquidStar · SectionGlyph · AstralSeal ·
 *   WaterDivider · HydroFrame · WaterArc · HydroFiligree · HydraulicWing ·
 *   AquaticMoon · SuspendedCrystal · OrbitalDecoration · LightDust ·
 *   RelicElement · InteractionOrnament · WaterDrawing · ConcentricRipple
 *
 * Reglas del sistema:
 *  - Forma → geometría → composición; después luz. Ningún ornamento usa
 *    filtros de desenfoque: los brillos son degradados radiales (baratos).
 *  - Todos conservan sus proporciones (viewBox + xMidYMid meet) y no reciben
 *    toques (pointer-events: none): nunca tapan ni bloquean el contenido.
 *  - Lo que se mueve de forma continua se anima en la capa HTML/raíz del SVG
 *    (transform/opacidad, en la GPU); lo de dentro solo en la ceremonia.
 */
import React, { useEffect, useMemo, useRef } from "react";
import {
  P, TAU, lin, poli, lerp, estrella4, destello, huso, gota, mediaLuna, cinta, pluma, rizo, marcas,
  sobreCirculo, ojiva, arco, circulo, elipsePts, suave, azar, semillaDe,
} from "./geometria";
import { Cristal, Engaste, Destello, GotaCristal, Huso, EstrellaFacetada, Halo, Eje, Diamante, DIB } from "./piezas";
import { useTheme } from "../../lib/ThemeContext";

const { PI, sin, cos } = Math;

/* ── el lienzo común: proporciones fijas, decorativo, sin toques ── */
function Lienzo({ vb, alto, ancho, className = "", style, ceremonia, children }) {
  const w = ancho ?? (alto * vb[2]) / vb[3];
  const h = alto ?? (ancho * vb[3]) / vb[2];
  return (
    <svg className={"orn " + (ceremonia ? "orn-ceremonia " : "") + className} viewBox={vb.join(" ")}
      width={round(w)} height={round(h)} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={style}>
      {children}
    </svg>
  );
}
const round = (v) => Math.round(v * 10) / 10;

/* ═══════════ DEFINICIONES COMPARTIDAS (degradados) ═══════════
 * Un único SVG invisible con los degradados de todo el sistema. Los colores
 * salen de variables CSS de :root (paleta ornamental), así un tema claro
 * puede ajustarlos. También marca <html data-orn="claro|oscuro"> según el tema. */
const ZONAS_TONO = ["hoy", "cuerpo", "saber", "hacer", "mente", "vida", "ajustes"];
const s = (c, o = 1) => ({ stopColor: `var(--orn-${c})`, stopOpacity: o });

export function OrnamentDefs() {
  const { theme } = useTheme();
  useEffect(() => {
    const hex = theme?.colors?.paper || "#1E3B6B";
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    document.documentElement.dataset.orn = lum > 0.6 ? "claro" : "oscuro";
  }, [theme]);
  return (
    <svg className="orn-defs" aria-hidden="true" focusable="false">
      <defs>
        {/* facetas del cristal: la luz entra por arriba a la izquierda */}
        <linearGradient id="orn-f1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={s("luz", 0.96)} /><stop offset=".5" style={s("hielo", 0.92)} /><stop offset="1" style={s("agua", 0.8)} />
        </linearGradient>
        <linearGradient id="orn-f2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" style={s("hielo", 0.88)} /><stop offset=".55" style={s("agua", 0.85)} /><stop offset="1" style={s("azul", 0.9)} />
        </linearGradient>
        <linearGradient id="orn-f3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={s("agua", 0.88)} /><stop offset="1" style={s("azul", 0.94)} />
        </linearGradient>
        <linearGradient id="orn-f4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={s("azul", 0.92)} /><stop offset="1" style={s("noche", 0.96)} />
        </linearGradient>
        <linearGradient id="orn-fi" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={s("luz", 1)} /><stop offset="1" style={s("hielo", 0.55)} />
        </linearGradient>
        {/* núcleo de luz y halos (sin desenfoque) */}
        <radialGradient id="orn-nucleo">
          <stop offset="0" stopColor="#fff" stopOpacity="1" /><stop offset=".28" style={s("luz", 0.9)} />
          <stop offset=".62" style={s("hielo", 0.32)} /><stop offset="1" style={s("hielo", 0)} />
        </radialGradient>
        <radialGradient id="orn-halo">
          <stop offset="0" style={s("hielo", 0.5)} /><stop offset=".38" style={s("agua", 0.18)} /><stop offset="1" style={s("agua", 0)} />
        </radialGradient>
        <radialGradient id="orn-halo-oro">
          <stop offset="0" style={s("champan", 0.62)} /><stop offset=".4" style={s("oro", 0.2)} /><stop offset="1" style={s("oro", 0)} />
        </radialGradient>
        {ZONAS_TONO.map((z) => (
          <radialGradient key={z} id={"orn-zh-" + z}>
            <stop offset="0" style={{ stopColor: `var(--orn-z-${z})`, stopOpacity: 0.5 }} />
            <stop offset=".42" style={{ stopColor: `var(--orn-z-${z})`, stopOpacity: 0.14 }} />
            <stop offset="1" style={{ stopColor: `var(--orn-z-${z})`, stopOpacity: 0 }} />
          </radialGradient>
        ))}
        {/* vidrio de agua: alas, lunas, cintas */}
        <linearGradient id="orn-vidrio" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={s("luz", 0.62)} /><stop offset=".3" style={s("hielo", 0.34)} />
          <stop offset=".68" style={s("agua", 0.16)} /><stop offset="1" style={s("azul", 0.06)} />
        </linearGradient>
        <linearGradient id="orn-vidrio-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={s("luz", 0.5)} /><stop offset=".45" style={s("hielo", 0.24)} /><stop offset="1" style={s("azul", 0.04)} />
        </linearGradient>
        <linearGradient id="orn-agua-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={s("hielo", 0.8)} /><stop offset=".22" style={s("agua", 0.6)} />
          <stop offset=".65" style={s("agua", 0.25)} /><stop offset="1" style={s("azul", 0)} />
        </linearGradient>
        <linearGradient id="orn-agua-c" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={s("agua", 0)} /><stop offset=".3" style={s("hielo", 0.42)} />
          <stop offset=".62" style={s("luz", 0.55)} /><stop offset="1" style={s("agua", 0)} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ═══════════ 4 · DIAMANTES DE FONTAINE ═══════════ */
const DIAMANTE = {
  principal: { vb: [-62, -114, 124, 228], alto: 64 },
  secundario: { vb: [-46, -92, 92, 184], alto: 48 },
  pequeno: { vb: [-24, -60, 48, 120], alto: 30 },
  micro: { vb: [-9, -16, 18, 32], alto: 14 },
  divisor: { vb: [-16, -124, 32, 248], alto: 110 },
};
export function FontaineDiamond({ variante = "principal", size, className = "", style, ceremonia }) {
  const cfg = DIAMANTE[variante] || DIAMANTE.principal;
  const alto = size || cfg.alto;
  const u = cfg.vb[3] / alto;
  let cuerpo;
  if (variante === "principal") {
    cuerpo = <>
      <Halo r={74} opacidad={0.5} />
      <Engaste rx={47} arriba={102} abajo={106} cintura={0.46} u={u} />
      <Engaste rx={38} arriba={84} abajo={90} cintura={0.3} u={u} velo={false} opacidad={0.45} />
      <Cristal y={6} w={64} h={150} k={0.46} u={u} />
      <Destello x={47} y={0} r={12} alto={0.75} halo={0.6} />
      <Destello x={-47} y={0} r={12} alto={0.75} halo={0.6} />
      <Destello x={0} y={-100} r={10} alto={1.7} halo={0.8} />
      <Destello x={0} y={106} r={5} alto={1.4} oro />
    </>;
  } else if (variante === "secundario") {
    cuerpo = <>
      <Halo r={58} opacidad={0.45} />
      <Engaste rx={33} arriba={84} abajo={86} cintura={0.42} u={u} />
      <Cristal y={4} w={56} h={128} k={0.47} u={u} />
      <Destello x={0} y={-84} r={8} alto={1.6} halo={0.7} />
    </>;
  } else if (variante === "pequeno") {
    cuerpo = <>
      <Halo r={32} opacidad={0.45} />
      <Engaste rx={17} arriba={52} abajo={50} cintura={0.46} u={u} velo={false} opacidad={0.8} />
      <Cristal y={0} w={30} h={70} k={0.5} u={u} interior={false} />
      <Destello x={0} y={-52} r={6} alto={1.6} />
    </>;
  } else if (variante === "micro") {
    cuerpo = <Cristal y={0} w={13} h={26} k={0.5} u={u} interior={false} nucleo={0.9} />;
  } else {   // divisor vertical
    cuerpo = <>
      <Eje y1={-120} y2={116} u={u} opacidad={0.75} />
      <Diamante x={0} y={-104} w={11} h={22} u={u} />
      <Cristal y={34} w={15} h={28} u={u} interior={false} />
      <Cristal y={66} w={17} h={32} u={u} interior={false} />
      <Cristal y={100} w={15} h={28} u={u} interior={false} />
      <Destello x={0} y={-60} r={4} alto={1.5} />
    </>;
  }
  return <Lienzo vb={cfg.vb} alto={alto} className={"orn-diamante " + className} style={style} ceremonia={ceremonia}>{cuerpo}</Lienzo>;
}

/* Gema de estado teñida (sustituye al punto de color: mismo significado, forma de cristal). */
export function GemaEstado({ color, size = 15, style }) {
  return (
    <svg className="orn orn-gema" viewBox="-6 -9 12 18" width={round(size * 0.66)} height={size} aria-hidden="true" focusable="false"
      style={{ color, flexShrink: 0, ...style }}>
      <path d="M0 -8.4L5.2 -0.6L0 8.4L-5.2 -0.6Z" fill="currentColor" />
      <path d="M0 -8.4L-5.2 -0.6L0 -0.6Z" fill="#fff" opacity=".5" />
      <path d="M0 -8.4L5.2 -0.6L0 -0.6Z" fill="#fff" opacity=".2" />
      <path d="M0 8.4L5.2 -0.6L0 -0.6Z" fill="#000" opacity=".22" />
      <circle cx="0" cy="-0.6" r="1.6" fill="#fff" opacity=".85" />
    </svg>
  );
}

/* ═══════════ 2 · GOTAS / LÁGRIMAS ═══════════ */
const GOTA = {
  pequena: { vb: [-10, -14, 20, 28], alto: 16 },
  alargada: { vb: [-20, -92, 40, 184], alto: 60 },
  cristalina: { vb: [-34, -112, 68, 186], alto: 66 },
  lagrima: { vb: [-36, -84, 72, 168], alto: 60 },
  estrella: { vb: [-28, -50, 56, 100], alto: 42 },
  nucleo: { vb: [-32, -42, 64, 84], alto: 36 },
};
export function WaterDrop({ variante = "cristalina", size, className = "", style, ceremonia }) {
  const cfg = GOTA[variante] || GOTA.cristalina;
  const alto = size || cfg.alto;
  const u = cfg.vb[3] / alto;
  let cuerpo;
  switch (variante) {
    case "pequena":
      cuerpo = <GotaCristal y={1} w={13} h={22} u={u} nucleo={0.8} />;
      break;
    case "alargada":
      cuerpo = <>
        <Eje y1={-90} y2={-62} u={u} />
        <Huso y={-6} w={18} h={112} u={u} />
        <Eje y1={52} y2={84} u={u} opacidad={0.6} />
        <Diamante x={0} y={70} w={9} h={18} u={u} chispa={false} />
        <Destello x={0} y={-88} r={5} alto={1.6} />
      </>;
      break;
    case "lagrima":
      cuerpo = <>
        <Eje y1={-80} y2={-36} u={u} />
        <Diamante x={0} y={-60} w={8} h={16} u={u} />
        <path d={gota(0, -2, 58, 86).d} className="orn-oro orn-d-forma" strokeWidth={0.8 * u} opacity=".8" {...DIB} />
        <GotaCristal y={0} w={46} h={72} u={u} />
        <Eje y1={40} y2={78} u={u} opacidad={0.7} />
        <Diamante x={0} y={60} w={9} h={18} u={u} chispa={false} />
      </>;
      break;
    case "estrella":
      cuerpo = <>
        <Halo r={34} opacidad={0.4} />
        <GotaCristal y={10} w={36} h={58} u={u} nucleo={0.7} />
        <Halo x={0} y={-24} r={18} opacidad={0.7} className="orn-d-chispa" />
        <path d={destello(0, -24, 13, 1.7, 0.86)} className="orn-relleno-oro orn-d-chispa" />
      </>;
      break;
    case "nucleo":
      cuerpo = <>
        <Halo y={6} r={40} opacidad={0.6} />
        <GotaCristal y={0} w={40} h={64} u={u} nucleo={1} />
        <circle cx="0" cy="10" r="8" fill="url(#orn-nucleo)" className="orn-d-calma" />
        <Destello x={0} y={10} r={6} alto={1.2} />
      </>;
      break;
    default:   // cristalina («icono» de la lámina)
      cuerpo = <>
        <Eje y1={-108} y2={-42} u={u} />
        <Destello x={0} y={-104} r={6} alto={1.8} halo={0.6} />
        <path d={gota(0, -4, 52, 96).d} className="orn-oro orn-d-forma" strokeWidth={0.8 * u} opacity=".75" {...DIB} />
        <GotaCristal y={0} w={40} h={78} u={u} />
        <Eje y1={42} y2={66} u={u} opacidad={0.7} />
        <Diamante x={0} y={58} w={8} h={16} u={u} chispa={false} />
      </>;
  }
  return <Lienzo vb={cfg.vb} alto={alto} className={"orn-gota " + className} style={style} ceremonia={ceremonia}>{cuerpo}</Lienzo>;
}

/* ═══════════ 11 · ESTRELLAS LÍQUIDAS (una estrella nacida de una gota) ═══════════ */
const ESTRELLA = {
  principal: { vb: [-60, -112, 120, 220], alto: 64 },
  secundaria: { vb: [-34, -98, 68, 196], alto: 52 },
  pequena: { vb: [-30, -58, 60, 116], alto: 30 },
};
export function LiquidStar({ variante = "principal", size, className = "", style, ceremonia, oro = false }) {
  const cfg = ESTRELLA[variante] || ESTRELLA.principal;
  const alto = size || cfg.alto;
  const u = cfg.vb[3] / alto;
  let cuerpo;
  if (variante === "principal") {
    cuerpo = <>
      <Halo r={66} opacidad={0.55} />
      <Halo r={30} opacidad={0.5} tono={oro ? "hoy" : ""} />
      <Engaste rx={50} arriba={104} abajo={96} cintura={0.74} u={u} />
      <EstrellaFacetada rx={24} arriba={44} abajo={36} cintura={0.3} u={u} />
      <GotaCristal y={66} w={9} h={15} u={u} nucleo={0.6} filo={0.6} />
      <Destello x={52} y={0} r={9} alto={0.8} oro halo={0.6} />
      <Destello x={-52} y={0} r={9} alto={0.8} oro halo={0.6} />
      <Destello x={0} y={-104} r={6} alto={1.7} />
    </>;
  } else if (variante === "secundaria") {
    cuerpo = <>
      <Halo r={40} opacidad={0.5} />
      <Engaste rx={30} arriba={94} abajo={86} cintura={0.8} u={u} velo={false} />
      <EstrellaFacetada rx={14} arriba={28} abajo={22} cintura={0.3} u={u} />
      <Diamante x={0} y={60} w={7} h={13} u={u} chispa={false} />
      <Destello x={0} y={-94} r={4} alto={1.6} oro />
    </>;
  } else {
    cuerpo = <>
      <Halo r={30} opacidad={0.6} />
      <path d={destello(0, 0, 26, 2.1, 0.9)} className="orn-relleno-oro orn-d-chispa" opacity=".9" />
      <EstrellaFacetada rx={11} arriba={20} abajo={16} cintura={0.3} u={u} />
      <circle cx="0" cy="38" r="2" className="orn-relleno-luz orn-d-chispa" opacity=".8" />
    </>;
  }
  return <Lienzo vb={cfg.vb} alto={alto} className={"orn-estrella " + className} style={style} ceremonia={ceremonia}>{cuerpo}</Lienzo>;
}

/* ═══════════ 3 · GLIFOS DE SECCIÓN ═══════════
 * Mismo esqueleto (eje con diamantes, anillo, paréntesis de oro, destellos
 * laterales) y un corazón distinto por constelación. Nada de iconos genéricos. */
const VB_GLIFO = [-52, -64, 104, 128];

function esqueleto(u, { anillo = 28, ojivaW = 70, ojivaH = 96, ojivaC = 0.18, laterales = 30, arriba = -62, abajo = 62, conAnillo = true, conOjiva = true } = {}) {
  const oj = ojiva(0, 0, ojivaW, ojivaH, ojivaC);
  return <>
    <Eje y1={arriba} y2={-ojivaH / 2 + 2} u={u} />
    <Eje y1={ojivaH / 2 - 2} y2={abajo} u={u} opacidad={0.7} />
    {conAnillo && <path d={circulo(0, 0, anillo)} className="orn-hielo orn-d-forma" strokeWidth={0.75 * u} opacity=".6" {...DIB} />}
    {conOjiva && <>
      <path d={oj.izq} className="orn-oro orn-d-forma" strokeWidth={0.8 * u} opacity=".88" {...DIB} />
      <path d={oj.der} className="orn-oro orn-d-forma" strokeWidth={0.8 * u} opacity=".88" {...DIB} />
    </>}
    <Diamante x={0} y={arriba + 12} w={8} h={16} u={u} />
    <Diamante x={0} y={abajo - 10} w={7} h={14} u={u} chispa={false} />
    {laterales > 0 && <>
      <Destello x={laterales} y={0} r={5} alto={0.8} />
      <Destello x={-laterales} y={0} r={5} alto={0.8} />
    </>}
  </>;
}

/* El corazón de cada glifo (también lo usan los sellos). */
const CORAZON = {
  cuerpo: (u) => <>
    <Huso y={0} w={15} h={58} u={u} />
    <path d={[-15, -5, 5, 15].map((y) => `M0 ${y}L-9 ${y - 6}M0 ${y}L9 ${y - 6}`).join("")}
      className="orn-hielo orn-d-forma" strokeWidth={0.65 * u} opacity=".75" {...DIB} />
  </>,
  saber: (u) => <>
    <path d="M-34 0Q0 -24 34 0Q0 24 -34 0Z" className="orn-hielo orn-vv orn-d-forma" strokeWidth={0.75 * u} opacity=".75" {...DIB} />
    <path d={circulo(0, 0, 14)} className="orn-oro orn-d-forma" strokeWidth={0.65 * u} opacity=".85" {...DIB} />
    <Cristal y={1} w={12} h={22} u={u} interior={false} />
    <path d={arco(0, 0, 44, 13, PI * 1.08, PI * 2.62, -18)} className="orn-oro orn-d-forma" strokeWidth={0.6 * u} opacity=".7" {...DIB} />
    {sobreCirculo(0, 0, 28, 4, PI / 4).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.3} className="orn-relleno-luz orn-d-chispa" />)}
  </>,
  hacer: (u) => <>
    <path d="M-30 18C-34 0 -26 -18 -16 -26M30 18C34 0 26 -18 16 -26" className="orn-hielo orn-d-forma" strokeWidth={0.7 * u} opacity=".6" {...DIB} />
    <Cristal y={6} w={20} h={54} k={0.62} u={u} />
    <path d="M-7 -34L0 -41L7 -34M-5 -41L0 -46L5 -41" className="orn-oro orn-d-forma" strokeWidth={0.7 * u} opacity=".85" {...DIB} />
  </>,
  mente: (u) => <>
    <path d={circulo(0, 0, 23)} className="orn-oro orn-d-forma" strokeWidth={0.55 * u} opacity=".7" {...DIB} />
    <path d="M-15 -11Q-22 0 -15 11M15 -11Q22 0 15 11" className="orn-hielo orn-d-forma" strokeWidth={0.7 * u} opacity=".8" {...DIB} />
    <path d={estrella4(0, 0, 12, 12, 0.55)} transform="rotate(45)" className="orn-oro orn-d-forma" strokeWidth={0.6 * u} opacity=".9" {...DIB} />
    <EstrellaFacetada rx={10} arriba={15} abajo={15} cintura={0.38} u={u} />
    {sobreCirculo(0, 0, 28, 8, PI / 8).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.1} className="orn-relleno-luz orn-d-chispa" />)}
  </>,
  vida: (u) => {
    const hi = pluma([-2, 12], [-21, -16], 10, 0.2, 0, 0.1), hd = pluma([2, 12], [21, -16], 10, -0.2, 0, -0.1);
    return <>
      <path d={arco(0, 0, 35, 35, -PI * 0.86, PI * 0.62)} className="orn-oro orn-d-forma" strokeWidth={0.6 * u} opacity=".7" {...DIB} />
      <circle cx={35 * cos(PI * 0.62)} cy={35 * sin(PI * 0.62)} r={2.2} className="orn-relleno-oro orn-d-chispa" />
      <path d={hi.d} className="orn-filo orn-vv orn-d-cristal" strokeWidth={0.6 * u} opacity=".9" />
      <path d={hd.d} className="orn-filo orn-vv orn-d-cristal" strokeWidth={0.6 * u} opacity=".9" />
      <Cristal y={0} w={14} h={38} k={0.5} u={u} />
    </>;
  },
  habitos: (u) => <>
    {[[14, 0.15, "orn-oro"], [21, 0.85, "orn-hielo"], [28, 1.5, "orn-oro"]].map(([r, g, c], i) => (
      <path key={i} d={arco(0, 0, r, r, g, g + PI * 1.6)} className={c + " orn-d-forma"} strokeWidth={0.65 * u} opacity=".75" {...DIB} />
    ))}
    {[[14, 0.15], [21, 0.85], [28, 1.5]].map(([r, g], i) => {
      const a = g + PI * 1.6, x = r * cos(a), y = r * sin(a);
      return <path key={i} d={destello(x, y, 2.6, 1, 0.75)} className="orn-relleno-luz orn-d-chispa" />;
    })}
    {sobreCirculo(0, 0, 34, 12, -PI / 2).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 0.9} className="orn-relleno-luz orn-d-chispa" opacity={i % 3 === 0 ? 0.95 : 0.6} />)}
    <Cristal y={0} w={10} h={20} u={u} interior={false} />
  </>,
  hoy: (u) => <>
    <Halo r={30} tono="hoy" opacidad={0.8} />
    <path d={estrella4(0, 0, 30, 44, 0.8)} className="orn-oro orn-d-forma" strokeWidth={0.7 * u} opacity=".95" {...DIB} />
    <path d={estrella4(0, 0, 20, 20, 0.78)} transform="rotate(45)" className="orn-hielo orn-d-forma" strokeWidth={0.6 * u} opacity=".75" {...DIB} />
    <path d={circulo(0, 0, 18)} className="orn-hielo orn-d-forma" strokeWidth={0.55 * u} opacity=".5" {...DIB} />
    <EstrellaFacetada rx={9} arriba={13} abajo={13} cintura={0.35} u={u} />
  </>,
  luna: (u) => {
    const m = mediaLuna(-2, 2, 25, 21, 10, -7);
    const r = mediaLuna(-4, 4, 21, 19, 8, -6);
    return <>
      <path d={circulo(-2, 2, 25)} className="orn-hielo orn-d-forma" strokeWidth={0.45 * u} opacity=".22" {...DIB} />
      <path d={m.d} className="orn-filo orn-vv orn-d-cristal" strokeWidth={0.7 * u} />
      <path d={r.d} className="orn-hielo orn-d-cristal" fill="none" strokeWidth={0.45 * u} opacity=".45" />
      <path d={destello(14, -16, 4.5, 1.4, 0.85)} className="orn-relleno-luz orn-d-chispa" />
      <path d={destello(22, 2, 2.6, 1.2, 0.8)} className="orn-relleno-oro orn-d-chispa" />
    </>;
  },
  ajustes: (u) => <>
    <path d={marcas(0, 0, 26, 31, 16)} className="orn-oro orn-d-forma" strokeWidth={0.55 * u} opacity=".7" {...DIB} />
    <path d={circulo(0, 0, 17)} className="orn-hielo orn-d-forma" strokeWidth={0.5 * u} opacity=".5" {...DIB} />
    <path d="M0 0L14 -14" className="orn-oro orn-d-trazo" strokeWidth={0.7 * u} opacity=".8" {...DIB} />
    <Cristal y={0} w={10} h={20} u={u} interior={false} />
  </>,
};
const ESQUELETO = {
  cuerpo: { anillo: 30, ojivaW: 74, ojivaH: 98, laterales: 31 },
  saber: { anillo: 27, ojivaW: 72, ojivaH: 92, laterales: 0 },
  hacer: { conAnillo: false, ojivaW: 50, ojivaH: 104, ojivaC: 0.08, laterales: 0, arriba: -64 },
  mente: { anillo: 29, ojivaW: 74, ojivaH: 96, laterales: 32 },
  vida: { anillo: 27, ojivaW: 66, ojivaH: 92, laterales: 0 },
  habitos: { conAnillo: false, ojivaW: 80, ojivaH: 98, laterales: 0 },
  hoy: { conAnillo: false, conOjiva: false, laterales: 0, arriba: -64, abajo: 62 },
  luna: { conAnillo: false, ojivaW: 72, ojivaH: 96, laterales: 0 },
  ajustes: { conAnillo: true, anillo: 26, ojivaW: 72, ojivaH: 94, laterales: 0 },
};

export function SectionGlyph({ glifo = "cuerpo", zona, size = 44, className = "", style, ceremonia }) {
  const u = VB_GLIFO[3] / size;
  return (
    <Lienzo vb={VB_GLIFO} alto={size} className={"orn-glifo " + className} style={style} ceremonia={ceremonia}>
      <Halo r={40} tono={zona || ""} opacidad={0.7} />
      {ceremonia && <circle cx="0" cy="0" r="10" fill="url(#orn-nucleo)" className="orn-d-punto" />}
      {esqueleto(u, ESQUELETO[glifo] || {})}
      {(CORAZON[glifo] || CORAZON.cuerpo)(u)}
    </Lienzo>
  );
}

/* ═══════════ 12 · SELLOS ASTRALES (un sello astronómico antiguo, no un botón) ═══════════ */
const ANILLO_SELLO = {
  cuerpo: (u) => <path d={marcas(0, 0, 50, 57, 8, PI / 8)} className="orn-oro orn-d-forma" strokeWidth={0.6 * u} opacity=".6" {...DIB} />,
  saber: (u) => <path d={circulo(0, 0, 36)} className="orn-oro orn-d-forma" strokeWidth={0.5 * u} opacity=".55" {...DIB} />,
  hacer: (u) => <path d="M-58 -4L-52 0L-58 4M58 -4L52 0L58 4" className="orn-oro orn-d-forma" strokeWidth={0.6 * u} opacity=".8" {...DIB} />,
  mente: (u) => <path d={suave(Array.from({ length: 33 }, (_, i) => {
    const a = (TAU * i) / 32, r = 37 + (i % 2 ? 1.6 : -1.6);
    return [r * cos(a), r * sin(a)];
  }), true)} className="orn-hielo orn-d-forma" strokeWidth={0.5 * u} opacity=".5" {...DIB} />,
  vida: (u) => <path d={arco(0, 0, 58, 20, PI * 0.95, PI * 2.75, -24)} className="orn-oro orn-d-forma" strokeWidth={0.55 * u} opacity=".6" {...DIB} />,
  hoy: (u) => <path d={estrella4(0, 0, 58, 58, 0.93)} transform="rotate(45)" className="orn-oro orn-d-forma" strokeWidth={0.5 * u} opacity=".45" {...DIB} />,
  ajustes: () => null,
};
const CORAZON_SELLO = { cuerpo: "cuerpo", saber: "saber", hacer: "hacer", mente: "mente", vida: "vida", hoy: "hoy", ajustes: "ajustes" };

export function AstralSeal({ zona = "cuerpo", size = 68, className = "", style, ceremonia, respira = true, fondo = false }) {
  const vb = [-64, -64, 128, 128];
  const u = vb[3] / size;
  const corazon = CORAZON[CORAZON_SELLO[zona] || "cuerpo"];
  const ref = useRef(null);
  usePausaFuera(ref);
  return (
    <span ref={ref} className={"orn-sello " + className} style={{ width: size, height: size, ...style }} aria-hidden="true">
      <Lienzo vb={vb} alto={size} ceremonia={ceremonia}>
        {fondo && <circle cx="0" cy="0" r="50" className="orn-sello-fondo" />}
        <Halo r={50} tono={zona} opacidad={0.8} />
        <Halo r={26} opacidad={0.55} />
        {ceremonia && <circle cx="0" cy="0" r="12" fill="url(#orn-nucleo)" className="orn-d-punto" />}
        <path d={circulo(0, 0, 50)} className="orn-oro orn-d-forma" strokeWidth={0.75 * u} opacity=".85" {...DIB} />
        <path d={marcas(0, 0, 46.5, 49.5, 36)} className="orn-hielo orn-d-forma" strokeWidth={0.45 * u} opacity=".45" {...DIB} />
        <path d={circulo(0, 0, 41)} className="orn-hielo orn-d-forma" strokeWidth={0.6 * u} opacity=".55" {...DIB} />
        {sobreCirculo(0, 0, 45.2, 8, PI / 8).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.05} className="orn-relleno-luz orn-d-chispa" opacity=".85" />)}
        {(ANILLO_SELLO[zona] || ANILLO_SELLO.ajustes)(u)}
        <path d="M-41 0L-60 0M41 0L60 0" className="orn-oro orn-d-trazo" strokeWidth={0.6 * u} opacity=".7" {...DIB} />
        <Destello x={-61} y={0} r={3.6} alto={0.9} />
        <Destello x={61} y={0} r={3.6} alto={0.9} />
        <Diamante x={0} y={-50} w={7} h={15} u={u} chispa />
        <Diamante x={0} y={50} w={6} h={12} u={u} chispa={false} />
        <g transform="scale(.94)">{corazon(u / 0.94)}</g>
      </Lienzo>
      {respira && <span className="orn-luz-viva" />}
    </span>
  );
}

/* Sello con alas: solo para la pantalla principal y estados especiales. */
export function SelloAlado({ zona = "hoy", size = 64, ceremonia, className = "", style }) {
  return (
    <span className={"orn-sello-alado " + className} style={{ width: size * 2.2, height: size * 1.15, ...style }} aria-hidden="true">
      <HydraulicWing variante="par" size={size * 2.2} eje={false} ceremonia={ceremonia} className="orn-sello-alas" />
      <AstralSeal zona={zona} size={size} ceremonia={ceremonia} className="orn-sello-centro" fondo />
    </span>
  );
}

/* Estrella líquida con alas: para estados especiales (p. ej. todos los hábitos del día hechos). */
export function EstrellaAlada({ size = 52, className = "", style }) {
  return (
    <span className={"orn-estrella-alada " + className} style={{ width: size, height: round((size * 168) / 268), ...style }} aria-hidden="true">
      <HydraulicWing variante="par" size={size} eje={false} />
      <LiquidStar variante="pequena" size={round(size * 0.5)} className="orn-ea-estrella" />
    </span>
  );
}

/* ═══════════ 13 · DIVISORES DE AGUA (línea — diamante — línea) ═══════════ */
export function WaterDivider({ glifo, zona, ancho = 250, alto = 32, ceremonia, orientacion = "h", variante = 1, className = "", style }) {
  if (orientacion === "v") return <DivisorVertical variante={variante} alto={ancho} className={className} style={style} ceremonia={ceremonia} />;
  const y = alto / 2;
  const x0 = glifo ? 30 : 4;
  const xc = Math.round(x0 + (ancho - x0) * 0.56);
  const xf = ancho - 6;
  // la cinta de agua: gruesa junto al glifo, se adelgaza y se desvanece
  const lomo = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12; return [x0 + (xf - x0) * t, y + sin(t * PI * 2.2) * 1.1];
  });
  const agua = cinta(lomo, (t) => 3.2 * Math.pow(1 - t, 1.3) * Math.min(1, t * 9), 1);
  const gl = alto - 2;
  return (
    <svg className={"orn orn-divisor " + (ceremonia ? "orn-ceremonia " : "") + className} viewBox={`0 0 ${ancho} ${alto}`}
      width={ancho} height={alto} preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false" style={style}>
      <path d={agua} fill="url(#orn-agua-h)" className="orn-d-agua" />
      <path d={lin([x0 + 2, y], [xf, y])} className="orn-oro orn-d-trazo" strokeWidth=".8" opacity=".75" {...DIB} />
      {[0.22, 0.36].map((t) => <circle key={t} cx={x0 + (xc - x0) * t} cy={y} r=".95" className="orn-relleno-luz orn-d-chispa" opacity=".75" />)}
      <Destello x={xc - 11} y={y} r={2.2} alto={0.8} className="orn-d-chispa" />
      <Destello x={xc + 11} y={y} r={2.2} alto={0.8} className="orn-d-chispa" />
      <Halo x={xc} y={y} r={10} opacidad={0.7} />
      <Cristal x={xc} y={y} w={7} h={15} k={0.5} u={1} interior={false} />
      <Destello x={xc + (xf - xc) * 0.62} y={y} r={2.6} alto={1.3} oro className="orn-d-chispa" />
      {glifo && (
        <svg x={0} y={(alto - gl) / 2} width={gl * (VB_GLIFO[2] / VB_GLIFO[3])} height={gl} viewBox={VB_GLIFO.join(" ")} overflow="visible">
          <Halo r={40} tono={zona || ""} opacidad={0.7} />
          {ceremonia && <circle cx="0" cy="0" r="10" fill="url(#orn-nucleo)" className="orn-d-punto" />}
          {esqueleto(VB_GLIFO[3] / gl, ESQUELETO[glifo] || {})}
          {(CORAZON[glifo] || CORAZON.cuerpo)(VB_GLIFO[3] / gl)}
        </svg>
      )}
    </svg>
  );
}

/* Las líneas verticales de agua (variaciones de la lámina). */
function DivisorVertical({ variante = 1, alto = 120, className, style, ceremonia }) {
  const vb = [-14, -124, 28, 248];
  const u = vb[3] / alto;
  const piezas = {
    1: <><Eje y1={-118} y2={82} u={u} /><Diamante x={0} y={100} w={9} h={22} u={u} chispa={false} /><Destello x={0} y={-118} r={3} alto={1.6} /></>,
    2: <><Eje y1={-118} y2={118} u={u} />{[-96, -64, 66, 98].map((y) => <Cristal key={y} y={y} w={10} h={22} u={u} interior={false} />)}</>,
    3: <><Eje y1={-118} y2={118} u={u} /><Diamante x={0} y={-96} w={11} h={26} u={u} /><Cristal y={-30} w={9} h={18} u={u} interior={false} />
      <path d="M-8 -30L8 -30" className="orn-hielo" strokeWidth={0.5 * u} /><Diamante x={0} y={96} w={11} h={26} u={u} chispa={false} /></>,
    4: <><Eje y1={-118} y2={60} u={u} oro={false} /><Cristal y={74} w={10} h={24} u={u} interior={false} /><Cristal y={102} w={8} h={18} u={u} interior={false} /><Destello x={0} y={-100} r={3} alto={1.5} /></>,
    5: <><Eje y1={-118} y2={78} u={u} /><GotaCristal y={100} w={16} h={28} u={u} /><Destello x={0} y={-70} r={3} alto={1.6} oro /></>,
  };
  return <Lienzo vb={vb} alto={alto} className={"orn-divisor-v " + (className || "")} style={style} ceremonia={ceremonia}>{piezas[variante] || piezas[1]}</Lienzo>;
}

/* ═══════════ 1 · MARCOS DE AGUA (capa superpuesta: no cambia el tamaño de nada) ═══════════ */
function EsquinaMarco({ variante, className }) {
  const t = variante === "principal" ? 36 : variante === "secundaria" ? 28 : 18;
  const u = 40 / t;
  const lomo = suave([[3.6, 34], [3.4, 17], [7.2, 7.2], [17, 3.4], [34, 3.6]]);
  const agua = cinta([[3.6, 36], [3.5, 24], [4.4, 12], [8.4, 6.6], [14, 4.2], [24, 3.5], [36, 3.6]],
    (x) => (variante === "minima" ? 2.2 : 3.4) * Math.pow(Math.sin(PI * x), 1.6), 1);
  return (
    <svg className={"orn orn-marco-esq " + className} viewBox="0 0 40 40" width={t} height={t} aria-hidden="true" focusable="false">
      <path d={agua} fill="url(#orn-vidrio)" />
      {variante !== "minima" && <path d={lomo} className="orn-hielo" strokeWidth={0.5 * u} opacity=".55" />}
      {variante === "principal" && <path d={suave(rizo(13.5, 13.5, 5.2, 1.1, 225, 1, 0.3))} className="orn-oro" strokeWidth={0.55 * u} opacity=".7" />}
      <path d={destello(5.2, 5.2, variante === "minima" ? 3.2 : 4, 1, 0.86)} className="orn-relleno-luz" opacity=".9" />
      {variante !== "minima" && <circle cx="3.6" cy="30" r=".9" className="orn-relleno-luz" opacity=".7" />}
    </svg>
  );
}
function GemaMarco({ abajo }) {
  const u = 1.4;
  return (
    <svg className={"orn orn-marco-gema" + (abajo ? " abajo" : "")} viewBox="-28 -14 56 28" width="40" height="20" aria-hidden="true" focusable="false">
      <path d={`M-26 0Q-18 0 -12 ${abajo ? 3 : -3}M26 0Q18 0 12 ${abajo ? 3 : -3}`} className="orn-oro" strokeWidth={0.6 * u} opacity=".8" />
      <path d={suave(rizo(-9, abajo ? 2 : -2, 3, 0.9, abajo ? 90 : 270, -1, 0.35)) + suave(rizo(9, abajo ? 2 : -2, 3, 0.9, abajo ? 90 : 270, 1, 0.35))}
        className="orn-oro" strokeWidth={0.5 * u} opacity=".6" />
      <Halo r={12} opacidad={0.7} className="" />
      <Cristal y={0} w={9} h={abajo ? 18 : 22} k={0.5} u={u} interior={false} className="" />
      {!abajo && <Destello x={0} y={-12.5} r={2.6} alto={1.6} className="" />}
    </svg>
  );
}
export function HydroFrame({ variante = "secundaria", radio = 18, className = "", style }) {
  return (
    <span className={`orn-marco orn-marco-${variante} ${className}`} aria-hidden="true" style={{ "--orn-r": radio + "px", ...style }}>
      {variante !== "minima" && <span className="orn-marco-linea" />}
      {["tl", "tr", "bl", "br"].map((e) => <EsquinaMarco key={e} variante={variante} className={"orn-esq-" + e} />)}
      {variante === "principal" && <><GemaMarco /><GemaMarco abajo /></>}
      {variante === "secundaria" && <GemaMarco />}
    </span>
  );
}

/* ═══════════ 5 · ARCOS DE AGUA (agua suspendida en el aire) ═══════════ */
export function WaterArc({ variante = "principal", size = 240, className = "", style, ceremonia }) {
  const vb = variante === "detalle" ? [-50, -50, 100, 100] : [-124, -74, 248, 148];
  const u = vb[2] / size;
  let cuerpo;
  if (variante === "principal") {
    const l1 = elipsePts(4, 40, 108, 92, PI * 1.02, PI * 1.94, 30);
    const l2 = elipsePts(6, 44, 92, 74, PI * 1.12, PI * 1.84, 26);
    cuerpo = <>
      <path d={cinta(l1, 13, 1.25, 0.15)} fill="url(#orn-vidrio)" className="orn-d-agua" />
      <path d={cinta(l1, 13, 1.25, 0.15)} className="orn-filo" strokeWidth={0.45 * u} opacity=".45" />
      <path d={cinta(l2, 6, 1.4)} fill="url(#orn-vidrio-v)" className="orn-d-agua" />
      <path d={arco(4, 40, 118, 102, PI * 1.12, PI * 1.82)} className="orn-oro orn-d-forma" strokeWidth={0.6 * u} opacity=".7" {...DIB} />
      <path d={arco(4, 40, 98, 82, PI * 1.25, PI * 1.6)} className="orn-hielo orn-d-forma" strokeWidth={0.5 * u} opacity=".55" {...DIB} />
      <Destello x={4 + 118 * cos(PI * 1.12)} y={40 + 102 * sin(PI * 1.12)} r={5} alto={1.3} halo={0.6} />
      <Diamante x={4 + 118 * cos(PI * 1.82)} y={40 + 102 * sin(PI * 1.82)} w={9} h={18} u={u} />
      {[1.38, 1.5, 1.66].map((a, i) => <circle key={i} cx={4 + 108 * cos(PI * a)} cy={40 + 92 * sin(PI * a)} r={1.1} className="orn-relleno-luz orn-d-chispa" opacity=".8" />)}
    </>;
  } else if (variante === "secundario") {
    const l1 = Array.from({ length: 18 }, (_, i) => { const t = i / 17; return [-110 + 220 * t, 10 - sin(t * PI) * 34 + sin(t * TAU) * 8]; });
    cuerpo = <>
      <path d={cinta(l1, 12, 1.1, -0.2)} fill="url(#orn-vidrio)" className="orn-d-agua" />
      <path d={suave(l1.map(([x, y]) => [x, y - 6]))} className="orn-oro orn-d-forma" strokeWidth={0.55 * u} opacity=".6" {...DIB} />
      <path d={suave(l1.map(([x, y]) => [x * 0.8, y + 9]))} className="orn-hielo orn-d-forma" strokeWidth={0.45 * u} opacity=".5" {...DIB} />
      <Destello x={-30} y={-22} r={4} alto={1.3} oro />
    </>;
  } else {
    cuerpo = <>
      <path d={cinta(elipsePts(0, 0, 36, 36, PI * 0.95, PI * 1.85, 16), 7, 1.3)} fill="url(#orn-vidrio)" className="orn-d-agua" />
      <path d={arco(0, 0, 42, 42, PI, PI * 1.75)} className="orn-oro orn-d-forma" strokeWidth={0.55 * u} opacity=".7" {...DIB} />
      <Diamante x={-42} y={4} w={6} h={13} u={u} chispa={false} />
      <Destello x={30} y={-30} r={3} alto={1.4} />
    </>;
  }
  return <Lienzo vb={vb} ancho={size} className={"orn-arco " + className} style={style} ceremonia={ceremonia}>{cuerpo}</Lienzo>;
}

/* ═══════════ 6 · FILIGRANA HIDROGRÁFICA (finísima: aporta hondura, no compite) ═══════════ */
export function HydroFiligree({ variante = "esquina", size = 120, className = "", style }) {
  const vb = variante === "borde" ? [0, -20, 200, 40] : variante === "central" ? [-60, -90, 120, 180] : [0, 0, 120, 120];
  const u = vb[2] / size;
  let cuerpo;
  if (variante === "esquina") {
    cuerpo = <>
      <path d="M4 116L4 24Q4 4 24 4L116 4" className="orn-oro" strokeWidth={0.6 * u} opacity=".65" />
      <path d="M10 92L10 28Q10 10 28 10L92 10" className="orn-hielo" strokeWidth={0.5 * u} opacity=".5" />
      <path d={suave(rizo(26, 26, 10, 1.15, 225, 1, 0.24))} className="orn-hielo" strokeWidth={0.55 * u} opacity=".6" />
      <path d={suave(rizo(4, 64, 6, 0.9, 0, 1, 0.4)) + suave(rizo(64, 4, 6, 0.9, 90, -1, 0.4))} className="orn-oro" strokeWidth={0.5 * u} opacity=".55" />
      <path d={cinta([[2, 50], [2.5, 26], [7, 10], [20, 3.5], [50, 2]], (t) => 3.5 * sin(PI * t) ** 1.5, 1)} fill="url(#orn-vidrio)" />
      <g transform="rotate(-45 15 15)"><Cristal x={15} y={15} w={7} h={20} u={u} interior={false} className="" /></g>
      <Destello x={116} y={4} r={2.6} alto={1} /><Destello x={4} y={116} r={2.6} alto={1} />
      <circle cx="36" cy="36" r="1.2" className="orn-relleno-luz" opacity=".7" />
    </>;
  } else if (variante === "central") {
    cuerpo = <>
      <Huso y={-6} w={12} h={150} u={u} nucleo={0.6} />
      <g transform="rotate(90)"><Huso y={0} w={8} h={64} u={u} nucleo={0} /></g>
      {[[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy], i) => (
        <path key={i} d={suave(rizo(14 * sx, 14 * sy, 9, 1.1, sy > 0 ? (sx > 0 ? 270 : 270) : 90, sx * sy, 0.3))} className="orn-oro" strokeWidth={0.55 * u} opacity=".6" />
      ))}
      <path d={ojiva(0, -4, 50, 120, 0.1).izq + ojiva(0, -4, 50, 120, 0.1).der} className="orn-hielo" strokeWidth={0.45 * u} opacity=".45" />
      <Destello x={0} y={-84} r={4} alto={1.6} />
    </>;
  } else {
    cuerpo = <>
      <path d="M14 0L186 0" className="orn-oro" strokeWidth={0.55 * u} opacity=".6" />
      <path d="M30 5L170 5" className="orn-hielo" strokeWidth={0.45 * u} opacity=".45" />
      <path d={suave(rizo(14, -6, 6, 1.1, 90, 1, 0.3)) + suave(rizo(186, -6, 6, 1.1, 90, -1, 0.3))} className="orn-hielo" strokeWidth={0.5 * u} opacity=".55" />
      <Cristal x={100} y={0} w={7} h={16} u={u} interior={false} className="" />
      <Destello x={60} y={0} r={2} alto={1} /><Destello x={140} y={0} r={2} alto={1} />
    </>;
  }
  return <Lienzo vb={vb} ancho={size} className={"orn-filigrana " + className} style={style}>{cuerpo}</Lienzo>;
}

/* ═══════════ 7 · ALAS HIDRÁULICAS (ala · pluma · agua · pétalo) ═══════════ */
function plumasAla(u, invertir = false) {
  // cinco plumas de cristal que se abren hacia arriba y hacia fuera, y dos pétalos que caen
  const P5 = [
    { b: [8, -2], p: [124, -66], w: 15, c: -0.16, g: -0.05 },
    { b: [8, 4], p: [118, -36], w: 15, c: -0.13, g: -0.04 },
    { b: [8, 10], p: [104, -10], w: 14, c: -0.1, g: -0.03 },
    { b: [8, 15], p: [84, 12], w: 12, c: -0.06, g: 0 },
    { b: [8, 20], p: [60, 30], w: 10, c: 0.04, g: 0.02 },
    { b: [6, 28], p: [44, 52], w: 8, c: 0.18, g: 0.05 },
  ];
  return P5.map((f, i) => {
    const pl = pluma(f.b, f.p, f.w, f.c, f.g, 0.32);
    return (
      <g key={i} className="orn-d-cristal">
        <path d={pl.d} fill="url(#orn-vidrio)" opacity={0.95 - i * 0.08} />
        <path d={pl.d} className="orn-filo" strokeWidth={0.5 * u} opacity={0.5 - i * 0.04} />
        <path d={suave(pl.lomo.slice(1, -2))} className={i === 0 ? "orn-oro" : "orn-hielo"} strokeWidth={0.45 * u} opacity={i === 0 ? 0.6 : 0.4} />
      </g>
    );
  });
}
export function HydraulicWing({ variante = "par", size = 200, eje = true, className = "", style, ceremonia }) {
  const vb = variante === "par" ? [-134, -84, 268, 168] : variante === "ala" ? [0, -84, 134, 168] : [-60, -70, 120, 140];
  const u = vb[2] / size;
  let cuerpo;
  if (variante === "variacion") {
    const tres = [[-40, 50, 50, -40], [-34, 18, 54, -64], [-40, -12, 40, -84]].map(([bx, by, px, py], i) => {
      const pl = pluma([bx, by], [px, py], 18 - i * 3, -0.16, -0.04, 0.4);
      return <g key={i} className="orn-d-cristal"><path d={pl.d} fill="url(#orn-vidrio)" /><path d={pl.d} className="orn-filo" strokeWidth={0.5 * u} opacity=".5" />
        <path d={suave(pl.lomo.slice(1, -2))} className="orn-hielo" strokeWidth={0.4 * u} opacity=".45" /></g>;
    });
    cuerpo = <>{tres}</>;
  } else {
    cuerpo = <>
      <Halo r={70} opacidad={0.35} />
      {variante === "par" && <g transform="scale(-1 1)">{plumasAla(u)}</g>}
      {plumasAla(u)}
      {eje && variante === "par" && <>
        <Eje y1={-82} y2={82} u={u} />
        <Cristal y={-12} w={16} h={42} u={u} />
        <Cristal y={44} w={10} h={24} u={u} interior={false} />
        <Destello x={0} y={-80} r={4} alto={1.6} />
      </>}
    </>;
  }
  return <Lienzo vb={vb} ancho={size} className={"orn-alas " + className} style={style} ceremonia={ceremonia}>{cuerpo}</Lienzo>;
}

/* ═══════════ 8 · MEDIAS LUNAS ACUÁTICAS (sueño, noche, reflexión, calma) ═══════════ */
export function AquaticMoon({ variante = "principal", size = 96, className = "", style, ceremonia }) {
  const vb = variante === "principal" ? [-64, -70, 128, 156] : [-40, -80, 80, 160];
  const u = vb[3] / size;
  let cuerpo;
  if (variante === "principal") {
    const m = mediaLuna(0, 0, 50, 43, 17, -13);
    const r = mediaLuna(-4, 4, 42, 38, 14, -11);
    cuerpo = <>
      <Halo r={66} opacidad={0.45} />
      <path d={circulo(0, 0, 50)} className="orn-hielo orn-d-forma" strokeWidth={0.45 * u} opacity=".2" {...DIB} />
      <path d={m.d} fill="url(#orn-vidrio)" className="orn-d-cristal" />
      <path d={m.d} className="orn-filo orn-d-cristal" strokeWidth={0.8 * u} opacity=".85" />
      <path d={r.d} className="orn-hielo orn-d-cristal" fill="none" strokeWidth={0.5 * u} opacity=".5" />
      <path d={arco(0, 0, 47, 47, PI * 0.62, PI * 1.05)} className="orn-chispa-linea orn-d-cristal" strokeWidth={1.2 * u} opacity=".7" />
      <Destello x={24} y={-30} r={5} alto={1.5} halo={0.6} />
      <Destello x={31} y={8} r={3} alto={1.3} oro />
      <Destello x={-14} y={-56} r={2.4} alto={1.2} />
      <Eje y1={52} y2={84} u={u} />
      <Diamante x={0} y={70} w={8} h={16} u={u} chispa={false} />
    </>;
  } else {
    cuerpo = <>
      <path d={arco(-6, 0, 58, 58, -PI * 0.42, PI * 0.42)} className="orn-hielo orn-d-forma" strokeWidth={0.6 * u} opacity=".6" {...DIB} />
      <path d={arco(-10, 0, 52, 52, -PI * 0.36, PI * 0.36)} className="orn-oro orn-d-forma" strokeWidth={0.45 * u} opacity=".5" {...DIB} />
      <Eje y1={-76} y2={76} u={u} />
      <Diamante x={0} y={-58} w={8} h={16} u={u} />
      <Cristal y={-4} w={12} h={28} u={u} interior={false} />
      <Cristal y={42} w={10} h={22} u={u} interior={false} />
      <Destello x={0} y={20} r={3} alto={1.4} />
    </>;
  }
  return <Lienzo vb={vb} alto={size} className={"orn-luna " + className} style={style} ceremonia={ceremonia}>{cuerpo}</Lienzo>;
}

/* ═══════════ 9 · CRISTALES SUSPENDIDOS (flotan de forma casi imperceptible) ═══════════ */
export function SuspendedCrystal({ variante = "cristal", size = 120, flota = true, className = "", style }) {
  const vb = variante === "combinacion" ? [-40, -90, 80, 180] : [-22, -90, 44, 180];
  const u = vb[3] / size;
  let cuerpo;
  if (variante === "cristal") {
    cuerpo = <>
      <path d={lin([0, -86], [0, 86])} className="orn-hielo" strokeWidth={0.4 * u} opacity=".35" />
      <Cristal y={-54} w={11} h={24} u={u} interior={false} />
      <Halo r={26} opacidad={0.4} className="" />
      <Cristal y={2} w={22} h={58} u={u} />
      <Cristal y={52} w={14} h={30} u={u} interior={false} />
      <Destello x={0} y={-80} r={3.5} alto={1.6} />
    </>;
  } else if (variante === "fragmento") {
    cuerpo = <>
      <Destello x={0} y={-80} r={4} alto={1.7} />
      <Cristal y={-44} w={9} h={30} u={u} interior={false} />
      <Cristal y={6} w={13} h={40} u={u} interior={false} />
      <circle cx="-6" cy="34" r="1.4" className="orn-relleno-luz" opacity=".7" />
      <circle cx="5" cy="38" r="1" className="orn-relleno-luz" opacity=".6" />
      <Cristal y={66} w={11} h={30} u={u} interior={false} />
    </>;
  } else {
    const oj = ojiva(0, 6, 66, 104, 0.14);
    cuerpo = <>
      <Halo r={44} opacidad={0.45} className="" />
      <path d={oj.izq + oj.der} className="orn-oro" strokeWidth={0.6 * u} opacity=".7" />
      <path d={lin([0, -88], [0, 88])} className="orn-oro" strokeWidth={0.5 * u} opacity=".5" />
      <Cristal y={-66} w={11} h={24} u={u} interior={false} />
      <Cristal y={8} w={26} h={70} u={u} />
      <Cristal y={70} w={11} h={22} u={u} interior={false} />
      <Destello x={-33} y={6} r={3.4} alto={0.9} /><Destello x={33} y={6} r={3.4} alto={0.9} />
      <Destello x={0} y={-86} r={3} alto={1.6} />
    </>;
  }
  return (
    <span className={"orn-suspendido " + (flota ? "orn-flota " : "") + className} style={style} aria-hidden="true">
      <Lienzo vb={vb} alto={size}>{cuerpo}</Lienzo>
    </span>
  );
}

/* ═══════════ 10 · LÍNEAS ORBITALES (órbitas incompletas que unen la página con el Mar) ═══════════ */
export function OrbitalDecoration({ variante = "principal", size = 300, giro = -9, nodo = 1, className = "", style, ceremonia }) {
  const vb = variante === "principal" ? [-152, -64, 304, 128] : variante === "secundaria" ? [-80, -80, 160, 160] : [-40, -80, 80, 160];
  const u = vb[2] / size;
  let cuerpo;
  if (variante === "principal") {
    const punto = (rx, ry, a, g = giro) => { const ga = (g * PI) / 180, x = rx * cos(a), y = ry * sin(a); return [x * cos(ga) - y * sin(ga), x * sin(ga) + y * cos(ga)]; };
    const [sx, sy] = punto(140, 44, -PI * 0.38), [dx, dy] = punto(116, 32, PI * 0.3), [ex, ey] = punto(140, 44, PI * 0.84);
    cuerpo = <>
      <path d={arco(0, 0, 140, 44, -PI * 0.92, PI * 0.84, giro, 40)} className="orn-hielo orn-d-forma" strokeWidth={0.6 * u} opacity=".55" {...DIB} />
      <path d={arco(0, 2, 116, 32, PI * 0.3, PI * 1.9, giro, 40)} className="orn-oro orn-d-forma" strokeWidth={0.55 * u} opacity=".6" {...DIB} />
      <path d={arco(0, -3, 92, 22, -PI * 0.7, PI * 0.5, giro, 30)} className="orn-hielo orn-d-forma" strokeWidth={0.4 * u} opacity=".35" {...DIB} />
      {nodo > 0 && <>
        <Halo x={sx} y={sy} r={12 * nodo} opacidad={0.7} className="orn-d-chispa" />
        <path d={destello(sx, sy, 8 * nodo, 1.4, 0.88)} className="orn-relleno-oro orn-d-chispa" />
        <Diamante x={dx} y={dy} w={7 * nodo} h={14 * nodo} u={u} chispa={false} />
        <Destello x={ex} y={ey} r={3 * nodo} alto={1.2} />
      </>}
    </>;
  } else if (variante === "secundaria") {
    cuerpo = <>
      <path d={arco(0, 0, 66, 28, -PI * 0.8, PI * 1.05, 38, 36)} className="orn-oro orn-d-forma" strokeWidth={0.55 * u} opacity=".6" {...DIB} />
      <path d={arco(0, 0, 58, 22, PI * 0.1, PI * 1.6, 38, 30)} className="orn-hielo orn-d-forma" strokeWidth={0.45 * u} opacity=".5" {...DIB} />
      <Destello x={34} y={-50} r={4} alto={1.4} halo={0.5} />
      <Destello x={-40} y={38} r={2.5} alto={1.2} oro />
    </>;
  } else {
    cuerpo = <>
      <path d={arco(-30, 0, 62, 74, -PI * 0.36, PI * 0.34)} className="orn-hielo orn-d-forma" strokeWidth={0.6 * u} opacity=".6" {...DIB} />
      <path d={arco(-36, 2, 60, 70, -PI * 0.3, PI * 0.28)} className="orn-oro orn-d-forma" strokeWidth={0.45 * u} opacity=".55" {...DIB} />
      <Destello x={22} y={-66} r={3.5} alto={1.5} />
      <Diamante x={30} y={-2} w={7} h={14} u={u} chispa={false} />
    </>;
  }
  return <Lienzo vb={vb} ancho={size} className={"orn-orbita " + className} style={style} ceremonia={ceremonia}>{cuerpo}</Lienzo>;
}

/* ═══════════ 14 · POLVO DE LUZ (muy poco, muy lento; luz suspendida en agua) ═══════════ */
export function LightDust({ cantidad = 7, semilla = 1, modo = "titila", className = "", style }) {
  const motas = useMemo(() => {
    const r = azar(semilla);
    return Array.from({ length: cantidad }, (_, i) => {
      const oro = i % 4 === 2;
      return {
        x: 4 + r() * 92, y: 6 + r() * 84, t: oro ? 5 + r() * 3 : 2.2 + r() * 2.6, oro,
        estrella: i % 3 === 0, d: 14 + r() * 16, dl: -r() * 20, o: 0.45 + r() * 0.45,
      };
    });
  }, [cantidad, semilla]);
  return (
    <span className={"orn-polvo orn-polvo-" + modo + " " + className} style={style} aria-hidden="true">
      {motas.map((m, i) => (
        <i key={i} className={(m.oro ? "oro " : "") + (m.estrella ? "est" : "")}
          style={{ left: m.x + "%", top: m.y + "%", width: m.t, height: m.t, "--o": m.o, animationDuration: m.d + "s", animationDelay: m.dl + "s" }} />
      ))}
    </span>
  );
}

/* ═══════════ 15 · GRANDES ELEMENTOS «RELIQUIA» (5–12 % de opacidad: se sienten más que se ven) ═══════════ */
const RELIQUIA = {
  /* Cuerpo · el astrolabio del Dragón: anillos, radios, rombo inscrito y un huso como columna */
  astrolabio: () => <>
    {[[180, "orn-oro", 1], [168, "orn-hielo", 0.7], [120, "orn-hielo", 0.8], [64, "orn-oro", 0.7], [30, "orn-hielo", 0.6]].map(([r, c, w]) =>
      <circle key={r} cx="0" cy="0" r={r} className={c} strokeWidth={w} />)}
    <path d={marcas(0, 0, 168, 180, 72)} className="orn-hielo" strokeWidth=".6" />
    <path d={marcas(0, 0, 158, 188, 12, PI / 12)} className="orn-oro" strokeWidth=".8" />
    <path d={marcas(0, 0, 30, 120, 8, PI / 8)} className="orn-hielo" strokeWidth=".5" />
    <path d={poli([[0, -120], [120, 0], [0, 120], [-120, 0]])} className="orn-oro" strokeWidth=".7" />
    <path d={estrella4(0, 0, 62, 104, 0.72)} className="orn-hielo" strokeWidth=".8" />
    {sobreCirculo(0, 0, 142, 12).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" className="orn-relleno-luz" />)}
    <path d="M0 -180L0 -198M0 180L0 198M-180 0L-198 0M180 0L198 0" className="orn-oro" strokeWidth=".9" />
    <Huso y={0} w={26} h={150} u={1} nucleo={0.8} className="" />
    <Diamante x={0} y={-190} w={8} h={16} u={1} className="" />
  </>,
  /* Saber · el Ojo entre dos pilares */
  ojo: () => <>
    {[-1, 1].map((sx) => (
      <g key={sx}>
        <path d={`M${sx * 70} -118L${sx * 70} 112M${sx * 94} -118L${sx * 94} 112M${sx * 62} -124L${sx * 102} -124M${sx * 62} 118L${sx * 102} 118M${sx * 66} -132L${sx * 98} -132`} className="orn-hielo" strokeWidth=".8" />
        <path d={`M${sx * 78} -110L${sx * 78} 104M${sx * 86} -110L${sx * 86} 104`} className="orn-hielo" strokeWidth=".4" />
        {[-80, -30, 20, 70].map((y) => <circle key={y} cx={sx * 82} cy={y} r="1.6" className="orn-relleno-luz" />)}
      </g>
    ))}
    <path d="M0 -196L0 196" className="orn-oro" strokeWidth=".9" />
    <path d="M-150 0Q0 -128 150 0Q0 128 -150 0Z" className="orn-hielo orn-vv" strokeWidth=".9" fillOpacity=".25" />
    <circle cx="0" cy="0" r="46" className="orn-oro" strokeWidth=".8" />
    <circle cx="0" cy="0" r="30" className="orn-hielo" strokeWidth=".6" />
    <path d={arco(0, 0, 172, 172, -PI * 0.38, PI * 0.38)} className="orn-hielo" strokeWidth=".5" />
    <path d={arco(0, 0, 172, 172, PI * 0.62, PI * 1.38)} className="orn-hielo" strokeWidth=".5" />
    <Cristal y={0} w={24} h={52} u={1} className="" />
    <Diamante x={0} y={-150} w={10} h={22} u={1} className="" />
    <Diamante x={0} y={150} w={10} h={22} u={1} chispa={false} className="" />
  </>,
  /* Hacer · la Flecha Alada: huso como astil dentro de un anillo, con plumas de cristal */
  flecha: () => <>
    <circle cx="0" cy="10" r="118" className="orn-oro" strokeWidth=".9" />
    <circle cx="0" cy="10" r="110" className="orn-hielo" strokeWidth=".5" />
    <path d="M-150 10L150 10" className="orn-hielo" strokeWidth=".5" />
    <Diamante x={-140} y={10} w={8} h={16} u={1} chispa={false} className="" /><Diamante x={140} y={10} w={8} h={16} u={1} chispa={false} className="" />
    {[1, -1].map((sx) => (
      <g key={sx} transform={sx < 0 ? "scale(-1 1)" : undefined}>
        {[[10, 60, 112, -30, 26], [10, 84, 104, 6, 22], [10, 106, 88, 40, 18]].map(([bx, by, px, py, w], i) => {
          const pl = pluma([bx, by], [px, py], w, -0.16, -0.04, 0.3);
          return <g key={i}><path d={pl.d} fill="url(#orn-vidrio)" /><path d={pl.d} className="orn-filo" strokeWidth=".6" opacity=".6" /></g>;
        })}
      </g>
    ))}
    <Huso y={10} w={34} h={300} u={1} nucleo={0.7} className="" />
    <path d={estrella4(0, -150, 16, 50, 0.72, 10)} className="orn-oro" strokeWidth=".9" />
    <Destello x={0} y={-196} r={6} alto={1.6} className="" />
  </>,
  /* Mente · la corona de pétalos sobre la media luna (la Luna y la Pluma) */
  corona: () => <>
    {[[24, 128, 30, -0.1], [52, 168, 32, -0.16], [78, 160, 26, -0.18], [104, 118, 20, -0.14], [138, 76, 14, -0.1]].map(([a, L, w, c], i) => [1, -1].map((sx) => {
      const ang = ((-90 + sx * a) * PI) / 180;
      const pl = pluma([0, -6], [L * cos(ang), L * sin(ang) - 6], w, sx * c, sx * -0.05, 0.25);
      return <g key={i + "" + sx}><path d={pl.d} fill="url(#orn-vidrio)" /><path d={pl.d} className="orn-filo" strokeWidth=".6" opacity=".55" />
        <path d={suave(pl.lomo.slice(1, -2))} className="orn-hielo" strokeWidth=".45" opacity=".6" /></g>;
    }))}
    <path d={mediaLuna(0, 70, 74, 66, 0, -18).d} className="orn-hielo orn-vv" strokeWidth=".8" fillOpacity=".4" />
    <circle cx="0" cy="0" r="40" className="orn-oro" strokeWidth=".7" />
    <path d="M0 -190L0 170" className="orn-oro" strokeWidth=".7" />
    <Cristal y={-4} w={30} h={74} u={1} className="" />
    <Diamante x={0} y={-176} w={9} h={20} u={1} className="" />
  </>,
  /* Vida · las Hojas: cuchillas de cristal altas en abanico, con una órbita */
  hojas: () => <>
    {[[0, 0, -188, 44], [-30, -58, -158, 36], [30, 58, -158, 36], [-58, -118, -104, 28], [58, 118, -104, 28]].map(([bx, px, py, w], i) => {
      const pl = pluma([bx, 150 + Math.abs(bx) * 0.35], [px, py], w, (bx === 0 ? 0.03 : -Math.sign(bx) * 0.1), 0, 0.12);
      return <g key={i}><path d={pl.d} fill="url(#orn-vidrio-v)" /><path d={pl.d} className="orn-filo" strokeWidth=".7" opacity=".6" />
        <path d={suave(pl.lomo.slice(1, -2))} className={i === 0 ? "orn-oro" : "orn-hielo"} strokeWidth=".5" opacity=".6" /></g>;
    })}
    <path d={arco(0, 10, 176, 52, -PI * 0.95, PI * 0.85, -10, 48)} className="orn-oro" strokeWidth=".9" />
    <path d={arco(0, 10, 150, 40, PI * 0.15, PI * 1.6, -10, 40)} className="orn-hielo" strokeWidth=".6" />
    <path d="M-196 6L196 14" className="orn-hielo" strokeWidth=".4" />
    <Cristal y={20} w={24} h={58} u={1} className="" />
    <Destello x={176 * cos(-PI * 0.95)} y={10 + 52 * sin(-PI * 0.95)} r={6} alto={1.4} oro className="" />
  </>,
  /* Hoy · la Rosa Astral: ocho rayos, dos anillos, el corazón dorado */
  rosa: () => <>
    <path d={estrella4(0, 0, 178, 192, 0.82)} className="orn-oro" strokeWidth=".9" />
    <path d={estrella4(0, 0, 118, 118, 0.84)} transform="rotate(45)" className="orn-hielo" strokeWidth=".8" />
    <circle cx="0" cy="0" r="140" className="orn-hielo" strokeWidth=".6" />
    <circle cx="0" cy="0" r="150" className="orn-oro" strokeWidth=".5" strokeDasharray="2 7" />
    <path d={marcas(0, 0, 140, 150, 48)} className="orn-hielo" strokeWidth=".5" />
    <circle cx="0" cy="0" r="62" className="orn-hielo" strokeWidth=".7" />
    {sobreCirculo(0, 0, 100, 8, PI / 8).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" className="orn-relleno-oro" />)}
    <EstrellaFacetada rx={26} arriba={40} abajo={40} cintura={0.34} u={1} className="" />
  </>,
};
export function RelicElement({ tipo = "astrolabio", size = 520, className = "", style }) {
  const dibujo = RELIQUIA[tipo];
  if (!dibujo) return null;
  return (
    <svg className={"orn orn-reliquia-svg " + className} viewBox="-200 -200 400 400" width={size} height={size}
      preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={style}>
      <Halo r={120} opacidad={0.5} className="" />
      {dibujo()}
    </svg>
  );
}

/* ═══════════ 18 · ELEMENTOS DE INTERACCIÓN ═══════════ */
export function InteractionOrnament({ tipo = "puntas", size = 14, className = "", style }) {
  if (tipo === "puntas") {   // las puntas de cristal de un botón principal (izquierda y derecha)
    return <span className={"orn-puntas " + className} style={style} aria-hidden="true">
      <FontaineDiamond variante="micro" size={size} className="izq" />
      <FontaineDiamond variante="micro" size={size} className="der" />
    </span>;
  }
  if (tipo === "marcador") return <WaterDivider orientacion="v" variante={3} ancho={size * 6} className={className} style={style} />;
  if (tipo === "notificacion") {
    return <Lienzo vb={[-30, -40, 60, 80]} alto={size} className={"orn-notif " + className} style={style}>
      <Halo r={30} opacidad={0.5} />
      <path d={estrella4(0, 0, 22, 34, 0.25)} className="orn-oro" strokeWidth={0.8 * (80 / size)} opacity=".85" />
      <Cristal y={0} w={22} h={40} u={80 / size} />
      <Destello x={0} y={-36} r={3} alto={1.6} />
    </Lienzo>;
  }
  return null;
}

/* ═══════════ 17 · AGUA QUE DIBUJA (la ceremonia de entrada, una sola vez) ═══════════
 * Envuelve cualquier ornamento: punto de luz → trazo de agua → forma →
 * cristal → destellos → calma. Las piezas marcadas con orn-d-* participan. */
export function WaterDrawing({ activa = true, retraso = 0, children, className = "", style }) {
  return <span className={(activa ? "orn-ceremonia " : "") + "orn-dibujo " + className} style={{ "--orn-retraso": retraso + "s", ...style }}>{children}</span>;
}

/* ═══════════ 16 · ONDAS CONCÉNTRICAS (una gota que cae sobre el agua) ═══════════ */
export function ConcentricRipple({ size = 150, className = "", style }) {
  return (
    <svg className={"orn orn-ondas " + className} viewBox="-75 -26 150 52" width={size} height={size * 52 / 150} aria-hidden="true" focusable="false" style={style}>
      <ellipse className="orn-onda o1" cx="0" cy="0" rx="72" ry="23" />
      <ellipse className="orn-onda o2" cx="0" cy="0" rx="50" ry="16" />
      <ellipse className="orn-onda o3 oro" cx="0" cy="0" rx="30" ry="9.5" />
      <path className="orn-onda-chispa" d={destello(0, 0, 9, 0.8, 0.86)} />
    </svg>
  );
}

/* Pausa lo que respira cuando sale de la pantalla (no gastar fotogramas en lo que no se ve). */
export function usePausaFuera(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { el.classList.toggle("orn-quieto", !e.isIntersecting); });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

export { semillaDe };
