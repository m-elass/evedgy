/*
 * components/muscleMap.js
 * ───────────────────────
 * Traduce los ids de músculo del backend (español) a los "slugs" que entiende
 * las regiones del cuerpo dibujable. Un músculo del backend puede
 * mapear a varios slugs (p. ej. "hombros" → deltoides frontal y trasero).
 *
 * Regiones del cuerpo (las usa MuscleFigure para agrupar músculos):
 *   chest, biceps, triceps, forearm, front-deltoids, back-deltoids,
 *   abs, obliques, trapezius, upper-back, lower-back,
 *   quadriceps, hamstring, gluteal, calves, adductor, abductors, neck, head
 */
export const MUSCLE_TO_SLUGS = {
  pecho:      ["chest"],
  hombros:      ["front-deltoids"],   // deltoides anterior y lateral
  hombros_post: ["back-deltoids"],    // deltoides posterior
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
  aductores:  ["adductor"],
  abductores: ["abductors"],
  cuello:     ["neck"],
};


/*
 * De MÚSCULO FINO a REGIÓN del cuerpo dibujable.
 * Generado desde app/muscles.py del backend: los ejercicios guardan anatomía
 * fina ("dorsal_ancho", "delt_post", "soleo") pero la figura solo sabe pintar
 * regiones, así que traducimos aquí. 66 músculos.
 */
export const FINE_TO_REGION = {
  pec_sup: "pecho",
  pec_med: "pecho",
  pec_inf: "pecho",
  pec_menor: "pecho",
  serrato: "oblicuos",
  delt_ant: "hombros",
  delt_lat: "hombros",
  delt_post: "hombros_post",
  supraesp: "hombros",
  infraesp: "hombros_post",
  redondo_menor: "hombros_post",
  subescap: "hombros",
  coracobraq: "hombros",
  biceps_largo: "biceps",
  biceps_corto: "biceps",
  braquial: "biceps",
  tri_larga: "triceps",
  tri_lat: "triceps",
  tri_med: "triceps",
  anconeo: "triceps",
  braquiorr: "antebrazo",
  flex_ante: "antebrazo",
  ext_ante: "antebrazo",
  pronador: "antebrazo",
  supinador: "antebrazo",
  dorsal_ancho: "dorsal",
  dorsal_inf: "dorsal",
  redondo_mayor: "dorsal",
  romboides: "dorsal",
  trap_sup: "trapecio",
  trap_med: "trapecio",
  trap_inf: "trapecio",
  elevador: "trapecio",
  erectores: "lumbar",
  multifidos: "lumbar",
  cuadrado_l: "lumbar",
  transverso: "abdomen",
  recto_abd: "abdomen",
  recto_abd_sup: "abdomen",
  recto_abd_inf: "abdomen",
  oblicuo_ext: "oblicuos",
  oblicuo_int: "oblicuos",
  psoas: "cuadriceps",
  sartorio: "cuadriceps",
  gluteo_mayor: "gluteos",
  gluteo_medio: "abductores",
  gluteo_menor: "abductores",
  tfl: "abductores",
  rotadores_cad: "gluteos",
  recto_fem: "cuadriceps",
  vastos: "cuadriceps",
  aductor_mayor: "aductores",
  aductores_c: "aductores",
  gracil: "aductores",
  isq_bf_larga: "femoral",
  isq_bf_corta: "femoral",
  isq_semitend: "femoral",
  isq_semimem: "femoral",
  gastro_med: "gemelos",
  gastro_lat: "gemelos",
  soleo: "gemelos",
  tibial_ant: "gemelos",
  tibial_post: "gemelos",
  peroneos: "gemelos",
  ecom: "cuello",
  cervical_post: "cuello",
};

// Convierte ids del backend (finos o de región) en slugs de la librería.
export function toSlugs(ids = []) {
  const out = [];
  for (const raw of ids) {
    const id = MUSCLE_TO_SLUGS[raw] ? raw : (FINE_TO_REGION[raw] || raw);
    for (const slug of (MUSCLE_TO_SLUGS[id] || [])) {
      if (!out.includes(slug)) out.push(slug);
    }
  }
  return out;
}
