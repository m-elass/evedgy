/*
 * sections/Today.jsx
 * ──────────────────
 * La pantalla de inicio. Reúne en un vistazo lo que importa hoy:
 *  - saludo según la hora y la frase del día (de la estrella Frases)
 *  - la carta de hoy: si ya está sellada o aún te espera, y tu racha
 *  - las misiones diarias del Sistema (habilidades)
 *  - hábitos de hoy, que se marcan al instante
 *  - un destello del pasado y, el fin de semana, el resumen de la semana
 *
 * Todo llega en UNA petición (/today) y se guarda en el móvil: al abrir la
 * app se ve al momento, aunque el servidor esté despertando.
 */
import React, { useState } from "react";
import { Check, Quote, Sparkles, Feather, ChevronRight, RefreshCw, Swords } from "lucide-react";
import { api, ymd, lunes, diaDeCarta } from "../lib/api";
import { useApi, useFijarCache, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader } from "../components/ui";
import { HelpDot } from "../components/Help";
import { SelloAlado, WaterDivider, HydroFrame, EstrellaAlada, pedirCeremonia } from "../components/ornamentos";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default function Today({ onNavigate }) {
  const hoy = ymd();
  const { data, gate } = useApi("today", api.today, { params: [hoy] });
  const finde = [0, 6].includes(new Date().getDay());
  const { data: resumen } = useApi("summary", api.summaryWeek, {
    params: [ymd(lunes())], enabled: finde, staleTime: 6 * 3600 * 1000,
  });
  const [pend, setPend] = useState({});        // marcas en vuelo (optimistas)
  const [qi, setQi] = useState(0);             // qué frase del día se muestra
  // ornamento: la ceremonia de entrada se dibuja una sola vez al entrar en Hoy
  const [retraso] = useState(() => pedirCeremonia("today"));   // null = sin ceremonia
  const ceremonia = retraso !== null;
  const fijar = useFijarCache();
  const refrescar = useRefrescar();

  if (gate) return (<><SectionHeader kicker="Tu cuaderno" title="Hoy" />{gate}</>);

  const habits = data.habits || [];
  const hecho = (h) => (pend[h.id] !== undefined ? pend[h.id] : h.done_today);
  const doneCount = habits.filter(hecho).length;
  const frases = data.quotes || [];
  const frase = frases.length ? frases[qi % frases.length] : null;
  const carta = data.letter || { written: false, streak: 0 };
  const misiones = data.missions || { total: 0, done: 0 };
  const isSunday = new Date().getDay() === 0;
  // La carta se escribe por la noche; de madrugada aún cuenta la de ayer
  const cartaPendiente = !carta.written && diaDeCarta() === hoy;

  async function toggleHabit(h) {
    if (pend[h.id] !== undefined) return;
    const nuevo = !h.done_today;
    setPend((p) => ({ ...p, [h.id]: nuevo }));
    if (navigator.vibrate) navigator.vibrate(12);
    try {
      await api.completeDailyTask(h.id, { date: hoy, done: nuevo });
      // Confirmado por el servidor: ahora sí se guarda en la memoria del móvil
      fijar("today", [hoy], (d) => d && {
        ...d, habits: d.habits.map((x) => (x.id === h.id ? { ...x, done_today: nuevo } : x)),
      });
      refrescar("today", "daily");
    } catch (e) {
      avisar(e?.humano || "No se pudo marcar el hábito.");
    } finally {
      setPend((p) => { const r = { ...p }; delete r[h.id]; return r; });
    }
  }

  return (
    <div>
      <div className="orn-cabecera" style={{ marginBottom: 20, "--orn-retraso": (retraso || 0) + "s" }}>
        {/* la Rosa Astral de Hoy: su sello con alas (solo aquí, la pantalla principal) */}
        <SelloAlado zona="hoy" size={58} ceremonia={ceremonia} className="orn-hoy-sello" />
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: C.sepiaInk, fontWeight: 600, margin: 0 }}>{greeting()}</h1>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, marginTop: 4 }}>Esto es lo que importa hoy.</p>
        <WaterDivider glifo="hoy" zona="hoy" ancho={230} alto={28} ceremonia={ceremonia} style={{ marginTop: 2, marginBottom: -18 }} />
      </div>

      {/* La frase del día */}
      {frase ? (
        <div className="frase-dia" style={{ position: "relative", marginBottom: 18, padding: "20px 20px 16px",
          borderRadius: 18, background: "linear-gradient(160deg, rgba(232,184,75,.13), rgba(183,156,255,.08) 60%, rgba(30,59,107,.4))",
          border: "1px solid rgba(232,184,75,.28)", overflow: "hidden" }}>
          <HydroFrame variante="principal" radio={18} />
          <Quote size={34} color="rgba(232,184,75,.22)" style={{ position: "absolute", right: 14, top: 10 }} />
          <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase",
            fontWeight: 600, marginBottom: 10, background: GRAD.gold, WebkitBackgroundClip: "text",
            backgroundClip: "text", color: "transparent", width: "fit-content" }}>
            La frase de hoy <HelpDot topic="quotes" size={13} />
          </div>
          <p key={frase.id} className="frase-texto" style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 21,
            fontStyle: "italic", color: C.sepiaInk, lineHeight: 1.45 }}>«{frase.text}»</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10 }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia }}>
              {frase.author ? `— ${frase.author}` : ""}{frase.source ? `, ${frase.source}` : ""}
            </span>
            {frases.length > 1 && (
              <button onClick={() => setQi((i) => i + 1)} aria-label="Otra frase" style={chipBtn}>
                <RefreshCw size={12} /> Otra
              </button>
            )}
          </div>
        </div>
      ) : (
        <button onClick={() => onNavigate?.("quotes")} style={emptyCard}>
          Guarda las frases que te marcan y aparecerán aquí cada día →
        </button>
      )}

      {/* La carta de hoy */}
      <button onClick={() => onNavigate?.("dailyletter")} className={cartaPendiente ? "carta-espera" : ""}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer",
          padding: "14px 16px", marginBottom: 12, borderRadius: 16, border: "1px solid rgba(214,180,120,.5)",
          background: "linear-gradient(135deg, #F1E2BE, #E3CC9C 70%, #D5B988)", color: "#3A2614",
          boxShadow: cartaPendiente ? "0 0 0 1px rgba(232,184,75,.3), 0 10px 26px rgba(0,0,0,.35)" : "0 6px 18px rgba(0,0,0,.28)" }}>
        <span style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: carta.written ? "radial-gradient(circle at 35% 30%, #D9534F, #8E1F1C 70%)" : "rgba(58,38,20,.08)",
          border: carta.written ? "none" : "1.5px dashed rgba(58,38,20,.35)",
          boxShadow: carta.written ? "inset 0 -3px 6px rgba(0,0,0,.35), 0 2px 5px rgba(0,0,0,.3)" : "none" }}>
          {carta.written ? <Check size={18} color="#F7E6C4" strokeWidth={3} /> : <Feather size={19} color="#5A3B1C" />}
        </span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontFamily: "'IM Fell English', Georgia, serif", fontSize: 18.5, fontStyle: "italic" }}>
            {carta.written ? "La carta de hoy está sellada" : "Tu carta de hoy te espera"}
          </span>
          <span style={{ display: "block", fontFamily: FONT_BODY, fontSize: 12, opacity: .75, marginTop: 2 }}>
            {carta.streak > 0 ? `Racha: ${carta.streak} ${carta.streak === 1 ? "día" : "días seguidos"}` : "Empieza hoy tu racha de cartas"}
          </span>
        </span>
        <ChevronRight size={18} color="#5A3B1C" />
      </button>

      {/* Misiones diarias del Sistema */}
      {misiones.total > 0 && (
        <button onClick={() => onNavigate?.("skills")} style={{ width: "100%", display: "flex", alignItems: "center",
          gap: 10, padding: "11px 14px", marginBottom: 18, borderRadius: 12, cursor: "pointer", textAlign: "left",
          background: "rgba(10,24,48,.75)", border: "1px solid rgba(90,200,255,.45)",
          boxShadow: "0 0 14px rgba(70,190,255,.18), inset 0 0 12px rgba(70,190,255,.08)" }}>
          <Swords size={16} color="#7FDBFF" />
          <span style={{ flex: 1, fontFamily: "'Rajdhani', 'Inter', sans-serif", fontSize: 14.5, fontWeight: 600,
            letterSpacing: ".06em", color: "#CDEFFF", textTransform: "uppercase" }}>
            Misiones diarias · {misiones.done}/{misiones.total}
          </span>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: misiones.done === misiones.total ? "#7CF5C0" : "#7FDBFF" }}>
            {misiones.done === misiones.total ? "COMPLETADAS" : "EN CURSO"}
          </span>
        </button>
      )}

      {/* Resumen de la semana (fines de semana) */}
      {finde && resumen?.summary && (
        <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`,
          padding: "16px 18px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: GRAD.gold }} />
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase",
            fontWeight: 600, marginBottom: 8, background: GRAD.gold, WebkitBackgroundClip: "text",
            backgroundClip: "text", color: "transparent", width: "fit-content" }}>
            Tu semana{" "}<HelpDot topic="weekly_summary" size={13} />
          </div>
          <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 17, color: C.sepiaInk, lineHeight: 1.6 }}>{resumen.summary}</p>
        </div>
      )}

      {/* Ritual de domingo */}
      {isSunday && (
        <button onClick={() => onNavigate?.("reviews")} style={{ width: "100%", textAlign: "left",
          background: GRAD.gold, border: "none", borderRadius: 14, padding: "16px 18px", marginBottom: 16,
          boxShadow: GLOW.gold, cursor: "pointer" }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
            color: C.cream, fontWeight: 700, opacity: .8 }}>Es domingo</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.cream, fontWeight: 600, marginTop: 2 }}>Cierra tu semana →</div>
        </button>
      )}

      {/* Hábitos de hoy */}
      <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
        marginBottom: 10, fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text",
        backgroundClip: "text", color: "transparent", width: "fit-content", position: "relative" }}>
        Hábitos de hoy · {doneCount}/{habits.length}
        {/* estado especial: todos hechos → una estrella líquida con alas */}
        {habits.length > 0 && doneCount === habits.length && <EstrellaAlada size={52} className="orn-completo" />}
      </div>
      {habits.length === 0 ? (
        <button onClick={() => onNavigate?.("daily")} style={emptyCard}>
          Aún no tienes hábitos. Crea el primero →
        </button>
      ) : (
        <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`, padding: "4px 16px", marginBottom: 22 }}>
          {habits.map((t, i) => {
            const ok = hecho(t);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0",
                borderBottom: i < habits.length - 1 ? `1px solid ${C.paperEdge}` : "none" }}>
                <button onClick={() => toggleHabit(t)} aria-label={ok ? "Desmarcar" : "Marcar hecho"} data-estrella={ok ? "hecho" : "marcar"}
                  style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: ok ? GRAD.gold : "transparent", boxShadow: ok ? GLOW.gold : "none",
                    outline: ok ? "none" : `2px solid ${C.sepia}`, outlineOffset: -2,
                    opacity: pend[t.id] !== undefined ? 0.75 : 1, transition: "background .2s, box-shadow .2s" }}>
                  {ok && <Check size={15} color={C.cream} strokeWidth={3} />}
                </button>
                <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk }}>{t.title}</span>
                {t.streak > 1 && (
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.rust, fontWeight: 600 }}>🔥 {t.streak}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Destello del pasado */}
      {data.flashback && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <Sparkles size={13} color={C.olive} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase",
              fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Un destello del pasado{" "}<HelpDot topic="flashback" size={13} />
            </span>
          </div>
          <div style={{ background: C.paper, borderRadius: 14, border: `1px solid ${C.paperEdge}`, padding: "16px 18px" }}>
            <Quote size={16} color={C.oliveSoft} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 16, color: C.sepiaInk, lineHeight: 1.55, fontStyle: "italic" }}>{data.flashback.content}</p>
            {data.flashback.created_at && (
              <span style={{ display: "block", marginTop: 10, fontFamily: FONT_BODY, fontSize: 11, color: C.sepia }}>
                {new Date(data.flashback.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const chipBtn = { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(232,184,75,.12)",
  border: "1px solid rgba(232,184,75,.35)", color: "#F2D58A", borderRadius: 999, padding: "5px 11px",
  fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer", flexShrink: 0 };
const emptyCard = { display: "block", width: "100%", textAlign: "left", background: C.paper,
  border: `1px dashed ${C.sepia}`, borderRadius: 14, padding: "16px 18px", marginBottom: 18,
  fontFamily: FONT_BODY, fontSize: 14, color: C.sepia, cursor: "pointer" };
