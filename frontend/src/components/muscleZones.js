/*
 * components/muscleZones.js — DÓNDE VIVE CADA MÚSCULO EN EL DIBUJO
 * ────────────────────────────────────────────────────────────────
 * El arte anatómico trae regiones amplias ("pecho", "tríceps"). Nuestra app
 * distingue mucho más fino: la porción clavicular del pectoral, la cabeza
 * larga del tríceps, el sóleo frente a los gemelos…
 *
 * La solución: cada músculo fino apunta a una región del dibujo Y a una ZONA
 * dentro de ella, expresada en fracciones de su caja (0 = borde superior o
 * interno, 1 = inferior o externo). Al pintar, la región se recorta a esa
 * zona, así que se ilumina exactamente la parte que trabaja el ejercicio y el
 * resto del músculo queda en reposo.
 *
 * Formato: [vista, región, [x0, y0, x1, y1]]  ·  sin zona = región entera
 *   vista: "a" anterior (frente) · "p" posterior (espalda)
 */
export const ZONES = {
  // ── Pecho ───────────────────────────────────────────────────
  pec_sup:      [["a", "chest", [0, 0, 1, 0.46]]],
  pec_med:      [["a", "chest", [0, 0.34, 1, 0.79]]],
  pec_inf:      [["a", "chest", [0, 0.72, 1, 1]]],
  pec_menor:    [["a", "chest", [0.18, 0.08, 0.82, 0.48]]],
  serrato:      [["a", "obliques", [0, 0, 1, 0.45]]],

  // ── Hombro ──────────────────────────────────────────────────
  delt_ant:     [["a", "deltoids", [0.38, 0, 1, 1]]],
  delt_lat:     [["a", "deltoids", [0, 0, 0.58, 1]]],
  delt_post:    [["p", "deltoids"]],
  supraesp:     [["p", "trapezius", [0.08, 0, 0.72, 0.22]]],
  infraesp:     [["p", "upper-back", [0, 0, 0.6, 0.3]]],
  redondo_menor:[["p", "upper-back", [0, 0.2, 0.5, 0.37]]],
  redondo_mayor:[["p", "upper-back", [0, 0.3, 0.55, 0.5]]],
  subescap:     [["p", "upper-back", [0.2, 0.04, 0.72, 0.3]]],

  // ── Brazo ───────────────────────────────────────────────────
  biceps_largo: [["a", "biceps", [0, 0, 0.56, 0.92]]],
  biceps_corto: [["a", "biceps", [0.44, 0, 1, 0.92]]],
  braquial:     [["a", "biceps", [0.1, 0.62, 1, 1]]],
  coracobraq:   [["a", "biceps", [0.3, 0, 1, 0.34]]],
  tri_larga:    [["p", "triceps", [0.44, 0, 1, 0.86]]],
  tri_lat:      [["p", "triceps", [0, 0, 0.5, 0.82]]],
  tri_med:      [["p", "triceps", [0.18, 0.6, 1, 1]]],
  anconeo:      [["p", "triceps", [0.3, 0.88, 1, 1]]],

  // ── Antebrazo ───────────────────────────────────────────────
  braquiorr:    [["a", "forearm", [0, 0, 0.62, 0.55]]],
  flex_ante:    [["a", "forearm", [0.32, 0.18, 1, 1]], ["p", "forearm", [0.42, 0, 1, 1]]],
  ext_ante:     [["p", "forearm", [0, 0, 0.58, 1]]],
  pronador:     [["a", "forearm", [0.36, 0.5, 1, 0.92]]],
  supinador:    [["a", "forearm", [0, 0.14, 0.6, 0.5]]],

  // ── Espalda ─────────────────────────────────────────────────
  dorsal_ancho: [["p", "upper-back", [0, 0.24, 1, 0.86]]],
  dorsal_inf:   [["p", "upper-back", [0.18, 0.74, 1, 1]]],
  romboides:    [["p", "upper-back", [0.44, 0.08, 1, 0.5]]],
  trap_sup:     [["p", "trapezius", [0, 0, 1, 0.4]], ["a", "trapezius"]],
  trap_med:     [["p", "trapezius", [0, 0.34, 1, 0.73]]],
  trap_inf:     [["p", "trapezius", [0, 0.68, 1, 1]]],
  elevador:     [["p", "trapezius", [0.55, 0, 1, 0.26]]],

  // ── Zona lumbar y core ──────────────────────────────────────
  erectores:    [["p", "lower-back", [0.34, 0, 1, 1]]],
  multifidos:   [["p", "lower-back", [0.55, 0.28, 1, 1]]],
  cuadrado_l:   [["p", "lower-back", [0, 0.08, 0.5, 0.82]]],
  recto_abd_sup:[["a", "abs", [0, 0, 1, 0.5]]],
  recto_abd_inf:[["a", "abs", [0, 0.5, 1, 1]]],
  transverso:   [["a", "abs", [0.08, 0.55, 0.92, 1]]],
  oblicuo_ext:  [["a", "obliques"]],
  oblicuo_int:  [["a", "obliques", [0.18, 0.34, 1, 1]]],

  // ── Cadera y muslo ──────────────────────────────────────────
  gluteo_mayor: [["p", "gluteal", [0, 0.2, 1, 1]]],
  gluteo_medio: [["p", "gluteal", [0, 0, 0.46, 0.36]]],
  gluteo_menor: [["p", "gluteal", [0.04, 0.04, 0.4, 0.28]]],
  rotadores_cad:[["p", "gluteal", [0.24, 0.14, 0.76, 0.46]]],
  tfl:          [["a", "quadriceps", [0, 0, 0.3, 0.18]]],
  psoas:        [["a", "quadriceps", [0.4, 0, 1, 0.16]]],
  recto_fem:    [["a", "quadriceps", [0.24, 0.04, 0.76, 0.86]]],
  vastos:       [["a", "quadriceps", [0, 0.08, 0.36, 0.92]],
                 ["a", "quadriceps", [0.62, 0.48, 1, 0.96]]],
  sartorio:     [["a", "quadriceps", [0.5, 0.04, 0.86, 1]]],
  aductor_mayor:[["a", "adductors", [0, 0.18, 1, 1]], ["p", "adductors"]],
  aductores_c:  [["a", "adductors", [0, 0, 1, 0.46]]],
  gracil:       [["a", "adductors", [0.54, 0.08, 1, 1]]],

  // ── Isquiosurales: los cuatro, por dentro y por fuera ────────
  isq_bf_larga: [["p", "hamstring", [0, 0, 0.5, 0.86]]],
  isq_bf_corta: [["p", "hamstring", [0, 0.54, 0.5, 1]]],
  isq_semitend: [["p", "hamstring", [0.5, 0, 1, 0.9]]],
  isq_semimem:  [["p", "hamstring", [0.58, 0.14, 1, 0.96]]],

  // ── Pierna baja ─────────────────────────────────────────────
  gastro_lat:   [["p", "calves", [0, 0, 0.5, 0.62]]],
  gastro_med:   [["p", "calves", [0.5, 0, 1, 0.62]]],
  soleo:        [["p", "calves", [0.08, 0.5, 0.92, 1]]],
  tibial_post:  [["p", "calves", [0.34, 0.34, 0.72, 0.82]]],
  tibial_ant:   [["a", "tibialis"]],
  peroneos:     [["a", "tibialis", [0, 0.08, 0.42, 0.92]]],

  // ── Cuello ──────────────────────────────────────────────────
  ecom:         [["a", "neck"]],
  cervical_post:[["p", "neck"]],
};

/* Nombre en español de cada región del dibujo, para el toque sobre el cuerpo */
export const REGION_NAMES = {
  chest: "Pecho", obliques: "Oblicuos", abs: "Abdomen", biceps: "Bíceps",
  triceps: "Tríceps", neck: "Cuello", trapezius: "Trapecio", deltoids: "Hombros",
  adductors: "Aductores", quadriceps: "Cuádriceps", tibialis: "Tibial anterior",
  calves: "Gemelos", forearm: "Antebrazo", "upper-back": "Espalda alta",
  "lower-back": "Lumbares", gluteal: "Glúteos", hamstring: "Femorales",
  knees: "Rodillas", hands: "Manos", ankles: "Tobillos", feet: "Pies",
  head: "Cabeza", hair: "Cabeza",
};
