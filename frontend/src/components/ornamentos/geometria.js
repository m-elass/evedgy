/*
 * ornamentos/geometria.js — la geometría del sistema ornamental.
 * ──────────────────────────────────────────────────────────────
 * Funciones puras que devuelven trazados SVG (cadenas "d") o puntos. Todo el
 * sistema ornamental se dibuja con ellas: cristales facetados, gotas, husos,
 * destellos de cuatro puntas, medias lunas, cintas de agua, plumas, órbitas y
 * rizos de filigrana. Ninguna imagen: solo geometría propia, en coordenadas
 * con el eje Y hacia abajo (como SVG).
 */

const r2 = (v) => Math.round(v * 100) / 100;
export const P = (x, y) => `${r2(x)} ${r2(y)}`;
const { sin, cos, PI, hypot, exp, max, pow } = Math;
export const TAU = PI * 2;

/* ── utilidades ── */
export const poli = (pts, cerrar = true) => "M" + pts.map((p) => P(p[0], p[1])).join("L") + (cerrar ? "Z" : "");
export const tri = (a, b, c) => poli([a, b, c]);
export const lin = (a, b) => `M${P(a[0], a[1])}L${P(b[0], b[1])}`;
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const espejoX = (pts, cx = 0) => pts.map(([x, y]) => [2 * cx - x, y]);

/* Une puntos con curvas suaves (Catmull-Rom → Bézier). Devuelve solo los
   comandos "C …" a partir del primer punto (para poder encadenar tramos). */
export function tramos(pts, cerrar = false, tension = 1) {
  const n = pts.length;
  if (n < 2) return "";
  const at = (i) => (cerrar ? pts[(i + n) % n] : pts[Math.min(n - 1, Math.max(0, i))]);
  let d = "";
  const fin = cerrar ? n : n - 1;
  for (let i = 0; i < fin; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
    d += `C${P(c1[0], c1[1])} ${P(c2[0], c2[1])} ${P(p2[0], p2[1])}`;
  }
  return d;
}
export const suave = (pts, cerrar = false, tension = 1) =>
  `M${P(pts[0][0], pts[0][1])}` + tramos(pts, cerrar, tension) + (cerrar ? "Z" : "");

/* Puntos sobre una elipse (ángulos en radianes, giro en grados). */
export function elipsePts(cx, cy, rx, ry, a0, a1, n = 24, giro = 0) {
  const g = (giro * PI) / 180, cg = cos(g), sg = sin(g);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const x = rx * cos(a), y = ry * sin(a);
    pts.push([cx + x * cg - y * sg, cy + x * sg + y * cg]);
  }
  return pts;
}
/* Arco de elipse abierto y suave (para órbitas incompletas). */
export const arco = (cx, cy, rx, ry, a0, a1, giro = 0, n = 28) => suave(elipsePts(cx, cy, rx, ry, a0, a1, n, giro));
/* Círculo completo como trazado (sirve para "dibujarse" con pathLength). */
export const circulo = (cx, cy, r) =>
  `M${P(cx, cy - r)}A${r2(r)} ${r2(r)} 0 1 1 ${P(cx, cy + r)}A${r2(r)} ${r2(r)} 0 1 1 ${P(cx, cy - r)}Z`;

/* ── CRISTALES ── */

/* Rombo facetado: las cuatro puntas y el centro de las facetas.
   k = altura (0..1 desde arriba) del punto más ancho: <0,5 da un cristal de punta larga abajo. */
export function rombo(cx, cy, w, h, k = 0.5) {
  const a = w / 2, top = cy - h / 2, yw = top + h * k;
  return { T: [cx, top], R: [cx + a, yw], B: [cx, top + h], L: [cx - a, yw], C: [cx, yw] };
}

/* Estrella de cuatro puntas de lados cóncavos (el engaste dorado, los destellos).
   cintura: 0 = rombo recto … 1 = brazos finísimos. arriba/abajo permiten puntas desiguales. */
export function estrella4(cx, cy, rx, arriba, cintura = 0.6, abajo = arriba, rxIzq = rx) {
  const T = [cx, cy - arriba], R = [cx + rx, cy], B = [cx, cy + abajo], L = [cx - rxIzq, cy];
  const c = (p, q) => {
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    return [mx + (cx - mx) * cintura, my + (cy - my) * cintura];
  };
  const q = (p, k) => `Q${P(...c(p, k))} ${P(k[0], k[1])}`;
  return `M${P(T[0], T[1])}${q(T, R)}${q(R, B)}${q(B, L)}${q(L, T)}Z`;
}
/* Destello: estrella de cuatro brazos finos (con brazos verticales opcionalmente más largos). */
export const destello = (cx, cy, r, alto = 1, fino = 0.9) => estrella4(cx, cy, r, r * alto, fino, r * alto);

