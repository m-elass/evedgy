/*
 * components/StarMap.jsx — EL MAR DE ESTRELLAS (calcado de la imagen de referencia)
 * ─────────────────────────────────────────────────────────────────────────────────
 * Un mapa astronómico de cinco constelaciones con figura (el Dragón, el Ojo, la
 * Flecha Alada, las Hojas, la Luna y la Pluma). Cada figura es un collar de
 * luz: hilos de oro ámbar con su resplandor y sus destellos, perlas de varios
 * colores y estrellas de cuatro rayos afilados; detrás, su cuerpo de cristal
 * translúcido (con fibras y polvo de luz dentro) y unos velos de gasa casi
 * invisibles (aletas, alas, hojas, halos). El fondo es azul noche con nubes de
 * nebulosa. La geometría vive en constelaciones.js; aquí solo se pinta.
 *
 * Lo que NO cambia: las secciones, sus nombres y sus relaciones (llegan de
 * App.jsx igual que antes) y la navegación ya validada: arrastrar el mar,
 * tocar una estrella y sumergirse en ella.
 *
 * Rendimiento: el cielo se construye UNA vez. Cada figura es su propio lienzo
 * SVG (un realce solo repinta esa figura); los cuerpos, velos y resplandores con
 * desenfoque se pintan una sola vez en capas aparte; la nebulosa es un lienzo
 * pequeño que se estira; las nubes de color están quietas; el polvo de fondo son
 * unos pocos trazos (cada punto es un remate redondo, no un elemento); al
 * arrastrar solo se mueve con transform y las animaciones son de opacidad y transform.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CONSTELACIONES, MAPA, CENTRO, MERIDIANOS, RADIO_ROSA, FIN_MERIDIANO, suave, hebra, arcoEntre, circulo, marcas,
} from "./constelaciones";
import "./StarMap.css";

/* pseudo-aleatorio determinista (solo para el polvo del ambiente y el color de las perlas) */
const h = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clave = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const REDUCIR = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* tamaño de cada clase de estrella-sección: halo, rayos en cruz, rayos en aspa y núcleo */
const TALLA = {
  centro:    { halo: 190, cruz: 88, aspa: 36, nucleo: 13, punto: 5.4, grueso: 3.6 },
  nucleo:    { halo: 120, cruz: 50, aspa: 21, nucleo: 9.4, punto: 3.8, grueso: 3.1 },
  principal: { halo: 70, cruz: 27, aspa: 11, nucleo: 5.3, punto: 2.4, grueso: 2.4 },
};

/* un rayo de luz afilado: más grueso junto al núcleo y fino en la punta (L: medio largo, g: grosor) */
const rayo = (L, g) => `M${-L} 0L0 ${-g / 2}L${L} 0L0 ${g / 2}Z`;

/* estrella de cuatro puntas cóncavas (el núcleo de las estrellas grandes) */
function puntas(R) {
  const c = (R * 0.2).toFixed(2);
  return `M0 ${-R}C${c} ${-c} ${c} ${-c} ${R} 0C${c} ${c} ${c} ${c} 0 ${R}C-${c} ${c} -${c} ${c} ${-R} 0C-${c} -${c} -${c} -${c} 0 ${-R}Z`;
}

/* el color de cada perla: el que pide la figura o, si no, uno de su clase */
const tintePerla = (n, j) => {
  if (n.tinte) return n.tinte;
  if (n.role === "brillante" || n.role === "estrella") return "oro";
  const a = h(j * 7.31 + n.x * 0.013 + n.y * 0.007);
  return a < 0.55 ? "blanco" : a < 0.8 ? "lila" : "cian";
};

