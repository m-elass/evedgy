/*
 * components/InstallApp.jsx — INSTALAR COMO APP
 * ─────────────────────────────────────────────
 * Explica cómo dejar la app instalada en el móvil, con su icono y a pantalla
 * completa. La instalación funciona distinto en cada sistema:
 *
 *   · Android y escritorio: el navegador ofrece instalarla. Capturamos ese
 *     ofrecimiento y lo mostramos como un botón, para que no dependa de que
 *     el usuario encuentre el menú.
 *   · iPhone y iPad: Safari NO permite instalar con un botón; hay que usar
 *     Compartir → «Añadir a pantalla de inicio». Por eso aquí se explica el
 *     camino exacto en lugar de mostrar un botón que no podría funcionar.
 *     Además, desde Chrome de iOS no se puede instalar: tiene que ser Safari.
 */
import React, { useEffect, useState } from "react";
import { Share, Plus, Download, CheckCircle2, Smartphone, ShieldCheck } from "lucide-react";
import { C, FONT_BODY, FONT_DISPLAY, GRAD, GLOW } from "../lib/theme";

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null);
  const [instalada, setInstalada] = useState(false);
  // ¿Hay un APK publicado junto a la web? Si lo hay, se ofrece la descarga
  // directa: app nativa de verdad, sin pasar por Google Play.
  const [apk, setApk] = useState(null);

  useEffect(() => {
    const yaEsApp = window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
    setInstalada(yaEsApp);
    const capturar = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", capturar);
    window.addEventListener("appinstalled", () => setInstalada(true));
    // Comprobamos si existe /tu-cuaderno.apk sin descargarlo entero
    fetch("/tu-cuaderno.apk", { method: "HEAD" })
      .then((r) => { if (r.ok) setApk("/tu-cuaderno.apk"); })
      .catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", capturar);
  }, []);

  const ua = navigator.userAgent || "";
  const esIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const esSafari = esIOS && !/CriOS|FxiOS|EdgiOS/.test(ua);

  if (instalada) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(232,184,75,.10)",
        border: `1px solid rgba(232,184,75,.3)`, borderRadius: 12, padding: "12px 14px" }}>
        <CheckCircle2 size={17} color={C.olive} />
        <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk }}>
          Ya la estás usando como app instalada.
        </span>
      </div>
    );
  }

  return (
    <div style={{ background: C.paper, border: `1px solid ${C.paperEdge}`, borderRadius: 14, padding: "15px 16px" }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: C.sepiaInk, fontWeight: 600, marginBottom: 6 }}>
        Instalar como aplicación
      </div>
      <p style={{ margin: "0 0 13px", fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.55 }}>
        Queda con su icono en la pantalla de inicio y se abre a pantalla completa, sin barra de navegador.
      </p>

      {/* Descarga directa: la app nativa sin tiendas ni cuotas */}
      {apk && !esIOS && (
        <div style={{ background: "rgba(232,184,75,.10)", border: "1px solid rgba(232,184,75,.32)",
          borderRadius: 12, padding: "13px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <Smartphone size={15} color={C.olive} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".1em",
              textTransform: "uppercase", fontWeight: 700, color: C.olive }}>App nativa para Android</span>
          </div>
          <p style={{ margin: "0 0 11px", fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk, lineHeight: 1.55 }}>
            Descarga el instalador directamente. Es la aplicación completa: notificaciones
            que suenan con el móvil bloqueado y vibración nativa.
          </p>
          <a href={apk} download style={{ display: "inline-flex", alignItems: "center", gap: 9,
            background: GRAD.gold, color: "#0B1B33", borderRadius: 999, padding: "11px 19px",
            fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, textDecoration: "none",
            boxShadow: GLOW.gold }}>
            <Download size={16} /> Descargar la app (.apk)
          </a>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 11 }}>
            <ShieldCheck size={13} color={C.sepia} style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, lineHeight: 1.5 }}>
              Android avisará de que procede de un origen desconocido: es normal al instalar
              fuera de Play Store. Pulsa «Ajustes» en el aviso y permite instalar desde tu
              navegador.
            </span>
          </div>
        </div>
      )}

      {prompt ? (
        <button onClick={async () => { prompt.prompt(); const r = await prompt.userChoice;
          if (r.outcome === "accepted") setInstalada(true); setPrompt(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 9, background: GRAD.gold,
            color: "#0B1B33", border: "none", borderRadius: 999, padding: "12px 20px",
            fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: GLOW.gold }}>
          <Download size={16} /> Instalar ahora
        </button>
      ) : esIOS ? (
        <div>
          {!esSafari && (
            <div style={{ background: "rgba(183,156,255,.12)", borderLeft: `3px solid ${C.rust}`,
              borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk, lineHeight: 1.5 }}>
                Estás en un navegador que no puede instalar apps en iPhone. Abre esta misma dirección en <strong>Safari</strong>.
              </span>
            </div>
          )}
          <Paso n="1" icon={<Share size={15} color={C.olive} />}
            texto="Pulsa el botón Compartir de Safari (el cuadrado con la flecha hacia arriba)." />
          <Paso n="2" icon={<Plus size={15} color={C.olive} />}
            texto="Baja en la lista y elige «Añadir a pantalla de inicio»." />
          <Paso n="3" icon={<CheckCircle2 size={15} color={C.olive} />}
            texto="Confirma con «Añadir». El icono aparecerá junto a tus demás apps." />
        </div>
      ) : (
        <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, lineHeight: 1.55 }}>
          Abre el menú de tu navegador (⋮) y elige <strong>«Instalar aplicación»</strong> o
          «Añadir a pantalla de inicio».
        </p>
      )}
    </div>
  );
}

function Paso({ n, icon, texto }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 10 }}>
      <span style={{ width: 24, height: 24, borderRadius: 999, background: C.inkSoft, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY,
        fontSize: 11, fontWeight: 700, color: C.olive }}>{n}</span>
      <span style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
        <span style={{ marginTop: 1, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepiaInk, lineHeight: 1.5 }}>{texto}</span>
      </span>
    </div>
  );
}
