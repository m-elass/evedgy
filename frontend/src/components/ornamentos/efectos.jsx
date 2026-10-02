/*
 * ornamentos/efectos.jsx — las interacciones ornamentales y la ceremonia.
 * ─────────────────────────────────────────────────────────────────────
 * - CapaEfectos: una capa fija, sin toques, donde nacen los efectos breves:
 *     · ondas concéntricas al pulsar algo importante ([data-onda]);
 *     · una estrella líquida al completar algo ([data-estrella="marcar"]);
 *     · el «cruce de la estrella» al entrar en una sección desde el Mar.
 *   Escucha en fase de captura, así no hay que tocar ningún manejador de la app:
 *   basta con un atributo data-* en el botón.
 * - La ceremonia «agua que dibuja» se pide una sola vez por entrada en una
 *   sección (nunca se repite al recargar datos ni al volver a renderizar).
 * - OrbitaDelMar: la órbita que rodea la estrella dorada de volver al Mar.
 */
import React, { useEffect, useState } from "react";
import { ConcentricRipple, LiquidStar } from "./Ornamentos";
import { destello, arco, estrella4 } from "./geometria";

/* ── la ceremonia: anclada al momento de entrar ──
 * La ceremonia sigue el reloj de la ENTRADA, no el del montaje: si la cabecera
 * se monta dos veces (primero la de «cargando» y luego la de verdad), la segunda
 * continúa justo donde iba la primera (retraso negativo), y si ya terminó se
 * muestra quieta. Así nunca se repite ni salta al llegar los datos. */
let entrada = { seccion: null, n: 0, t: 0, desde: "inicio" };
const ahora = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const DURA = 1.55;   // lo que dura la ceremonia completa (s)

export function marcarEntrada(seccion, desde = "corriente") {
  entrada = { seccion, n: entrada.n + 1, t: ahora(), desde };
}
export function entradaActual() { return entrada; }
/* Devuelve el retraso (s, puede ser negativo) con que debe empezar la ceremonia,
   o null si no toca (otra sección, ya terminó o «reducir movimiento»). */
export function pedirCeremonia(seccion) {
  if (typeof window === "undefined") return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return null;
  if (entrada.n === 0) entrada = { seccion, n: 1, t: ahora(), desde: "inicio" };
  if (entrada.seccion !== seccion) return null;
  const base = entrada.desde === "mar" ? 0.32 : 0.12;   // si se viene del Mar, espera al zoom
  const retraso = base - (ahora() - entrada.t) / 1000;
  if (retraso < -DURA) return null;
  return Math.round(retraso * 1000) / 1000;
}

/* ── la capa de efectos ── */
let lanzar = null;
let ultimo = { x: null, y: null };
const DURACION = { onda: 900, estrella: 1100, cruce: 1150 };

export function cruzarEstrella() {
  const x = ultimo.x ?? window.innerWidth / 2, y = ultimo.y ?? window.innerHeight * 0.42;
  lanzar?.("cruce", x, y);
}

export function CapaEfectos() {
  const [efectos, setEfectos] = useState([]);
  useEffect(() => {
    let n = 0;
    lanzar = (tipo, x, y) => {
      const id = ++n;
      setEfectos((l) => [...l.slice(-5), { id, tipo, x, y }]);
      setTimeout(() => setEfectos((l) => l.filter((e) => e.id !== id)), DURACION[tipo] || 900);
    };
    const abajo = (e) => {
      ultimo = { x: e.clientX, y: e.clientY };
      const el = e.target?.closest?.("[data-onda]");
      if (el && !el.disabled) lanzar("onda", e.clientX, e.clientY);
    };
    const clic = (e) => {
      const el = e.target?.closest?.('[data-estrella="marcar"]');
      if (!el || el.disabled) return;
      const r = el.getBoundingClientRect();
      lanzar("estrella", r.left + r.width / 2, r.top + r.height / 2);
    };
    document.addEventListener("pointerdown", abajo, true);
    document.addEventListener("click", clic, true);
    return () => {
      document.removeEventListener("pointerdown", abajo, true);
      document.removeEventListener("click", clic, true);
      lanzar = null;
    };
  }, []);
  return (
    <div className="orn-efectos" aria-hidden="true">
      {efectos.map((e) => (
        <span key={e.id} className={"orn-efecto orn-efecto-" + e.tipo} style={{ left: e.x, top: e.y }}>
          {e.tipo === "onda" && <ConcentricRipple size={150} />}
          {e.tipo === "estrella" && <>
            <ConcentricRipple size={110} className="orn-ondas-suaves" />
            <LiquidStar variante="pequena" size={46} className="orn-estallido" oro />
            <i className="orn-chispa-vuela a" /><i className="orn-chispa-vuela b" /><i className="orn-chispa-vuela c" />
          </>}
          {e.tipo === "cruce" && <>
            <span className="orn-cruce-luz" />
            <ConcentricRipple size={260} className="orn-cruce-ondas" />
            <LiquidStar variante="principal" size={120} className="orn-cruce-estrella" oro />
          </>}
        </span>
      ))}
    </div>
  );
}

/* ── la órbita alrededor de la estrella dorada (une cada página con el Mar) ──
 * Dos mitades: la de atrás pasa por detrás del botón y la de delante por
 * delante, como un anillo alrededor de un astro. Sin toques: el botón sigue
 * funcionando exactamente igual. */
export function OrbitaDelMar() {
  const atras = arco(0, 0, 41, 11, PI_(1.02), PI_(1.98), -12, 26);
  const delante = arco(0, 0, 41, 11, PI_(0.04), PI_(0.96), -12, 26);
  return (
    <>
      <svg className="orn orn-orbita-mar atras" viewBox="-48 -24 96 48" width="96" height="48" aria-hidden="true" focusable="false">
        <path d={atras} className="orn-oro" strokeWidth=".7" opacity=".55" />
        <path d={arco(0, 0, 36, 8, PI_(1.1), PI_(1.7), -12, 16)} className="orn-hielo" strokeWidth=".5" opacity=".45" />
        <path d={destello(-30, -6, 3, 1.3, 0.86)} className="orn-relleno-luz" opacity=".85" />
      </svg>
      <svg className="orn orn-orbita-mar delante" viewBox="-48 -24 96 48" width="96" height="48" aria-hidden="true" focusable="false">
        <path d={delante} className="orn-oro" strokeWidth=".75" opacity=".7" />
        <path d={estrella4(37, 1, 3, 4.4, 0.85)} className="orn-relleno-oro" />
      </svg>
    </>
  );
}
const PI_ = (k) => Math.PI * k;