/** Todo lo que se dibuja, calculado una vez a partir de los datos de siempre. */
function construir(stars, edges, zones) {
  const porId = new Map(stars.map((s) => [s.id, s]));
  const esc = MAPA / 1300;                        // por si llega una sección sin sitio diseñado
  const astros = [], figuras = [], meridianos = [], etiquetas = [];
  const pos = new Map(), cubiertas = new Set();

  for (const c of CONSTELACIONES) {
    const o = c.origin;
    const local = new Map(c.nodes.map((n) => [n.id, n]));
    const deco = [], lineas = [];
    for (const n of c.nodes) {
      if (n.star) {
        const s = porId.get(n.star);
        if (!s) continue;                          // esa sección ya no existe: no se pinta
        const astro = { id: s.id, texto: s.label, x: o.x + n.x, y: o.y + n.y, c: c.id, color: c.color,
          rol: n.centro ? "centro" : n.role === "nucleo" ? "nucleo" : "principal", lado: n.label || "abajo", tinte: n.tinte };
        astros.push(astro);
        pos.set(s.id, astro);
      } else {
        deco.push(n);
      }
    }
    // los hilos de la figura, en sus coordenadas locales
    c.connections.forEach((k, i) => {
      if (k.pts) {
        lineas.push({ key: `${c.id}-${i}`, d: suave(k.pts, { cerrado: !!k.cerrado }), estilo: k.style, s: "", largo: 0 });
        return;
      }
      const pts = k.path.map((id) => local.get(id)).filter(Boolean);
      if (pts.length < 2 || pts.some((p) => p.star && !porId.has(p.star))) return;
      const antes = k.antes ? local.get(k.antes) : null, despues = k.despues ? local.get(k.despues) : null;
      const recta = pts.length === 2 && k.bend !== undefined;
      const quebrada = (q) => "M" + q.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L");
      const d = k.recto ? quebrada(pts) : recta ? arcoEntre(pts[0], pts[1], k.bend) : suave(pts, { antes, despues });
      const d2 = k.style !== "oro" || k.recto ? null
        : recta ? arcoEntre(pts[0], pts[1], k.bend + (k.bend >= 0 ? 0.022 : -0.022)) : hebra(pts, 2.2, { antes, despues });
      const ids = pts.filter((p) => p.star).map((p) => p.star);
      lineas.push({ key: `${c.id}-${i}`, d, d2, estilo: k.style, s: ids.join(" "), largo: pts.length, tenue: !!k.tenue });
      if (k.style === "oro") for (let j = 0; j + 1 < ids.length; j++) cubiertas.add(clave(ids[j], ids[j + 1]));
    });
    if (c.id === "hoy") continue;
    // la caja de la figura (coordenadas locales), con margen para los halos y la niebla
    const todos = [...c.nodes, ...c.connections.flatMap((k) => k.pts || [])];
    const xs = todos.map((n) => n.x), ys = todos.map((n) => n.y), m = 96;
    const caja = { x: Math.round(Math.min(...xs) - m), y: Math.round(Math.min(...ys) - m) };
    caja.w = Math.round(Math.max(...xs) + m) - caja.x;
    caja.h = Math.round(Math.max(...ys) + m) - caja.y;
    figuras.push({ c, caja, deco, lineas });
    if (c.zone) {
      const z = zones.find((zz) => zz.name === c.zone);
      if (z) etiquetas.push({ name: z.name, x: o.x + (c.label?.x ?? 0), y: o.y + (c.label?.y ?? 0) });
    }
  }

  // secciones sin sitio en ninguna figura (por si se añaden en el futuro)
  for (const s of stars) {
    if (pos.has(s.id)) continue;
    const a = { id: s.id, texto: s.label, x: s.x * esc, y: s.y * esc, c: null, color: CONSTELACIONES[5].color,
      rol: "principal", lado: "abajo" };
    astros.push(a); pos.set(s.id, a);
  }
  // nombres de zona sin constelación diseñada
  for (const z of zones) {
    if (!etiquetas.some((e) => e.name === z.name)) etiquetas.push({ name: z.name, x: z.x * esc, y: z.y * esc });
  }

  // las relaciones que la figura no dibuja ya: trayectorias astrales propias. Las de Hoy nacen en el
  // anillo de su rosa y se detienen antes de la estrella a la que llegan (no cruzan ningún nombre).
  edges.forEach(([a, b], i) => {
    if (cubiertas.has(clave(a, b))) return;
    let A = pos.get(a), B = pos.get(b);
    if (!A || !B) return;
    const otro = a === "today" ? b : b === "today" ? a : null;
    let bend = otro && MERIDIANOS[otro] !== undefined ? MERIDIANOS[otro] : 0.1 * (i % 2 ? 1 : -1);
    if (b === "today") { [A, B] = [B, A]; bend = -bend; }   // siempre de Hoy hacia fuera
    const L = Math.hypot(B.x - A.x, B.y - A.y) || 1, ux = (B.x - A.x) / L, uy = (B.y - A.y) / L;
    const r0 = otro ? RADIO_ROSA : 12, r1 = (otro && FIN_MERIDIANO[otro]) || 13;
    const A2 = { x: A.x + ux * r0, y: A.y + uy * r0 }, B2 = { x: B.x - ux * r1, y: B.y - uy * r1 };
    const k = L / Math.max(1, L - r0 - r1);     // la misma comba que tendría la trayectoria entera
    meridianos.push({ key: `m${i}`, id: `cel-m-${i}`, d: arcoEntre(A2, B2, bend * k),
      d2: arcoEntre(A2, B2, (bend + (bend >= 0 ? 0.018 : -0.018)) * k), s: `${a} ${b}`, central: !!otro,
      x1: A2.x, y1: A2.y, x2: B2.x, y2: B2.y });
  });

  return { astros, figuras, meridianos, etiquetas };
}

/* Un hilo de luz: halo ancho y tenue, el hilo, la segunda hebra (si es dorado) y sus destellos */
const SOLO_TRAZO = new Set(["marcas", "barbas", "pluma", "vena", "petalo"]);
function Hilo({ d, d2, estilo, s, id, tenue }) {
  if (SOLO_TRAZO.has(estilo)) return <path className={`cel-solo ${estilo}`} d={d} />;
  return (
    <g className={`cel-hilo ${estilo}${tenue ? " tenue" : ""}`} data-s={s || undefined}>
      {estilo !== "seda" && estilo !== "punteado" && <path className="cel-hh" d={d} />}
      {estilo !== "punteado" && <path id={id} className="cel-l" d={d} />}
      {d2 && <path className="cel-l2" d={d2} />}
      {estilo !== "seda" && <path className="cel-ch" d={d} />}
    </g>
  );
}

/* Una perla de luz (o una estrella dorada con rayos, si es de las grandes) */
function Perla({ n, j }) {
  const t = tintePerla(n, j);
  if (n.role === "estrella") {
    // como las de la referencia: el rayo vertical algo más largo que el horizontal
    return (
      <g transform={`translate(${n.x} ${n.y})`} className="cel-perla estrella">
        <circle r="17" fill="url(#cel-p-oro)" opacity=".9" />
        <path d={rayo(14, 2.2)} fill="url(#cel-rayo)" />
        <path d={rayo(18, 2.2)} fill="url(#cel-rayo)" transform="rotate(90)" />
        <path d={rayo(6.5, 1.2)} fill="url(#cel-rayo)" transform="rotate(45)" opacity=".6" />
        <path d={rayo(6.5, 1.2)} fill="url(#cel-rayo)" transform="rotate(-45)" opacity=".6" />
        <circle r="2.5" fill="#FFF8EC" />
      </g>
    );
  }
  const r = n.role === "brillante" ? [8.8, 1.9] : n.role === "secundaria" ? [5.8, 1.35] : [3.4, 0.85];
  return (
    <g transform={`translate(${n.x} ${n.y})`} className={`cel-perla ${n.role}`}>
      <circle r={r[0]} fill={`url(#cel-p-${t})`} />
      {n.role !== "chispa" && j % 4 === 0 && (
        <path d={`M${-r[0] * 0.85} 0H${r[0] * 0.85}M0 ${-r[0] * 0.85}V${r[0] * 0.85}`} className="cel-cruz" />
      )}
      <circle r={r[1]} fill={t === "oro" ? "#FFF2DE" : "#F6F8FF"} />
    </g>
  );
}

