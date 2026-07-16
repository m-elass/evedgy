/*
 * lib/themeGenerator.js
 * ─────────────────────
 * La parte "atrevida": el usuario escribe unas palabras ("dorados, azules de
 * agua, etereo") y esto devuelve un TEMA con la forma de theme.js.
 *
 * Cómo: le pedimos a un modelo de Anthropic que actúe como diseñador y nos
 * devuelva SOLO un JSON con la paleta de roles. Luego lo validamos con
 * sanitizeTheme (que rellena cualquier rol que falte o venga mal).
 *
 * La llamada va al BACKEND (no directamente a Anthropic desde el navegador),
 * porque la clave de Anthropic es secreta y debe vivir en el servidor. El
 * backend expone /theme/generate; aquí solo lo llamamos.
 */
import { api } from "./api";
import { sanitizeTheme } from "./theme";

export async function generateTheme(prompt) {
  // El backend recibe las palabras, llama a Anthropic y devuelve el JSON del tema.
  const raw = await api.generateTheme({ prompt });
  return sanitizeTheme(raw);
}
