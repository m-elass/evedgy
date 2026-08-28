/*
 * components/Legal.jsx — PRIVACIDAD, TÉRMINOS Y BORRADO DE CUENTA
 * ──────────────────────────────────────────────────────────────
 * Tres cosas que la ley exige que estén disponibles y que además son de
 * sentido común: poder leer qué se hace con tus datos, bajo qué reglas usas
 * la app, y poder borrarlo todo si un día ya no quieres estar.
 *
 * El borrado pide escribir BORRAR a mano: una acción irreversible no debería
 * estar a un solo toque de distancia.
 */
import React, { useState } from "react";
import { Shield, FileText, X, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { PRIVACIDAD, TERMINOS, ACTUALIZADO } from "../lib/legal";
import { C, FONT_BODY, FONT_DISPLAY, GRAD } from "../lib/theme";

export default function Legal() {
  const [abierto, setAbierto] = useState(null);   // "privacidad" | "terminos"
  const [borrando, setBorrando] = useState(false);
  const [confirma, setConfirma] = useState("");
  const [error, setError] = useState("");

  async function borrarTodo() {
    if (confirma !== "BORRAR") return;
    setError("");
    try {
      await api.deleteAccount();
      // Se cierra la sesión: ya no queda nada que mostrar
      const { supabase } = await import("../lib/supabase");
      await supabase.auth.signOut();
      window.location.reload();
    } catch (e) {
      setError("No se pudo completar el borrado. Inténtalo de nuevo.");
    }
  }

  const doc = abierto === "privacidad" ? PRIVACIDAD : abierto === "terminos" ? TERMINOS : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={() => setAbierto("privacidad")} style={enlace}>
          <Shield size={14} /> Privacidad
        </button>
        <button onClick={() => setAbierto("terminos")} style={enlace}>
          <FileText size={14} /> Términos de uso
        </button>
      </div>

      {/* Zona peligrosa: borrar todo */}
      <div style={{ background: "rgba(183,156,255,.07)", border: `1px solid ${C.rust}44`,
        borderRadius: 12, padding: "13px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <AlertTriangle size={14} color={C.rust} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em",
            textTransform: "uppercase", fontWeight: 700, color: C.rust }}>Borrar mis datos</span>
        </div>
        <p style={{ margin: "0 0 11px", fontFamily: FONT_BODY, fontSize: 12.5,
          color: C.sepia, lineHeight: 1.55 }}>
          Elimina para siempre todo lo que la app guarda de ti: entrenamientos, hábitos,
          notas, textos y objetivos. No se puede deshacer. Exporta antes si quieres
          conservarlo.
        </p>

        {!borrando ? (
          <button onClick={() => setBorrando(true)} style={{ ...enlace, color: C.rust,
            borderColor: `${C.rust}66` }}>Quiero borrar mis datos</button>
        ) : (
          <div>
            <p style={{ margin: "0 0 8px", fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk }}>
              Escribe <strong style={{ color: C.rust }}>BORRAR</strong> para confirmar:
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={confirma} onChange={(e) => setConfirma(e.target.value)}
                placeholder="BORRAR" style={{ flex: 1, minWidth: 120, background: C.inkSoft,
                  border: `1px solid ${C.paperEdge}`, borderRadius: 10, padding: "9px 11px",
                  color: C.sepiaInk, fontFamily: FONT_BODY, fontSize: 13.5, outline: "none" }} />
              <button onClick={borrarTodo} disabled={confirma !== "BORRAR"}
                style={{ background: confirma === "BORRAR" ? C.rust : C.paperEdge, color: "#0B1B33",
                  border: "none", borderRadius: 999, padding: "9px 16px", fontFamily: FONT_BODY,
                  fontSize: 12.5, fontWeight: 700,
                  cursor: confirma === "BORRAR" ? "pointer" : "default" }}>
                Borrar definitivamente
              </button>
              <button onClick={() => { setBorrando(false); setConfirma(""); }}
                style={{ background: "none", border: "none", color: C.sepia,
                  fontFamily: FONT_BODY, fontSize: 12.5, cursor: "pointer" }}>Cancelar</button>
            </div>
            {error && <p style={{ margin: "8px 0 0", fontFamily: FONT_BODY, fontSize: 12, color: C.rust }}>{error}</p>}
          </div>
        )}
      </div>

      {/* La hoja con el documento */}
      {doc && (
        <>
          <div onClick={() => setAbierto(null)} style={{ position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(4,10,20,.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} />
          <div role="dialog" aria-label={doc.title} style={{ position: "fixed", bottom: 0, left: 0, right: 0,
            zIndex: 61, maxWidth: 560, margin: "0 auto", maxHeight: "88vh", overflowY: "auto",
            background: C.inkSoft, borderTopLeftRadius: 30, borderTopRightRadius: 30,
            padding: "14px 22px 34px", boxShadow: "0 -20px 60px rgba(0,0,0,.55)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: C.paperEdge, margin: "0 auto 18px" }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".2em",
                  textTransform: "uppercase", fontWeight: 700, marginBottom: 6, background: GRAD.gold,
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                  width: "fit-content" }}>Actualizado en {ACTUALIZADO}</div>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: C.sepiaInk, margin: 0,
                  fontWeight: 700, lineHeight: 1.12 }}>{doc.title}</h2>
              </div>
              <button onClick={() => setAbierto(null)} aria-label="Cerrar" style={{ background: C.paper,
                border: "none", borderRadius: 999, width: 34, height: 34, cursor: "pointer", color: C.sepia,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={17} />
              </button>
            </div>

            <p style={{ margin: "16px 0 20px", fontFamily: FONT_BODY, fontSize: 14.5,
              color: C.sepiaInk, lineHeight: 1.65 }}>{doc.intro}</p>

            {doc.bloques.map((b, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, letterSpacing: ".14em",
                  textTransform: "uppercase", color: C.olive, fontWeight: 700, marginBottom: 8 }}>{b.h}</div>
                {b.p.map((t, j) => (
                  <p key={j} style={{ margin: "0 0 9px", fontFamily: FONT_BODY, fontSize: 13.5,
                    color: C.sepiaInk, lineHeight: 1.62 }}>{t}</p>
                ))}
              </div>
            ))}

            <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia,
              lineHeight: 1.55, fontStyle: "italic" }}>{doc.contacto}</p>
          </div>
        </>
      )}
    </div>
  );
}

const enlace = {
  display: "inline-flex", alignItems: "center", gap: 7, background: "none",
  border: `1px solid ${C.paperEdge}`, color: C.sepia, borderRadius: 999,
  padding: "9px 15px", fontFamily: FONT_BODY, fontSize: 12.5, cursor: "pointer",
};
