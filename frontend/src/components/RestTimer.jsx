/*
 * components/RestTimer.jsx — EL DESCANSO, BIEN MEDIDO
 * ───────────────────────────────────────────────────
 * Un temporizador de gimnasio tiene un problema que casi ninguna web resuelve:
 * el móvil se bloquea o cambias de app, el navegador congela el JavaScript y
 * la cuenta se queda parada o el aviso nunca suena.
 *
 * Aquí se ataca con cuatro medidas, de la más fiable a la de refuerzo:
 *
 * 1. HORA DE FIN, NO CUENTA ATRÁS. No se descuenta un segundo cada segundo:
 *    se guarda el instante exacto en que termina y siempre se calcula
 *    "cuánto falta desde ahora". Aunque el navegador congele la app diez
 *    minutos, al volver el tiempo es correcto, nunca se retrasa.
 *
 * 2. PANTALLA DESPIERTA (Wake Lock). Mientras corre el descanso se pide al
 *    sistema que no apague la pantalla. Si no se apaga, el navegador no
 *    congela nada y el aviso suena a su hora. Es la medida que de verdad
 *    resuelve el caso "dejo el móvil en el banco y espero".
 *
 * 3. AVISO POR TRES VÍAS: pitido sintetizado, vibración y notificación del
 *    sistema. Cada plataforma soporta unas u otras; se disparan todas.
 *
 * 4. RECUPERACIÓN AL VOLVER. Si a pesar de todo el móvil congeló la app y el
 *    tiempo se cumplió mientras no mirabas, al volver se avisa igualmente y
 *    se indica cuánto hace que terminó.
 *
 * Límite honesto: con la pantalla apagada, iOS detiene por completo el
 * JavaScript de una web. Ninguna aplicación web puede sonar en ese estado sin
 * un servidor que envíe una notificación push. Por eso el Wake Lock es la
 * pieza importante: evita que se llegue a ese estado.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Bell, BellOff } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { HelpDot } from "./Help";
import { esNativo, programarAvisoDescanso, cancelarAvisoDescanso, vibrar } from "../lib/native";

const mmss = (n) => `${Math.floor(n / 60)}:${String(Math.max(0, n) % 60).padStart(2, "0")}`;

/* Pitido sintetizado: no necesita ningún archivo de audio. */
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tono = (freq, inicio, dur) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      vol.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      vol.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + inicio + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + dur);
      osc.connect(vol); vol.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + dur + 0.05);
    };
    tono(880, 0, 0.18); tono(1320, 0.22, 0.18); tono(880, 0.44, 0.26);
    setTimeout(() => ctx.close && ctx.close(), 1500);
  } catch { /* sin audio disponible: quedan vibración y notificación */ }
}

