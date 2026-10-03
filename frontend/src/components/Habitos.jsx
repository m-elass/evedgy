/*
 * components/Habitos.jsx — las piezas que comparten Hoy y Hábitos.
 * ────────────────────────────────────────────────────────────────
 *  · useAccionesHabito: marcar, sumar a una métrica, fijar su cifra y
 *    responder al principio, al instante (optimista) y guardándolo luego en
 *    la memoria del móvil cuando el servidor confirma.
 *  · Casilla, FilaMetrica (barra + botones rápidos + escribir la cifra) y
 *    TarjetaPrincipio (el principio del día y, por la noche, «¿lo viviste?»).
 */
import React, { useRef, useState } from "react";
import { Check, Minus, Plus, Moon } from "lucide-react";
import { api } from "../lib/api";
import { useFijarCache, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { C, FONT_BODY, FONT_DISPLAY, GRAD, GLOW } from "../lib/theme";
import { cambiarEnHoy, lineaMetrica, num, pasoDe, RESPUESTAS } from "../lib/habitos";

const vibrar = (p = 12) => { try { navigator.vibrate?.(p); } catch { /* sin vibración */ } };

export function useAccionesHabito(hoy) {
  const fijar = useFijarCache();
  const refrescar = useRefrescar();
  const [pend, setPend] = useState({});          // id → { done?, value? } mientras el servidor confirma
  const vuelo = useRef({});                       // peticiones en curso por hábito
  const cola = useRef({});                        // métricas: una petición cada vez, en orden
  const optimo = useRef({});                      // la cifra que se ve mientras llegan las respuestas

  const poner = (id, cambios) => setPend((p) => ({ ...p, [id]: { ...p[id], ...cambios } }));
  const quitar = (id, campo) => setPend((p) => {
    if (!p[id]) return p;
    const r = { ...p, [id]: { ...p[id] } };
    delete r[id][campo];
    if (!Object.keys(r[id]).length) delete r[id];
    return r;
  });
  function guardar(id, cambios) {
    fijar("today", [hoy], (d) => cambiarEnHoy(d, id, cambios));
    fijar("habits", [hoy], (l) => (Array.isArray(l) ? l.map((h) => (h.id === id ? { ...h, ...cambios } : h)) : l));
  }

  const hecho = (h) => (pend[h.id]?.done !== undefined ? pend[h.id].done : h.done_today);
  const valor = (h) => (pend[h.id]?.value !== undefined ? pend[h.id].value : h.value_today);
  const ocupado = (h) => !!vuelo.current[h.id];

  async function marcar(h) {
    if (vuelo.current[h.id]) return;
    const nuevo = !hecho(h);
    vuelo.current[h.id] = 1;
    poner(h.id, { done: nuevo });
    vibrar();
    try {
      await api.completeDailyTask(h.id, { date: hoy, done: nuevo });
      guardar(h.id, { done_today: nuevo, week_done: Math.max(0, (h.week_done || 0) + (nuevo ? 1 : -1)) });
      refrescar("today", "habits", "daily");
    } catch (e) {
      avisar(e?.humano || "No se pudo marcar.");
    } finally {
      delete vuelo.current[h.id];
      quitar(h.id, "done");
    }
  }

  function cifra(h, cuerpo, optimista) {
    optimo.current[h.id] = optimista;
    poner(h.id, { value: optimista });
    vuelo.current[h.id] = (vuelo.current[h.id] || 0) + 1;
    // encadenadas: si tocas «+» tres veces seguidas, llegan una detrás de otra y suman las tres
    const previa = cola.current[h.id] || Promise.resolve();
    const esta = previa.catch(() => {}).then(() => enviarCifra(h, cuerpo));
    cola.current[h.id] = esta;
    return esta;
  }
  async function enviarCifra(h, cuerpo) {
    try {
      const r = await api.setHabitValue(h.id, { date: hoy, ...cuerpo });
      vuelo.current[h.id] -= 1;
      if (!vuelo.current[h.id]) {                // la última en llegar fija la cifra buena
        delete optimo.current[h.id];
        guardar(h.id, { value_today: r.value, done_today: r.done });
        quitar(h.id, "value");
        refrescar("today", "habits");
      }
    } catch (e) {
      vuelo.current[h.id] -= 1;
      if (!vuelo.current[h.id]) { delete optimo.current[h.id]; quitar(h.id, "value"); refrescar("today", "habits"); }
      avisar(e?.humano || "No se pudo guardar la cifra.");
    } finally {
      if (!vuelo.current[h.id]) delete vuelo.current[h.id];
    }
  }
  function sumar(h, cantidad) {
    const base = h.id in optimo.current ? optimo.current[h.id] : valor(h);
    const nuevo = Math.max(0, Math.round(((base || 0) + cantidad) * 1000) / 1000);
    vibrar(8);
    return cifra(h, { add: cantidad }, nuevo);
  }
  const fijarValor = (h, v) => cifra(h, { value: v }, v);
  function responder(h, v) {
    vibrar();
    return v === null ? cifra(h, { clear: true }, null) : cifra(h, { value: v }, v);
  }
  return { hecho, valor, ocupado, marcar, sumar, fijarValor, responder };
}

export function Casilla({ ok, onClick, size = 26, apagada, label }) {
  return (
    <button onClick={onClick} aria-label={label || (ok ? "Desmarcar" : "Marcar hecho")} aria-pressed={ok}
      data-estrella={ok ? "hecho" : "marcar"}
      style={{ width: size, height: size, borderRadius: 8, flexShrink: 0, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: ok ? GRAD.gold : "transparent", boxShadow: ok ? GLOW.gold : "none",
        outline: ok ? "none" : `2px solid ${C.sepia}`, outlineOffset: -2,
        opacity: apagada ? 0.7 : 1, transition: "background .2s, box-shadow .2s" }}>
      {ok && <Check size={size * 0.58} color={C.cream} strokeWidth={3} />}
    </button>
  );
}

export function FilaMetrica({ h, valor, onSumar, onFijar, ultima }) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const v = valor ?? 0;
  const pct = h.target ? Math.max(0, Math.min(1, v / h.target)) : (v > 0 ? 1 : 0);
  const ok = h.target ? v >= h.target : v > 0;
  const paso = pasoDe(h);
  function abrir() { setTexto(valor != null ? String(valor).replace(".", ",") : ""); setEscribiendo(true); }
  function confirmar() {
    const n = leerNumero(texto);
    if (n !== null) onFijar(n);
    setEscribiendo(false);
  }
  return (
    <div style={{ padding: "12px 0", borderBottom: ultima ? "none" : `1px solid ${C.paperEdge}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk }}>{h.title}</span>
            {escribiendo ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input autoFocus inputMode="decimal" value={texto} aria-label={`Cifra de ${h.title}`}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmar(); if (e.key === "Escape") setEscribiendo(false); }}
                  style={{ width: 82, background: C.inkSoft, border: `1px solid ${C.olive}`, borderRadius: 8,
                    padding: "4px 8px", color: C.sepiaInk, fontFamily: FONT_BODY, fontSize: 14, outline: "none" }} />
                <button onClick={confirmar} style={miniBtn(true)}>OK</button>
              </span>
            ) : (
              <button onClick={abrir} aria-label={`Escribir la cifra de ${h.title}`} title="Toca para escribir la cifra"
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: FONT_BODY,
                  fontSize: 13, color: ok ? C.olive : C.sepia, fontWeight: ok ? 700 : 500,
                  textDecoration: "underline dotted", textUnderlineOffset: 3 }}>
                {lineaMetrica(h, valor)}{ok ? " ✓" : ""}
              </button>
            )}
          </div>
          <div style={{ height: 6, borderRadius: 99, background: C.inkSoft, marginTop: 8, overflow: "hidden" }}
            role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
            <div style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 99,
              background: ok ? GRAD.gold : "linear-gradient(90deg, #6FB7E8, #A7D8FF)",
              boxShadow: ok ? GLOW.gold : "0 0 8px rgba(120,190,255,.45)", transition: "width .35s ease" }} />
          </div>
        </div>
        {!escribiendo && (
          <>
            <button onClick={() => onSumar(-paso)} disabled={!v} aria-label={`Restar ${num(paso)} ${h.unit || ""}`}
              style={{ ...miniBtn(false), width: 32, padding: 0, opacity: v ? 1 : 0.35 }}>
              <Minus size={14} />
            </button>
            <button onClick={() => onSumar(paso)} data-onda="" aria-label={`Sumar ${num(paso)} ${h.unit || ""}`}
              style={{ ...miniBtn(true), display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
              <Plus size={13} strokeWidth={3} />{num(paso)}{h.unit && h.unit.length <= 3 ? ` ${h.unit}` : ""}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function TarjetaPrincipio({ h, valor, onResponder, etiqueta = "El principio de hoy" }) {
  const hora = new Date().getHours();
  const noche = hora >= 19 || hora < 4;
  const [ya, setYa] = useState(false);
  const respuesta = RESPUESTAS.find((r) => r.v === valor);
  return (
    <div style={{ position: "relative", marginBottom: 14, padding: "14px 16px", borderRadius: 16,
      background: "linear-gradient(150deg, rgba(183,156,255,.12), rgba(30,59,107,.35) 70%)",
      border: "1px solid rgba(183,156,255,.32)" }}>
      <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase",
        fontWeight: 700, color: "#CDBBFF", marginBottom: 6 }}>{etiqueta}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: C.sepiaInk, fontWeight: 600 }}>{h.title}</div>
      {h.description && (
        <p style={{ margin: "4px 0 0", fontFamily: FONT_DISPLAY, fontStyle: "italic", fontSize: 15,
          color: C.sepiaInk, opacity: 0.85, lineHeight: 1.45 }}>{h.description}</p>
      )}
      {respuesta ? (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, fontFamily: FONT_BODY, fontSize: 13 }}>
          <span style={{ color: respuesta.v === 1 ? C.olive : C.sepia, fontWeight: 600 }}>
            {respuesta.v === 1 ? "✦ " : ""}{respuesta.dicho}
          </span>
          <button onClick={() => onResponder(null)} style={enlace}>cambiar</button>
        </div>
      ) : noche || ya ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Moon size={14} color="#CDBBFF" /> ¿Lo viviste hoy?
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label={`¿Viviste «${h.title}» hoy?`}>
            {RESPUESTAS.map((r) => (
              <button key={r.v} onClick={() => onResponder(r.v)} data-onda=""
                style={{ ...miniBtn(r.v === 1), padding: "8px 16px", fontSize: 13.5 }}>{r.txt}</button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10, fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia }}>
          Esta noche te preguntaré si lo viviste.{" "}
          <button onClick={() => setYa(true)} style={enlace}>Responder ya</button>
        </div>
      )}
    </div>
  );
}

/** «3,5» · «3.5» · «10.000» · «10000» → número (o null si no se entiende). */
export function leerNumero(t) {
  let s = String(t || "").trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const enlace = { background: "none", border: "none", padding: 0, cursor: "pointer", color: C.sepia,
  fontFamily: FONT_BODY, fontSize: 12.5, textDecoration: "underline", textUnderlineOffset: 3 };

export function miniBtn(dorado) {
  return {
    height: 32, padding: "0 11px", borderRadius: 999, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5,
    fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    border: dorado ? "1px solid rgba(232,184,75,.45)" : `1px solid ${C.paperEdge}`,
    background: dorado ? "rgba(232,184,75,.14)" : C.inkSoft, color: dorado ? "#F2D58A" : C.sepiaInk,
  };
}
