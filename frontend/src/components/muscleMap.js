/*
 * components/muscleMap.js
 * ───────────────────────
 * Traduce los ids de músculo del backend (español) a los "slugs" que entiende
 * la librería react-body-highlighter (inglés). Un músculo del backend puede
 * mapear a varios slugs (p. ej. "hombros" → deltoides frontal y trasero).
 *
 * Slugs válidos de react-body-highlighter (verificados de su documentación):
 *   chest, biceps, triceps, forearm, front-deltoids, back-deltoids,
 *   abs, obliques, trapezius, upper-back, lower-back,
 *   quadriceps, hamstring, gluteal, calves, adductor, abductors, neck, head
 */
export const MUSCLE_TO_SLUGS = {
  pecho:      ["chest"],
  hombros:    ["front-deltoids", "back-deltoids"],
  biceps:     ["biceps"],
  triceps:    ["triceps"],
  antebrazo:  ["forearm"],
  abdomen:    ["abs"],
  oblicuos:   ["obliques"],
  cuadriceps: ["quadriceps"],
  femoral:    ["hamstring"],
  gluteos:    ["gluteal"],
  gemelos:    ["calves"],
  trapecio:   ["trapezius"],
  dorsal:     ["upper-back"],
  lumbar:     ["lower-back"],
};

// Convierte una lista de ids del backend en slugs de la librería (sin duplicados).
export function toSlugs(ids = []) {
  const out = [];
  for (const id of ids) {
    for (const slug of (MUSCLE_TO_SLUGS[id] || [])) {
      if (!out.includes(slug)) out.push(slug);
    }
  }
  return out;
}
