/*
 * sections/DailyLetter.jsx — LA CARTA DE CADA DÍA
 * ───────────────────────────────────────────────
 * Cada noche, una carta en pergamino para una persona lejana: le cuentas tu
 * día y la sellas con lacre. Una por día (la fecha es su identidad), una racha
 * que crece con cada noche seguida y un legajo con todas, listo para
 * encuadernarlo y entregárselo algún día.
 *
 * Privacidad: estas cartas NO se guardan en la memoria del móvil (solo viven
 * en el servidor). El borrador sin sellar sí se guarda en este móvil para que
 * no se pierda si la app se cierra, y se borra al sellar o al cerrar sesión.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Feather, BookOpen, ChevronLeft, Printer, Shuffle, Lock, Unlock, X } from "lucide-react";
import { api, diaDeCarta, ymd } from "../lib/api";
import { useApi, useRefrescar, useFijarCache } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { C, FONT_BODY } from "../lib/theme";
import { SectionHeader } from "../components/ui";
import { HelpDot } from "../components/Help";
import "./DailyLetter.css";

/* ── Lacres ─────────────────────────────────────────────── */
export const LACRES = {
  carmesi:   { nombre: "Carmesí",   luz: "#E0635A", base: "#8E1F1C", sombra: "#4E0C0B" },
  oro:       { nombre: "Oro",       luz: "#F6D27A", base: "#A8761E", sombra: "#5A3C08" },
  esmeralda: { nombre: "Esmeralda", luz: "#6FC79C", base: "#1E6B4C", sombra: "#0B3424" },
  zafiro:    { nombre: "Zafiro",    luz: "#7FA8F0", base: "#1F4A8F", sombra: "#0D2148" },
  amatista:  { nombre: "Amatista",  luz: "#B793EC", base: "#55308A", sombra: "#2A1548" },
  noche:     { nombre: "Noche",     luz: "#7A7A92", base: "#2A2A38", sombra: "#0E0E16" },
};

/* contorno irregular de una gota de lacre */
function contornoLacre(r, semilla = 7) {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const ruido = Math.sin(i * 12.9898 + semilla) * 43758.5453;
    const k = 1 + ((ruido - Math.floor(ruido)) - 0.5) * 0.13;
    pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
  }
  return "M " + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join(" L ") + " Z";
}
function estrella(R) {
  const c = (R * 0.24).toFixed(1);
  return `M 0 ${-R} C ${c} ${-c} ${c} ${-c} ${R} 0 C ${c} ${c} ${c} ${c} 0 ${R} C -${c} ${c} -${c} ${c} ${-R} 0 C -${c} ${-c} -${c} ${-c} 0 ${-R} Z`;
}

export function SelloLacre({ color = "carmesi", size = 86, estampar = false, semilla = 7 }) {
  const L = LACRES[color] || LACRES.carmesi;
  const id = `lac-${color}-${semilla}`;
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <svg className={"sello" + (estampar ? " estampar" : "")} width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={L.luz} />
            <stop offset="55%" stopColor={L.base} />
            <stop offset="100%" stopColor={L.sombra} />
          </radialGradient>
          <radialGradient id={`${id}-i`} cx="60%" cy="65%" r="70%">
            <stop offset="0%" stopColor={L.base} />
            <stop offset="100%" stopColor={L.sombra} />
          </radialGradient>
        </defs>
        <path d={contornoLacre(46, semilla)} fill={`url(#${id}-g)`} />
        <circle r="31" fill={`url(#${id}-i)`} opacity=".9" />
        <circle r="31" fill="none" stroke={L.luz} strokeOpacity=".45" strokeWidth="1.4" />
        <circle r="27" fill="none" stroke={L.sombra} strokeOpacity=".6" strokeWidth="1" strokeDasharray="1.5 2.5" />
        {/* el emblema en relieve: la estrella de tu cuaderno */}
        <g transform="translate(.8 1.2)"><path d={estrella(17)} fill={L.sombra} opacity=".7" /></g>
        <path d={estrella(17)} fill={L.base} stroke={L.luz} strokeOpacity=".75" strokeWidth="1" />
        <circle r="3" fill={L.luz} opacity=".8" />
        <ellipse cx="-14" cy="-20" rx="10" ry="4.5" fill="#fff" opacity=".18" transform="rotate(-30)" />
      </svg>
      {estampar && <span className="onda-lacre" />}
    </span>
  );
}

