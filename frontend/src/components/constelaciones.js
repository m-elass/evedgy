/*
 * components/constelaciones.js — LA GEOMETRÍA DEL MAR DE ESTRELLAS
 * ────────────────────────────────────────────────────────────────
 * Cada zona del mar es una constelación con figura propia, CALCADA de la
 * imagen de referencia: las coordenadas de cada figura están escritas tal
 * cual se ven en esa imagen (1536 × 1024) y `ref(cx, cy)` las lleva al mapa.
 * Nada de azar en la forma: el azar solo varía el tamaño y el color de las
 * perlas de luz.
 *
 *   Cuerpo → el Dragón          Meta, la frente; Rangos, el pecho; Entreno, la
 *                               primera vuelta; Sueño, la segunda; Ejercicios y
 *                               Anatomía, la garra; Récords, la perla.
 *   Saber  → el Ojo             astrolabio con loto: Lecturas es la pupila.
 *   Hacer  → la Flecha Alada    Tareas es la punta; Hábitos, el astil.
 *   Vida   → las Hojas          Objetivos es el nudo de las dos hojas.
 *   Mente  → la Luna y la Pluma Carta diaria arriba de la luna; Destellos y
 *                               Escritura, la punta y la plumilla de la pluma.
 *   Hoy    → la rosa astral del centro · Ajustes → el pequeño instrumento.
 *
 * Cómo se edita una constelación (sin tocar el resto):
 *
 *   {
 *     origin:  { x, y }             dónde se coloca en el lienzo (el centro de su `ref`)
 *     nodes:   [{ id, x, y, role, star?, label?, tinte? }]
 *               role:  "nucleo" (la más luminosa) · "principal"  → estrellas-sección
 *                      "estrella" (dorada con rayos) · "brillante" (perla dorada)
 *                      "secundaria" (perla) · "chispa" (polvo)  → adorno
 *               star:  el id de la sección que vive en ese nodo (se puede tocar)
 *               label: dónde va su nombre: "abajo" · "arriba" · "izq" · "der" y diagonales
 *               tinte: color de una perla: "oro" · "blanco" · "cian" · "lila"
 *     connections: [{ path: [ids…], style, bend?, tenue?, recto? }]   hilo de luz que pasa por esos nodos
 *               (tenue: más fino · recto: tramos rectos, con esquina en cada nodo)
 *               ó  [{ pts: [{x,y}…], style }]          hilo libre (bordes, hebras, órbitas…)
 *               style: "oro"      relación de datos (doble hebra dorada)
 *                      "trazo"    dibujo de la figura (hilo cálido con destellos)
 *                      "fino"     detalle (hilo frío)
 *                      "seda"     hebra translúcida, sin destellos
 *                      "punteado" estela de polvo
 *     orbits:  [{ d, style }]       trazos sueltos en SVG (mismos estilos, más
 *                                   "marcas", "barbas", "pluma", "vena", "petalo")
 *     planets: [{ x, y, r }]
 *     silhouette: { shapes: [d], relleno: [d], fibras: [d], velos: [d], vetas: [d], fuerza? }
 *               shapes: cuerpo de cristal translúcido (seda) con el borde iluminado
 *               relleno: el mismo cristal, sin borde y difuminado (cuando el contorno ya lo dibujan los hilos)
 *               fibras: la textura de ese cuerpo (hebras finas que siguen su forma)
 *               velos:  formas fantasma, casi invisibles (aletas, alas, hojas, halos)
 *               vetas:  las nervaduras apenas dibujadas de esos velos
 *               bordeVelos: cuánto se dibuja el contorno de los velos (1 = normal)
 *               cristal: cuánto se ve el relleno del cristal (1 = normal) · borde: cuánto su contorno
 *               cintas: [{ d, w }] cintas anchas de seda translúcida que se superponen (la trenza del cuerpo)
 *               densidadVelos, veloBlur: cuánto se ven los velos y cuánto se difuminan
 *     color:   { halo, accent, mist (humo), seda (cristal), velo (fantasma), rim (borde) }
 *   }
 *
 * Las relaciones entre secciones (EDGES de App.jsx) se dibujan SIEMPRE: si
 * una conexión "oro" de la figura ya une esas dos estrellas sin otra sección
 * en medio, la relación es parte de la figura; si no, se dibuja como una
 * trayectoria astral propia (MERIDIANOS dice cómo se curvan las de Hoy).
 */

export const MAPA = 1500;
export const CENTRO = { x: 750, y: 750 };

const r1 = (n) => Math.round(n * 10) / 10;
const P = (x, y) => ({ x, y });
const RAD = (a) => (a * Math.PI) / 180;
const GRADOS = (p, c = P(0, 0)) => (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;

// ── Curvas ────────────────────────────────────────────────

/** Curva suave (Catmull-Rom) que pasa por todos los puntos. */
export function suave(pts, { k = 1, cerrado = false, antes = null, despues = null } = {}) {
  if (!pts || pts.length < 2) return "";
  const Q = cerrado ? [pts[pts.length - 1], ...pts, pts[0], pts[1]]
    : [antes || pts[0], ...pts, despues || pts[pts.length - 1]];
  let d = `M${r1(Q[1].x)} ${r1(Q[1].y)}`;
  for (let i = 1; i < Q.length - 2; i++) {
    const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
    d += ` C${r1(p1.x + (p2.x - p0.x) * k / 6)} ${r1(p1.y + (p2.y - p0.y) * k / 6)}`
       + ` ${r1(p2.x - (p3.x - p1.x) * k / 6)} ${r1(p2.y - (p3.y - p1.y) * k / 6)}`
       + ` ${r1(p2.x)} ${r1(p2.y)}`;
  }
  return cerrado ? d + " Z" : d;
}

/** La segunda hebra de una trayectoria: la misma curva, separada un poco entre estrella y estrella. */
export function hebra(pts, sep = 2.4, { antes = null, despues = null } = {}) {
  const Q = [antes || pts[0], ...pts, despues || pts[pts.length - 1]];
  let d = `M${r1(Q[1].x)} ${r1(Q[1].y)}`;
  for (let i = 1; i < Q.length - 2; i++) {
    const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
    const dx = p2.x - p1.x, dy = p2.y - p1.y, L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * sep * (i % 2 ? 1 : -1), ny = (dx / L) * sep * (i % 2 ? 1 : -1);
    d += ` C${r1(p1.x + (p2.x - p0.x) / 6 + nx)} ${r1(p1.y + (p2.y - p0.y) / 6 + ny)}`
       + ` ${r1(p2.x - (p3.x - p1.x) / 6 + nx)} ${r1(p2.y - (p3.y - p1.y) / 6 + ny)}`
       + ` ${r1(p2.x)} ${r1(p2.y)}`;
  }
  return d;
}

/** Una sola curva entre dos puntos, combada hacia un lado (bend: fracción de la distancia). */
export function arcoEntre(A, B, bend = 0.1) {
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, b = L * bend;
  return `M${r1(A.x)} ${r1(A.y)} C${r1(A.x + dx * 0.3 + nx * b)} ${r1(A.y + dy * 0.3 + ny * b)}`
       + ` ${r1(A.x + dx * 0.7 + nx * b)} ${r1(A.y + dy * 0.7 + ny * b)} ${r1(B.x)} ${r1(B.y)}`;
}

/** Puntos de un arco de circunferencia (ángulos en grados; 0 = derecha, crece hacia abajo). */
export function puntosArco(cx, cy, r, a0, a1, n = 12) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = RAD(a0 + (a1 - a0) * (i / n));
    return P(cx + r * Math.cos(a), cy + r * Math.sin(a));
  });
}

/** Arco de elipse girada (para órbitas). */
export function elipse(cx, cy, rx, ry, rot, a0, a1, n = 40) {
  const g = RAD(rot);
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const a = RAD(a0 + (a1 - a0) * (i / n));
    const x = rx * Math.cos(a), y = ry * Math.sin(a);
    return P(cx + x * Math.cos(g) - y * Math.sin(g), cy + x * Math.sin(g) + y * Math.cos(g));
  });
  return { d: suave(pts), pts };
}

