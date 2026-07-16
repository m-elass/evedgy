/*
 * components/Auth.jsx
 * ───────────────────
 * La puerta de entrada, rediseñada como merece: la gota de oro del icono, el
 * título en serif con degradado metálico, y una tarjeta de cristal sobre el
 * azul profundo. La primera impresión de "Tu cuaderno".
 *
 * La lógica no cambia: Supabase gestiona cuentas y contraseñas de forma segura;
 * nosotros no guardamos contraseñas en ningún sitio.
 */
import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState("");   // qué campo tiene el foco (borde oro)

  async function submit() {
    setBusy(true); setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Cuenta creada. Revisa tu correo si pide confirmación, luego inicia sesión.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Al entrar, el listener de App.jsx detecta la sesión y cambia de pantalla.
      }
    } catch (e) {
      setMsg(e.message || "Algo no ha ido bien. Inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  const inp = (name) => ({
    width: "100%", boxSizing: "border-box", background: "rgba(11,27,51,.65)",
    border: `1px solid ${focus === name ? C.olive : C.paperEdge}`,
    boxShadow: focus === name ? "0 0 0 3px rgba(232,184,75,.12)" : "none",
    borderRadius: 10, padding: "13px 14px", fontFamily: FONT_BODY, fontSize: 15,
    color: C.sepiaInk, outline: "none", transition: "border-color .2s, box-shadow .2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
      backgroundImage: "radial-gradient(ellipse at 50% -10%, rgba(127,213,232,.14), transparent 55%), radial-gradient(ellipse at 50% 115%, rgba(232,184,75,.07), transparent 55%)" }}>
      <div className="view-anim" style={{ width: "100%", maxWidth: 380 }}>

        {/* La gota de oro (el icono de la app) */}
        <svg width="58" height="58" viewBox="0 0 64 64" style={{ display: "block", margin: "0 auto 16px",
          filter: "drop-shadow(0 0 16px rgba(232,184,75,.45))" }}>
          <defs>
            <linearGradient id="authGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#A6741E" /><stop offset=".45" stopColor="#E8B84B" />
              <stop offset=".6" stopColor="#FBF0C8" /><stop offset="1" stopColor="#A6741E" />
            </linearGradient>
          </defs>
          <path d="M32 6 C32 6 14 28 14 41 a18 18 0 0 0 36 0 C50 28 32 6 32 6 Z" fill="url(#authGold)" />
        </svg>

        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".3em",
            textTransform: "uppercase", color: C.sepia, marginBottom: 8 }}>Tu cuaderno</div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 34, margin: 0, fontWeight: 700,
            background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            {mode === "login" ? "Bienvenido de vuelta" : "Empieza tu cuaderno"}
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, margin: "10px 0 0", lineHeight: 1.5 }}>
            Gimnasio, hábitos y vida deliberada. Todo tuyo, en un solo lugar.
          </p>
        </div>

        {/* Tarjeta de cristal */}
        <div style={{ background: "rgba(21,41,74,.72)", border: `1px solid ${C.paperEdge}`,
          borderRadius: 18, padding: "24px 22px", backdropFilter: "blur(10px)",
          boxShadow: "0 20px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(216,232,245,.06)" }}>

          <label style={lbl}>Correo</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
            placeholder="tu@correo.com" style={inp("email")}
            onFocus={() => setFocus("email")} onBlur={() => setFocus("")} />

          <label style={{ ...lbl, marginTop: 16 }}>Contraseña</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password"
            placeholder="••••••••" style={inp("pass")}
            onFocus={() => setFocus("pass")} onBlur={() => setFocus("")}
            onKeyDown={(e) => e.key === "Enter" && submit()} />

          <button onClick={submit} disabled={busy} style={{
            width: "100%", marginTop: 22, padding: "14px", borderRadius: 11, border: "none",
            background: GRAD.gold, color: "#0B1B33", fontFamily: FONT_BODY, fontSize: 15,
            fontWeight: 700, letterSpacing: ".02em", cursor: busy ? "default" : "pointer",
            opacity: busy ? .6 : 1, boxShadow: GLOW.gold }}>
            {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>

          {msg && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.rust,
            marginTop: 14, lineHeight: 1.5 }}>{msg}</p>}
        </div>

        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }}
          style={{ display: "block", margin: "20px auto 0", background: "none", border: "none",
            color: C.sepia, fontFamily: FONT_BODY, fontSize: 13.5, cursor: "pointer", padding: 4 }}>
          {mode === "login" ? "¿No tienes cuenta? Créala" : "¿Ya tienes cuenta? Entra"}
        </button>
      </div>
    </div>
  );
}

const lbl = { display: "block", fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em",
  textTransform: "uppercase", color: C.sepia, marginBottom: 7 };