/* ── Papel ──────────────────────────────────────────────── */
let RUIDO = null;
function ruidoPapel() {
  if (RUIDO !== null) return RUIDO;
  try {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 140;
    const cx = cv.getContext("2d");
    const img = cx.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random();
      img.data[i] = 110; img.data[i + 1] = 72; img.data[i + 2] = 30;
      img.data[i + 3] = v > 0.985 ? 70 : v > 0.9 ? 22 : 0;
    }
    cx.putImageData(img, 0, 0);
    RUIDO = `url(${cv.toDataURL()})`;
  } catch { RUIDO = "none"; }
  return RUIDO;
}

/* borde de pergamino: dientes pequeños e irregulares */
function bordeDeckle(semilla = 3) {
  const r = (i) => { const x = Math.sin(i * 78.233 + semilla) * 43758.5453; return x - Math.floor(x); };
  const p = [];
  for (let i = 0; i <= 40; i++) p.push(`${(i * 2.5).toFixed(1)}% ${(r(i) * 4).toFixed(1)}px`);
  for (let i = 0; i <= 40; i++) p.push(`calc(100% - ${(r(i + 50) * 4).toFixed(1)}px) ${(i * 2.5).toFixed(1)}%`);
  for (let i = 40; i >= 0; i--) p.push(`${(i * 2.5).toFixed(1)}% calc(100% - ${(r(i + 100) * 4).toFixed(1)}px)`);
  for (let i = 40; i >= 0; i--) p.push(`${(r(i + 150) * 4).toFixed(1)}px ${(i * 2.5).toFixed(1)}%`);
  return `polygon(${p.join(",")})`;
}

function Pergamino({ children, semilla = 3, style }) {
  const recorte = useMemo(() => bordeDeckle(semilla), [semilla]);
  return (
    <div className="carta-sombra" style={style}>
      <div className="pergamino" style={{ clipPath: recorte, WebkitClipPath: recorte, "--ruido-papel": ruidoPapel() }}>
        {children}
      </div>
    </div>
  );
}

function Capitular({ letra }) {
  return (
    <span className="capitular" aria-hidden="true">
      <svg viewBox="0 0 62 62">
        <path d="M4 52 C 14 40, 10 26, 22 18 M 58 10 C 48 20, 52 34, 40 44" stroke="#C9962F" strokeOpacity=".55" fill="none" strokeWidth="1.3" />
        <circle cx="22" cy="18" r="2" fill="#E8B84B" opacity=".7" />
        <circle cx="40" cy="44" r="2" fill="#E8B84B" opacity=".7" />
        <path d="M6 8 l3 3 m40 40 l3 3" stroke="#E8B84B" strokeOpacity=".5" />
      </svg>
      <span>{letra}</span>
    </span>
  );
}

function fechaLarga(iso) {
  const d = new Date(iso + "T12:00:00");
  const t = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const INSPIRACION = [
  "¿Qué momento de hoy querrías que viviera contigo?",
  "Algo pequeño que hoy te hizo sonreír.",
  "¿Qué has aprendido hoy, aunque sea mínimo?",
  "Lo que te costó hoy, y cómo lo atravesaste.",
  "Un lugar, un olor o una canción de hoy.",
  "¿Qué le preguntarías si estuviera aquí esta noche?",
  "Algo que hoy te recordó a esa persona.",
  "Un pensamiento que no le has contado a nadie.",
  "¿Qué esperas del día de mañana?",
  "Una conversación de hoy que merezca guardarse.",
];

/* ── Lectura de una carta sellada ───────────────────────── */
function Lectura({ carta, onEditar, onCerrar, recienSellada }) {
  const texto = carta.body || "";
  const primera = texto.trim().charAt(0);
  const resto = texto.trim().slice(1);
  return (
    <div style={{ marginBottom: 22 }}>
      {onCerrar && (
        <button onClick={onCerrar} style={volver}><ChevronLeft size={16} /> Volver al legajo</button>
      )}
      <Pergamino semilla={parseInt(carta.date.replaceAll("-", ""), 10) % 97}>
        <div className="fecha">{fechaLarga(carta.date)}</div>
        {carta.greeting && <div className="saludo" style={{ marginBottom: 10 }}>{carta.greeting}</div>}
        <div className="texto">
          {primera && <Capitular letra={primera.toUpperCase()} />}
          {resto.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {carta.closing && <div className="despedida" style={{ marginTop: 14 }}>{carta.closing}</div>}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <SelloLacre color={carta.seal} estampar={recienSellada} semilla={parseInt(carta.date.slice(-2), 10)} />
        </div>
      </Pergamino>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia }}>{carta.words} palabras</span>
        {onEditar && (
          <button onClick={onEditar} style={enlace}><Unlock size={13} /> Romper el lacre y editar</button>
        )}
      </div>
    </div>
  );
}

