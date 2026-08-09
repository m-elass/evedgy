/*
 * components/MuscleFigure.jsx — LA FIGURA ANATÓMICA
 * ─────────────────────────────────────────────────
 * Ilustración vectorial del cuerpo, vista anterior y posterior, con los
 * músculos que trabaja un ejercicio encendidos sobre ella.
 *
 * Cómo se consigue precisión sin renunciar al dibujo:
 *   1. Se pinta el cuerpo ENTERO en reposo (todas las regiones). La base
 *      nunca tiene huecos.
 *   2. Encima se pintan solo los músculos implicados, recortando cada región
 *      a la ZONA que le corresponde (ver muscleZones.js). Así el press
 *      inclinado enciende la banda superior del pectoral y deja el resto
 *      apagado, sobre una ilustración real y no sobre manchas.
 *   3. El contorno del cuerpo se dibuja al final, para que la silueta quede
 *      definida por encima de todo.
 *
 * Rendimiento (importa: la app iba a tirones):
 *   · La geometría se calcula UNA vez y se memoriza; al cambiar de ejercicio
 *     solo se recalcula la capa de encendidos, que son unas pocas formas.
 *   · Sin filtros sobre elementos HTML —eran los que rompían la vista en
 *     iPhone— y sin carga diferida: aparece al instante.
 *   · Cuatro degradados para toda la figura, reutilizados por todas las piezas.
 */
import React, { useMemo, useState } from "react";
import { ART, OUTLINE, VIEWBOX } from "./bodyArt";
import { ZONES, REGION_NAMES } from "./muscleZones";
import { FINE_TO_REGION } from "./muscleMap";

/* Paleta: carne en reposo, ámbar asistente, oro principal, foco incandescente */
const NIVEL = {
  0: { a: "#7A4038", b: "#41211D" },
  1: { a: "#E8A45C", b: "#A05F22" },
  2: { a: "#FFD873", b: "#D2941B" },
  3: { a: "#FFF8DC", b: "#F5C032" },
};

/* Un músculo genérico enciende todas sus porciones */
const ALIAS = {
  recto_abd: ["recto_abd_sup", "recto_abd_inf"],
  gastro: ["gastro_med", "gastro_lat"],
  isquios: ["isq_bf_larga", "isq_bf_corta", "isq_semitend", "isq_semimem"],
  biceps_braq: ["biceps_largo", "biceps_corto"],
  rot_ext: ["infraesp", "redondo_menor"],
  aductores_m: ["aductor_mayor", "aductores_c", "gracil"],
};

/** Expande alias y regiones enteras ("dorsal" → sus músculos). */
function expandir(ids = []) {
  const out = new Set();
  for (const raw of ids) {
    if (ALIAS[raw]) { ALIAS[raw].forEach((m) => out.add(m)); continue; }
    if (ZONES[raw]) { out.add(raw); continue; }
    let esRegion = false;
    for (const [fino, region] of Object.entries(FINE_TO_REGION)) {
      if (region === raw) { out.add(fino); esRegion = true; }
    }
    if (!esRegion && ZONES[raw]) out.add(raw);
  }
  return out;
}

