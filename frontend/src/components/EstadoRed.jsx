/*
 * components/EstadoRed.jsx — EL AVISO DISCRETO DE CONEXIÓN
 * ────────────────────────────────────────────────────────
 * Cuando lo que ves viene de lo guardado en el móvil porque el servidor no
 * responde (o no hay red), una cápsula arriba lo dice. Así nunca parece que
 * los datos se hayan borrado, y sabes que lo nuevo aún no se ha sincronizado.
 * Si una actualización tarda (el servidor estaba dormido), lo indica también.
 */
import React, { useEffect, useState } from "react";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { CloudOff, RefreshCw } from "lucide-react";

function haceCuanto(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

export default function EstadoRed() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(onlineManager.isOnline());
  const [estado, setEstado] = useState({ fallo: null, lento: false });

  useEffect(() => onlineManager.subscribe(setOnline), []);

  useEffect(() => {
    let reloj = null;
    function revisar() {
      const activas = qc.getQueryCache().findAll({ type: "active" });
      const conFallo = activas.filter((q) => q.state.status === "error" && q.state.data !== undefined);
      const fallo = conFallo.length
        ? Math.min(...conFallo.map((q) => q.state.dataUpdatedAt || Date.now()))
        : null;
      const cargando = activas.some((q) => q.state.fetchStatus === "fetching" && q.state.data !== undefined);
      setEstado((e) => ({ ...e, fallo }));
      clearTimeout(reloj);
      if (cargando) reloj = setTimeout(() => setEstado((e) => ({ ...e, lento: true })), 2500);
      else setEstado((e) => ({ ...e, lento: false }));
    }
    const baja = qc.getQueryCache().subscribe(revisar);
    revisar();
    return () => { baja(); clearTimeout(reloj); };
  }, [qc]);

  let texto = null, icono = null;
  if (!online) { texto = "Sin conexión · ves lo guardado en tu móvil"; icono = <CloudOff size={13} />; }
  else if (estado.fallo) { texto = `No se pudo actualizar · datos de ${haceCuanto(estado.fallo)}`; icono = <CloudOff size={13} />; }
  else if (estado.lento) { texto = "Actualizando…"; icono = <RefreshCw size={12} className="spin" />; }
  if (!texto) return null;

  const reintentar = () => qc.refetchQueries({ type: "active" });
  return (
    <button onClick={reintentar} className="toast-in" aria-live="polite" style={{ position: "fixed",
      top: "calc(env(safe-area-inset-top, 0px) + 8px)",
      left: "50%", transform: "translateX(-50%)", zIndex: 55, display: "flex", alignItems: "center", gap: 7,
      padding: "7px 13px", borderRadius: 999, border: "1px solid rgba(169,194,230,.28)",
      background: "rgba(13,30,58,.88)", color: "#CFE0F5", backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)", fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12,
      cursor: "pointer", boxShadow: "0 8px 22px rgba(0,0,0,.35)", whiteSpace: "nowrap" }}>
      {icono}{texto}
    </button>
  );
}