/* ── El escritorio: escribir y sellar ───────────────────── */
function Editor({ fecha, previa, porDefecto, onSellada, onCancelar }) {
  const claveBorrador = `tc:borrador:${fecha}`;
  const inicial = useMemo(() => {
    try {
      const b = JSON.parse(localStorage.getItem(claveBorrador) || "null");
      if (b && (b.body || "").trim()) return b;
    } catch { /* sin borrador */ }
    return previa || { greeting: porDefecto.greeting, body: "", closing: porDefecto.closing, seal: "carmesi" };
  }, [claveBorrador]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [saludo, setSaludo] = useState(inicial.greeting || "");
  const [cuerpo, setCuerpo] = useState(inicial.body || "");
  const [despedida, setDespedida] = useState(inicial.closing || "");
  const [lacre, setLacre] = useState(inicial.seal || "carmesi");
  const [idea, setIdea] = useState(() => Math.floor(Math.random() * INSPIRACION.length));
  const [sellando, setSellando] = useState(false);
  const enCurso = useRef(false);
  const area = useRef(null);

  // El área de texto crece con lo escrito (nada de barras de desplazamiento)
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(320, el.scrollHeight) + "px";
  }, [cuerpo]);

  // Borrador en este móvil, para no perder nada si la app se cierra
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (cuerpo.trim()) localStorage.setItem(claveBorrador,
          JSON.stringify({ greeting: saludo, body: cuerpo, closing: despedida, seal: lacre }));
      } catch { /* sin almacenamiento */ }
    }, 600);
    return () => clearTimeout(t);
  }, [saludo, cuerpo, despedida, lacre, claveBorrador]);

  const palabras = cuerpo.trim() ? cuerpo.trim().split(/\s+/).length : 0;

  async function sellar() {
    if (enCurso.current || !cuerpo.trim()) return;
    enCurso.current = true;
    setSellando(true);
    try {
      const carta = await api.saveDailyLetter(fecha, {
        greeting: saludo.trim(), body: cuerpo.trim(), closing: despedida.trim(), seal: lacre,
      });
      try { localStorage.removeItem(claveBorrador); } catch { /* nada */ }
      if (navigator.vibrate) navigator.vibrate([30, 60, 90]);
      onSellada(carta);
    } catch (e) {
      avisar(e?.humano || "No se pudo sellar la carta. Tu texto sigue aquí.");
    } finally {
      enCurso.current = false;
      setSellando(false);
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: C.sepia,
        fontFamily: FONT_BODY, fontSize: 13, fontStyle: "italic" }}>
        <span style={{ flex: 1 }}>Si no sabes por dónde empezar: {INSPIRACION[idea % INSPIRACION.length]}</span>
        <button onClick={() => setIdea((i) => i + 1)} aria-label="Otra idea" style={{ ...enlace, padding: 6 }}>
          <Shuffle size={14} />
        </button>
      </div>

      <Pergamino semilla={parseInt(fecha.replaceAll("-", ""), 10) % 97}>
        <div className="fecha">{fechaLarga(fecha)}</div>
        <input className="saludo" value={saludo} onChange={(e) => setSaludo(e.target.value)}
          placeholder="Querida…" maxLength={120} aria-label="Encabezamiento" />
        <textarea ref={area} className="cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)}
          placeholder="Hoy…" maxLength={20000} aria-label="Tu carta" />
        <input className="despedida" value={despedida} onChange={(e) => setDespedida(e.target.value)}
          placeholder="Siempre tuyo…" maxLength={120} aria-label="Despedida" />
      </Pergamino>

      {/* Elegir el lacre */}
      <div style={{ marginTop: 18, marginBottom: 6, fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".14em",
        textTransform: "uppercase", color: C.sepia }}>Lacre</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {Object.entries(LACRES).map(([k, v]) => (
          <button key={k} onClick={() => setLacre(k)} aria-label={`Lacre ${v.nombre}`} aria-pressed={lacre === k}
            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", borderRadius: "50%",
              outline: lacre === k ? `2px solid ${C.olive}` : "none", outlineOffset: 1,
              transform: lacre === k ? "scale(1.08)" : "none", transition: "transform .2s" }}>
            <SelloLacre color={k} size={40} semilla={k.length} />
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="pluma-btn" onClick={sellar} disabled={sellando || !cuerpo.trim()}>
          <Lock size={17} /> {sellando ? "Sellando…" : "Sellar la carta"}
        </button>
        {onCancelar && <button onClick={onCancelar} style={enlace}>Cancelar</button>}
        <span style={{ marginLeft: "auto", fontFamily: FONT_BODY, fontSize: 12, color: C.sepia }}>
          {palabras} {palabras === 1 ? "palabra" : "palabras"}
        </span>
      </div>
      <p style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, opacity: .8, marginTop: 10, lineHeight: 1.5 }}>
        Mientras escribes, el borrador se guarda en este móvil. Al sellar, viaja a tu cuaderno y el borrador se borra.
      </p>
    </div>
  );
}

