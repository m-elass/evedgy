/*
 * sections/SettingsHub.jsx
 * ────────────────────────
 * El centro de ajustes: todo lo que configura tu cuaderno, en un solo lugar.
 *   · Perfil: alias, peso corporal y sexo (lo que usan los rangos).
 *   · Privacidad: el opt-in de compartir rangos con amigos.
 *   · Apariencia: acceso al taller de temas.
 *   · Tus datos: exportarlo TODO en un JSON. Tus datos son tuyos.
 * Se abre con el engranaje de la cabecera.
 */
import React, { useEffect, useState } from "react";
import { User, Eye, EyeOff, Palette, Download, Info } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "../lib/theme";
import { SectionHeader, Field, SolidBtn, Loading } from "../components/ui";
import { HelpDot } from "../components/Help";
import InstallApp from "../components/InstallApp";
import Legal from "../components/Legal";

export default function SettingsHub({ onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [bw, setBw] = useState("");
  const [alias, setAlias] = useState("");
  const [sex, setSex] = useState("m");
  const [saved, setSaved] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const p = await api.getProfile();
      setProfile(p); setAlias(p.display_name || "");
      setBw(p.bodyweight ? String(p.bodyweight) : ""); setSex(p.sex || "m");
    } catch { setProfile({}); }
  }
  async function saveProfile() {
    await api.updateProfile({ display_name: alias.trim(), bodyweight: parseFloat(bw) || 0, sex });
    setSaved(true); load();
  }
  async function toggleShare() {
    await api.updateProfile({ share_ranks: !profile.share_ranks }); load();
  }

  // Exporta todos los datos como archivo JSON descargable.
  async function exportAll() {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tu-cuaderno-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  if (profile === null) return (<><SectionHeader kicker="Tu cuaderno" title="Ajustes" /><Loading /></>);

  return (
    <div>
      <SectionHeader kicker="Tu cuaderno" title="Ajustes" />

      {/* Perfil */}
      <Block icon={<User size={15} color={C.olive} />} title="Perfil">
        <Field label="Alias (lo que ven tus amigos)" value={alias}
          onChange={(e) => { setAlias(e.target.value); setSaved(false); }} placeholder="Tu nombre visible" />
        <Field label="Peso corporal (kg) — para los rangos" value={bw}
          onChange={(e) => { setBw(e.target.value); setSaved(false); }} placeholder="80" />
        <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: C.sepia, marginBottom: 8 }}>Sexo (para los estándares de fuerza)</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[["m", "Hombre"], ["f", "Mujer"]].map(([k, lab]) => (
            <button key={k} onClick={() => { setSex(k); setSaved(false); }} style={{ flex: 1, padding: "9px 0",
              borderRadius: 8, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13,
              background: sex === k ? GRAD.gold : C.inkSoft, color: sex === k ? "#0B1B33" : C.sepia,
              border: `1px solid ${sex === k ? "transparent" : C.paperEdge}`, fontWeight: sex === k ? 700 : 400 }}>{lab}</button>
          ))}
        </div>
        <SolidBtn label={saved ? "Guardado" : "Guardar perfil"} onClick={saveProfile} disabled={saved} />
      </Block>

      {/* Privacidad */}
      <Block icon={profile.share_ranks ? <Eye size={15} color={C.olive} /> : <EyeOff size={15} color={C.sepia} />} title="Privacidad">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk, fontWeight: 600 }}>
              {profile.share_ranks ? "Compartes tus rangos con amigos" : "Tus rangos son privados"}
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, marginTop: 2, lineHeight: 1.45 }}>
              Solo la insignia, nunca tus pesos. Solo amigos aceptados.
            </div>
          </div>
          <button onClick={toggleShare} style={{ background: profile.share_ranks ? GRAD.gold : C.inkSoft,
            color: profile.share_ranks ? "#0B1B33" : C.sepia, border: `1px solid ${profile.share_ranks ? "transparent" : C.paperEdge}`,
            borderRadius: 8, padding: "9px 14px", fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            {profile.share_ranks ? "Activado" : "Activar"}
          </button>
        </div>
      </Block>

      {/* Apariencia */}
      <Block icon={<Palette size={15} color={C.rust} />} title="Apariencia">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.5 }}>
            El taller de temas: cambia los colores de tu cuaderno, o pídele uno nuevo a la IA con unas palabras.
          </div>
          <button onClick={() => onNavigate && onNavigate("theme")} style={{ background: C.inkSoft,
            border: `1px solid ${C.paperEdge}`, borderRadius: 8, padding: "9px 14px",
            fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk, cursor: "pointer", flexShrink: 0 }}>Abrir</button>
        </div>
      </Block>

      {/* Tus datos */}
      <Block icon={<Download size={15} color={C.olive} />} title="Tus datos">
        <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.55, marginBottom: 12 }}>
          Todo lo que has escrito y registrado es tuyo. Descárgalo entero en un archivo JSON cuando quieras.
          Las cartas selladas viajan sin su texto: su sello se respeta incluso aquí.
        </div>
        <div style={{ marginBottom: 18 }}><InstallApp /></div>

        <div style={{ marginBottom: 18 }}><Legal /></div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SolidBtn label={exporting ? "Preparando…" : "Exportar todos mis datos"} onClick={exportAll} disabled={exporting} />
          <HelpDot topic="export_data" size={16} label="¿Qué incluye la exportación?" />
          <HelpDot topic="install_pwa" size={16} label="¿Cómo instalar la app en el móvil?" />
        </div>
      </Block>

      {/* Acerca de */}
      <Block icon={<Info size={15} color={C.sepia} />} title="Acerca de">
        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepia, lineHeight: 1.6 }}>
          Tu cuaderno · gimnasio y vida deliberada.<br />
          Hecho a medida, con el tema Iudex: azul profundo y oro para lo que cuesta.
        </div>
      </Block>
    </div>
  );
}

function Block({ icon, title, children }) {
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.paperEdge}`, borderRadius: 14,
      padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon}
        <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".14em",
          textTransform: "uppercase", color: C.sepiaInk, fontWeight: 700 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