/* Polvo de estrellas: cada punto es el remate redondo de un trazo de longitud cero
   (cientos de estrellas en unos pocos elementos) */
function polvoEn(n, semilla, ancho, alto, x0 = 0, y0 = 0) {
  const grupos = new Map();
  for (let i = 0; i < n; i++) {
    const x = x0 + h(i * 2.1 + semilla) * ancho, y = y0 + h(i * 3.7 + semilla * 1.3) * alto;
    const t = h(i * 5.3 + semilla * 0.7);
    const talla = t < 0.62 ? 0.7 : t < 0.9 ? 1.1 : 1.6;
    const col = ["#FFFFFF", "#DCE6FF", "#BFD9FF", "#D7CCFF", "#FFE9C4"][Math.floor(h(i * 7.9 + semilla) * 5)];
    const op = talla < 1 ? 0.35 : talla < 1.5 ? 0.55 : 0.8;
    const k = `${col}|${talla}|${op}`;
    if (!grupos.has(k)) grupos.set(k, { col, talla, op, d: "" });
    grupos.get(k).d += `M${x.toFixed(1)} ${y.toFixed(1)}h0`;
  }
  return [...grupos.values()];
}

/* La nebulosa del fondo: nubes suaves de violeta y azul hechas con ruido (siempre el mismo dibujo) y,
   encima, las nubes de color del cielo; todo pintado una sola vez en un lienzo pequeño que el navegador
   estira sobre el mapa. Al arrastrar, el fondo es una sola imagen: nada de degradados que repintar. */
function nebulosa(nieblas, lado = 224) {
  try {
    const lienzo = document.createElement("canvas");
    lienzo.width = lienzo.height = lado;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(lado, lado);
    const ruido = (x, y, paso, s) => {           // ruido de valor suavizado en una rejilla de ese paso
      const gx = Math.floor(x / paso), gy = Math.floor(y / paso), tx = x / paso - gx, ty = y / paso - gy;
      const v = (i, j) => h(i * 57.31 + j * 113.17 + s * 7.73);
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = v(gx, gy), b = v(gx + 1, gy), c = v(gx, gy + 1), d = v(gx + 1, gy + 1);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        let n = 0, amp = 0.55, paso = lado / 3.2;
        for (let o = 0; o < 5; o++) {                              // cada octava, girada: sin bloques de rejilla
          const g = 0.6 + o * 1.3, c = Math.cos(g), sn = Math.sin(g);
          n += amp * ruido(x * c - y * sn + 500, x * sn + y * c + 500, paso, 3 + o);
          amp *= 0.5; paso /= 2;
        }
        const tono = ruido(x * 0.8 - y * 0.6 + 900, x * 0.6 + y * 0.8 + 900, lado / 2.4, 17);   // violeta o azul
        const k = Math.max(0, Math.min(1, (n - 0.4) / 0.48));       // solo las crestas: nubes sueltas, cielo limpio
        const i = (y * lado + x) * 4;
        img.data[i] = 46 + 70 * tono;
        img.data[i + 1] = 52 + 18 * (1 - tono);
        img.data[i + 2] = 150 + 60 * (1 - tono * 0.5);
        const e = Math.min(1, Math.min(x, lado - 1 - x, y, lado - 1 - y) / (lado * 0.14));   // se apaga en los bordes
        img.data[i + 3] = Math.round(255 * 0.9 * 0.2 * k * k * e * e * (3 - 2 * e));
      }
    }
    ctx.putImageData(img, 0, 0);
    // las nubes de color, cada una apagándose suave hasta su borde
    const q = lado / MAPA;
    for (const [x, y, r, c] of nieblas) {
      const g = ctx.createRadialGradient(x * q, y * q, 0, x * q, y * q, r * q);
      g.addColorStop(0, c); g.addColorStop(0.28, alfa(c, 0.66)); g.addColorStop(0.52, alfa(c, 0.32));
      g.addColorStop(0.76, alfa(c, 0.1)); g.addColorStop(1, alfa(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect((x - r) * q, (y - r) * q, 2 * r * q, 2 * r * q);
    }
    return lienzo.toDataURL("image/png");
  } catch {
    return null;
  }
}

/* el alfa de un color rgba multiplicado (para que cada nube se apague suave hasta su borde) */
const alfa = (c, k) => c.replace(/,\s*([\d.]+)\)$/, (_, a) => `,${(parseFloat(a) * k).toFixed(3)})`);

/* los puntos del polvo de luz que llevan dentro los cuerpos de cristal */
const GRANO = Array.from({ length: 34 }, (_, i) => ({
  x: +(h(i * 3.3 + 1) * 96).toFixed(1), y: +(h(i * 5.1 + 2) * 96).toFixed(1), r: +(0.35 + h(i * 7.7 + 3) * 0.6).toFixed(2),
  c: ["#FFFFFF", "#DCD4FF", "#CFE6FF", "#FFE9C2"][i % 4], o: +(0.25 + h(i * 9.1 + 4) * 0.6).toFixed(2),
}));

/* En pantallas estrechas el cielo se ve algo más pequeño para que cada figura quepa
   entera en la pantalla; los nombres y la zona que se toca conservan su tamaño real. */
const escalaPara = (ancho) => Math.min(1, Math.max(0.8, ancho / 490));

/* El cuerpo de cada figura (humo, velos, cristal, fibras, cintas y el resplandor de sus hilos) como
   un SVG independiente en texto. Se pinta UNA sola vez en un lienzo: así sus desenfoques no se vuelven
   a calcular cada vez que el mar se arrastra y aparece un trozo nuevo de cielo (eso daba tirones). */
