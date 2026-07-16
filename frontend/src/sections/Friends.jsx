/*
 * sections/Friends.jsx
 * ────────────────────
 * El modo cooperativo (deseo 2). Sigue a amigos por su alias y ve sus rangos por
 * ejercicio (solo la insignia, nunca sus pesos). Requiere activar el opt-in de
 * compartir y poner un alias en el perfil.
 *
 * La privacidad se respeta de raíz: aquí solo se piden y muestran insignias; el
 * backend nunca entrega pesos ni datos sensibles de otros.
 */
import React, { useEffect, useState } from "react";
import { UserPlus, Check, X, Users, Trophy, Shield as ShieldIcon, Eye, EyeOff } from "lucide-react";
import { api } from "../lib/api";
import { C, FONT_DISPLAY, FONT_BODY, GRAD, GLOW } from "../lib/theme";
import { SectionHeader, Field, SolidBtn, Loading, Empty } from "../components/ui";
import RankBadge from "../components/RankBadge";

export default function Friends() {
  const [friends, setFriends] = useState(null);
  const [profile, setProfile] = useState(null);
  const [alias, setAlias] = useState("");
  const [adding, setAdding] = useState("");
  const [msg, setMsg] = useState("");
  const [openId, setOpenId] = useState(null);
  const [ranks, setRanks] = useState({});

  useEffect(() => { load(); }, []);
  async function load() {
    try { setProfile(await api.getProfile()); } catch { setProfile({}); }
    try { setFriends(await api.listFriends()); } catch { setFriends([]); }
  }

  async function saveAlias() {
    await api.updateProfile({ display_name: alias.trim() });
    setAlias(""); load();
  }
  async function toggleShare() {
    await api.updateProfile({ share_ranks: !profile.share_ranks });
    load();
  }
  async function sendRequest() {
    setMsg("");
    try {
      const r = await api.sendFriendRequest({ display_name: adding.trim() });
      setMsg(r.message || "Solicitud enviada."); setAdding(""); load();
    } catch (e) {
      setMsg("No se pudo enviar. ¿Alias correcto?");
    }
  }
  async function accept(id) { await api.acceptFriend(id); load(); }
  async function remove(id) { await api.removeFriend(id); if (openId === id) setOpenId(null); load(); }
  async function viewRanks(id) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    try {
      const data = await api.friendRanks(id);
      setRanks((p) => ({ ...p, [id]: data }));
    } catch {
      setRanks((p) => ({ ...p, [id]: [] }));
    }
  }

  if (friends === null || profile === null) return (<><SectionHeader kicker="Vida · Juntos" title="Amigos" /><Loading /></>);

  // Necesita alias para usar la función
  if (!profile.display_name) {
    return (
      <div>
        <SectionHeader kicker="Vida · Juntos" title="Amigos" />
        <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepia, lineHeight: 1.6, marginBottom: 16 }}>
          Para competir con amigos, primero elige un alias con el que te encontrarán. Es lo único que verán de ti.
        </p>
        <div style={{ background: C.paper, borderRadius: 12, padding: 16, border: `1px solid ${C.paperEdge}` }}>
          <Field label="Tu alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Cómo quieres que te vean" />
          <SolidBtn label="Guardar alias" onClick={saveAlias} />
        </div>
      </div>
    );
  }

  const accepted = friends.filter((f) => f.direction === "amigos");
  const received = friends.filter((f) => f.direction === "recibida");
  const sent = friends.filter((f) => f.direction === "enviada");

  return (
    <div>
      <SectionHeader kicker="Vida · Juntos" title="Amigos" />

      {/* Control de privacidad: opt-in de compartir rangos */}
      <div style={{ background: C.paper, borderRadius: 12, padding: "14px 16px", marginBottom: 16,
        border: `1px solid ${profile.share_ranks ? C.olive : C.paperEdge}`, display: "flex", alignItems: "center", gap: 12 }}>
        {profile.share_ranks ? <Eye size={18} color={C.olive} /> : <EyeOff size={18} color={C.sepia} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.sepiaInk, fontWeight: 600 }}>
            {profile.share_ranks ? "Compartes tus rangos" : "Tus rangos son privados"}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.sepia, marginTop: 1 }}>
            Tu alias: {profile.display_name} · solo se comparte la insignia, nunca tus pesos
          </div>
        </div>
        <button onClick={toggleShare} style={{ background: profile.share_ranks ? GRAD.gold : C.inkSoft,
          color: profile.share_ranks ? C.cream : C.sepia, border: `1px solid ${profile.share_ranks ? "transparent" : C.paperEdge}`,
          borderRadius: 8, padding: "8px 12px", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {profile.share_ranks ? "Activado" : "Activar"}
        </button>
      </div>

      {/* Añadir amigo */}
      <div style={{ background: C.paper, borderRadius: 12, padding: 16, marginBottom: 16, border: `1px solid ${C.paperEdge}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
          <UserPlus size={15} color={C.olive} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.sepiaInk, fontWeight: 600 }}>Añadir por alias</span>
        </div>
        <Field value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Alias de tu amigo" />
        <SolidBtn label="Enviar solicitud" onClick={sendRequest} />
        {msg && <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.rust, marginTop: 10 }}>{msg}</div>}
      </div>

      {/* Solicitudes recibidas */}
      {received.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Label text="Solicitudes recibidas" />
          {received.map((f) => (
            <div key={f.friendship_id} style={rowStyle}>
              <Users size={18} color={C.sepia} />
              <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14.5, color: C.sepiaInk }}>{f.display_name}</span>
              <button onClick={() => accept(f.friendship_id)} style={miniBtn(true)}><Check size={15} color={C.cream} /></button>
              <button onClick={() => remove(f.friendship_id)} style={miniBtn(false)}><X size={15} color={C.sepia} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Amigos */}
      <Label text={`Amigos (${accepted.length})`} />
      {accepted.length === 0 && <Empty text="Aún no tienes amigos conectados. Envía una solicitud por su alias." />}
      {accepted.map((f) => (
        <div key={f.friendship_id} style={{ background: C.paper, borderRadius: 12, border: `1px solid ${C.paperEdge}`, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ ...rowStyle, marginBottom: 0, border: "none", background: "transparent" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: GRAD.gold, display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: C.cream, fontWeight: 700 }}>{f.display_name[0]?.toUpperCase()}</span>
            </div>
            <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 15, color: C.sepiaInk }}>{f.display_name}</span>
            <button onClick={() => viewRanks(f.friendship_id)} style={{ display: "flex", alignItems: "center", gap: 6,
              background: C.inkSoft, border: `1px solid ${C.paperEdge}`, borderRadius: 8, padding: "7px 12px",
              fontFamily: FONT_BODY, fontSize: 12, color: C.rust, cursor: "pointer" }}>
              <Trophy size={13} /> {openId === f.friendship_id ? "Ocultar" : "Rangos"}
            </button>
          </div>
          {/* Rangos del amigo */}
          {openId === f.friendship_id && (
            <div style={{ padding: "4px 16px 16px" }}>
              {ranks[f.friendship_id] === undefined ? (
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, padding: "8px 0" }}>Cargando…</div>
              ) : ranks[f.friendship_id].length === 0 ? (
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.sepia, padding: "8px 0" }}>
                  Este amigo no comparte rangos todavía.
                </div>
              ) : (
                ranks[f.friendship_id].map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                    borderTop: i > 0 ? `1px solid ${C.paperEdge}` : "none" }}>
                    <RankBadge color={r.badge_color} size={32} glow={r.badge_name === "Oro"} />
                    <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, color: C.sepiaInk }}>{r.exercise}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: r.badge_color }}>{r.badge_name}{r.tier ? ` ${r.tier}` : ""}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}

      {/* Solicitudes enviadas */}
      {sent.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Label text="Solicitudes enviadas" />
          {sent.map((f) => (
            <div key={f.friendship_id} style={rowStyle}>
              <Users size={18} color={C.sepia} />
              <span style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14.5, color: C.sepia }}>{f.display_name}</span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.sepia, fontStyle: "italic" }}>pendiente</span>
              <button onClick={() => remove(f.friendship_id)} style={miniBtn(false)}><X size={15} color={C.sepia} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ text }) {
  return <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase",
    color: C.sepia, marginBottom: 10, fontWeight: 600 }}>{text}</div>;
}
const rowStyle = { display: "flex", alignItems: "center", gap: 12, background: C.paper,
  borderRadius: 10, border: `1px solid ${C.paperEdge}`, padding: "12px 14px", marginBottom: 8 };
const miniBtn = (primary) => ({ width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  background: primary ? "var(--grad-gold)" : "transparent", border: primary ? "none" : `1px solid var(--paperEdge)` });