export default function RestTimer() {
  const [endAt, setEndAt] = useState(null);   // instante en que termina
  const [total, setTotal] = useState(0);
  const [left, setLeft] = useState(0);
  const [done, setDone] = useState(false);
  const [avisos, setAvisos] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted");
  const [nativo, setNativo] = useState(false);
  const lock = useRef(null);
  const yaAvisado = useRef(false);

  /* La pantalla no se apaga mientras dura el descanso */
  const pedirWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !lock.current) {
        lock.current = await navigator.wakeLock.request("screen");
        lock.current.addEventListener("release", () => { lock.current = null; });
      }
    } catch { /* el navegador puede negarlo; no es crítico */ }
  }, []);
  const soltarWakeLock = useCallback(() => {
    try { lock.current && lock.current.release(); } catch {}
    lock.current = null;
  }, []);

  const avisar = useCallback((retrasoSeg = 0) => {
    if (yaAvisado.current) return;
    yaAvisado.current = true;
    beep();
    vibrar(true);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Descanso terminado", {
          body: retrasoSeg > 5
            ? `Terminó hace ${mmss(Math.round(retrasoSeg))}. A por la siguiente serie.`
            : "A por la siguiente serie.",
          icon: "/icon-192.png", badge: "/icon-192.png", tag: "descanso",
        });
      }
    } catch {}
  }, []);

  /* Único reloj: recalcula desde la hora de fin, nunca descuenta a ciegas */
  useEffect(() => {
    if (!endAt) return;
    const tic = () => {
      const restante = Math.round((endAt - Date.now()) / 1000);
      setLeft(restante);
      if (restante <= 0) {
        avisar(-restante);
        setDone(true); setEndAt(null); soltarWakeLock();
      }
    };
    tic();
    const id = setInterval(tic, 250);
    return () => clearInterval(id);
  }, [endAt, avisar, soltarWakeLock]);

  /* Al volver a la app: recupera el wake lock o avisa si ya había terminado */
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      if (endAt) {
        if (Date.now() >= endAt) { avisar((Date.now() - endAt) / 1000); setDone(true); setEndAt(null); }
        else pedirWakeLock();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [endAt, avisar, pedirWakeLock]);

  useEffect(() => () => soltarWakeLock(), [soltarWakeLock]);

  async function activarAvisos() {
    try {
      if (typeof Notification === "undefined") return;
      const p = await Notification.requestPermission();
      setAvisos(p === "granted");
    } catch {}
  }

  function arrancar(seg) {
    yaAvisado.current = false;
    setDone(false); setTotal(seg); setLeft(seg);
    setEndAt(Date.now() + seg * 1000);
    pedirWakeLock();
    // En la app nativa el aviso lo programa el sistema: suena aunque
    // bloquees el móvil o cierres la app.
    programarAvisoDescanso(seg).then((ok) => setNativo(ok));
    // Un toque de audio al arrancar desbloquea el sonido en móviles que lo
    // exigen tras una interacción; así el pitido final sí suena.
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) { const c = new Ctx(); c.resume && c.resume(); setTimeout(() => c.close && c.close(), 300); }
    } catch {}
  }
  function cancelar() {
    cancelarAvisoDescanso();
    setEndAt(null); setLeft(0); setTotal(0); setDone(false);
    yaAvisado.current = false; soltarWakeLock();
  }

  const corriendo = !!endAt && left > 0;

  return (
    <div style={{ background: C.inkSoft, border: `1px solid ${corriendo ? C.olive : C.paperEdge}`,
      borderRadius: 10, padding: "11px 14px", marginBottom: 14,
      animation: corriendo ? "pulseGold 2s ease infinite" : "none" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: corriendo || done ? 10 : 0 }}>
        <Timer size={14} color={corriendo ? C.olive : C.sepia} />
        <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em",
          textTransform: "uppercase", color: corriendo ? C.olive : C.sepia, fontWeight: 600, flex: 1 }}>
          {corriendo ? "Descansando" : done ? "¡A por la siguiente!" : "Descanso entre series"}
        </span>
        {corriendo && (
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: C.sepiaInk }}>
            {mmss(left)}
          </span>
        )}
        {!corriendo && <HelpDot topic="rest_timer" size={13} />}
      </div>

      {corriendo ? (
        <>
          <div style={{ height: 5, background: C.paperEdge, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ width: `${(left / total) * 100}%`, height: "100%", background: GRAD.gold,
              transition: "width .25s linear" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <button onClick={cancelar} style={{ background: "none", border: "none", color: C.sepia,
              fontFamily: FONT_BODY, fontSize: 11.5, cursor: "pointer", padding: "4px 0" }}>Cancelar</button>
            <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: nativo ? C.olive : C.sepia }}>
              {nativo ? "sonará aunque bloquees el móvil"
                : lock.current ? "pantalla activa" : "no cierres la app"}
            </span>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[60, 90, 120, 180].map((n) => (
              <button key={n} onClick={() => arrancar(n)} style={{ flex: 1, padding: "8px 0",
                borderRadius: 8, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600,
                background: C.paper, color: C.sepiaInk, border: `1px solid ${C.paperEdge}` }}>{mmss(n)}</button>
            ))}
          </div>
          {!esNativo() && typeof Notification !== "undefined" && !avisos && (
            <button onClick={activarAvisos} style={{ display: "inline-flex", alignItems: "center", gap: 7,
              marginTop: 9, background: "none", border: "none", color: C.sepia,
              fontFamily: FONT_BODY, fontSize: 11.5, cursor: "pointer", padding: 0 }}>
              <BellOff size={12} /> Activar aviso del sistema al terminar
            </button>
          )}
          {avisos && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 9,
              color: C.olive, fontFamily: FONT_BODY, fontSize: 11.5 }}>
              <Bell size={12} /> Avisos activados
            </div>
          )}
        </>
      )}
    </div>
  );
}
