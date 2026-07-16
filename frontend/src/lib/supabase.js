/*
 * lib/supabase.js
 * ───────────────
 * Crea el cliente de Supabase, que es lo que gestiona el LOGIN en el frontend.
 * Cuando alguien inicia sesión, Supabase guarda su token y nos lo da cuando
 * lo pidamos (lo usaremos para hablar con nuestro backend).
 *
 * Las dos claves vienen del archivo .env del frontend. Son las claves PÚBLICAS
 * de Supabase (la "anon key"), que pueden ir en el navegador sin problema —
 * no son las secretas del backend.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey);
