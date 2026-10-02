/*
 * lib/useApi.jsx — LEER DATOS SIN QUE LA PANTALLA SE VACÍE NUNCA
 * ──────────────────────────────────────────────────────────────
 * Sustituye al antiguo patrón
 *     try { setItems(await api.x()) } catch { setItems([]) }
 * que convertía cualquier fallo en «no tienes nada». Ahora:
 *
 *     const { data, gate, reload } = useApi("notes", api.listNotes);
 *     if (gate) return gate;     // cargando (primera vez) o error con «Reintentar»
 *
 * · Si hay datos guardados, se pintan al instante y se refrescan por detrás.
 * · Si falla y ya había datos, se siguen viendo (y arriba sale un aviso).
 * · Si falla y no había nada, se dice qué pasó y se ofrece reintentar.
 */
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, WifiOff } from "lucide-react";
import { useUid } from "./session";
import { C, FONT_BODY, FONT_DISPLAY } from "./theme";
import { Loading } from "../components/ui";

export function useApi(recurso, fn, { params = [], enabled = true, staleTime, refetchInterval } = {}) {
  const uid = useUid();
  const q = useQuery({
    queryKey: ["u", uid, recurso, ...params],
    queryFn: () => fn(...params),
    enabled: !!uid && enabled,
    staleTime,
    refetchInterval,
  });
  const gate = q.data !== undefined ? null
    : q.isError ? <FalloCarga error={q.error} onRetry={() => q.refetch()} />
    : <Loading />;
  return { data: q.data, gate, reload: () => q.refetch(), q };
}

/** Marca recursos como «viejos» para que se vuelvan a pedir (tras una escritura). */
export function useRefrescar() {
  const uid = useUid();
  const qc = useQueryClient();
  return (...recursos) =>
    Promise.all(recursos.map((r) => qc.invalidateQueries({ queryKey: ["u", uid, r] })));
}

/** Escribe directamente en la caché algo que el servidor YA ha confirmado. */
export function useFijarCache() {
  const uid = useUid();
  const qc = useQueryClient();
  return (recurso, params, actualizar) => qc.setQueryData(["u", uid, recurso, ...params], actualizar);
}

export function FalloCarga({ error, onRetry }) {
  const sinRed = error?.code === "red" || error?.code === "timeout";
  return (
    <div role="alert" style={{ border: `1.5px dashed ${C.paperEdge}`, borderRadius: 18,
      padding: "26px 22px", textAlign: "center" }}>
      <WifiOff size={22} color={C.sepia} style={{ marginBottom: 8 }} />
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: C.sepiaInk, fontWeight: 600, marginBottom: 6 }}>
        {sinRed ? "No llego al servidor" : "No se pudo cargar"}
      </div>
      <p style={{ margin: "0 0 14px", fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.55 }}>
        {error?.humano || "Algo ha fallado."} Tus datos siguen a salvo: esto es solo la conexión.
      </p>
      <button onClick={onRetry} style={{ display: "inline-flex", alignItems: "center", gap: 7,
        background: "transparent", border: `1px solid ${C.olive}`, color: C.olive, borderRadius: 12,
        padding: "9px 16px", fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
        <RefreshCw size={14} /> Reintentar
      </button>
    </div>
  );
}