export function circulo(cx, cy, r, a0 = 0, a1 = 360) {
  if (a1 - a0 >= 360) {
    return `M${r1(cx + r)} ${r1(cy)} A${r} ${r} 0 1 1 ${r1(cx - r)} ${r1(cy)} A${r} ${r} 0 1 1 ${r1(cx + r)} ${r1(cy)}`;
  }
  const [s, e] = [a0, a1].map(RAD);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${r1(cx + r * Math.cos(s))} ${r1(cy + r * Math.sin(s))} A${r} ${r} 0 ${large} 1 ${r1(cx + r * Math.cos(e))} ${r1(cy + r * Math.sin(e))}`;
}

/** Marcas de astrolabio alrededor de un punto (solo entre a0 y a1 si se indica). */
export function marcas(cx, cy, r, largo, cada = 10, largas = 30, extra = 2.2, a0 = 0, a1 = 360) {
  let d = "";
  for (let a = a0; a < a1; a += cada) {
    const l = a % largas === 0 ? largo * extra : largo;
    const t = RAD(a), c = Math.cos(t), s = Math.sin(t);
    d += `M${r1(cx + r * c)} ${r1(cy + r * s)}L${r1(cx + (r + l) * c)} ${r1(cy + (r + l) * s)}`;
  }
  return d;
}

const polilinea = (pts, cerrar = false) => "M" + pts.map((p) => `${r1(p.x)} ${r1(p.y)}`).join("L") + (cerrar ? "Z" : "");

// ── Muestreo de curvas ────────────────────────────────────

function muestrear(pts, porTramo = 8) {
  // muestras de la curva Catmull-Rom con su «parámetro» (índice de tramo + t)
  const Q = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  for (let i = 1; i < Q.length - 2; i++) {
    const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
    const c1 = P(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6);
    const c2 = P(p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6);
    for (let j = 0; j < porTramo; j++) {
      const t = j / porTramo, u = 1 - t;
      out.push({
        x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x,
        y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y,
        s: i - 1 + t,
      });
    }
  }
  out.push({ ...pts[pts.length - 1], s: pts.length - 1 });
  return out;
}

/** Recorrido de una curva por longitud: total y el punto que está a s píxeles del principio. */
function recorrido(pts) {
  const m = muestrear(pts, 14);
  const ac = [0];
  for (let i = 1; i < m.length; i++) ac.push(ac[i - 1] + Math.hypot(m[i].x - m[i - 1].x, m[i].y - m[i - 1].y));
  const total = ac[ac.length - 1];
  const en = (s) => {
    let lo = 1, hi = ac.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ac[mid] < s) lo = mid + 1; else hi = mid; }
    const t = (s - ac[lo - 1]) / ((ac[lo] - ac[lo - 1]) || 1);
    return P(m[lo - 1].x + (m[lo].x - m[lo - 1].x) * t, m[lo - 1].y + (m[lo].y - m[lo - 1].y) * t);
  };
  return { total, en };
}

/** Puntos repartidos cada `paso` píxeles a lo largo de la curva (para sembrar estrellas en un trazo). */
export function sembrar(pts, paso, { desde = paso / 2, hasta = paso / 2 } = {}) {
  const R = recorrido(pts), out = [];
  for (let s = desde; s <= R.total - hasta + 1e-6; s += paso) out.push(R.en(s));
  return out;
}

/** El punto que está a la fracción t (0–1) de la longitud de la curva. */
export function enCurva(pts, t) { const R = recorrido(pts); return R.en(R.total * t); }

// ── Formas ────────────────────────────────────────────────

/** Cinta: un cuerpo alargado que sigue una línea, con su grosor en cada punto. */
export function cinta(pts, anchos) {
  const m = muestrear(pts, 7);
  const izq = [], der = [];
  m.forEach((p, i) => {
    const a = m[Math.max(0, i - 1)], b = m[Math.min(m.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const k = Math.min(anchos.length - 2, Math.floor(p.s));
    const w = (anchos[k] + (anchos[k + 1] - anchos[k]) * (p.s - k)) / 2;
    izq.push(P(p.x - (dy / L) * w, p.y + (dx / L) * w));
    der.push(P(p.x + (dy / L) * w, p.y - (dx / L) * w));
  });
  return polilinea([...izq, ...der.reverse()], true);
}

/** Hoja (o pétalo, o pluma) como una sola curva cerrada: de la base a la punta, abombada a los dos lados. */
export function hoja(A, B, ancho, asimetria = 0.15) {
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, w1 = ancho * (0.5 + asimetria), w2 = ancho * (0.5 - asimetria);
  return `M${r1(A.x)} ${r1(A.y)}`
    + ` C${r1(A.x + dx * 0.22 + nx * w1)} ${r1(A.y + dy * 0.22 + ny * w1)} ${r1(A.x + dx * 0.72 + nx * w1 * 0.8)} ${r1(A.y + dy * 0.72 + ny * w1 * 0.8)} ${r1(B.x)} ${r1(B.y)}`
    + ` C${r1(A.x + dx * 0.72 - nx * w2 * 0.8)} ${r1(A.y + dy * 0.72 - ny * w2 * 0.8)} ${r1(A.x + dx * 0.22 - nx * w2)} ${r1(A.y + dy * 0.22 - ny * w2)} ${r1(A.x)} ${r1(A.y)} Z`;
}

/**
 * Una hoja de verdad (o el estandarte de una pluma): sus dos bordes de la base
 * a la punta, su nervio central y la forma cerrada para la silueta.
 * borde(t, lado, f): el punto del borde a la fracción t (lado +1 / -1; f < 1 = hacia dentro).
 */
const PERFIL_HOJA = (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.85))), 0.85);
/* una pluma: se ensancha deprisa desde la base, sigue ancha y se redondea en la punta */
const PERFIL_PLUMA = (t) => Math.pow(Math.min(1, t / 0.2), 0.6)
  * Math.pow(Math.max(0, Math.cos((Math.max(0, t - 0.6) / 0.4) * (Math.PI / 2))), 0.75);

export function hojaDe(A, B, ancho, { arco = 0, asim = 0, n = 10, perfil = PERFIL_HOJA } = {}) {
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const eje = (t) => { const b = Math.sin(Math.PI * t) * arco * L; return P(A.x + dx * t + nx * b, A.y + dy * t + ny * b); };
  const borde = (t, s, f = 1) => {
    const e = eje(t), w = (ancho / 2) * perfil(t) * (1 + s * asim) * f;
    return P(e.x + nx * w * s, e.y + ny * w * s);
  };
  const lado = (s) => Array.from({ length: n + 1 }, (_, i) => borde(i / n, s));
  const a = lado(1), b = lado(-1);
  return { a, b, eje, borde, nervio: Array.from({ length: n + 1 }, (_, i) => eje(i / n)),
    forma: polilinea([...a, ...b.slice(0, -1).reverse()], true) };
}

/** Los dos bordes de un cuerpo alargado: puntos a cada lado de su línea central y la normal en cada uno. */
export function bordes(pts, anchos, cada = 3) {
  const m = muestrear(pts, 7);
  const izq = [], der = [], normales = [];
  m.forEach((p, i) => {
    const a = m[Math.max(0, i - 1)], b = m[Math.min(m.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const k = Math.min(anchos.length - 2, Math.floor(p.s));
    const w = (anchos[k] + (anchos[k + 1] - anchos[k]) * (p.s - k)) / 2;
    if (i % cada === 0 || i === m.length - 1) {
      izq.push(P(p.x - (dy / L) * w, p.y + (dx / L) * w));
      der.push(P(p.x + (dy / L) * w, p.y - (dx / L) * w));
      normales.push({ x: -dy / L, y: dx / L, tx: dx / L, ty: dy / L, w, s: p.s });
    }
  });
  return { izq, der, normales };
}

/** Media luna: la circunferencia exterior menos la interior (cuernos H1 arriba y H2 abajo). */
function mediaLuna(c1, R1, c2, R2) {
  const dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.hypot(dx, dy);
  const a = (R1 * R1 - R2 * R2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R1 * R1 - a * a));
  const m = P(c1.x + (a * dx) / d, c1.y + (a * dy) / d);
  const H1 = P(m.x + (h * dy) / d, m.y - (h * dx) / d);
  const H2 = P(m.x - (h * dy) / d, m.y + (h * dx) / d);
  const t1 = GRADOS(H1, c1), t2 = GRADOS(H2, c1);
  const fuera = puntosArco(c1.x, c1.y, R1, t1, t2 - 360 * (t2 > t1 ? 1 : 0), 40);
  const s1 = GRADOS(H2, c2), s2 = GRADOS(H1, c2);
  const dentro = puntosArco(c2.x, c2.y, R2, s1, s2 + 360 * (s2 < s1 ? 1 : 0), 34);
  return { forma: polilinea([...fuera, ...dentro], true), fuera, dentro, H1, H2 };
}

const nodo = (id, p, role = "secundaria", extra = {}) => ({ id, x: r1(p.x), y: r1(p.y), role, ...extra });

// ── Herramientas para calcar la referencia ────────────────

// azar determinista: solo varía tamaños, colores y separación de las perlas (nunca la forma)
const azar = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Paso de las coordenadas de la imagen de referencia a las locales de la figura (centro y escala). */
const ESCALA = 1.08;
const ref = (cx, cy, s = ESCALA) => (x, y) => P((x - cx) * s, (y - cy) * s);
const refs = (T, lista) => lista.map(([x, y]) => T(x, y));
const espejoX = (pts) => pts.map((p) => P(-p.x, p.y));

/** Perlas de luz a lo largo de una curva, con la separación irregular de un collar natural. */
function rosario(prefijo, pts, paso, { desde = paso * 0.7, hasta = paso * 0.7, semilla = 1, patron = null, tintes = null } = {}) {
  const R = recorrido(pts), out = [];
  let s = desde, k = 0;
  while (s <= R.total - hasta + 1e-6) {
    const p = R.en(s), a = azar(semilla * 97.3 + k * 13.7);
    const role = patron ? patron[k % patron.length] : a < 0.16 ? "brillante" : a < 0.58 ? "secundaria" : "chispa";
    const tinte = tintes ? tintes[Math.floor(azar(semilla * 7.1 + k * 3.3) * tintes.length)] : undefined;
    out.push({ id: `${prefijo}${k}`, x: r1(p.x), y: r1(p.y), role, ...(tinte ? { tinte } : {}) });
    s += paso * (0.62 + 0.76 * azar(semilla * 31.7 + k * 7.3));
    k++;
  }
  return out;
}

/** Un arco de circunferencia como lista de puntos (para trazos que llevan perlas). */
const arcoPts = (c, r, a0, a1, n = 24) => puntosArco(c.x, c.y, r, a0, a1, n);

/** Trenza: n hebras de seda que recorren un cuerpo alargado y se cruzan unas con otras. */
function trenza(espina, anchos, n = 7, { semilla = 1, amp = 0.3, ondas = 3, dentro = 0.84 } = {}) {
  const m = muestrear(espina, 6);
  const ac = [0];
  for (let i = 1; i < m.length; i++) ac.push(ac[i - 1] + Math.hypot(m[i].x - m[i - 1].x, m[i].y - m[i - 1].y));
  const total = ac[ac.length - 1] || 1;
  const fase = Array.from({ length: n }, (_, j) => azar(semilla * 3.1 + j * 1.7) * Math.PI * 2);
  const frec = Array.from({ length: n }, (_, j) => ondas * (0.7 + 0.6 * azar(semilla * 5.3 + j * 2.9)));
  const hebras = Array.from({ length: n }, () => []);
  m.forEach((p, i) => {
    if (i % 2 && i !== m.length - 1) return;
    const a = m[Math.max(0, i - 1)], b = m[Math.min(m.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const k = Math.min(anchos.length - 2, Math.floor(p.s));
    const w = (anchos[k] + (anchos[k + 1] - anchos[k]) * (p.s - k)) / 2, u = ac[i] / total;
    for (let j = 0; j < n; j++) {
      const f = n === 1 ? 0 : -1 + (2 * j) / (n - 1);
      const off = w * Math.max(-1, Math.min(1, f * dentro + amp * Math.sin(u * Math.PI * 2 * frec[j] + fase[j])));
      hebras[j].push(P(p.x + nx * off, p.y + ny * off));
    }
  });
  return hebras;
}

/** Fibras: curvas repartidas entre dos bordes que tienen el mismo número de puntos (f = 0 → A, 1 → B). */
const entre = (A, B, fs) => fs.map((f) => A.map((a, i) => P(a.x + (B[i].x - a.x) * f, a.y + (B[i].y - a.y) * f)));

/** El borde de una pluma con muescas: las barbas se separan en lóbulos (ts: dónde se abre cada muesca).
    Cada muesca es una entrada suave, más tendida por el lado de la punta y más brusca por el de la base. */
const muesca = (t, ts, prof, ancho) => ts.reduce((f, tk) => {
  const s = (t - tk) / (t < tk ? ancho * 1.5 : ancho * 0.65);
  return f * (1 - prof * Math.exp(-s * s));
}, 1);
function muescas(H, lado, ts, { prof = 0.42, ancho = 0.04, n = 72 } = {}) {
  return Array.from({ length: n + 1 }, (_, i) => H.borde(i / n, lado, muesca(i / n, ts, prof, ancho)));
}

/** Los puntos de la curva que dibuja arcoEntre (para sembrar perlas en ella). */
function curvaEntre(A, B, bend = 0.1, n = 18) {
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, b = L * bend;
  const c1 = P(A.x + dx * 0.3 + nx * b, A.y + dy * 0.3 + ny * b), c2 = P(A.x + dx * 0.7 + nx * b, A.y + dy * 0.7 + ny * b);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return P(u * u * u * A.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * B.x,
      u * u * u * A.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * B.y);
  });
}

/** El contorno cerrado de una hoja / pluma hecha con hojaDe (o con un borde propio en lugar de `a`). */
const contorno = (H, a = H.a, b = H.b) => polilinea([...a, ...b.slice(0, -1).reverse()], true);

// ═══════════════════════════════════════════════════════════
// CUERPO — EL DRAGÓN (calcado de la referencia)
// La cabeza mira hacia el centro con su corona de llamas; el cuello baja al
// pecho (Rangos), el cuerpo de seda serpentea con tres tramos y la cola se
// enrosca. Entreno brilla en la primera vuelta, Sueño en la segunda; Meta es
// la estrella de la frente; una garra (Ejercicios → Anatomía) se mete en el
// seno del cuerpo y la otra sostiene la perla de los Récords ante el hocico.
// ═══════════════════════════════════════════════════════════
const TD = ref(250, 280);
// la cabeza, larga hacia el hocico: la frente y la mandíbula se dibujan por separado
const D_FRENTE = refs(TD, [[318, 97], [333, 101], [348, 108], [362, 116], [375, 125], [386, 135], [395, 146], [402, 156],
  [408, 165], [413, 172], [414, 179], [408, 184]]);
const D_MANDIBULA = refs(TD, [[408, 184], [397, 183], [386, 178], [374, 171], [361, 164], [347, 158], [333, 154], [319, 151]]);
const D_CABEZA = [...D_FRENTE, ...D_MANDIBULA.slice(1)];
const D_BOCA = refs(TD, [[410, 177], [399, 174], [388, 170], [378, 166]]);
// las púas de la frente y la crin, que se peina hacia atrás en mechones largos
const D_LLAMAS = [   // (todas detrás de la estrella de la frente: arriba a su derecha va el nombre de Meta)
  [[369, 120], [366, 101], [359, 84]],
  [[357, 112], [350, 94], [340, 78]],
].map((l) => refs(TD, l));
const D_CRIN = [   // la crin: mechones en S que nacen en lo alto de la cabeza y se peinan hacia atrás sobre el cuello
  [[362, 116], [362, 98], [356, 80], [346, 66], [338, 50]],
  [[356, 112], [348, 92], [336, 74], [318, 62], [300, 56], [284, 44]],
  [[346, 106], [334, 88], [316, 76], [294, 72], [272, 74], [252, 68]],
  [[336, 103], [318, 94], [296, 90], [272, 94], [250, 96], [228, 90]],
  [[326, 104], [302, 104], [278, 108], [256, 114], [234, 114], [212, 106]],
  [[320, 112], [296, 118], [274, 124], [254, 128]],
].map((l) => refs(TD, l));
const D_ESPINA = refs(TD, [
  [342, 142], [316, 132], [288, 128], [262, 134], [242, 151],                                           // 0–4 cuello
  [230, 176],                                                                                          // 5 pecho: Rangos
  [236, 202], [254, 221], [280, 234], [312, 243], [346, 250], [380, 258], [406, 270], [422, 286],     // 6–13 primer tramo
  [428, 304],                                                                                          // 14 primera vuelta: Entreno
  [420, 324], [398, 341], [364, 351], [328, 350], [292, 342], [256, 331], [220, 323], [186, 323], [158, 334], [140, 352], // 15–24
  [136, 374],                                                                                          // 25 segunda vuelta: Sueño
  [148, 394], [174, 416], [206, 435], [244, 450], [286, 459], [328, 460], [366, 453], [398, 443],     // 26–33 tercer tramo
  [422, 440], [438, 451], [441, 468],                                                                  // 34–36 la cola se enrosca
]);
// el cuerpo es una cinta ancha de seda: más estrecha en el cuello, más amplia en la vuelta de abajo
const D_ANCHO = [22, 26, 30, 34, 38, 42, 44, 46, 48, 48, 48, 48, 46, 44, 42, 42, 42, 42, 44, 46, 50, 54, 58, 60, 62,
  64, 66, 66, 64, 62, 58, 52, 42, 32, 20, 10, 2];
const D_HILOS = trenza(D_ESPINA, D_ANCHO, 7, { semilla: 2, amp: 0.38, ondas: 3.4 });         // las hebras que se ven
const D_FIBRAS = trenza(D_ESPINA, D_ANCHO.map((w) => w * 0.94), 9, { semilla: 9, amp: 0.26, ondas: 5 });  // la textura
const D_META = TD(364, 124), D_PERLA = TD(404, 216), D_EJERC = TD(424, 382), D_ANAT = TD(378, 407);
const D_BRAZO = refs(TD, [[444, 284], [442, 258], [428, 236]]);
const D_GARRA = refs(TD, [[438, 334], [404, 396]]);
const D_UNAS = [[[372, 413], [366, 423]], [[380, 416], [378, 427]], [[388, 413], [392, 423]]].map((l) => [D_ANAT, ...refs(TD, l)]);
// aletas de humo, como las grandes alas translúcidas de la referencia
const D_ALETAS = [
  [[268, 100], [96, 92], 46, -0.18, 0.25], [[222, 160], [62, 214], 50, 0.16, 0.2], [[196, 236], [70, 300], 38, 0.14, 0.1],
  [[150, 334], [46, 326], 40, -0.2, 0], [[142, 398], [50, 458], 44, 0.18, 0.1], [[300, 472], [236, 526], 30, 0.22, 0],
  [[436, 458], [458, 524], 26, -0.26, 0],
].map(([a, b, w, arco, asim]) => hojaDe(TD(...a), TD(...b), w * ESCALA, { arco, asim, n: 16 }));
const DRAGON = {
  id: "cuerpo", zone: "Cuerpo", figure: "El Dragón",
  origin: { x: 262, y: 335 },
  color: { halo: "#FFD98A", accent: "#C9C0FF", mist: "#3B3A9E", seda: "#B6AFE8", velo: "#4B52C4", rim: "#B9B0FF" },
  label: { x: -170, y: -236 },
  nodes: [
    nodo("meta", D_META, "principal", { star: "physique", label: "arriba-der" }),
    nodo("rangos", D_ESPINA[5], "principal", { star: "ranks", label: "izq" }),
    nodo("entreno", D_ESPINA[14], "nucleo", { star: "training", label: "der" }),
    nodo("sueno", D_ESPINA[25], "principal", { star: "sleep", label: "izq" }),
    nodo("ejercicios", D_EJERC, "principal", { star: "exercises", label: "izq" }),
    nodo("anatomia", D_ANAT, "principal", { star: "anatomy", label: "izq" }),
    nodo("records", D_PERLA, "principal", { star: "records", label: "arriba-izq" }),
    nodo("nuca", TD(344, 132), "chispa"),
    ...[1, 2, 3, 4].map((i) => nodo(`cu${i}`, D_ESPINA[i], i === 3 ? "brillante" : "secundaria")),
    ...[...Array(37).keys()].filter((i) => ![0, 1, 2, 3, 4, 5, 14, 25].includes(i)).map((i) =>
      nodo(`c${i}`, D_ESPINA[i], [9, 19, 30].includes(i) ? "estrella" : [7, 12, 17, 22, 28, 33].includes(i) ? "brillante"
        : i % 2 ? "secundaria" : "chispa", i % 3 === 0 ? { tinte: "lila" } : {})),
    ...D_BRAZO.map((p, i) => nodo(`br${i}`, p, i === 1 ? "secundaria" : "chispa")),
    ...D_GARRA.map((p, i) => nodo(`ga${i}`, p, "chispa")),
    ...D_UNAS.map((l, i) => nodo(`un${i}`, l[2], "chispa")),
    // la cabeza: el ojo (cian), la nariz, las puntas de las púas y de la crin
    nodo("ojo", TD(383, 145), "brillante", { tinte: "cian" }), nodo("nariz", TD(407, 172), "chispa", { tinte: "blanco" }),
    nodo("mandibula", TD(392, 181), "chispa", { tinte: "lila" }), nodo("menton", TD(410, 183), "secundaria", { tinte: "blanco" }),
    ...D_LLAMAS.map((l, i) => nodo(`ll${i}`, l[l.length - 1], i === 1 ? "brillante" : "chispa")),
    ...D_CRIN.map((l, i) => nodo(`cr${i}`, l[l.length - 1], i < 2 ? "secundaria" : "chispa", { tinte: i % 2 ? "lila" : "oro" })),
    // perlas a lo largo de las hebras de seda: las de los bordes llevan más
    ...D_HILOS.flatMap((h, j) => (j % 2 ? [] : rosario(`h${j}_`, h, j === 0 || j === 6 ? 40 : 58,
      { semilla: 11 + j, tintes: ["lila", "blanco", "oro", "lila", "cian", "blanco"] }))),
  ],
  connections: [
    { path: ["meta", "nuca", "cu1", "cu2", "cu3", "cu4", "rangos"], style: "oro" },
    { path: ["rangos", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "entreno"], style: "oro" },
    { path: ["entreno", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24", "sueno"], style: "oro" },
    { path: ["entreno", "ga0", "ejercicios", "ga1", "anatomia"], style: "oro" },
    { path: ["entreno", "br0", "br1", "br2", "records"], style: "oro" },
    { path: ["sueno", ...[...Array(11).keys()].map((k) => `c${26 + k}`)], style: "trazo", antes: "c24" },
    { pts: D_FRENTE, style: "trazo" }, { pts: D_MANDIBULA, style: "trazo" }, { pts: D_BOCA, style: "fino" },
    ...D_LLAMAS.map((pts) => ({ pts, style: "trazo" })),
    ...D_CRIN.map((pts, i) => ({ pts, style: i < 2 ? "trazo" : "fino" })),
    ...D_HILOS.map((pts, j) => ({ pts, style: j === 0 || j === 6 ? "fino" : "seda" })),
    ...D_UNAS.map((pts) => ({ pts, style: "fino" })),
  ],
  orbits: [
    { d: circulo(D_PERLA.x, D_PERLA.y, 9), style: "fino" },
    { d: circulo(D_PERLA.x, D_PERLA.y, 15, 200, 520), style: "punteado" },
  ],
  planets: [],
  silhouette: {
    // (el cristal nace afilado dentro de la cabeza: así no se ve el corte del cuello). Apenas un velo de
    // cristal y casi sin contorno: lo que da cuerpo a la seda son sus cintas trenzadas, como en la referencia
    shapes: [cinta(D_ESPINA, D_ANCHO.map((w, i) => (i < 3 ? [2, 12, 24][i] : w + 4)))],
    cristal: 0.3,
    borde: 0.15,
    cintas: D_HILOS.map((h, j) => ({ d: suave(h), w: [6, 9, 12, 13, 12, 9, 6][j] })),
    relleno: [polilinea(D_CABEZA, true)],       // la cabeza: cristal sin borde (su contorno ya lo dibujan los hilos)
    fibras: [
      ...D_FIBRAS.map((h) => suave(h)),
      ...entre(D_FRENTE.slice(0, 8), D_MANDIBULA.slice(0, 8).reverse(), [0.3, 0.55, 0.78]).map((l) => suave(l)),
    ],
    velos: [
      ...D_ALETAS.map((H) => H.forma),
      cinta([D_ESPINA[14], ...D_GARRA.slice(0, 1), D_EJERC, D_ANAT], [12, 10, 9, 6]),
      cinta([D_ESPINA[14], ...D_BRAZO, D_PERLA], [12, 10, 9, 8, 6]),
    ],
    vetas: D_ALETAS.flatMap((H) => entre(H.nervio, H.a, [0.3, 0.7])).map((l) => suave(l)),
    bordeVelos: 0.25,
    veloBlur: 3,
  },
};

// ═══════════════════════════════════════════════════════════
// SABER — EL OJO (astrolabio con loto, calcado de la referencia)
// Lecturas es la pupila; Por ver, la estrella de arriba; Por leer y Por
// aprender, las de los lados, sobre el gran círculo; Frases, la punta
// izquierda del loto. El eje de abajo es la trayectoria que llega desde Hoy.
// ═══════════════════════════════════════════════════════════
const TE = ref(768, 290);
const E_C = TE(768, 250);
const E_R = 156 * ESCALA, E_RM = 118 * ESCALA, E_RI = 57 * ESCALA, E_RI2 = 34 * ESCALA, E_RB = 186 * ESCALA;
const enE = (r, a) => P(E_C.x + r * Math.cos(RAD(a)), E_C.y + r * Math.sin(RAD(a)));
const E_TOP = enE(E_R, -90), E_IZQ = enE(E_R, 180), E_DER = enE(E_R, 0), E_BASE = enE(E_R, 90);
const E_LID = (s) => refs(TE, Array.from({ length: 15 }, (_, i) => {
  const x = 658 + (220 * i) / 14, u = (x - 768) / 110;
  return [x, 250 + s * (s < 0 ? 50 : 52) * Math.pow(Math.max(0, 1 - u * u), 0.72)];
}));
const E_ARRIBA = E_LID(-1), E_ABAJO = E_LID(1);
// el ojo grande (como en la referencia): sus esquinas son Por leer y Por aprender; de la estrella de
// arriba bajan dos rectas hasta las estrellas doradas de su párpado alto (una cometa, no un triángulo)
const E_OJO_ALTO = [E_IZQ, ...refs(TE, [[660, 224], [707, 198], [768, 184], [829, 198], [876, 224]]), E_DER];
const E_OJO_BAJO = [E_IZQ, ...refs(TE, [[660, 278], [708, 302], [768, 316], [828, 302], [876, 278]]), E_DER];
const E_FRASES = TE(592, 352), E_LOTO_D = TE(944, 352);
// el loto: como en la referencia, un abanico de arcos que nacen en la estrella de abajo y se abren
// hasta las dos puntas (varios llegan a la misma punta, combados cada vez más hacia arriba)
const E_LOTO = [[592, 352, 0.1], [592, 352, 0.2], [592, 352, 0.3], [632, 390, 0.06]]
  .flatMap(([x, y, b]) => [curvaEntre(E_BASE, TE(x, y), b), curvaEntre(E_BASE, TE(1536 - x, y), -b)]);
const OJO = {
  id: "saber", zone: "Saber", figure: "El Ojo",
  origin: { x: 750, y: 330 },
  color: { halo: "#FFE3A6", accent: "#A9E6FF", mist: "#33479E", seda: "#9FC0F4", velo: "#3E58C0", rim: "#A6DAFF" },
  label: { x: -206, y: -246 },
  nodes: [
    nodo("pupila", E_C, "nucleo", { star: "readings", label: "abajo" }),
    nodo("izq", E_IZQ, "principal", { star: "toread", label: "izq" }),
    nodo("der", E_DER, "principal", { star: "tolearn", label: "der" }),
    nodo("cima", E_TOP, "principal", { star: "towatch", label: "der" }),
    nodo("frases", E_FRASES, "principal", { star: "quotes", label: "abajo" }),
    nodo("base", E_BASE, "estrella"), nodo("lotoD", E_LOTO_D, "brillante"),
    nodo("ejeA", TE(768, 38), "secundaria", { tinte: "cian" }), nodo("eje1", TE(768, 128), "brillante"),
    nodo("eje2", TE(768, 158), "secundaria", { tinte: "cian" }), nodo("eje3", TE(768, 184), "secundaria", { tinte: "cian" }),
    nodo("eje4", TE(768, 440), "secundaria"), nodo("ejeB", TE(768, 478), "secundaria", { tinte: "lila" }),
    nodo("esqI", TE(658, 250), "secundaria", { tinte: "cian" }), nodo("esqD", TE(878, 250), "secundaria", { tinte: "cian" }),
    // las cuatro estrellas doradas del ojo grande y los puntos por donde pasan los arcos que bajan de arriba
    nodo("pd0", E_OJO_ALTO[2], "estrella"), nodo("pd1", E_OJO_ALTO[4], "estrella"),
    nodo("pd2", E_OJO_BAJO[2], "brillante"), nodo("pd3", E_OJO_BAJO[4], "brillante"),
    nodo("oI", E_OJO_ALTO[1], "secundaria", { tinte: "blanco" }), nodo("oD", E_OJO_ALTO[5], "secundaria", { tinte: "blanco" }),
    ...rosario("pa", E_ARRIBA, 24, { semilla: 3, tintes: ["blanco", "oro", "cian", "blanco"] }),
    ...rosario("pb", E_ABAJO, 24, { semilla: 4, tintes: ["blanco", "oro", "lila", "blanco"] }),
    ...rosario("ob", E_OJO_BAJO.slice(1, -1), 26, { semilla: 11, desde: 30, hasta: 30, tintes: ["oro", "blanco", "cian"] }),
    ...rosario("ci", arcoPts(E_C, E_R, -86, 266, 60), 34, { semilla: 5, tintes: ["oro", "blanco", "oro", "lila"] }),
    ...rosario("ir", arcoPts(E_C, E_RI2, 0, 360, 24), 22, { semilla: 6, patron: ["chispa", "secundaria"], tintes: ["cian", "blanco"] }),
    ...rosario("bi", [E_IZQ, E_BASE], 32, { semilla: 9, tintes: ["oro", "blanco"] }),
    ...rosario("bd", [E_DER, E_BASE], 32, { semilla: 10, tintes: ["oro", "blanco"] }),
    // las perlas del loto: a lo largo de dos de sus arcos y en las puntas de los más bajos
    ...[2, 3, 4, 5].flatMap((k) => rosario(`lo${k}_`, E_LOTO[k], k < 4 ? 32 : 38,
      { semilla: 12 + k, desde: 26, hasta: 18, tintes: ["oro", "blanco", "cian", "oro"] })),
    ...[6, 7].map((k) => nodo(`lt${k}`, E_LOTO[k][E_LOTO[k].length - 1], "secundaria", { tinte: "cian" })),
  ],
  connections: [
    { path: ["pupila", "izq"], style: "oro", bend: 0 },
    { path: ["pupila", "der"], style: "oro", bend: 0 },
    // de la estrella de arriba bajan dos rectas a las estrellas doradas del párpado y siguen por él hasta las esquinas
    { path: ["izq", "pd0", "cima"], style: "oro", recto: true },
    { path: ["cima", "pd1", "der"], style: "oro", recto: true },
    { path: ["izq", "frases"], style: "oro", bend: 0, tenue: true },
    { path: ["izq", "base"], style: "trazo", bend: 0 },
    { path: ["der", "base"], style: "trazo", bend: 0 },
    { pts: E_OJO_ALTO.slice(2, -2), style: "trazo" },
    { pts: E_OJO_BAJO, style: "trazo" },
    { pts: E_ARRIBA, style: "fino" },
    { pts: E_ABAJO, style: "fino" },
    { path: ["ejeA", "cima"], style: "fino", bend: 0 },
    { path: ["cima", "eje1", "eje2", "eje3"], style: "trazo" },
    { path: ["base", "eje4", "ejeB"], style: "fino" },
    ...E_LOTO.map((pts, k) => ({ pts, style: k === 6 || k === 7 ? "fino" : "trazo" })),
  ],
  orbits: [
    { d: circulo(E_C.x, E_C.y, E_R), style: "fino" },
    { d: circulo(E_C.x, E_C.y, E_RM, 196, 344), style: "fino" },
    { d: circulo(E_C.x, E_C.y, E_RM, 18, 162), style: "seda" },
    { d: circulo(E_C.x, E_C.y, E_RI), style: "fino" },
    { d: circulo(E_C.x, E_C.y, E_RI2), style: "seda" },
    { d: circulo(E_C.x, E_C.y, E_RB, 58, 122), style: "fino" },
    { d: circulo(E_C.x, E_C.y, E_RB, 228, 312), style: "seda" },
  ],
  planets: [{ ...TE(652, 159), r: 6.2 }, { ...TE(885, 192), r: 4.2, violeta: true }],
  silhouette: {
    fuerza: 0.75,
    // el iris: apenas un resplandor azul; el ojo y la copa del loto, apenas un velo
    shapes: [],
    relleno: [circulo(E_C.x, E_C.y, E_RI)],
    velos: [
      polilinea([...E_OJO_ALTO, ...E_OJO_BAJO.slice(1, -1).reverse()], true),
      polilinea([...E_LOTO[4], ...[...E_LOTO[5]].reverse()], true),
    ],
    bordeVelos: 0.2,
    veloBlur: 3,
    vetas: [circulo(E_C.x, E_C.y, E_R + 7, 200, 340), circulo(E_C.x, E_C.y, E_RB, 60, 120)],
  },
};

// ═══════════════════════════════════════════════════════════
// HACER — LA FLECHA ALADA (calcada de la referencia)
// Tareas es la punta; Hábitos, la gran estrella del astil. Las líneas de luz
// se abren en abanico desde la punta y detrás se adivinan las alas de humo.
// ═══════════════════════════════════════════════════════════
const TA = ref(1250, 290);
const A_PUNTA = TA(1250, 61), A_HABITOS = TA(1250, 275);
const A_ASTA = Object.fromEntries([127, 202, 345, 388, 432, 480, 530].map((y) => [y, TA(1250, y)]));
const A_FAN = [
  refs(TA, [[1250, 64], [1232, 86], [1215, 108], [1200, 130], [1188, 152]]),
  refs(TA, [[1250, 127], [1232, 148], [1212, 171], [1182, 192], [1152, 210], [1121, 236], [1090, 261], [1057, 287]]),
  refs(TA, [[1250, 140], [1234, 168], [1214, 200], [1196, 226], [1180, 252], [1168, 272], [1157, 291], [1145, 318], [1132, 344]]),
];
const A_FAN_D = A_FAN.map(espejoX);
const A_HELICE = refs(TA, [[1316, 312], [1300, 330], [1270, 346], [1236, 358], [1200, 372], [1176, 392], [1180, 414], [1210, 428],
  [1250, 436], [1290, 446], [1316, 462], [1308, 482], [1276, 494], [1240, 498]]);
// el haz del astil: hebras que se separan un poco entre la estrella alta y la de abajo, como una lanceta
const A_LANZA = [-1, 1].flatMap((s) => [0.5, 1].map((k) => refs(TA, [[1250, 127], [1250 + s * 3.5 * k, 190],
  [1250 + s * 6.5 * k, 270], [1250 + s * 7.5 * k, 350], [1250 + s * 6 * k, 430], [1250 + s * 2.5 * k, 500], [1250, 530]])));
// las alas: plumas largas (remeras) que se abren hacia arriba y afuera, y encima otras cortas (cobertoras)
const pluma = ([a, b, w, arco]) => hojaDe(TA(...a), TA(...b), w * ESCALA, { arco, asim: 0.2, n: 14, perfil: PERFIL_PLUMA });
const A_REMERAS = [
  [[1214, 206], [1072, 56], 32, -0.12], [[1208, 218], [1048, 100], 36, -0.1], [[1203, 232], [1036, 150], 36, -0.08],
  [[1200, 246], [1040, 200], 34, -0.06], [[1200, 260], [1054, 246], 30, -0.04], [[1204, 274], [1080, 290], 24, -0.02],
].map(pluma);
const A_COBERTORAS = [
  [[1222, 200], [1146, 126], 24, -0.1], [[1216, 216], [1132, 176], 25, -0.07], [[1212, 234], [1136, 226], 22, -0.04],
].map(pluma);
const espejoH = (H) => ({ a: espejoX(H.a), b: espejoX(H.b), nervio: espejoX(H.nervio) });
const A_PLUMAS = [...A_REMERAS, ...A_COBERTORAS];
const A_PLUMAS_D = A_PLUMAS.map(espejoH);
const ALAS = {
  id: "hacer", zone: "Hacer", figure: "La Flecha Alada",
  origin: { x: 1224, y: 330 },
  color: { halo: "#FFE0A0", accent: "#D2C8FF", mist: "#38389A", seda: "#B4ACF2", velo: "#5A4ACB", rim: "#C4B6FF" },
  label: { x: 0, y: -292 },
  nodes: [
    nodo("punta", A_PUNTA, "principal", { star: "todo", label: "der", tinte: "violeta" }),
    nodo("corazon", A_HABITOS, "nucleo", { star: "daily", label: "der" }),
    nodo("a127", A_ASTA[127], "estrella"), nodo("a202", A_ASTA[202], "secundaria", { tinte: "cian" }),
    nodo("a345", A_ASTA[345], "chispa"), nodo("a388", A_ASTA[388], "brillante"), nodo("a432", A_ASTA[432], "brillante"),
    nodo("a480", A_ASTA[480], "estrella"), nodo("a530", A_ASTA[530], "secundaria", { tinte: "cian" }),
    ...[...A_FAN, ...A_FAN_D].flatMap((l, i) => [
      nodo(`fin${i}`, l[l.length - 1], i % 3 === 1 ? "estrella" : "secundaria", { tinte: ["blanco", "oro", "cian", "blanco", "oro", "lila"][i] }),
      ...rosario(`fa${i}_`, l, 26, { semilla: 20 + i, hasta: 12, tintes: ["oro", "blanco", "oro", "cian"] }),
    ]),
    ...rosario("he", A_HELICE, 30, { semilla: 30, tintes: ["oro", "blanco", "lila", "oro"] }),
    ...[...A_REMERAS, ...A_REMERAS.map(espejoH)].filter((_, i) => i % 2 === 0)
      .map((H, i) => nodo(`pl${i}`, H.nervio[H.nervio.length - 1], "chispa", { tinte: i % 2 ? "cian" : "lila" })),
  ],
  connections: [
    { path: ["corazon", "a202", "a127", "punta"], style: "oro" },
    { path: ["corazon", "a345", "a388", "a432", "a480", "a530"], style: "trazo" },
    ...[...A_FAN, ...A_FAN_D].map((pts) => ({ pts, style: "trazo" })),
    { pts: [P(0, A_PUNTA.y + 10), A_ASTA[127]], style: "seda" },
    ...A_LANZA.map((pts, i) => ({ pts, style: i % 2 ? "trazo" : "seda" })),
    // la hélice: dos hebras doradas que se enroscan al astil
    { pts: A_HELICE, style: "trazo" },
    { pts: A_HELICE.map((p) => P(p.x + 2.5, p.y + 5)), style: "seda" },
  ],
  orbits: [
    // el ala: el raquis de cada pluma (su contorno lo dibuja el velo)
    ...[...A_PLUMAS, ...A_PLUMAS_D].map((H) => ({ d: suave(H.nervio), style: "pluma" })),
  ],
  planets: [],
  silhouette: {
    shapes: [],
    // las alas: plumas de gasa violeta que se superponen, sin contorno marcado
    velos: [...A_PLUMAS, ...A_PLUMAS_D].map((H) => contorno(H)),
    densidadVelos: 1.5,
    bordeVelos: 0.25,
    veloBlur: 2.4,
    vetas: [...A_PLUMAS, ...A_PLUMAS_D].flatMap((H) => entre(H.nervio, H.a, [0.6])).map((l) => suave(l)),
  },
};

// ═══════════════════════════════════════════════════════════
// VIDA — LAS HOJAS (calcadas de la referencia)
// Objetivos es el nudo donde se unen las dos hojas. La hoja alta lleva a
// Valores en su nervio, a Revisión en la punta y a Amigos en el borde; el
// tallo baja hasta Habilidades, en la base de la hoja baja, cuya punta es
// Decisiones; del nudo brota el capullo de las Cartas. Una órbita lo rodea.
// ═══════════════════════════════════════════════════════════
const TL = ref(490, 770);
const L_NUDO = TL(462, 790);
const L_SUP = hojaDe(L_NUDO, TL(630, 617), 128 * ESCALA, { arco: 0.04, n: 14 });
const L_BASE = TL(534, 940), L_PUNTA_INF = TL(318, 802);
const L_INF = hojaDe(L_BASE, L_PUNTA_INF, 118 * ESCALA, { arco: -0.05, n: 14 });
const L_TALLO = refs(TL, [[462, 790], [474, 826], [494, 866], [514, 904], [534, 940]]);
const L_CAPULLO = TL(418, 712);
const L_TALLO_C = [L_NUDO, ...refs(TL, [[446, 766], [430, 738]]), L_CAPULLO];
const L_VALORES = L_SUP.eje(0.36), L_AMIGOS = L_SUP.borde(0.62, 1, 0.98);   // (Valores → Amigos: una vena hacia la punta)
const L_ORB = { c: TL(482, 768), rx: 204 * ESCALA, ry: 90 * ESCALA, rot: -22 };
const L_ORBITA = elipse(L_ORB.c.x, L_ORB.c.y, L_ORB.rx, L_ORB.ry, L_ORB.rot, 0, 360, 72);
const venas = (H, lado, ts, largo = 0.16) => ts.map((t) => [H.eje(t), H.borde((t + t + largo) / 2, lado, 0.5), H.borde(t + largo, lado, 0.94)]);
// hojas fantasma, grandes y casi invisibles, detrás de la rama (como en la referencia)
const L_FANTASMAS = [
  hojaDe(TL(404, 724), TL(468, 566), 74 * ESCALA, { arco: 0.08, n: 12 }),
  hojaDe(TL(560, 896), TL(704, 786), 70 * ESCALA, { arco: -0.08, n: 12 }),
  hojaDe(TL(330, 846), TL(268, 926), 40 * ESCALA, { arco: 0.1, n: 10 }),
];
const RAMA = {
  id: "vida", zone: "Vida", figure: "Las Hojas",
  origin: { x: 1056, y: 1084 },
  color: { halo: "#FFE2A4", accent: "#C8D4FF", mist: "#3A3F9E", seda: "#B4A6F0", velo: "#4A4CC0", rim: "#BCC4FF" },
  label: { x: 0, y: 236 },
  nodes: [
    nodo("objetivos", L_NUDO, "nucleo", { star: "goals", label: "izq" }),
    nodo("valores", L_VALORES, "principal", { star: "values", label: "izq" }),
    nodo("revision", L_SUP.eje(1), "principal", { star: "reviews", label: "der" }),
    nodo("amigos", L_AMIGOS, "principal", { star: "friends", label: "der" }),
    nodo("habilidades", L_BASE, "principal", { star: "skills", label: "der" }),
    nodo("decisiones", L_PUNTA_INF, "principal", { star: "decisions", label: "izq" }),
    nodo("cartas", L_CAPULLO, "principal", { star: "letters", label: "izq" }),
    ...[0.6, 0.84].map((t, i) => nodo(`ns${i}`, L_SUP.eje(t), i ? "brillante" : "secundaria")),
    ...[0.18].map((t, i) => nodo(`nv${i}`, L_SUP.eje(t), "chispa")),
    nodo("va", L_SUP.borde(0.53, 1, 0.52), "chispa"),
    ...[0.3, 0.58, 0.8].map((t, i) => nodo(`ni${i}`, L_INF.eje(t), i === 1 ? "estrella" : "secundaria")),
    ...L_TALLO.slice(1, -1).map((p, i) => nodo(`ta${i}`, p, i === 1 ? "brillante" : "chispa")),
    ...L_TALLO_C.slice(1, -1).map((p, i) => nodo(`tc${i}`, p, "chispa")),
    ...rosario("sa", L_SUP.a, 21, { semilla: 41, tintes: ["oro", "blanco", "oro", "cian"] }),
    ...rosario("sb", L_SUP.b, 21, { semilla: 42, tintes: ["blanco", "oro", "cian", "oro"] }),
    ...rosario("ia", L_INF.a, 21, { semilla: 43, tintes: ["oro", "blanco", "lila", "oro"] }),
    ...rosario("ib", L_INF.b, 21, { semilla: 44, tintes: ["blanco", "oro", "cian"] }),
    ...rosario("or", L_ORBITA.pts, 40, { semilla: 45, tintes: ["oro", "blanco", "cian", "oro"] }),
  ],
  connections: [
    { path: ["objetivos", "nv0", "valores"], style: "oro" },
    { path: ["valores", "ns0", "ns1", "revision"], style: "oro" },
    { path: ["valores", "va", "amigos"], style: "oro" },
    { path: ["objetivos", "ta0", "ta1", "ta2", "habilidades"], style: "oro" },
    { path: ["habilidades", "ni0", "ni1", "ni2", "decisiones"], style: "oro" },
    { path: ["objetivos", "tc0", "tc1", "cartas"], style: "oro" },
    { pts: L_SUP.a, style: "trazo" }, { pts: L_SUP.b, style: "trazo" },
    { pts: L_INF.a, style: "trazo" }, { pts: L_INF.b, style: "trazo" },
    { pts: L_ORBITA.pts, style: "trazo", cerrado: true },
  ],
  orbits: [
    ...[...venas(L_SUP, -1, [0.1, 0.24, 0.38, 0.52, 0.66, 0.78]), ...venas(L_SUP, 1, [0.12, 0.24, 0.72, 0.84], 0.12),
      ...venas(L_INF, 1, [0.1, 0.24, 0.38, 0.52, 0.66, 0.78]), ...venas(L_INF, -1, [0.1, 0.24, 0.38, 0.52, 0.66, 0.78])]
      .map((pts) => ({ d: suave(pts), style: "vena" })),
    { d: hoja(TL(426, 748), TL(410, 694), 22, 0), style: "fino" },
  ],
  planets: [{ ...L_ORBITA.pts[Math.round(L_ORBITA.pts.length * 0.03)], r: 9, tierra: true }],
  silhouette: {
    shapes: [
      L_SUP.forma, L_INF.forma, hoja(TL(426, 748), TL(410, 694), 26, 0),
      cinta(L_TALLO, [6, 6, 5, 5, 4]),
    ],
    cristal: 0.6,
    // la textura de las hojas: sus venas (en las órbitas) y una sola fibra a cada lado del nervio
    fibras: [L_SUP, L_INF].flatMap((H) => [...entre(H.nervio, H.a, [0.6]), ...entre(H.nervio, H.b, [0.6])]).map((l) => suave(l)),
    velos: L_FANTASMAS.map((H) => H.forma),
    bordeVelos: 0.2,
    veloBlur: 3,
    vetas: L_FANTASMAS.flatMap((H) => [H.nervio, ...entre(H.nervio, H.a, [0.5]), ...entre(H.nervio, H.b, [0.5])]).map((l) => suave(l)),
  },
};

// ═══════════════════════════════════════════════════════════
// MENTE — LA LUNA Y LA PLUMA (calcadas de la referencia)
// La Carta diaria es la gran estrella de lo alto de la luna; Destellos brilla
// en la punta de la pluma y Escritura en su plumilla. Un halo de niebla la
// rodea y una gota de luz cuelga de su borde.
// ═══════════════════════════════════════════════════════════
const TM = ref(1110, 760);
const M_C1 = TM(1080, 740), M_R1 = 119 * ESCALA, M_C2 = TM(1120, 735), M_R2 = 98 * ESCALA;
const M_LUNA = mediaLuna(M_C1, M_R1, M_C2, M_R2);
const enM = (a) => P(M_C1.x + M_R1 * Math.cos(RAD(a)), M_C1.y + M_R1 * Math.sin(RAD(a)));
const M_A1 = GRADOS(M_LUNA.H1, M_C1), M_A2 = GRADOS(M_LUNA.H2, M_C1);
const M_B1 = GRADOS(M_LUNA.H1, M_C2), M_B2 = GRADOS(M_LUNA.H2, M_C2);
const M_CARTA = enM(-102), M_DEST = TM(1266, 629), M_ESCR = TM(1035, 907);
const M_FUERA = arcoPts(M_C1, M_R1, -102, M_A2 - 360, 40);         // de la Carta, por la izquierda, al cuerno de abajo
const M_FUERA2 = arcoPts(M_C1, M_R1, M_A1, -102, 8);               // del cuerno de arriba a la Carta
const M_DENTRO = arcoPts(M_C2, M_R2, M_B2, M_B1 + (M_B1 < M_B2 ? 360 : 0), 34);
// el resto de las dos circunferencias, por la derecha (detrás de la pluma): la luna se lee como dos anillos
const M_DENTRO_D = arcoPts(M_C2, M_R2, M_B1, M_B2 + (M_B2 < M_B1 ? 360 : 0), 30);
const M_PLUMA = (t) => P(M_DEST.x + (M_ESCR.x - M_DEST.x) * t, M_DEST.y + (M_ESCR.y - M_DEST.y) * t);
const M_VANO = hojaDe(M_DEST, M_PLUMA(0.64), 33 * ESCALA, { asim: 0.42, n: 14 });
// el estandarte ancho se abre en lóbulos, como la pluma de la referencia
const M_MUESCAS = { ts: [0.38, 0.62], prof: 0.42, ancho: 0.026 };
const M_VANO_A = muescas(M_VANO, 1, M_MUESCAS.ts, M_MUESCAS);
function barbas(H, desde = 0.08, hasta = 0.92, paso = 0.06, corte = () => 1) {
  let d = "";
  for (let t = desde; t <= hasta; t += paso) {
    for (const s of [1, -1]) {
      const tb = Math.max(0, t - 0.08), a = H.eje(t), b = H.borde(tb, s, 0.94 * (s > 0 ? corte(tb) : 1));
      d += `M${r1(a.x)} ${r1(a.y)}L${r1(b.x)} ${r1(b.y)}`;
    }
  }
  return d;
}
// las fibras de la media luna: arcos que pasan por los dos cuernos, entre el borde de fuera y el de dentro
const M_FIBRAS = [0.2, 0.47, 0.72].map((g) => {
  const c = P(M_C1.x + (M_C2.x - M_C1.x) * g, M_C1.y + (M_C2.y - M_C1.y) * g);
  const r = Math.hypot(M_LUNA.H1.x - c.x, M_LUNA.H1.y - c.y), a1 = GRADOS(M_LUNA.H1, c), a2 = GRADOS(M_LUNA.H2, c);
  return arcoPts(c, r, a1, a2 - 360 * (a2 > a1 ? 1 : 0), 40);
});
// el halo: dos medias lunas finas y mayores, apenas un velo: una arriba a la izquierda y otra abajo a la
// derecha (el círculo que las recorta es más grande que el suyo, por eso quedan como dos gajos separados)
const M_HALOS = [
  mediaLuna(TM(1076, 744), 212 * ESCALA, TM(1147, 803), 250 * ESCALA),
  mediaLuna(TM(1110, 770), 204 * ESCALA, TM(1042, 714), 238 * ESCALA),
];
const M_GOTA = refs(TM, [[1074, 858], [1074, 896], [1074, 935]]);
// la relación Destellos–Carta diaria: un hilo de oro que sale de la punta de la pluma hacia la izquierda,
// llega tangente a lo alto de la luna y sigue por su borde hasta la Carta
const M_ENLACE = [P(M_DEST.x - 64, M_DEST.y - 4.5), P(M_DEST.x - 128, M_DEST.y - 7.5), enM(-90), enM(-96)];
const LUNA_FIG = {
  id: "mente", zone: "Mente", figure: "La Luna y la Pluma",
  origin: { x: 446, y: 1088 },
  color: { halo: "#FFE6B4", accent: "#D6CEFF", mist: "#3B3A9C", seda: "#BAB1EC", velo: "#4A4EBA", rim: "#C0B6FF" },
  label: { x: -40, y: 236 },
  nodes: [
    nodo("destellos", M_DEST, "nucleo", { star: "notes", label: "der" }),
    nodo("escritura", M_ESCR, "principal", { star: "write", label: "izq" }),
    nodo("carta", M_CARTA, "principal", { star: "dailyletter", label: "izq" }),
    nodo("izquierda", enM(180), "estrella"), nodo("abajo", enM(128), "brillante"),
    nodo("h1", M_LUNA.H1, "secundaria", { tinte: "cian" }), nodo("h2", M_LUNA.H2, "brillante"),
    ...[0.22, 0.42].map((t, i) => nodo(`pq${i}`, M_PLUMA(t), "brillante")),
    nodo("pq2", M_PLUMA(0.62), "secundaria"),
    ...M_GOTA.map((p, i) => nodo(`go${i}`, p, i === 2 ? "secundaria" : "chispa", i === 2 ? { tinte: "cian" } : {})),
    ...rosario("mf", M_FUERA, 18, { semilla: 51, tintes: ["oro", "blanco", "oro", "lila", "blanco"] }),
    ...rosario("mg", M_FUERA2, 20, { semilla: 52, tintes: ["oro", "blanco"] }),
    ...M_ENLACE.map((p, i) => nodo(`en${i}`, p, i === 2 ? "brillante" : "chispa")),
    ...rosario("md", M_DENTRO, 28, { semilla: 53, tintes: ["blanco", "cian", "lila", "oro"] }),
    ...rosario("dr", M_DENTRO_D, 34, { semilla: 57, tintes: ["cian", "blanco", "lila"] }),
    ...rosario("va", M_VANO_A, 26, { semilla: 54, tintes: ["blanco", "lila", "oro"] }),
    ...rosario("vb", M_VANO.b, 26, { semilla: 55, tintes: ["blanco", "lila"] }),
    ...rosario("fm", M_FIBRAS[1], 40, { semilla: 56, tintes: ["lila", "blanco", "cian"] }),
  ],
  connections: [
    { path: ["destellos", "escritura"], style: "oro", bend: 0 },
    { path: ["destellos", ...M_ENLACE.map((_, i) => `en${i}`), "carta"], style: "oro", tenue: true },
    { pts: M_FUERA, style: "trazo" },
    { pts: M_FUERA2, style: "trazo" },
    { pts: M_DENTRO, style: "fino" },
    { pts: M_FIBRAS[1], style: "seda" },
    { pts: M_DENTRO_D, style: "seda" },
    { pts: M_VANO_A, style: "fino" }, { pts: M_VANO.b, style: "fino" },
    { pts: [M_GOTA[0], M_GOTA[1], M_GOTA[2]], style: "fino" },
  ],
  orbits: [
    { d: barbas(M_VANO, 0.08, 0.92, 0.045, (t) => muesca(t, M_MUESCAS.ts, M_MUESCAS.prof, M_MUESCAS.ancho)), style: "barbas" },
    { d: circulo(M_C1.x, M_C1.y, M_R1, M_A1 + 3, M_A2 - 3), style: "seda" },
  ],
  planets: [],
  silhouette: {
    shapes: [M_LUNA.forma, contorno(M_VANO, M_VANO_A)],
    cristal: 0.9,
    fibras: M_FIBRAS.map((l) => suave(l)),
    velos: M_HALOS.map((m) => m.forma),
    bordeVelos: 0.2,                            // halos de gasa: casi sin contorno
    veloBlur: 3,
  },
};

// ═══════════════════════════════════════════════════════════
// HOY — la rosa astral del centro · AJUSTES — el instrumento
// ═══════════════════════════════════════════════════════════
const HOY = {
  id: "hoy", zone: null, figure: "La Rosa Astral",
  origin: CENTRO,
  color: { halo: "#FFDB8C", accent: "#FFE9BF", mist: "#C9A24E", rim: "#FFE9BF" },
  nodes: [{ id: "hoy", star: "today", x: 0, y: 0, role: "nucleo", label: "abajo", centro: true }],
  connections: [],
  orbits: [],
  planets: [],
  silhouette: { shapes: [], wisps: [] },
};

const INSTRUMENTO = {
  id: "ajustes", zone: null, figure: "El Instrumento",
  origin: { x: 750, y: 1338 },
  color: { halo: "#F0E6CF", accent: "#C9D8F2", mist: "#4A5A9A", rim: "#C9D8F2" },
  nodes: [
    { id: "ajustes", star: "settings", x: 0, y: 0, role: "principal", label: "izq" },
    { id: "apariencia", star: "theme", x: 62, y: 36, role: "principal", label: "der" },
    { id: "a1", ...P(-52, -30), role: "chispa" }, { id: "a2", ...P(-60, 26), role: "secundaria", tinte: "cian" },
    ...rosario("in", arcoPts(P(0, 0), 46, 150, 330, 30), 16, { semilla: 61, tintes: ["oro", "blanco"] }),
  ],
  connections: [
    { path: ["ajustes", "apariencia"], style: "oro", bend: 0.1 },
  ],
  orbits: [
    { d: circulo(0, 0, 28), style: "trazo" },
    { d: marcas(0, 0, 31, 3, 15, 45, 1.8), style: "marcas" },
    { d: circulo(0, 0, 46, 150, 330), style: "fino" },
  ],
  planets: [],
  silhouette: { shapes: [], wisps: [] },
};

export const CONSTELACIONES = [DRAGON, OJO, ALAS, RAMA, LUNA_FIG, HOY, INSTRUMENTO];

/* Cómo se curvan las trayectorias que unen Hoy con cada constelación (0 = recta) */
export const MERIDIANOS = { training: 0.04, readings: 0, daily: 0.1, goals: 0.08, notes: 0.1, settings: 0.05 };
/* Nacen en el anillo de la rosa de Hoy (para no cruzar su nombre) y se detienen un poco antes de la
   estrella a la que llegan; la de Lecturas, en el borde del iris, para no pasar por debajo de su nombre. */
export const RADIO_ROSA = 90;
export const FIN_MERIDIANO = { readings: 66 };
