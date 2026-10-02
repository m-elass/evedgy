/*
 * components/Avisos.jsx — EL AVISO DE LA CARTA DIARIA
 * ──────────────────────────────────────────────────
 * Activa en este dispositivo el recordatorio de la noche («Tu carta de hoy te
 * espera») y elige la hora. Solo llega si ese día aún no has escrito.
 *   · App nativa: lo programa el propio teléfono (sin servidor).
 *   · Web/PWA: aviso push del servidor. En iPhone exige tener la app añadida
 *     a la pantalla de inicio (iOS 16.4 o posterior) y abrirla desde allí.
 */
import React, { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { api } from "../lib/api";
import { avisar } from "../lib/toast";
import { esNativo, programarRecordatorioCarta, cancelarRecordatorioCarta } from "../lib/native";
import { C, FONT_BODY, GRAD } from "../lib/theme";

const CLAVE_NATIVO = "tc:aviso-carta-nativo";

function base64ABytes(b64) {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const crudo = atob((b64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...crudo].map((c) => c.charCodeAt(0)));
}

function enIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent); }
function instalada() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function Avisos() {
  const nativo = esNativo();
  const soportaPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const [activo, setActivo] = useState(false);
  const [hora, setHora] = useState("22:00");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (nativo) {
        try {
          const g = JSON.parse(localStorage.getItem(CLAVE_NATIVO) || "null");
          if (g && vivo) { setActivo(true); setHora(g.hora); }
        } catch { /* nada */ }
        return;
      }
      if (!soportaPush) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub || !vivo) return;
        setActivo(true);
        const mias = await api.pushSubscriptions();
        const host = new URL(sub.endpoint).host;
        const esta = mias.find((m) => m.endpoint_host === host) || mias[0];
        if (esta && vivo) setHora(`${String(esta.hour).padStart(2, "0")}:${String(esta.minute).padStart(2, "0")}`);
      } catch { /* sin datos: se queda como está */ }
    })();
    return () => { vivo = false; };
  }, [nativo, soportaPush]);

  async function activar(nuevaHora = hora) {
    if (ocupado) return;
    setOcupado(true);
    const [h, m] = nuevaHora.split(":").map((x) => parseInt(x, 10));
    try {
      if (nativo) {
        const ok = await programarRecordatorioCarta(h, m);
        if (!ok) throw new Error("permiso");
        localStorage.setItem(CLAVE_NATIVO, JSON.stringify({ hora: nuevaHora }));
      } else {
        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") {
          avisar("Sin permiso para avisos. Actívalo en los ajustes del navegador o del móvil.");
          return;
        }
        const { public_key } = await api.pushConfig();
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription())
          || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ABytes(public_key) });
        const j = sub.toJSON();
        await api.pushSubscribe({ endpoint: j.endpoint, keys: j.keys,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid", hour: h, minute: m });
      }
      setActivo(true);
      setHora(nuevaHora);
      avisar(`Aviso activado: cada día a las ${nuevaHora}, si aún no has escrito.`, "ok");
    } catch (e) {
      avisar(e?.humano || "No se pudo activar el aviso en este dispositivo.");
    } finally { setOcupado(false); }
  }

  async function desactivar() {
    if (ocupado) return;
    setOcupado(true);
    try {
      if (nativo) {
        await cancelarRecordatorioCarta();
        localStorage.removeItem(CLAVE_NATIVO);
      } else {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.pushUnsubscribe(sub.endpoint).catch(() => {});
          await sub.unsubscribe();
        }
      }
      setActivo(false);
    } catch (e) {
      avisar(e?.humano || "No se pudo desactivar.");
    } finally { setOcupado(false); }
  }

  async function probar() {
    try { await api.pushTest(); avisar("Aviso de prueba enviado. Debería llegar en unos segundos.", "ok"); }
    catch (e) { avisar(e?.humano || "No se pudo enviar la prueba."); }
  }

  if (!nativo && !soportaPush) {
    return <p style={nota}>Este navegador no admite avisos. {enIOS() ? "En iPhone: añade la app a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde allí." : ""}</p>;
  }
  if (!nativo && enIOS() && !instalada()) {
    return <p style={nota}>Para recibir el aviso en el iPhone, añade la app a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio»), ábrela desde ese icono y vuelve aquí.</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk, fontWeight: 600 }}>
            {activo ? `Cada noche a las ${hora}` : "Aviso de la carta desactivado"}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, marginTop: 2, lineHeight: 1.45 }}>
            Solo si ese día aún no has escrito tu carta.
          </div>
        </div>
        <input type="time" value={hora} onChange={(e) => { setHora(e.target.value); if (activo) activar(e.target.value); }}
          aria-label="Hora del aviso" style={{ background: C.inkSoft, color: C.sepiaInk, border: `1px solid ${C.paperEdge}`,
            borderRadius: 8, padding: "7px 8px", fontFamily: FONT_BODY, fontSize: 14 }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {activo ? (
          <>
            {!nativo && <button onClick={probar} style={boton(false)}><BellRing size={14} /> Probar</button>}
            <button onClick={desactivar} disabled={ocupado} style={boton(false)}><BellOff size={14} /> Desactivar</button>
          </>
        ) : (
          <button onClick={() => activar()} disabled={ocupado} style={boton(true)}>
            <Bell size={14} /> {ocupado ? "Activando…" : "Activar en este dispositivo"}
          </button>
        )}
      </div>
    </div>
  );
}

const nota = { fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, lineHeight: 1.55, margin: 0 };
const boton = (lleno) => ({ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
  padding: "9px 14px", borderRadius: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
  background: lleno ? GRAD.gold : C.inkSoft, color: lleno ? "#0B1B33" : C.sepiaInk,
  border: `1px solid ${lleno ? "transparent" : C.paperEdge}` });
