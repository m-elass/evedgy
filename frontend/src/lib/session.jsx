/*
 * lib/session.jsx — QUIÉN ESTÁ DENTRO, SIN ESPERAR A LA RED
 * ────────────────────────────────────────────────────────
 * Antes la app mostraba una pantalla negra hasta que Supabase confirmaba la
 * sesión, y si el token había caducado eso exigía ir a la red (lento, o
 * imposible sin conexión). Ahora se lee la sesión guardada en el móvil al
 * instante y se pinta con los datos guardados; la confirmación llega detrás.
 *
 * Solo se vuelve a la pantalla de entrar si Supabase dice de verdad que no
 * hay sesión (o se cierra sesión). Si la renovación falla por falta de red,
 * se sigue dentro, con lo guardado.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { purgarCache } from "./queryClient";

const SessionCtx = createContext(undefined);
const PISTA = "tc:uid";

/** La sesión que supabase-js guardó en este móvil (sin tocar la red). */
function sesionGuardada() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      const v = JSON.parse(localStorage.getItem(k) || "null");
      const s = v?.currentSession || v;
      if (s?.user?.id && s?.refresh_token) return { user: { id: s.user.id }, provisional: true };
    }
  } catch { /* almacenamiento no disponible */ }
  return undefined;
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(sesionGuardada);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!vivo) return;
      if (data?.session) setSession(data.session);
      else if (!error) setSession(null);           // de verdad no hay sesión
      // con error (casi siempre, sin red al renovar) se mantiene la guardada
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === "SIGNED_OUT") {
        purgarCache();
        try { localStorage.removeItem(PISTA); } catch { /* nada */ }
        setSession(null);
        return;
      }
      if (s?.user?.id) {
        try {
          const antes = localStorage.getItem(PISTA);
          if (antes && antes !== s.user.id) purgarCache();   // otra persona en este móvil
          localStorage.setItem(PISTA, s.user.id);
        } catch { /* nada */ }
        setSession(s);
      }
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, []);

  return <SessionCtx.Provider value={session}>{children}</SessionCtx.Provider>;
}

/** undefined = aún no se sabe · null = sin sesión · objeto = dentro */
export const useSession = () => useContext(SessionCtx);
export const useUid = () => useContext(SessionCtx)?.user?.id;
