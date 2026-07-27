/*
 * components/Celebration.jsx
 * ──────────────────────────
 * La celebración de récord. Cuando una serie supera tu mejor 1RM histórico,
 * la pantalla se rinde un instante al oro: rayos que giran, destellos, el
 * trofeo y tu nueva marca. Se cierra tocando en cualquier parte.
 *
 * Es puro CSS + SVG (sin librerías): ligera y con el carácter de Iudex.
 */
import React from "react";
import { Trophy } from "lucide-react";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { HelpDot } from "./Help";

export default function Celebration({ show, exercise, oneRm, onClose }) {
  if (!show) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000, display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
      background: "radial-gradient(ellipse at 50% 45%, rgba(232,184,75,.16), rgba(6,15,31,.94) 65%)",
      animation: "celebIn .3s ease both", backdropFilter: "blur(3px)" }}>

      {/* Rayos dorados girando lentamente tras el trofeo */}
      <svg width="340" height="340" viewBox="0 0 340 340" style={{
        position: "absolute", animation: "raysSpin 24s linear infinite", opacity: .5 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="168" y="10" width="4" height="120" rx="2" fill="url(#rayg)"
            transform={`rotate(${i * 30} 170 170)`} />
        ))}
        <defs>
          <linearGradient id="rayg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E8B84B" stopOpacity="0" />
            <stop offset="1" stopColor="#E8B84B" stopOpacity=".55" />
          </linearGradient>
        </defs>
      </svg>

      {/* Destellos que parpadean alrededor */}
      {[[18, -96, 0], [-92, -40, .4], [86, 30, .8], [-40, 96, 1.2], [104, -60, 1.6]].map(([x, y, d], i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 16 16" style={{
          position: "absolute", transform: `translate(${x}px, ${y}px)`,
          animation: `sparkle 1.8s ease ${d}s infinite` }}>
          <path d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4 Z" fill="#FBF0C8" />
        </svg>
      ))}

      {/* La tarjeta central */}
      <div style={{ textAlign: "center", animation: "celebPop .5s cubic-bezier(.2,.9,.3,1.2) both", padding: 24 }}>
        <div style={{ width: 84, height: 84, margin: "0 auto 18px", borderRadius: "50%",
          background: GRAD.gold, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(232,184,75,.55)" }}>
          <Trophy size={40} color="#0B1B33" strokeWidth={2.2} />
        </div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, letterSpacing: ".28em",
          textTransform: "uppercase", fontWeight: 700, marginBottom: 8,
          background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          Nuevo récord{" "}<HelpDot topic="record_celebration" size={12} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 700, color: C.sepiaInk, lineHeight: 1.15 }}>
          {exercise}
        </div>
        {oneRm && (
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, marginTop: 6,
            background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", fontWeight: 600 }}>
            1RM estimado: {oneRm} kg
          </div>
        )}
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, marginTop: 16 }}>
          Toca para continuar
        </div>
      </div>
    </div>
  );
}
