/*
 * components/Toaster.jsx — los avisos breves, encima de la estrella del mar.
 */
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { escucharAvisos } from "../lib/toast";
import { FontaineDiamond } from "./ornamentos";

export default function Toaster() {
  const [avisos, setAvisos] = useState([]);
  useEffect(() => escucharAvisos((a) => {
    setAvisos((prev) => [...prev.filter((x) => x.texto !== a.texto), a].slice(-3));
    setTimeout(() => setAvisos((prev) => prev.filter((x) => x.id !== a.id)), 4800);
  }), []);
  if (!avisos.length) return null;
  return (
    <div aria-live="polite" style={{ position: "fixed", left: 16, right: 16, bottom: 88, zIndex: 60,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
      {avisos.map((a) => (
        <div key={a.id} className="toast-in" style={{ position: "relative", maxWidth: 420, width: "100%", boxSizing: "border-box",
          display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 14,
          background: a.tipo === "ok" ? "rgba(22,52,40,.94)" : "rgba(58,24,30,.94)",
          border: `1px solid ${a.tipo === "ok" ? "rgba(120,220,170,.35)" : "rgba(255,150,150,.32)"}`,
          boxShadow: "0 12px 30px rgba(0,0,0,.45)", color: "#F4F7FF",
          fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13.5, lineHeight: 1.45 }}>
          {a.tipo === "ok" ? <CheckCircle2 size={17} color="#8FE3B9" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle size={17} color="#FFB4B4" style={{ flexShrink: 0, marginTop: 1 }} />}
          <span>{a.texto}</span>
          <FontaineDiamond variante="micro" size={13} className="orn-aviso-gema" />
        </div>
      ))}
    </div>
  );
}