/* Huso: lente vertical apuntada arriba y abajo. */
export function huso(cx, cy, w, h, panza = 1) {
  const t = cy - h / 2, b = cy + h / 2, k = (w / 2) * 1.333 * panza;
  return `M${P(cx, t)}C${P(cx + k, t + h * 0.3)} ${P(cx + k, b - h * 0.3)} ${P(cx, b)}` +
    `C${P(cx - k, b - h * 0.3)} ${P(cx - k, t + h * 0.3)} ${P(cx, t)}Z`;
}
/* Media lente (solo un lado del huso): para facetar. lado = 1 derecha, -1 izquierda */
export function husoMitad(cx, cy, w, h, lado = 1, panza = 1) {
  const t = cy - h / 2, b = cy + h / 2, k = (w / 2) * 1.333 * panza * lado;
  return `M${P(cx, t)}C${P(cx + k, t + h * 0.3)} ${P(cx + k, b - h * 0.3)} ${P(cx, b)}Z`;
}

/* Gota: punta arriba, panza redonda abajo (o al revés con invertida). */
export function gota(cx, cy, w, h, invertida = false) {
  const a = w / 2, t = cy - h / 2, yc = cy + h / 2 - a;
  const d = `M${P(cx, t)}C${P(cx + a * 0.22, t + h * 0.26)} ${P(cx + a, yc - a * 0.95)} ${P(cx + a, yc)}` +
    `A${r2(a)} ${r2(a)} 0 0 1 ${P(cx - a, yc)}` +
    `C${P(cx - a, yc - a * 0.95)} ${P(cx - a * 0.22, t + h * 0.26)} ${P(cx, t)}Z`;
  return invertida ? { d, transform: `rotate(180 ${r2(cx)} ${r2(cy)})` } : { d };
}
/* La mitad izquierda (o derecha) de la gota: faceta de luz. */
export function gotaMitad(cx, cy, w, h, lado = -1) {
  const a = (w / 2) * lado, t = cy - h / 2, yc = cy + h / 2 - Math.abs(a);
  return `M${P(cx, t)}C${P(cx + a * 0.22, t + h * 0.26)} ${P(cx + a, yc - Math.abs(a) * 0.95)} ${P(cx + a, yc)}` +
    `A${r2(Math.abs(a))} ${r2(Math.abs(a))} 0 0 ${lado > 0 ? 1 : 0} ${P(cx, yc + Math.abs(a))}Z`;
}

/* ── MEDIA LUNA: disco exterior menos disco interior desplazado ── */
export function mediaLuna(cx, cy, R, r, dx, dy, n = 40) {
  // intersecciones de los dos círculos
  const d = hypot(dx, dy);
  const a = (R * R - r * r + d * d) / (2 * d);
  const h = Math.sqrt(max(0, R * R - a * a));
  const ux = dx / d, uy = dy / d;
  const px = cx + ux * a, py = cy + uy * a;
  const p1 = [px - uy * h, py + ux * h], p2 = [px + uy * h, py - ux * h];
  const ang = (p, ox, oy) => Math.atan2(p[1] - oy, p[0] - ox);
  // arco exterior: de p1 a p2 por el lado contrario al disco interior
  let a1 = ang(p1, cx, cy), a2 = ang(p2, cx, cy);
  const dir = Math.atan2(dy, dx);
  // recorrer el lado largo (el que pasa por dir + PI)
  const norm = (x) => ((x % TAU) + TAU) % TAU;
  const lejos = dir + PI;
  // decidir sentido: probamos a1→a2 en sentido positivo y vemos si contiene "lejos"
  let sweep = norm(a2 - a1);
  const contiene = norm(lejos - a1) < sweep;
  const ext = [];
  if (contiene) { for (let i = 0; i <= n; i++) ext.push(a1 + (sweep * i) / n); }
  else { sweep = TAU - sweep; for (let i = 0; i <= n; i++) ext.push(a1 - (sweep * i) / n); }
  const pe = ext.map((t) => [cx + R * cos(t), cy + R * sin(t)]);
  // arco interior: de p2 a p1 por dentro del disco exterior
  const icx = cx + dx, icy = cy + dy;
  const b2 = ang(p2, icx, icy), b1 = ang(p1, icx, icy);
  let sw = norm(b1 - b2);
  const cerca = dir + PI; // la parte del círculo interior que mira hacia fuera del desplazamiento
  const conts = norm(cerca - b2) < sw;
  const intr = [];
  const m = Math.round(n * 0.8);
  if (conts) { for (let i = 1; i < m; i++) intr.push(b2 + (sw * i) / m); }
  else { sw = TAU - sw; for (let i = 1; i < m; i++) intr.push(b2 - (sw * i) / m); }
  const pi = intr.map((t) => [icx + r * cos(t), icy + r * sin(t)]);
  return { d: "M" + [...pe, ...pi].map((p) => P(p[0], p[1])).join("L") + "Z", p1, p2 };
}

