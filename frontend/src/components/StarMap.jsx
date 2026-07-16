/*
 * components/StarMap.jsx — EL MAR DE ESTRELLAS (arte v2)
 * ──────────────────────────────────────────────────────
 * Cada sección es ahora una ESTRELLA de verdad: cuatro puntas afiladas con
 * núcleo incandescente, halo y destello en cruz. Casi todas doradas; unas
 * pocas arden en rojizo o violeta. La central (Hoy) es una estrella de ocho
 * puntas con llamarada.
 *
 * Los hilos que las unen ya no son líneas: son TRENZAS de tres hebras curvas
 * que se cruzan entre sí (tejidos de luz), y por los hilos dorados del centro
 * viaja una chispa. El lienzo lleva nebulosas y ~300 motas de polvo estelar.
 *
 * La navegación (arrastrar / tocar / sumergirse) es la ya validada.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";

const MAP = 1300;

/* pseudo-aleatorio determinista: el cielo es el mismo en cada visita */
const h = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* paletas de estrella */
const HUE = {
  gold: { light: "#FFF6D8", mid: "#F2C24C", deep: "#A5731C", glow: "rgba(242,194,76,.8)" },
  rojo: { light: "#FFE3D0", mid: "#F0975C", deep: "#A34A20", glow: "rgba(240,151,92,.75)" },
  vio:  { light: "#F0E7FF", mid: "#BEA3FF", deep: "#6E51B0", glow: "rgba(190,163,255,.75)" },
};
/* qué estrellas se apartan del oro (rojizas: fuego/empeño · violetas: la mente) */
const STAR_HUE = { physique: "rojo", records: "rojo", todo: "rojo",
                   notes: "vio", write: "vio", readings: "vio", theme: "vio" };

/* estrella de 4 puntas cóncavas; las grandes llevan otra girada 45º detrás */
function starPath(R) {
  const c = (R * 0.22).toFixed(1);
  return `M 0 ${-R} C ${c} ${-c} ${c} ${-c} ${R} 0 C ${c} ${c} ${c} ${c} 0 ${R} C -${c} ${c} -${c} ${c} ${-R} 0 C -${c} ${-c} -${c} ${-c} 0 ${-R} Z`;
}

function Star({ id, hue, R, center }) {
  const P = HUE[hue] || HUE.gold;
  const S = R * 2.6;                       // caja con sitio para el halo
  return (
    <svg width={S} height={S} viewBox={`${-S / 2} ${-S / 2} ${S} ${S}`}
      style={{ filter: `drop-shadow(0 0 ${center ? 16 : 9}px ${P.glow})`, overflow: "visible" }}>
      <defs>
        <radialGradient id={`sg-${id}`}>
          <stop offset="0%" stopColor="#FFFDF4" />
          <stop offset="28%" stopColor={P.light} />
          <stop offset="62%" stopColor={P.mid} />
          <stop offset="100%" stopColor={P.deep} />
        </radialGradient>
        <radialGradient id={`sh-${id}`}>
          <stop offset="0%" stopColor={P.light} stopOpacity=".85" />
          <stop offset="45%" stopColor={P.mid} stopOpacity=".28" />
          <stop offset="100%" stopColor={P.mid} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* corona de rayos que gira lentamente (solo la estrella central) */}
      {center && (
        <g className="corona" opacity=".45">
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} x={-0.9} y={-R * 2.5} width={1.8} height={R * 2.5} rx={0.9}
              fill={`url(#sh-${id})`} transform={`rotate(${i * 45})`} />
          ))}
        </g>
      )}
      {/* halo */}
      <circle r={R * 1.45} fill={`url(#sh-${id})`} />
      {/* destello en cruz */}
      <g opacity={center ? 0.85 : 0.55}>
        <rect x={-R * 1.9} y={-0.8} width={R * 3.8} height={1.6} rx={0.8} fill={`url(#sh-${id})`} />
        <rect x={-0.8} y={-R * 1.9} width={1.6} height={R * 3.8} rx={0.8} fill={`url(#sh-${id})`} />
      </g>
      {/* segunda estrella girada: ocho puntas en las importantes */}
      {(center || R >= 20) && (
        <path d={starPath(R * 0.62)} transform="rotate(45)" fill={`url(#sg-${id})`} opacity=".8" />
      )}
      <path d={starPath(R)} fill={`url(#sg-${id})`} />
      {/* corazón incandescente */}
      <circle r={R * 0.2} fill="#FFFDF4" opacity=".95" />
    </svg>
  );
}