export default function MuscleFigure({
  view = "a", primary = [], secondary = [], intensity = null,
  size = 150, names = null, onTap = null,
}) {
  const [tocado, setTocado] = useState(null);

  /* La base del cuerpo: se calcula una sola vez por vista */
  const base = useMemo(() => {
    const piezas = [];
    for (const r of ART[view]) {
      for (const lado of ["left", "right"]) {
        (r[lado] || []).forEach((d, i) => piezas.push({ key: `${r.slug}-${lado}-${i}`, d, slug: r.slug }));
      }
    }
    return piezas;
  }, [view]);

  const pri = useMemo(() => expandir(primary), [primary]);
  const sec = useMemo(() => expandir(secondary), [secondary]);

  const topCarga = useMemo(() => {
    if (!intensity) return 0;
    const v = Object.values(intensity);
    return v.length ? Math.max(...v) : 0;
  }, [intensity]);

  /* La capa de encendidos: región recortada a la zona del músculo */
  const encendidos = useMemo(() => {
    const out = [];
    const nivelDe = (id) => {
      if (pri.has(id)) {
        if (intensity && topCarga > 0) return (intensity[id] || 0) >= topCarga * 0.999 ? 3 : 2;
        return 2;
      }
      return sec.has(id) ? 1 : 0;
    };
    const todos = [...pri, ...sec];
    for (const id of todos) {
      const nivel = nivelDe(id);
      if (!nivel) continue;
      for (const [v, slug, zona] of (ZONES[id] || [])) {
        if (v !== view) continue;
        const region = ART[view].find((r) => r.slug === slug);
        if (!region) continue;
        for (const lado of ["left", "right"]) {
          const bb = region.bb && region.bb[lado];
          if (!bb || !(region[lado] || []).length) continue;
          let rect = null;
          if (zona) {
            // En el lado derecho se refleja el eje X: "interno" sigue siendo interno
            const [x0, y0, x1, y1] = lado === "right" ? [1 - zona[2], zona[1], 1 - zona[0], zona[3]] : zona;
            rect = { x: bb.x + bb.w * x0, y: bb.y + bb.h * y0, w: bb.w * (x1 - x0), h: bb.h * (y1 - y0) };
          }
          region[lado].forEach((d, i) => out.push({
            key: `${id}-${slug}-${lado}-${i}`, d, nivel, rect, id,
            clip: rect ? `c-${view}-${id}-${lado}` : null,
          }));
        }
      }
    }
    return out;
  }, [pri, sec, intensity, topCarga, view]);

  const recortes = useMemo(() => {
    const m = new Map();
    for (const e of encendidos) if (e.clip && !m.has(e.clip)) m.set(e.clip, e.rect);
    return [...m.entries()];
  }, [encendidos]);

  const tocar = (id, slug) => {
    const nombre = (id && names && names[id]) || REGION_NAMES[slug] || slug;
    setTocado(nombre);
    onTap && onTap(id || slug, nombre);
  };

  return (
    <svg viewBox={VIEWBOX[view]} width={size} height={size * 2}
      style={{ display: "block", overflow: "visible" }}
      role="img" aria-label={view === "a" ? "Vista anterior" : "Vista posterior"}>
      <defs>
        {[0, 1, 2, 3].map((n) => (
          <linearGradient key={n} id={`g${n}-${view}`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor={NIVEL[n].a} />
            <stop offset="100%" stopColor={NIVEL[n].b} />
          </linearGradient>
        ))}
        {recortes.map(([id, r]) => (
          <clipPath key={id} id={id}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} />
          </clipPath>
        ))}
      </defs>

      {/* 1. El cuerpo en reposo, completo */}
      <g>
        {base.map((p) => (
          <path key={p.key} d={p.d} fill={`url(#g0-${view})`}
            stroke="#2A1512" strokeWidth="1.4" strokeOpacity="0.5"
            onClick={() => tocar(null, p.slug)} style={{ cursor: "pointer" }} />
        ))}
      </g>

      {/* 2. Los músculos implicados, recortados a su porción exacta */}
      <g>
        {encendidos.map((e) => (
          <path key={e.key} d={e.d} fill={`url(#g${e.nivel}-${view})`}
            clipPath={e.clip ? `url(#${e.clip})` : undefined}
            stroke="#2A1512" strokeWidth="1.2" strokeOpacity="0.35"
            onClick={() => tocar(e.id, null)} style={{ cursor: "pointer" }} />
        ))}
      </g>

      {/* 3. El contorno, por encima: define la silueta */}
      <path d={OUTLINE[view]} fill="none" stroke="rgba(255,214,180,.35)"
        strokeWidth="2.2" style={{ pointerEvents: "none" }} />
    </svg>
  );
}