/* ── El libro: todas las cartas, para imprimir o guardar en PDF ── */
function Libro({ onCerrar }) {
  const { data, gate } = useApi("dailyletters-book", api.dailyLetterBook);
  return (
    <div className="libro-cartas">
      <div className="no-imprimir" style={{ display: "flex", gap: 10, maxWidth: 620, margin: "0 auto 18px", alignItems: "center" }}>
        <button onClick={onCerrar} style={{ ...enlace, color: "#E9D3A6" }}><X size={16} /> Cerrar</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => window.print()} className="pluma-btn" style={{ fontSize: 15, padding: "10px 16px" }}>
          <Printer size={15} /> Imprimir o guardar en PDF
        </button>
      </div>
      {gate || (data.length === 0 ? (
        <p style={{ color: "#E9D3A6", textAlign: "center", fontFamily: "'IM Fell English', serif" }}>Aún no hay cartas.</p>
      ) : data.map((c) => (
        <div key={c.date} className="hoja"><Lectura carta={c} /></div>
      )))}
    </div>
  );
}

/* ── La estrella ────────────────────────────────────────── */
export default function DailyLetter() {
  const dia = diaDeCarta();
  const { data, gate } = useApi("dailyletters", api.dailyLetters, { params: [dia] });
  const refrescar = useRefrescar();
  const fijar = useFijarCache();
  const [modo, setModo] = useState(null);           // null | "escribir" | "leer" | "libro"
  const [fechaActiva, setFechaActiva] = useState(dia);
  const [recien, setRecien] = useState(null);       // carta recién sellada (para la animación)
  const hoyEscrita = !!data?.written_today;
  const { data: cartaHoy } = useApi("dailyletter", api.dailyLetter, { params: [dia], enabled: hoyEscrita });
  const { data: cartaVista, gate: gateVista } = useApi("dailyletter", api.dailyLetter,
    { params: [fechaActiva], enabled: modo === "leer" && fechaActiva !== dia });

  if (gate) return (<><Cabecera />{gate}</>);

  const ayer = (() => { const d = new Date(dia + "T12:00:00"); d.setDate(d.getDate() - 1); return ymd(d); })();
  const faltaAyer = !data.letters.some((l) => l.date === ayer) && data.total > 0;
  const porDefecto = { greeting: data.last_greeting || "", closing: data.last_closing || "" };

  function sellada(carta) {
    // El servidor ya la ha confirmado: se pinta sellada al instante (sin parpadeo)
    fijar("dailyletter", [carta.date], carta);
    if (carta.date === dia) fijar("dailyletters", [dia], (d) => d && { ...d, written_today: true });
    setRecien(carta);
    setModo(null);
    setFechaActiva(dia);
    refrescar("dailyletters", "dailyletter", "today");
    avisar(carta.date === dia ? "Carta sellada. Buenas noches." : "Carta sellada.", "ok");
  }

  if (modo === "libro") return <Libro onCerrar={() => setModo(null)} />;

  if (modo === "escribir") {
    const previa = fechaActiva === dia ? cartaHoy : cartaVista;
    return (
      <div>
        <Cabecera />
        <Editor key={fechaActiva} fecha={fechaActiva} previa={previa} porDefecto={porDefecto}
          onSellada={sellada} onCancelar={() => setModo(null)} />
      </div>
    );
  }

  if (modo === "leer" && fechaActiva !== dia) {
    return (
      <div>
        <Cabecera />
        {gateVista || <Lectura carta={cartaVista} onCerrar={() => setModo(null)}
          onEditar={() => setModo("escribir")} />}
      </div>
    );
  }

  // Agrupar el legajo por meses
  const meses = [];
  for (const l of data.letters) {
    const mes = new Date(l.date + "T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const etiqueta = mes.charAt(0).toUpperCase() + mes.slice(1);
    const ultimo = meses[meses.length - 1];
    if (ultimo && ultimo.etiqueta === etiqueta) ultimo.cartas.push(l);
    else meses.push({ etiqueta, cartas: [l] });
  }

  return (
    <div>
      <Cabecera />

      {/* La cinta: racha, mejor racha y cartas */}
      <div className="cinta-cartas">
        <div className="cifra"><div className="num">{data.streak}</div><div className="lab">Racha</div></div>
        <div className="cifra"><div className="num">{data.best_streak}</div><div className="lab">Mejor racha</div></div>
        <div className="cifra"><div className="num">{data.total}</div><div className="lab">Cartas</div></div>
        <div className="cifra"><div className="num">{data.words >= 1000 ? `${(data.words / 1000).toFixed(1)}k` : data.words}</div><div className="lab">Palabras</div></div>
      </div>

      {/* Hoy */}
      {!hoyEscrita ? (
        <Pergamino semilla={11} style={{ marginBottom: 22 }}>
          <div className="fecha">{fechaLarga(dia)}</div>
          <div style={{ fontFamily: "'IM Fell English', Georgia, serif", fontStyle: "italic", fontSize: 25,
            color: "#2b1a0b", lineHeight: 1.3, marginBottom: 10 }}>
            Hoy aún no le has escrito.
          </div>
          <p style={{ fontFamily: "'IM Fell English', Georgia, serif", fontSize: 17, color: "#4a3218",
            lineHeight: 1.6, margin: "0 0 20px" }}>
            Cuéntale tu día: lo que viste, lo que sentiste, lo que aprendiste. Algún día leerá estas líneas.
            {data.streak > 0 && <> Si escribes esta noche, tu racha llegará a <strong>{data.streak + 1}</strong> {data.streak + 1 === 1 ? "día" : "días"}.</>}
          </p>
          <button className="pluma-btn" onClick={() => { setFechaActiva(dia); setModo("escribir"); }}>
            <Feather size={18} /> Tomar la pluma
          </button>
          {faltaAyer && (
            <div style={{ marginTop: 14 }}>
              <button onClick={() => { setFechaActiva(ayer); setModo("escribir"); }}
                style={{ ...enlace, color: "#6b4a26", padding: 0 }}>
                ¿Se te pasó la de ayer? Escríbela →
              </button>
            </div>
          )}
        </Pergamino>
      ) : cartaHoy ? (
        <Lectura carta={cartaHoy} recienSellada={recien?.date === dia}
          onEditar={() => { setFechaActiva(dia); setModo("escribir"); }} />
      ) : null}

      {/* El legajo */}
      {data.total > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 12px" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
              fontWeight: 600, color: C.olive }}>El legajo</span>
            <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(232,184,75,.4), transparent)" }} />
            <button onClick={() => setModo("libro")} style={enlace}><BookOpen size={14} /> Encuadernar</button>
          </div>
          {meses.map((m) => (
            <div key={m.etiqueta} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'IM Fell English', Georgia, serif", fontStyle: "italic", fontSize: 17,
                color: C.sepiaInk, margin: "0 0 8px 2px" }}>{m.etiqueta}</div>
              {m.cartas.map((l) => (
                <button key={l.date} className="carta-mini" onClick={() => {
                  setFechaActiva(l.date); setModo(l.date === dia ? null : "leer");
                  if (l.date === dia) window.scrollTo({ top: 0, behavior: "smooth" });
                }}>
                  <SelloLacre color={l.seal} size={38} semilla={parseInt(l.date.slice(-2), 10)} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".08em",
                      textTransform: "uppercase", opacity: .7 }}>
                      {new Date(l.date + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })}
                      {" · "}{l.words} palabras
                    </span>
                    <span style={{ display: "block", fontFamily: "'IM Fell English', Georgia, serif", fontStyle: "italic",
                      fontSize: 15.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {l.preview}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Cabecera() {
  return <SectionHeader kicker="Mente · Correspondencia" title="Carta diaria" help="daily_letter" />;
}

const enlace = { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none",
  color: C.sepia, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", padding: "6px 4px" };
const volver = { ...enlace, marginBottom: 12, padding: 0 };