function svgFantasma(c, caja, lineas, ancho, alto) {
  const sil = c.silhouette, f = sil.fuerza ?? 1, col = c.color, id = c.id;
  const cuerpos = sil.shapes || [], rellenos = sil.relleno || [], fibras = sil.fibras || [];
  const velos = sil.velos || [], vetas = sil.vetas || [], cintas = sil.cintas || [];
  const cristal = f * (sil.cristal ?? 1), borde = f * (sil.borde ?? 1), bordeVelos = f * (sil.bordeVelos ?? 1);
  const densidad = f * (sil.densidadVelos ?? 1);
  const brillo = lineas.filter((l) => (l.estilo === "oro" || l.estilo === "trazo") && !l.tenue);
  const n = (v) => +v.toFixed(3);
  const trazos = (lista) => lista.map((d) => `<path d="${d}"/>`).join("");
  const linea = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const desenfoque = (nombre, dev, m) =>
    `<filter id="${nombre}-${id}" x="-${m}%" y="-${m}%" width="${100 + 2 * m}%" height="${100 + 2 * m}%"><feGaussianBlur stdDeviation="${dev}"/></filter>`;
  const grano = GRANO.map((g) => `<circle cx="${g.x}" cy="${g.y}" r="${g.r}" fill="${g.c}" opacity="${g.o}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="${caja.x} ${caja.y} ${caja.w} ${caja.h}">`
    + `<defs>${desenfoque("fa", 18, 40)}${desenfoque("fb", 2.6, 15)}${desenfoque("fs", 1.1, 10)}${desenfoque("fv", sil.veloBlur ?? 1.1, 15)}`
    + `<pattern id="grano-${id}" width="96" height="96" patternUnits="userSpaceOnUse">${grano}</pattern></defs>`
    // el humo y el cristal se pintan opacos y la transparencia va al grupo (no se acumulan);
    // los velos y las cintas de seda, en cambio, se superponen como gasa: donde se cruzan, más luz
    + `<g filter="url(#fa-${id})" fill="${col.mist}" opacity="${n(0.12 * f)}">${trazos([...cuerpos, ...rellenos])}</g>`
    + `<g filter="url(#fv-${id})" fill="${col.velo}" fill-opacity="${n(0.075 * densidad)}">${trazos(velos)}</g>`
    + `<g ${linea} stroke="${col.rim}" stroke-width=".7" opacity="${n(0.2 * bordeVelos)}">${trazos(velos)}</g>`
    + `<g ${linea} stroke="${col.rim}" stroke-width=".45" opacity="${n(0.13 * f)}">${trazos(vetas)}</g>`
    + `<g fill="${col.seda}" opacity="${n(0.13 * cristal)}">${trazos(cuerpos)}</g>`
    + `<g filter="url(#fb-${id})" fill="${col.seda}" opacity="${n(0.17 * f)}">${trazos(rellenos)}</g>`
    + `<g filter="url(#fs-${id})" ${linea} stroke="${col.seda}" stroke-opacity="${n(0.07 * f)}">`
    + cintas.map((k) => `<path d="${k.d}" stroke-width="${k.w}"/>`).join("") + "</g>"
    + `<g filter="url(#fb-${id})" ${linea} stroke="${col.rim}" stroke-width="3" opacity="${n(0.24 * borde)}">${trazos(cuerpos)}</g>`
    + `<g ${linea} stroke="${col.rim}" stroke-width=".55" opacity="${n(0.32 * borde)}">${trazos(cuerpos)}</g>`
    + `<g ${linea} stroke="${col.accent}" stroke-width=".5" opacity="${n(0.22 * f)}">${trazos(fibras)}</g>`
    // el polvo de luz atrapado dentro del cristal
    + `<g fill="url(#grano-${id})" opacity="${n(0.8 * f)}">${trazos([...cuerpos, ...rellenos])}</g>`
    // el resplandor cálido de los hilos de oro
    + `<g filter="url(#fb-${id})" ${linea} stroke="#F4B25E" stroke-width="2.4" opacity=".5">${trazos(brillo.map((l) => l.d))}</g>`
    + "</svg>";
}

/* El cuerpo de una figura pintado en su lienzo (a la resolución de la pantalla, sin pasarse de 2×).
   Si el navegador no pudiera pintar el SVG como imagen, se pone tal cual: se ve igual, solo cuesta más. */
function Fantasma({ c, caja, lineas, i, escala }) {
  const lienzo = useRef(null);
  const [vivo, setVivo] = useState(false);
  const k = Math.min(window.devicePixelRatio || 1, 2) * escala;
  const ancho = Math.max(1, Math.round(caja.w * k)), alto = Math.max(1, Math.round(caja.h * k));
  const texto = useMemo(() => svgFantasma(c, caja, lineas, ancho, alto), [c, caja, lineas, ancho, alto]);
  useEffect(() => {
    const el = lienzo.current;
    if (!el) return undefined;
    let url = "";
    const img = new Image();
    const soltar = () => { if (url) URL.revokeObjectURL(url); url = ""; };
    img.onload = () => {
      try { el.getContext("2d")?.drawImage(img, 0, 0, ancho, alto); } catch { setVivo(true); }
      soltar();
    };
    img.onerror = () => { soltar(); setVivo(true); };
    // uno tras otro (y no todos a la vez) para no frenar la apertura del mar
    const t = setTimeout(() => {
      try { url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml" })); img.src = url; } catch { setVivo(true); }
    }, 60 + i * 140);
    return () => { clearTimeout(t); img.onload = null; img.onerror = null; soltar(); };
  }, [texto, ancho, alto, i]);
  return (
    <div className="cel-fantasma" data-c={c.id}
      style={{ left: c.origin.x + caja.x, top: c.origin.y + caja.y, width: caja.w, height: caja.h,
        animationDelay: `${0.9 + i * 0.25}s, ${-i * 3.1}s` }}>
      {vivo ? <div className="cel-fantasma-svg" dangerouslySetInnerHTML={{ __html: texto }} />
        : <canvas ref={lienzo} width={ancho} height={alto} style={{ width: caja.w, height: caja.h }} aria-hidden="true" />}
    </div>
  );
}

export default function StarMap({ stars, edges, zones, onEnter }) {
  // La posición del mar NO es estado de React: al arrastrar se mueve con
  // transform directamente (una vez por fotograma), sin volver a pintar el cielo.
  const escala = useRef(escalaPara(window.innerWidth));
  const pan = useRef({ x: window.innerWidth / 2 - CENTRO.x * escala.current,
    y: window.innerHeight / 2 - CENTRO.y * escala.current });
  const mapRef = useRef(null);
  const farRef = useRef(null);
  const wrapRef = useRef(null);
  const drag = useRef(null);
  const diving = useRef(false);
  const frame = useRef(0);
  const quieto = useRef(false);

  /* Mientras se arrastra, el cielo se queda quieto: se pausan los pulsos de luz (SMIL) y las
     animaciones CSS (titileos, halos, respiración). Así el hilo principal solo mueve el mapa y el
     arrastre va fluido; al soltar, todo sigue donde estaba (la pausa no se nota). */
  function pausar(si) {
    if (quieto.current === si) return;
    quieto.current = si;
    wrapRef.current?.classList.toggle("cel-arrastrando", si);
    mapRef.current?.querySelectorAll("svg.cel-vivo").forEach((g) => {
      try { if (si) g.pauseAnimations(); else g.unpauseAnimations(); } catch { /* sin SMIL: nada que pausar */ }
    });
  }

  // Con el mar abierto, el fondo de la app (que queda debajo, tapado) deja de animarse
  useEffect(() => {
    document.body.classList.add("cel-en-el-mar");
    return () => document.body.classList.remove("cel-en-el-mar");
  }, []);

  function aplicar() {
    frame.current = 0;
    const { x, y } = pan.current, s = escala.current;
    if (mapRef.current) mapRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)${s < 1 ? ` scale(${s})` : ""}`;
    if (farRef.current) farRef.current.style.transform = `translate3d(${x * 0.45}px, ${y * 0.45}px, 0)`;
  }
  useEffect(() => { pan.current = clamp(pan.current.x, pan.current.y); aplicar(); return () => cancelAnimationFrame(frame.current); }, []);

  function clamp(x, y) {
    const vw = window.innerWidth, vh = window.innerHeight, lado = MAPA * escala.current;
    return { x: Math.min(60, Math.max(vw - lado - 60, x)), y: Math.min(60, Math.max(vh - lado - 60, y)) };
  }
  function down(e) {
    if (diving.current) return;
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.current.x, py: pan.current.y, moved: false };
  }
  function move(e) {
    const d = drag.current; if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 8) { d.moved = true; pausar(true); }
    pan.current = clamp(d.px + e.clientX - d.sx, d.py + e.clientY - d.sy);
    if (!frame.current) frame.current = requestAnimationFrame(aplicar);
  }
  function up() {
    setTimeout(() => { drag.current = null; }, 0);
    if (quieto.current) requestAnimationFrame(() => pausar(false));
  }

  /* Realce: la estrella brilla más, sus trayectorias se encienden y su figura asoma */
  function realzar(a) {
    const root = mapRef.current;
    if (!root || diving.current) return;
    apagar();
    root.querySelectorAll(`[data-s~="${a.id}"]`).forEach((n) => n.classList.add("on"));
    if (a.c) root.querySelectorAll(`[data-c="${a.c}"]`).forEach((n) => n.classList.add("viva"));
  }
  function apagar() {
    const root = mapRef.current;
    if (!root || diving.current) return;
    root.querySelectorAll(".on, .viva").forEach((n) => n.classList.remove("on", "viva"));
  }

  /* Tocar una estrella: su constelación despierta y el mar se sumerge en ella */
  function dive(a) {
    if (drag.current?.moved || diving.current) return;
    const el = mapRef.current;
    if (a.c) el.querySelectorAll(`[data-c="${a.c}"]`).forEach((n) => n.classList.add("despierta"));
    el.querySelectorAll(`[data-s~="${a.id}"]`).forEach((n) => n.classList.add("on"));
    diving.current = true;
    if (navigator.vibrate) navigator.vibrate(20);
    setTimeout(() => {
      // el zoom de siempre (×2,8) centrado en la estrella tocada
      const s = escala.current, k = 2.8;
      el.style.transition = "transform .55s cubic-bezier(.6,.05,.35,1), opacity .5s ease";
      requestAnimationFrame(() => {
        el.style.transform = `translate3d(${pan.current.x + s * a.x * (1 - k)}px, ${pan.current.y + s * a.y * (1 - k)}px, 0) scale(${s * k})`;
        el.style.opacity = "0";
      });
    }, 170);
    setTimeout(() => onEnter(a.id), 620);
  }

  // el cielo se pinta una sola vez: sus estrellas llaman siempre a las acciones del render actual
  const acciones = useRef(null);
  acciones.current = { dive, realzar, apagar };

  const modelo = useMemo(() => construir(stars, edges, zones), [stars, edges, zones]);
  const lejos = useMemo(() => polvoEn(560, 51, MAPA, MAPA), []);

  // Todo el cielo se construye UNA vez: arrastrar ya no lo vuelve a crear
  const cielo = useMemo(() => {
    const { astros, figuras, meridianos, etiquetas } = modelo;
    const polvo = polvoEn(1150, 3, MAPA, MAPA);
    const brillos = Array.from({ length: 58 }, (_, i) => ({
      x: h(i * 11 + 4) * MAPA, y: h(i * 11 + 9) * MAPA, r: 1.8 + h(i * 13 + 1) * 2.4,
      col: ["#FFFFFF", "#CFE6FF", "#DCD0FF", "#FFE7BE"][i % 4],
    }));
    // unas pocas estrellas sueltas con su cruz de luz, como las que salpican la referencia
    const cruces = Array.from({ length: 16 }, (_, i) => ({
      x: h(i * 19 + 7) * MAPA, y: h(i * 23 + 2) * MAPA, r: 5 + h(i * 7 + 3) * 6,
      tinte: ["blanco", "cian", "oro", "lila"][i % 4],
    }));
    const titilan = Array.from({ length: 34 }, (_, i) => ({
      x: h(i * 17 + 4) * MAPA, y: h(i * 17 + 9) * MAPA, s: 1.4 + h(i * 13 + 1) * 1.7,
      col: ["#FFFFFF", "#BFE8FF", "#E2D6FF", "#FFE9BE"][i % 4], dur: 3.6 + h(i * 5 + 8) * 4.4,
    }));
    const derivan = Array.from({ length: 12 }, (_, i) => ({
      x: h(i * 17 + 3) * MAPA, y: h(i * 17 + 6) * MAPA, dur: 70 + h(i * 3 + 1) * 60, dx: (h(i) - 0.5) * 160,
      dy: (h(i + 40) - 0.5) * 120,
    }));
    // nebulosas: nubes muy tenues de azul noche, índigo y algo de violeta, como el fondo moteado de la
    // referencia (sin teñir de morado el cielo), más un poso dorado apenas visible en el centro
    const nieblas = [
      [250, 330, 380, "rgba(58,62,170,.11)"], [90, 640, 260, "rgba(70,54,160,.09)"], [760, 260, 340, "rgba(44,70,170,.09)"],
      [1250, 290, 380, "rgba(64,60,176,.11)"], [1420, 660, 260, "rgba(52,58,150,.08)"], [450, 1090, 360, "rgba(62,58,170,.1)"],
      [1060, 1090, 360, "rgba(48,70,176,.1)"], [760, 1400, 300, "rgba(56,50,150,.08)"], [60, 1320, 280, "rgba(50,44,140,.09)"],
      [1460, 1380, 300, "rgba(48,46,140,.08)"], [560, 660, 220, "rgba(84,64,170,.06)"], [960, 640, 220, "rgba(56,76,180,.06)"],
      [330, 760, 180, "rgba(92,70,180,.05)"], [1190, 760, 200, "rgba(60,86,190,.05)"], [760, 40, 260, "rgba(60,56,160,.08)"],
      [170, 90, 200, "rgba(76,58,170,.07)"], [1380, 60, 220, "rgba(80,60,176,.07)"], [620, 1220, 200, "rgba(70,60,170,.06)"],
      [1300, 980, 200, "rgba(54,72,176,.06)"], [40, 960, 200, "rgba(60,64,160,.06)"],
      [CENTRO.x, CENTRO.y, 240, "rgba(232,190,110,.045)"],
    ];
    const nube = nebulosa(nieblas);
    const pulsosMer = meridianos.filter((m) => m.central).map((m, i) => ({ ref: m.id, dur: 11 + (i % 3) * 2.2, begin: 1.2 + i * 1.7 }));

    return (
      <>
        {/* la nebulosa y las nubes de color: una sola imagen */}
        {nube ? <div className="cel-nebulosa" style={{ width: MAPA, height: MAPA, backgroundImage: `url(${nube})` }} />
          : nieblas.map(([x, y, r, c], i) => (
            <span key={i} className="cel-neb" style={{ left: x - r, top: y - r,
              width: r * 2, height: r * 2, background: `radial-gradient(circle closest-side, ${c} 0%, ${alfa(c, 0.66)} 28%, `
                + `${alfa(c, 0.32)} 52%, ${alfa(c, 0.1)} 76%, transparent 100%)` }} />
          ))}

        {/* polvo estelar quieto: unos pocos trazos */}
        <svg className="cel-polvo" width={MAPA} height={MAPA} aria-hidden="true">
          {polvo.map((g, i) => (
            <path key={i} d={g.d} stroke={g.col} strokeWidth={g.talla} strokeLinecap="round" opacity={g.op} />
          ))}
          {brillos.map((b, i) => (
            <g key={`b${i}`} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}>
              <circle r={b.r * 2.4} fill={`url(#cel-p-${["blanco", "cian", "lila", "oro"][i % 4]})`} opacity=".45" />
              <circle r={b.r * 0.32} fill={b.col} />
            </g>
          ))}
          {cruces.map((b, i) => (
            <g key={`x${i}`} transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`} opacity=".8">
              <circle r={b.r * 0.9} fill={`url(#cel-p-${b.tinte})`} />
              <path d={rayo(b.r, 1.1)} fill="url(#cel-rayo)" />
              <path d={rayo(b.r * 1.25, 1.1)} fill="url(#cel-rayo)" transform="rotate(90)" />
              <circle r=".9" fill="#FFFFFF" />
            </g>
          ))}
        </svg>

        {/* el cuerpo de cada figura, como en la referencia: un humo apenas visible, los velos fantasma
            (aletas, alas, hojas, halos) de borde suave, el cristal translúcido con su borde de luz y
            sus fibras, y el resplandor cálido que rodea los hilos dorados. Pintado una vez en su lienzo. */}
        {figuras.map(({ c, caja, lineas }, i) => (
          <Fantasma key={c.id} c={c} caja={caja} lineas={lineas} i={i} escala={escala.current} />
        ))}

        {/* las trayectorias de Hoy al corazón de cada constelación: salen con luz, se adelgazan
            en el viaje y llegan encendidas; al realzarlas se iluminan enteras */}
        <svg className="cel-meridianos cel-vivo" width={MAPA} height={MAPA} aria-hidden="true">
          {meridianos.map((m) => (
            <g key={m.key} className={`cel-meridiano ${m.central ? "central" : ""}`} data-s={m.s}>
              <defs>
                <linearGradient id={`cel-mg-${m.key}`} gradientUnits="userSpaceOnUse" x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2}>
                  <stop offset="0" stopColor="#FFCC82" stopOpacity=".95" />
                  <stop offset=".24" stopColor="#FFCC82" stopOpacity=".45" />
                  <stop offset=".52" stopColor="#F2B65E" stopOpacity=".2" />
                  <stop offset=".8" stopColor="#FFCC82" stopOpacity=".5" />
                  <stop offset="1" stopColor="#FFDDA8" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path className="cel-glow" d={m.d} style={{ stroke: `url(#cel-mg-${m.key})` }} />
              <path id={m.id} className="cel-l" d={m.d} style={{ stroke: `url(#cel-mg-${m.key})` }} />
              <path className="cel-l2" d={m.d2} style={{ stroke: `url(#cel-mg-${m.key})` }} />
              <path className="cel-lon" d={m.d} />
            </g>
          ))}
          {!REDUCIR && pulsosMer.map((p, i) => (
            <g key={i} opacity="0">
              <circle r="7" fill="url(#cel-pulso)" />
              <circle r="1.4" fill="#FFFDF6" />
              <animateMotion dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite"
                keyPoints="0;1;1" keyTimes="0;0.62;1" calcMode="linear">
                <mpath href={`#${p.ref}`} xlinkHref={`#${p.ref}`} />
              </animateMotion>
              <animate attributeName="opacity" values="0;.9;.9;0;0" keyTimes="0;0.07;0.54;0.62;1"
                dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
            </g>
          ))}
        </svg>

        {/* cada figura, en su propio lienzo y en sus coordenadas */}
        {figuras.map(({ c, caja, deco, lineas }, ci) => {
          const pulsos = lineas.filter((l) => l.estilo === "oro" && l.largo >= 4 && !l.tenue);
          return (
            <div key={c.id} className="cel-figura" data-c={c.id}
              style={{ left: c.origin.x + caja.x, top: c.origin.y + caja.y, width: caja.w, height: caja.h,
                color: c.color.accent, animationDelay: `${0.35 + ci * 0.22}s` }}>
              <svg className="cel-vivo" width={caja.w} height={caja.h} viewBox={`${caja.x} ${caja.y} ${caja.w} ${caja.h}`} aria-hidden="true">
                {c.orbits.map((o, j) => <Hilo key={`o${j}`} d={o.d} estilo={o.style} />)}
                {lineas.map((l) => <Hilo key={l.key} id={`cel-t-${l.key}`} d={l.d} d2={l.d2} estilo={l.estilo} s={l.s} tenue={l.tenue} />)}
                {c.planets.map((p, j) => (
                  <g key={`p${j}`} transform={`translate(${p.x} ${p.y})`}>
                    <circle r={p.r * 2.6} fill={`url(#cel-p-${p.violeta ? "lila" : "blanco"})`} opacity=".45" />
                    <circle r={p.r} fill={p.violeta ? "url(#cel-planeta-v)" : "url(#cel-planeta)"} />
                  </g>
                ))}
                {deco.map((n, j) => <Perla key={n.id} n={n} j={j} />)}
                {!REDUCIR && pulsos.map((l, i) => (
                  <g key={`u${i}`} opacity="0">
                    <circle r="6" fill="url(#cel-pulso)" />
                    <circle r="1.3" fill="#FFFDF6" />
                    <animateMotion dur={`${12 + (i % 3) * 2.5}s`} begin={`${2.5 + ci * 1.3 + i * 2.1}s`} repeatCount="indefinite"
                      keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear">
                      <mpath href={`#cel-t-${l.key}`} xlinkHref={`#cel-t-${l.key}`} />
                    </animateMotion>
                    <animate attributeName="opacity" values="0;.85;.85;0;0" keyTimes="0;0.07;0.52;0.6;1"
                      dur={`${12 + (i % 3) * 2.5}s`} begin={`${2.5 + ci * 1.3 + i * 2.1}s`} repeatCount="indefinite" />
                  </g>
                ))}
              </svg>
            </div>
          );
        })}

        {/* la rosa astral de Hoy: el centro del mapa */}
        <div className="cel-rosa" style={{ left: CENTRO.x, top: CENTRO.y }} aria-hidden="true">
          <svg width="230" height="230" viewBox="-115 -115 230 230">
            <path d={circulo(0, 0, 80)} className="r1" />
            <path d={circulo(0, 0, 86)} className="r2" />
            <path d={marcas(0, 0, 86, 3, 5, 30, 2)} className="r3" />
            <path d={puntas(64)} className="r4" />
            <path d={puntas(64)} className="r4" transform="rotate(45) scale(.62)" />
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d="M0 -88 L2.6 -83 L0 -78 L-2.6 -83 Z" transform={`rotate(${a})`} className="r5" />
            ))}
            {[22, 67, 112, 157, 202, 247, 292, 337].map((a, i) => (
              <circle key={a} cx={(80 * Math.cos((a * Math.PI) / 180)).toFixed(1)} cy={(80 * Math.sin((a * Math.PI) / 180)).toFixed(1)}
                r={i % 2 ? 1 : 1.5} className="r6" />
            ))}
          </svg>
        </div>

        {/* destellos que titilan y motas que derivan */}
        {titilan.map((t, i) => (
          <span key={i} className="cel-tw" style={{ left: t.x, top: t.y, width: t.s, height: t.s, background: t.col,
            boxShadow: `0 0 ${t.s * 3}px ${t.s * 0.6}px ${t.col}`, animationDuration: `${t.dur}s`,
            animationDelay: `${-(i * 0.9)}s` }} />
        ))}
        {derivan.map((t, i) => (
          <span key={i} className="cel-deriva" style={{ left: t.x, top: t.y, animationDuration: `${t.dur}s`,
            "--dx": `${t.dx}px`, "--dy": `${t.dy}px`, animationDelay: `${-i * 7}s` }} />
        ))}

        {/* los nombres de las constelaciones */}
        {etiquetas.map((z) => (
          <span key={z.name} className="cel-zona" style={{ left: z.x, top: z.y }}>{z.name}</span>
        ))}

        {/* las estrellas-sección: las que se pueden tocar */}
        {astros.map((a, i) => {
          const t = TALLA[a.rol];
          const caja = (t.cruz * 1.2 + 6) * 2;
          return (
            <button key={a.id} className={`cel-astro ${a.rol}${a.tinte ? ` ${a.tinte}` : ""}`} data-c={a.c || undefined} data-s={a.id}
              style={{ left: a.x, top: a.y, "--halo": a.color.halo, animationDelay: `${0.25 + i * 0.035}s` }}
              onClick={() => acciones.current.dive(a)} onPointerEnter={() => acciones.current.realzar(a)}
              onPointerLeave={() => acciones.current.apagar()} onFocus={() => acciones.current.realzar(a)}
              onBlur={() => acciones.current.apagar()} aria-label={a.texto}>
              <span className="cel-halo" style={{ width: t.halo, height: t.halo, animationDelay: `${-(i % 7) * 1.1}s` }} />
              <svg className="cel-luz" width={caja} height={caja} viewBox={`${-caja / 2} ${-caja / 2} ${caja} ${caja}`}
                style={{ animationDelay: `${-(i % 5) * 0.9}s` }}>
                <g className="rayos">
                  <path d={rayo(t.cruz, t.grueso)} fill="url(#cel-rayo)" />
                  <path d={rayo(t.cruz * 1.2, t.grueso)} fill="url(#cel-rayo)" transform="rotate(90)" />
                  <path d={rayo(t.aspa, t.grueso * 0.55)} fill="url(#cel-rayo)" transform="rotate(45)" opacity=".6" />
                  <path d={rayo(t.aspa, t.grueso * 0.55)} fill="url(#cel-rayo)" transform="rotate(-45)" opacity=".6" />
                </g>
                <circle r={t.nucleo * 2.1} fill="url(#cel-corona)" />
                <path d={puntas(t.nucleo)} fill="url(#cel-nucleo)" />
                <circle r={t.punto} fill="#FFFEF8" />
              </svg>
              <span className={`cel-lab ${a.lado}`} style={{ "--d": `${t.nucleo * 2.2 + 9}px` }}>{a.texto}</span>
            </button>
          );
        })}
      </>
    );
  }, [modelo]);

  return (
    <div ref={wrapRef} className="smap-wrap cel-cielo" onPointerDown={down} onPointerMove={move}
      onPointerUp={up} onPointerCancel={up}
      style={{ "--cel-k": 1 / escala.current, "--cel-kl": Math.pow(1 / escala.current, 0.75) }}>
      {/* la noche: hondura sobre el mar de siempre, solo mientras se ve el mapa */}
      <div className="cel-noche" aria-hidden="true" />
      {/* degradados compartidos por todas las estrellas y perlas */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="cel-rayo" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#FFEDD2" stopOpacity="0" />
            <stop offset="40%" stopColor="#FFE6C2" stopOpacity=".5" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="60%" stopColor="#FFE6C2" stopOpacity=".5" />
            <stop offset="100%" stopColor="#FFEDD2" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="cel-nucleo">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#FFE8C6" />
            <stop offset="100%" stopColor="#EFAE55" />
          </radialGradient>
          <radialGradient id="cel-corona">
            <stop offset="0%" stopColor="#FFF1DA" stopOpacity=".9" />
            <stop offset="50%" stopColor="#FFC982" stopOpacity=".24" />
            <stop offset="100%" stopColor="#FFC982" stopOpacity="0" />
          </radialGradient>
          {/* las perlas: un punto blanco que se funde en su color */}
          {[["oro", "#FFC274", ".5"], ["blanco", "#E4ECFF", ".42"], ["cian", "#8FDCFF", ".5"], ["lila", "#B9A6FF", ".5"]].map(([id, col, o]) => (
            <radialGradient key={id} id={`cel-p-${id}`}>
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".95" />
              <stop offset="22%" stopColor={col} stopOpacity={o} />
              <stop offset="55%" stopColor={col} stopOpacity=".12" />
              <stop offset="100%" stopColor={col} stopOpacity="0" />
            </radialGradient>
          ))}
          {/* polvo de luz para el interior del cristal: un azulejo grande de puntos sueltos */}
          <pattern id="cel-grano" width="96" height="96" patternUnits="userSpaceOnUse">
            {GRANO.map((g, i) => <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={g.c} opacity={g.o} />)}
          </pattern>
          <radialGradient id="cel-pulso">
            <stop offset="0%" stopColor="#FFF4E2" stopOpacity="1" />
            <stop offset="30%" stopColor="#FFD9A0" stopOpacity=".55" />
            <stop offset="100%" stopColor="#FFC274" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cel-planeta" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#F4F0FF" />
            <stop offset="45%" stopColor="#A9B6E8" />
            <stop offset="100%" stopColor="#2A3466" />
          </radialGradient>
          <radialGradient id="cel-planeta-v" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#F1E8FF" />
            <stop offset="45%" stopColor="#B49BEA" />
            <stop offset="100%" stopColor="#3A2A70" />
          </radialGradient>
        </defs>
      </svg>

      {/* la capa lejana de polvo: paralaje al arrastrar */}
      <div ref={farRef} className="smap-far cel-lejos" aria-hidden="true">
        <svg width={MAPA} height={MAPA}>
          {lejos.map((g, i) => (
            <path key={i} d={g.d} stroke={g.col} strokeWidth={g.talla * 0.8} strokeLinecap="round" opacity={g.op * 0.7} />
          ))}
        </svg>
      </div>

      {/* estrellas fugaces, muy de vez en cuando */}
      <div className="meteors" aria-hidden="true"><i /><i /><i /></div>

      <div ref={mapRef} className="smap" style={{ width: MAPA, height: MAPA, transformOrigin: "0 0" }}>
        {cielo}
      </div>

      <div className="maphint">Arrastra el mar · toca una estrella para entrar</div>
    </div>
  );
}