/* ── CINTAS DE AGUA: un lomo con grosor que nace y muere en punta ── */
export function cinta(lomo, ancho, perfil = 1, asim = 0) {
  const n = lomo.length;
  const izq = [], der = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = lomo[i], a = lomo[Math.max(0, i - 1)], b = lomo[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx;
    const w = (typeof ancho === "function" ? ancho(t) : ancho * pow(sin(PI * t), perfil)) / 2;
    const wi = w * (1 + asim), wd = w * (1 - asim);
    izq.push([p[0] + nx * wi, p[1] + ny * wi]);
    der.push([p[0] - nx * wd, p[1] - ny * wd]);
  }
  der.reverse();
  return `M${P(izq[0][0], izq[0][1])}` + tramos(izq) + `L${P(der[0][0], der[0][1])}` + tramos(der) + "Z";
}
/* Lomo curvo de una pluma o una hoja: de la base a la punta con una comba. */
export function lomoCurvo(base, punta, comba = 0.25, n = 14, giroFinal = 0) {
  const dx = punta[0] - base[0], dy = punta[1] - base[1];
  const L = hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = sin(PI * t) * comba * L + giroFinal * pow(t, 3) * L;
    pts.push([base[0] + dx * t + nx * s, base[1] + dy * t + ny * s]);
  }
  return pts;
}
/* Pluma de cristal: hoja curva, ancha cerca de la base y muy fina en la punta. */
export function pluma(base, punta, ancho, comba = 0.22, giroFinal = 0, asim = 0.25) {
  const lomo = lomoCurvo(base, punta, comba, 16, giroFinal);
  const d = cinta(lomo, (t) => ancho * pow(sin(PI * pow(t, 0.58)), 0.85), 1, asim);
  return { d, lomo };
}

/* ── FILIGRANA: rizos (espiral que se cierra) ── */
export function rizo(cx, cy, r0, vueltas = 1.25, giro = 0, sentido = 1, apriete = 0.22, n = 30) {
  const pts = [];
  const g = (giro * PI) / 180;
  for (let i = 0; i <= n; i++) {
    const th = (vueltas * TAU * i) / n;
    const r = r0 * exp(-apriete * th);
    pts.push([cx + r * cos(g + sentido * th), cy + r * sin(g + sentido * th)]);
  }
  return pts;
}

/* Marcas radiales sobre un círculo (los ticks del astrolabio). */
export function marcas(cx, cy, r1, r2v, n, desfase = 0) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = desfase + (TAU * i) / n;
    d += `M${P(cx + r1 * cos(a), cy + r1 * sin(a))}L${P(cx + r2v * cos(a), cy + r2v * sin(a))}`;
  }
  return d;
}
/* Puntos (posiciones) repartidos sobre un círculo. */
export function sobreCirculo(cx, cy, r, n, desfase = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = desfase + (TAU * i) / n;
    return [cx + r * cos(a), cy + r * sin(a)];
  });
}

/* Ojiva: dos arcos que se juntan arriba y abajo (los "paréntesis" dorados de los glifos). */
export function ojiva(cx, cy, w, h, cintura = 0.18) {
  const t = cy - h / 2, b = cy + h / 2, a = w / 2;
  return {
    izq: `M${P(cx, t)}C${P(cx - a * 0.25, t + h * cintura)} ${P(cx - a * 1.15, cy - h * 0.2)} ${P(cx - a, cy)}` +
      `C${P(cx - a * 0.88, cy + h * 0.28)} ${P(cx - a * 0.2, b - h * cintura)} ${P(cx, b)}`,
    der: `M${P(cx, t)}C${P(cx + a * 0.25, t + h * cintura)} ${P(cx + a * 1.15, cy - h * 0.2)} ${P(cx + a, cy)}` +
      `C${P(cx + a * 0.88, cy + h * 0.28)} ${P(cx + a * 0.2, b - h * cintura)} ${P(cx, b)}`,
  };
}

/* Generador pseudoaleatorio determinista (mismas posiciones en cada carga: sin saltos). */
export function azar(semilla = 1) {
  let s = semilla >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export function semillaDe(texto = "") {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
