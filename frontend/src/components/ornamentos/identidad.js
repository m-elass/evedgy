/*
 * ornamentos/identidad.js — la identidad de cada sección dentro del sistema.
 * ─────────────────────────────────────────────────────────────────────────
 * Todas las páginas hablan el mismo idioma (agua → cristal → glifo →
 * ornamentación → conocimiento), pero cada constelación tiene su glifo, su
 * reliquia de fondo, su color secundario, su composición y su comportamiento.
 * Las zonas son las mismas constelaciones del Mar de estrellas:
 *   Hoy = la Rosa Astral · Cuerpo = el Dragón · Saber = el Ojo ·
 *   Hacer = la Flecha Alada · Mente = la Luna y la Pluma · Vida = las Hojas ·
 *   Ajustes = el Instrumento.
 */

export const ZONAS = {
  hoy:     { figura: "La Rosa Astral",     glifo: "hoy",     reliquia: "rosa",        polvo: "titila",  lado: "der" },
  cuerpo:  { figura: "El Dragón",          glifo: "cuerpo",  reliquia: "astrolabio",  polvo: "asciende", lado: "der" },
  saber:   { figura: "El Ojo",             glifo: "saber",   reliquia: "ojo",         polvo: "orbita",  lado: "izq" },
  hacer:   { figura: "La Flecha Alada",    glifo: "hacer",   reliquia: "flecha",      polvo: "impulso", lado: "izq" },
  mente:   { figura: "La Luna y la Pluma", glifo: "mente",   reliquia: "corona",      polvo: "titila",  lado: "der" },
  vida:    { figura: "Las Hojas",          glifo: "vida",    reliquia: "hojas",       polvo: "ondea",   lado: "der" },
  ajustes: { figura: "El Instrumento",     glifo: "ajustes", reliquia: null,          polvo: "titila",  lado: "der" },
};

/* Sección → zona, glifo propio (si difiere del de su zona) y piezas especiales. */
export const SECCIONES = {
  today:       { zona: "hoy",    nucleo: true },
  training:    { zona: "cuerpo", nucleo: true },
  exercises:   { zona: "cuerpo", motivo: "cristales" },
  sleep:       { zona: "cuerpo", glifo: "luna", luna: true, motivo: "luna" },
  records:     { zona: "cuerpo", motivo: "estrellas" },
  ranks:       { zona: "cuerpo", motivo: "sello" },
  physique:    { zona: "cuerpo", motivo: "arco" },
  anatomy:     { zona: "cuerpo", motivo: "orbita" },
  daily:       { zona: "hacer",  glifo: "habitos", nucleo: true },
  todo:        { zona: "hacer",  motivo: "cristales" },
  notes:       { zona: "mente",  nucleo: true },
  write:       { zona: "mente",  motivo: "arco" },
  dailyletter: { zona: "mente",  luna: true, motivo: "luna" },
  readings:    { zona: "saber",  nucleo: true },
  toread:      { zona: "saber",  motivo: "cristales" },
  towatch:     { zona: "saber",  motivo: "orbita" },
  tolearn:     { zona: "saber",  motivo: "estrellas" },
  quotes:      { zona: "saber",  motivo: "gotas" },
  goals:       { zona: "vida",   nucleo: true },
  values:      { zona: "vida",   motivo: "sello" },
  reviews:     { zona: "vida",   motivo: "orbita" },
  skills:      { zona: "vida",   motivo: "ninguno" },   // conserva su propio HUD «Sistema»
  decisions:   { zona: "vida",   motivo: "cristales" },
  letters:     { zona: "vida",   motivo: "luna" },
  friends:     { zona: "vida",   motivo: "estrellas" },
  settings:    { zona: "ajustes", motivo: "ninguno" },
  theme:       { zona: "ajustes", motivo: "ninguno" },
};

/* Todo lo que el sistema necesita saber de una sección. */
export function identidad(seccion) {
  const s = SECCIONES[seccion] || { zona: "ajustes" };
  const z = ZONAS[s.zona] || ZONAS.ajustes;
  // posición en su constelación: varía la composición entre hermanas sin copiarlas
  const hermanas = Object.keys(SECCIONES).filter((k) => SECCIONES[k].zona === s.zona);
  const orden = Math.max(0, hermanas.indexOf(seccion));
  return {
    seccion, zona: s.zona, glifo: s.glifo || z.glifo, reliquia: z.reliquia, nucleo: !!s.nucleo,
    luna: !!s.luna, motivo: s.motivo || "ninguno", polvo: z.polvo, lado: z.lado, orden, figura: z.figura,
  };
}
