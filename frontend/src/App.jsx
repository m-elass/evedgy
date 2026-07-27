/*
 * App.jsx
 * ───────
 * Centro de mando del frontend.
 * - ThemeProvider reparte el tema (variables CSS).
 * - Sin sesion -> login. Con sesion -> app.
 * - Navegacion: barra inferior con lo esencial + un menu "Mas" con el resto,
 *   agrupado por zonas (Cuerpo, Hacer, Mente, Vida). Con 12 secciones, este
 *   patron es mas claro que apilar 12 iconos.
 */
import React, { useEffect, useState, useRef } from "react";
import {
  Home, Dumbbell, BookMarked, Moon, CheckSquare, Lightbulb, PenLine, BookOpen,
  Target, Compass, RefreshCw, GraduationCap, Award, Mail, Scale, BookText, Grid3x3, Shield, Flame, Users, PersonStanding, Sparkles, LogOut, Palette, Settings as Cog, Menu, X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { C, FONT_DISPLAY, FONT_BODY, GRAD } from "./lib/theme";
import { ThemeProvider } from "./lib/ThemeContext";
import Auth from "./components/Auth";
import { ErrorBoundary } from "./components/ErrorBoundary";

import Today from "./sections/Today";
import Training from "./sections/Training";
import Exercises from "./sections/Exercises";
import Sleep from "./sections/Sleep";
import DailyTasks from "./sections/DailyTasks";
import RandomTasks from "./sections/RandomTasks";
import Notes from "./sections/Notes";
import Write from "./sections/Write";
import Goals from "./sections/Goals";
import Values from "./sections/Values";
import Reviews from "./sections/Reviews";
import Skills from "./sections/Skills";
import Records from "./sections/Records";
import Ranks from "./sections/Ranks";
import Physique from "./sections/Physique";
import Anatomy from "./sections/Anatomy";
import Friends from "./sections/Friends";
import Letters from "./sections/Letters";
import Decisions from "./sections/Decisions";
import Readings from "./sections/Readings";
import Tapestry from "./sections/Tapestry";
import ThemeSettings from "./sections/ThemeSettings";
import SettingsHub from "./sections/SettingsHub";
import StarMap from "./components/StarMap";
import { HelpProvider, HelpDot } from "./components/Help";

// Todas las secciones, con su zona para el menu.
const SECTIONS = {
  today:     { label: "Hoy",         icon: Home,         comp: Today },
  training:  { label: "Entreno",     icon: Dumbbell,     comp: Training,   zone: "Cuerpo" },
  exercises: { label: "Ejercicios",  icon: BookMarked,   comp: Exercises,  zone: "Cuerpo" },
  sleep:     { label: "Sueno",       icon: Moon,         comp: Sleep,      zone: "Cuerpo" },
  records:   { label: "Records",     icon: Award,        comp: Records,    zone: "Cuerpo" },
  ranks:     { label: "Rangos",      icon: Shield,       comp: Ranks,      zone: "Cuerpo" },
  physique:  { label: "Meta",        icon: Flame,        comp: Physique,   zone: "Cuerpo" },
  anatomy:   { label: "Anatomía",    icon: PersonStanding, comp: Anatomy,  zone: "Cuerpo" },
  daily:     { label: "Habitos",     icon: CheckSquare,  comp: DailyTasks, zone: "Hacer" },
  todo:      { label: "Tareas",      icon: Lightbulb,    comp: RandomTasks, zone: "Hacer" },
  notes:     { label: "Destellos",   icon: PenLine,      comp: Notes,      zone: "Mente" },
  write:     { label: "Escritura",   icon: BookOpen,     comp: Write,      zone: "Mente" },
  readings:  { label: "Lecturas",    icon: BookText,     comp: Readings,   zone: "Mente" },
  goals:     { label: "Objetivos",   icon: Target,       comp: Goals,      zone: "Vida" },
  values:    { label: "Valores",     icon: Compass,      comp: Values,     zone: "Vida" },
  reviews:   { label: "Revision",    icon: RefreshCw,    comp: Reviews,    zone: "Vida" },
  skills:    { label: "Aprendizajes", icon: GraduationCap, comp: Skills,   zone: "Vida" },
  decisions: { label: "Decisiones",  icon: Scale,        comp: Decisions,  zone: "Vida" },
  letters:   { label: "Cartas",      icon: Mail,         comp: Letters,    zone: "Vida" },
  tapestry:  { label: "El tapiz",    icon: Grid3x3,      comp: Tapestry,   zone: "Vida" },
  friends:   { label: "Amigos",      icon: Users,        comp: Friends,    zone: "Vida" },
};

/* ── EL MAR DE ESTRELLAS: dónde vive cada estrella (lienzo 1300×1300) ──
 * Hoy es la estrella central (650,650). El resto se agrupa en constelaciones
 * por zonas, unidas por hilos de luz; los dorados salen del centro. */
const COORDS = {
  today: [650, 650],
  training: [340, 410], exercises: [225, 345], sleep: [235, 485], records: [425, 315],
  ranks: [480, 470], physique: [335, 555], anatomy: [175, 425],
  daily: [950, 400], todo: [1055, 330],
  notes: [330, 895], write: [235, 975], readings: [430, 985],
  goals: [975, 845], values: [1075, 780], reviews: [1105, 915], skills: [930, 975],
  decisions: [1015, 1040], letters: [870, 760], tapestry: [780, 940], friends: [1145, 720],
  settings: [650, 1085], theme: [770, 1130],
};
const STARS = [
  ...Object.entries(SECTIONS).map(([id, sec]) => ({
    id, label: sec.label, Icon: sec.icon,
    x: COORDS[id]?.[0] ?? 650, y: COORDS[id]?.[1] ?? 650, center: id === "today",
  })),
  { id: "settings", label: "Ajustes", Icon: Cog, x: COORDS.settings[0], y: COORDS.settings[1] },
  { id: "theme", label: "Apariencia", Icon: Palette, x: COORDS.theme[0], y: COORDS.theme[1] },
];
const EDGES = [
  ["today", "training", 1], ["today", "daily", 1], ["today", "notes", 1],
  ["today", "goals", 1], ["today", "settings", 1],
  ["training", "exercises"], ["training", "records"], ["training", "sleep"],
  ["training", "ranks"], ["ranks", "physique"], ["exercises", "anatomy"],
  ["daily", "todo"],
  ["notes", "write"], ["notes", "readings"],
  ["goals", "values"], ["values", "reviews"], ["goals", "skills"],
  ["skills", "decisions"], ["goals", "letters"], ["letters", "tapestry"], ["values", "friends"],
  ["settings", "theme"],
];
const SKY_ZONES = [
  { name: "Cuerpo", x: 300, y: 245 }, { name: "Hacer", x: 995, y: 262 },
  { name: "Mente", x: 320, y: 1058 }, { name: "Vida", x: 1005, y: 652 },
];


// Las que van en la barra inferior (lo esencial del dia a dia).
const BOTTOM = ["today", "training", "daily", "notes"];
const ZONES = ["Cuerpo", "Hacer", "Mente", "Vida"];

function Shell() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("today");
  const [mode, setMode] = useState("section");   // empezamos DENTRO de la estrella de Hoy
  const [closing, setClosing] = useState(false); // animación de salida (zoom out)
  const [anim, setAnim] = useState("slide-l");     // dirección del deslizamiento
  const touch = useRef({ x: 0, y: 0 });
  const FLOW = Object.keys(SECTIONS);              // el orden de la corriente
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div style={{ minHeight: "100vh", background: C.ink }} />;
  if (!session) return <Auth />;

  // Entrar en una estrella (desde el mar) y volver al mar (zoom out)
  function enterStar(id) { setView(id); setClosing(false); setMode("section"); }
  function toSea() {
    setClosing(true);
    setTimeout(() => { setMode("map"); setClosing(false); }, 290);
  }

  function go(id) {
    const a = FLOW.indexOf(view), b = FLOW.indexOf(id);
    setAnim(b >= a ? "slide-l" : "slide-r");       // hacia dónde fluye el contenido
    setView(id); setMenuOpen(false);
  }
  // Deslizar como corriente: swipe horizontal = sección anterior/siguiente
  function onTouchStart(e) { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  function onTouchEnd(e) {
    if (menuOpen) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    const i = FLOW.indexOf(view);
    if (i === -1) return;
    const next = dx < 0 ? FLOW[i + 1] : FLOW[i - 1];
    if (next) go(next);
  }

  const Active = view === "theme" ? ThemeSettings : view === "settings" ? SettingsHub : SECTIONS[view].comp;
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <HelpProvider section={view}>
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
      {/* EL MAR: la capa viva que permanece mientras el contenido fluye */}
      <div className="sea" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      {mode === "map" ? (<>
        <StarMap stars={STARS} edges={EDGES} zones={SKY_ZONES} onEnter={enterStar} />
        {/* Qué es este cielo y cómo se navega */}
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 7,
          background: "rgba(20,40,80,.72)", borderRadius: 999, padding: 3,
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(140,175,230,.28)" }}>
          <HelpDot topic="sea" size={20} label="¿Qué es el mar de estrellas?" />
        </div>
      </>
      ) : (<>
      <div key={view + "-z"} className={"zoomer" + (closing ? " out" : "")}>
      <header style={{ padding: "22px 20px 16px", borderBottom: "none", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: C.sepia }}>Tu cuaderno</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.sepiaInk, fontWeight: 600, marginTop: 2, textTransform: "capitalize" }}>{today}</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => go("theme")} style={iconBtn(view === "theme")} aria-label="Apariencia"><Palette size={18} /></button>
          <button onClick={() => go("settings")} style={iconBtn(view === "settings")} aria-label="Ajustes"><Cog size={18} /></button>
          <button onClick={() => supabase.auth.signOut()} style={iconBtn(false)} aria-label="Cerrar sesion"><LogOut size={18} /></button>
        </div>
      </header>

      <main style={{ flex: 1, padding: "26px 20px 130px", maxWidth: 560, width: "100%", margin: "0 auto", boxSizing: "border-box", position: "relative", zIndex: 1 }}>
        <ErrorBoundary key={view}>
          <div className={`view-anim ${anim}`}>
            <Active onNavigate={go} />
          </div>
        </ErrorBoundary>
      </main>
      </div>
      {/* la estrella para volver al mar */}
      <button onClick={toSea} aria-label="Mar de estrellas" style={{ position: "fixed",
        bottom: 18, left: "50%", transform: "translateX(-50%)", zIndex: 10, width: 56, height: 56,
        borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(circle at 35% 30%, rgba(255,243,199,.95), #E8B84B 55%, #9A6A14)",
        border: "1px solid rgba(255,243,199,.6)", color: "#0B1B33",
        boxShadow: "0 0 22px rgba(232,184,75,.6), 0 8px 20px rgba(0,0,0,.45)" }}>
        <Sparkles size={22} />
      </button>
      </>)}

      {/* Menu completo (se abre con "Mas") */}
      {false && (
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(4,10,20,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", bottom: 0, left: 0, right: 0,
            background: C.inkSoft, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: "14px 20px 34px", boxShadow: "0 -20px 60px rgba(0,0,0,.5)",
            maxWidth: 560, margin: "0 auto", maxHeight: "80vh", overflowY: "auto", zIndex: 21 }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: C.paperEdge, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: C.sepiaInk, fontWeight: 600 }}>Todo tu cuaderno</span>
              <button onClick={() => setMenuOpen(false)} style={iconBtn(false)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            {ZONES.map((zone) => (
              <div key={zone} style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase",
                  marginBottom: 10, fontWeight: 600, background: GRAD.gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", width: "fit-content" }}>{zone}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(SECTIONS).filter(([, s]) => s.zone === zone).map(([id, s]) => {
                    const Icon = s.icon;
                    const active = view === id;
                    return (
                      <button key={id} onClick={() => go(id)} style={{ display: "flex", alignItems: "center", gap: 10,
                        background: active ? "rgba(232,184,75,.14)" : C.paper, border: `1px solid ${active ? C.olive : "transparent"}`,
                        borderRadius: 14, padding: "13px 14px", boxShadow: "0 3px 10px rgba(0,0,0,.22)", cursor: "pointer", color: C.sepiaInk, textAlign: "left" }}>
                        <Icon size={18} color={active ? C.olive : C.sepia} />
                        <span style={{ fontFamily: FONT_BODY, fontSize: 14 }}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra inferior: esenciales + boton Mas */}
      {false && <nav style={{ position: "fixed", bottom: 14, left: 14, right: 14, zIndex: 10,
        background: "color-mix(in srgb, var(--inkSoft) 82%, transparent)", backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)", borderRadius: 24, border: "1px solid rgba(127,168,214,.14)",
        boxShadow: "0 18px 40px -12px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.06)",
        padding: "9px 6px", display: "flex", justifyContent: "space-around", maxWidth: 520, margin: "0 auto" }}>
        {BOTTOM.map((id) => {
          const s = SECTIONS[id]; const Icon = s.icon; const active = view === id;
          return (
            <button key={id} onClick={() => go(id)} style={navBtn(active)}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} color={active ? C.olive : C.sepia} />
              <span style={{ fontSize: 9.5, fontWeight: active ? 600 : 400, color: active ? C.olive : C.sepia }}>{s.label}</span>
            </button>
          );
        })}
        <button onClick={() => setMenuOpen(true)} style={navBtn(menuOpen)}>
          <Menu size={20} strokeWidth={1.8} color={C.sepia} />
          <span style={{ fontSize: 9.5, color: C.sepia }}>Más</span>
        </button>
      </nav>}
    </div>
    </HelpProvider>
  );
}

const iconBtn = (active) => ({ background: "none", border: "none", color: active ? C.olive : C.sepia, cursor: "pointer", padding: 6 });
const navBtn = (active) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: active ? "rgba(232,184,75,.13)" : "transparent", border: "none", cursor: "pointer", padding: "7px 12px", borderRadius: 15, minWidth: 52, transition: "background .25s" });

export default function App() {
  return (
    <ThemeProvider>
      <Shell />
    </ThemeProvider>
  );
}
