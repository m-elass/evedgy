/*
 * lib/habitos.js — los cuatro tipos de hábito y cómo se cuentan en texto.
 * ───────────────────────────────────────────────────────────────────────
 * No todo lo que sostiene un día es igual:
 *   · Hábito            — una práctica con su tiempo (meditar 10 min).
 *   · Objetivo del día  — un bloque de trabajo largo (estudiar 90 min).
 *   · Métrica           — una cifra que se va sumando (agua 3,5 L).
 *   · Principio         — algo que marca el día («primero lo importante»): no se marca;
 *                         por la noche, «¿lo viviste?».
 */

export const TIPOS = [
  { id: "habito", nombre: "Hábito", plural: "Hábitos",
    desc: "Una práctica con su tiempo: meditar 10 min, leer 20 min." },
  { id: "bloque", nombre: "Objetivo del día", plural: "Objetivos del día",
    desc: "Un bloque de trabajo largo hacia una meta: estudiar 90 min, gimnasio 75 min." },
  { id: "metrica", nombre: "Métrica", plural: "Métricas",
    desc: "Una cifra que vas sumando durante el día: agua, proteína, pasos, sueño." },
  { id: "principio", nombre: "Principio", plural: "Principios",
    desc: "Algo que marca tus días, como «primero lo importante». No se marca: por la noche te pregunta si lo viviste." },
];
export const TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t]));

export const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
export const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const PRIORIDADES = [
  { id: 1, nombre: "Imprescindible", corto: "imprescindible" },
  { id: 2, nombre: "Importante", corto: "" },
  { id: 3, nombre: "Si da tiempo", corto: "si da tiempo" },
];
export const RESPUESTAS = [
  { v: 1, txt: "Sí", dicho: "Lo viviste" },
  { v: 0.5, txt: "A medias", dicho: "Lo viviste a medias" },
  { v: 0, txt: "No", dicho: "Hoy no lo viviste" },
];

/** Número a la española, sin decimales de más: 3,5 · 10.000 */
export function num(n, dec = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "0";
  return Number(n).toLocaleString("es-ES", { maximumFractionDigits: dec, useGrouping: "always" });
}

/** Minutos legibles: «45 min», «1 h 30», «4 h». */
export function tiempo(min) {
  const m = Math.round(min || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

export function frecuencia(h) {
  if (h.days && h.days.length) return h.days.map((d) => DIAS[d]).join("·");
  if ((h.per_week || 7) >= 7) return "cada día";
  return `${h.per_week}× semana`;
}

export const esSemanal = (h) => (h.days && h.days.length) || (h.per_week || 7) < 7;

/** «25 min · cada día · imprescindible» */
export function lineaHabito(h) {
  const p = PRIORIDADES.find((x) => x.id === h.priority);
  return [h.minutes > 0 ? `${h.minutes} min` : null, frecuencia(h), p?.corto || null,
    h.link === "entreno" ? "se marca al entrenar" : null].filter(Boolean).join(" · ");
}

/** La cifra de una métrica: «1,75 / 3,5 L» */
export function lineaMetrica(h, valor) {
  const v = valor ?? h.value_today ?? 0;
  const unidad = h.unit ? ` ${h.unit}` : "";
  return h.target ? `${num(v)} / ${num(h.target)}${unidad}` : `${num(v)}${unidad}`;
}

export function pasoDe(h) {
  if (h.step && h.step > 0) return h.step;
  const t = h.target || 1;
  return t >= 1000 ? 1000 : t >= 100 ? 10 : t >= 10 ? 1 : 0.25;
}

/** Aplica cambios a un hábito allí donde aparezca en la respuesta de /today (lista y plan). */
export function cambiarEnHoy(d, id, cambios) {
  if (!d) return d;
  const f = (h) => (h && h.id === id ? { ...h, ...cambios } : h);
  const out = { ...d, habits: (d.habits || []).map(f) };
  if (d.plan) {
    out.plan = {
      ...d.plan,
      items: (d.plan.items || []).map(f), extras: (d.plan.extras || []).map(f),
      others: (d.plan.others || []).map(f), metrics: (d.plan.metrics || []).map(f),
      principle: f(d.plan.principle),
    };
  }
  return out;
}