/* trenza etérea entre dos estrellas: tres hebras curvas que se cruzan */
function Weave({ A, B, gold, seed }) {
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;                       // perpendicular
  const strands = [1, -0.62, 0.34];
  const col = gold ? "rgba(238,196,96," : "rgba(196,218,255,";
  const paths = strands.map((k, i) => {
    const amp = L * 0.13 * k * (0.75 + 0.5 * h(seed * 7 + i));
    const c1x = A.x + dx * 0.3 + nx * amp, c1y = A.y + dy * 0.3 + ny * amp;
    const c2x = A.x + dx * 0.7 - nx * amp * 0.9, c2y = A.y + dy * 0.7 - ny * amp * 0.9;
    return `M ${A.x} ${A.y} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${B.x} ${B.y}`;
  });
  return (
    <g>
      <path d={paths[0]} fill="none" stroke={col + (gold ? ".42)" : ".20)")} strokeWidth="1.6" filter="url(#wblur)" />
      <path d={paths[1]} fill="none" stroke={col + (gold ? ".30)" : ".14)")} strokeWidth="1" />
      <path d={paths[2]} fill="none" stroke={col + (gold ? ".22)" : ".10)")} strokeWidth="0.7" />
      {gold && (
        /* la chispa que recorre el hilo dorado */
        <path d={paths[0]} fill="none" stroke="#FFEFC2" strokeWidth="2" strokeLinecap="round"
          className="flow" style={{ animationDelay: `${(seed % 7) * 0.9}s` }} />
      )}
    </g>
  );
}

