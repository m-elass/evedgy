/*
 * lib/toast.js — AVISOS BREVES
 * Un aviso que aparece abajo unos segundos («No se ha guardado: sin conexión»).
 * Cualquier parte de la app puede lanzar uno con avisar(texto).
 */
const oyentes = new Set();
let n = 0;

export function avisar(texto, tipo = "error") {
  const aviso = { id: ++n, texto, tipo };
  oyentes.forEach((f) => f(aviso));
}

export function escucharAvisos(f) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}
