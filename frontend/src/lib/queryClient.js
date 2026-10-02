/*
 * lib/queryClient.js — LA MEMORIA DE LA APP EN EL MÓVIL
 * ────────────────────────────────────────────────────
 * Por qué existe: antes, cada vez que entrabas en una estrella la app pedía
 * todo al servidor y esperaba. Si el servidor estaba dormido o fallaba, la
 * pantalla se quedaba vacía, como si tus datos se hubieran borrado.
 *
 * Ahora la app GUARDA en el móvil lo último que vio (IndexedDB) y lo pinta al
 * instante; mientras, pregunta al servidor por detrás y actualiza si hay algo
 * nuevo. Si el servidor falla, sigues viendo lo guardado y un aviso discreto.
 *
 * Reglas (acordadas en el consejo):
 *  · Solo se guardan LECTURAS y solo de una lista blanca: cartas, carta
 *    diaria, Escritura, revisiones, decisiones, valores, amigos y perfil
 *    nunca tocan el disco (viven solo en memoria mientras la app está abierta).
 *  · Las escrituras nunca se guardan ni se encolan: o las confirma el
 *    servidor, o fallan y lo dicen.
 *  · Todo se borra al cerrar sesión, al borrar la cuenta o si entra otra
 *    persona en el mismo móvil.
 *  · CACHE_VERSION: súbela cuando cambie la forma de una respuesta guardada;
 *    la caché vieja se descarta entera al abrir.
 */
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { createStore, get, set, del, clear } from "idb-keyval";

export const CACHE_VERSION = "2026-10-02";
const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;

// Lo que SÍ puede guardarse en el dispositivo (segundo elemento de la clave tras el usuario)
const GUARDABLE = new Set([
  "today", "daily", "training", "exercises", "routine", "sessions", "progress",
  "tasks", "sections", "sleep", "goals", "physique", "ranks", "records", "muscles",
  "notes", "readings", "knowledge", "quotes", "skills", "catalog", "summary",
]);

function reintentable(err) {
  if (!err) return false;
  if (err.code === "red" || err.code === "timeout") return true;
  return err.code === "http" && (err.status === 429 || err.status >= 500);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,          // pasados 30 s, se refresca por detrás al volver
      gcTime: SIETE_DIAS,            // igual que maxAge: si fuera menor, se perdería lo restaurado
      retry: (n, err) => n < 3 && reintentable(err),
      retryDelay: (n, err) => (err?.retryAfter ? err.retryAfter * 1000 : Math.min(1000 * 2 ** n, 8000)),
      refetchOnWindowFocus: true,    // al volver a la app, se pone al día
    },
    mutations: {
      retry: 0,                      // una escritura no se repite sola: podría duplicarse
      networkMode: "always",         // sin red, falla y lo dice (nada queda pendiente)
    },
  },
});

// Almacén propio en IndexedDB (asíncrono y con espacio de sobra)
const almacen = createStore("tu-cuaderno", "cache");
export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (k) => get(k, almacen),
    setItem: (k, v) => set(k, v, almacen),
    removeItem: (k) => del(k, almacen),
  },
  key: "tc-cache",
  throttleTime: 1500,
});

export const persistOptions = {
  persister,
  maxAge: SIETE_DIAS,
  buster: CACHE_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (q) =>
      q.state.status === "success" && q.queryKey[0] === "u" && GUARDABLE.has(q.queryKey[2]),
    shouldDehydrateMutation: () => false,
  },
};

/** Borra TODO lo guardado: memoria e IndexedDB. */
export async function purgarCache() {
  queryClient.clear();
  try {   // borradores de la carta diaria que no llegaron a sellarse
    Object.keys(localStorage).filter((k) => k.startsWith("tc:borrador:")).forEach((k) => localStorage.removeItem(k));
  } catch { /* sin almacenamiento */ }
  try { await persister.removeClient(); } catch { /* ya estaba vacío */ }
  try { await clear(almacen); } catch { /* IndexedDB no disponible */ }
}