export default function StarMap({ stars, edges, zones, onEnter }) {
  const [pan, setPan] = useState(null);
  const mapRef = useRef(null);
  const drag = useRef(null);
  const diving = useRef(false);

  useEffect(() => {
    setPan({ x: window.innerWidth / 2 - 650, y: window.innerHeight / 2 - 650 });
  }, []);

  /* polvo estelar denso: ~300 motas, unas pocas brillantes con fulgor */
  const dots = useMemo(() => Array.from({ length: 210 }, (_, i) => ({
    x: h(i * 2 + 1) * MAP, y: h(i * 2 + 2) * MAP,
    s: 0.8 + h(i * 3 + 5) * 1.7, d: (2 + h(i + 9) * 3.5).toFixed(1),
    o: 0.25 + h(i * 5 + 3) * 0.6, big: i % 34 === 0,
  })), []);

  /* polvo LEJANO: se mueve a media velocidad al arrastrar (paralaje = hondura) */
  const farDots = useMemo(() => Array.from({ length: 110 }, (_, i) => ({
    x: h(i * 4 + 51) * MAP, y: h(i * 4 + 52) * MAP,
    s: 0.6 + h(i * 2 + 7) * 1.1, d: (3 + h(i + 13) * 4).toFixed(1), o: 0.15 + h(i * 3 + 6) * 0.35,
  })), []);

  /* nebulosas dentro del lienzo (se mueven con el mar al arrastrar) */
  const nebulae = useMemo(() => ([
    { x: 320, y: 390, r: 290, c: "rgba(150,110,230,.20)" },
    { x: 980, y: 830, r: 310, c: "rgba(226,132,116,.13)" },
    { x: 990, y: 370, r: 230, c: "rgba(182,132,255,.15)" },
    { x: 330, y: 940, r: 250, c: "rgba(118,88,200,.17)" },
    { x: 650, y: 640, r: 360, c: "rgba(120,196,240,.09)" },
  ]), []);

  function clamp(x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    return { x: Math.min(60, Math.max(vw - MAP - 60, x)),
             y: Math.min(60, Math.max(vh - MAP - 60, y)) };
  }
  function down(e) {
    if (diving.current) return;
    drag.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y, moved: false };
  }
  function move(e) {
    const d = drag.current; if (!d) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 8) d.moved = true;
    setPan(clamp(d.px + e.clientX - d.sx, d.py + e.clientY - d.sy));
  }
  function up() { setTimeout(() => { drag.current = null; }, 0); }

  function dive(star) {
    if (drag.current?.moved || diving.current) return;
    diving.current = true;
    const el = mapRef.current;
    el.style.transformOrigin = `${star.x}px ${star.y}px`;
    el.style.transition = "transform .55s cubic-bezier(.6,.05,.35,1), opacity .5s ease";
    requestAnimationFrame(() => {
      el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(2.8)`;
      el.style.opacity = "0";
    });
    if (navigator.vibrate) navigator.vibrate(20);
    setTimeout(() => onEnter(star.id), 480);
  }

  if (!pan) return null;

  return (
    <div className="smap-wrap" onPointerDown={down} onPointerMove={move}
      onPointerUp={up} onPointerCancel={up}>
      {/* la capa lejana de polvo: paralaje al arrastrar */}
      <div className="smap-far" style={{ transform: `translate(${pan.x * 0.45}px, ${pan.y * 0.45}px)` }}>
        {farDots.map((d, i) => (
          <span key={i} className="mdot" style={{ left: d.x, top: d.y, width: d.s, height: d.s,
            opacity: d.o, animationDuration: `${d.d}s`, animationDelay: `${(i % 8) * 0.4}s` }} />
        ))}
      </div>

      {/* nubes luminosas posadas en el horizonte */}
      <div className="clouds" aria-hidden="true"><b /><b /><b /></div>
      {/* estrellas fugaces */}
      <div className="meteors" aria-hidden="true"><i /><i /><i /></div>
      {/* reflejos del cielo en el agua */}
      <div className="glints" aria-hidden="true" />

      <div ref={mapRef} className="smap"
        style={{ width: MAP, height: MAP, transform: `translate(${pan.x}px, ${pan.y}px)` }}>

        {/* nebulosas */}
        {nebulae.map((n, i) => (
          <span key={i} className="neb" style={{ left: n.x - n.r, top: n.y - n.r,
            width: n.r * 2, height: n.r * 2,
            background: `radial-gradient(circle, ${n.c}, transparent 70%)` }} />
        ))}

        {/* trenzas de luz */}
        <svg width={MAP} height={MAP} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <filter id="wblur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.9" />
            </filter>
          </defs>
          {edges.map(([a, b, gold], i) => {
            const A = stars.find((s) => s.id === a), B = stars.find((s) => s.id === b);
            if (!A || !B) return null;
            return <Weave key={i} A={A} B={B} gold={!!gold} seed={i + 1} />;
          })}
        </svg>

        {/* polvo estelar */}
        {dots.map((d, i) => (
          <span key={i} className={`mdot ${d.big ? "big" : ""}`}
            style={{ left: d.x, top: d.y, width: d.s, height: d.s, opacity: d.o,
              animationDuration: `${d.d}s`, animationDelay: `${(i % 9) * 0.35}s` }} />
        ))}

        {/* nombres de las constelaciones */}
        {zones.map((z) => (
          <span key={z.name} className="mzone" style={{ left: z.x, top: z.y }}>{z.name}</span>
        ))}

        {/* las estrellas-sección */}
        {stars.map((s, i) => {
          const alpha = ["training", "daily", "notes", "goals", "settings"].includes(s.id);
          const R = s.center ? 30 : alpha ? 21 : 16;
          return (
            <button key={s.id} className={`stnode ${s.center ? "center" : ""}`}
              style={{ left: s.x, top: s.y, animationDelay: `${i * 0.045}s` }} onClick={() => dive(s)}>
              <span className="sttw" style={{ animationDelay: `${(i % 6) * 0.7}s` }}>
                <Star id={s.id} hue={s.center ? "gold" : (STAR_HUE[s.id] || "gold")} R={R} center={s.center} />
              </span>
              <span className="stlab" style={s.center ? {} : { marginTop: -R * 0.5 }}>{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="maphint">Arrastra el mar · toca una estrella para entrar</div>
    </div>
  );
}
