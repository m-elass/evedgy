/*
 * sections/Skills.jsx — EL SISTEMA (habilidades con maestría de verdad)
 * ────────────────────────────────────────────────────────────────────
 * Cada habilidad sigue su camino de rangos, de E Novato a S Maestro, con unas
 * horas de referencia y una PRUEBA DE ASCENSO por rango: el rango solo sube si
 * lo demuestras. El Sistema propone cada día misiones concretas (hasta 3), una
 * misión semanal por habilidad y, cerca del ascenso, ensayos de la prueba.
 * Todo lo calcula el servidor (routers/skill_board.py y maestria.py); cada
 * acción sobre una misión devuelve el tablero ya actualizado.
 */
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Check, Trash2, Pencil, ChevronDown, Swords, Flame, Lock, Shuffle, Undo2, Sparkles,
  ShieldCheck, Wand2, CalendarDays, Target,
} from "lucide-react";
import { api, ymd } from "../lib/api";
import { useApi, useFijarCache, useRefrescar } from "../lib/useApi";
import { avisar } from "../lib/toast";
import { HelpDot } from "../components/Help";
import "./Skills.css";

const ATRIBUTOS = {
  STR: "Fuerza", AGI: "Agilidad", VIT: "Vitalidad", INT: "Inteligencia", PER: "Percepción", SEN: "Sentido",
};
const MIN_DIARIA = [10, 15, 20, 30, 45];
const MIN_SEMANAL = [30, 60, 90, 120];
const MIN_LIBRE = [10, 15, 20, 30, 60];
const MIN_AL_DIA = [0, 10, 15, 20, 30, 60];
const XP_HITO = [50, 100, 200, 300];
const fmt = (n) => Math.round(n || 0).toLocaleString("es-ES");
const horas = (h) => (h || 0).toLocaleString("es-ES", { maximumFractionDigits: 1 });
const dias = (n) => `${n} ${n === 1 ? "día" : "días"}`;
const vibrar = (p) => { try { navigator.vibrate?.(p); } catch { /* sin vibración */ } };
const generandoAlgo = (q) => ((q?.state?.data?.skills || []).some((s) => s.plan?.generating) ? 4000 : false);

function Rango({ r, size = 30 }) {
  return (
    <span className={`sis-rango rango-${r}`} style={{ width: size, height: size, fontSize: size * 0.58 }}>
      <span>{r}</span>
    </span>
  );
}

export default function Skills() {
  const hoy = ymd();
  const { data, gate } = useApi("skills", api.skillBoard, { params: [hoy], refetchInterval: generandoAlgo });
  const fijar = useFijarCache();
  const refrescar = useRefrescar();
  const [creando, setCreando] = useState(false);
  const [ventana, setVentana] = useState(null);

  /** Pinta lo que devuelve el servidor y celebra lo que haya que celebrar. */
  function aplicar(r) {
    if (r?.board) fijar("skills", [hoy], r.board);
    else refrescar("skills");
    refrescar("today");
    const res = r?.result;
    if (!res?.skill) return;
    const s = res.skill;
    if (res.rank_up) { vibrar([60, 60, 60, 60, 240]); setVentana({ tipo: "ascenso", ...s }); }
    else if (res.trial_passed) { vibrar([40, 50, 140]); setVentana({ tipo: "prueba", ...s }); }
    else if (res.level_up) { vibrar([40, 50, 120]); setVentana({ tipo: "nivel", ...s }); }
    else if (res.sealed) avisar(`[SISTEMA] ${s.name}: nivel sellado. Supera la prueba de ascenso para seguir subiendo.`, "ok");
    else if (res.xp_gained) { vibrar(20); avisar(`[SISTEMA] +${res.xp_gained} XP · ${s.name}`, "ok"); }
    if (res.trial_opened) avisar(`[SISTEMA] Se ha abierto la prueba de ascenso a rango ${s.next_rank} de ${s.name}.`, "ok");
  }
  async function accion(fn, fallo = "No se pudo completar.") {
    try { aplicar(await fn()); return true; }
    catch (e) { avisar(e?.humano || fallo); return false; }
  }

  if (gate) return <div className="sis"><Cabecera />{gate}</div>;
  const d = data;
  const porId = Object.fromEntries(d.skills.map((s) => [s.id, s]));

  return (
    <div className="sis">
      <Cabecera />
      <Estado d={d} />

      {d.daily.length > 0 && <MisionesDelDia d={d} hoy={hoy} accion={accion} />}

      {d.trials.map((t) => porId[t.skill_id] && (
        <PruebaAscenso key={t.id} t={t} s={porId[t.skill_id]} hoy={hoy} accion={accion} />
      ))}

      {d.weekly.length > 0 && <MisionSemanal d={d} hoy={hoy} accion={accion} />}

      {d.skills.length > 0 && <div className="sis-seccion">Tus habilidades</div>}
      {d.skills.map((s) => <Habilidad key={s.id} s={s} d={d} hoy={hoy} accion={accion} />)}

      {creando ? (
        <NuevaHabilidad d={d} onListo={() => { setCreando(false); refrescar("skills", "today"); }}
          onCancelar={() => setCreando(false)} />
      ) : (
        <button className="sis-btn sis-btn-ancho" onClick={() => setCreando(true)}>
          <Plus size={16} /> Registrar nueva habilidad
        </button>
      )}

      {d.skills.length === 0 && !creando && (
        <p className="sis-vacio">
          Registra lo que quieres dominar: un instrumento, un idioma, programar, un deporte… El Sistema reconocerá
          de qué tipo es, te propondrá cada día misiones concretas para avanzar de verdad y te pedirá demostrar
          cada rango antes de ascender. Si ya lo tenías apuntado en Tareas, desde allí puedes traerlo.
        </p>
      )}

      {ventana && <Ventana v={ventana} onClose={() => setVentana(null)} />}
    </div>
  );
}

function Cabecera() {
  return (
    <div className="sis-cab">
      <div className="sis-cab-kicker"><Swords size={13} /> El Sistema <HelpDot topic="skills" size={14} /></div>
      <h1>Habilidades</h1>
    </div>
  );
}

/* ── Estado del cazador ─────────────────────────────────── */

function Estado({ d }) {
  const P = d.player;
  return (
    <div className="sis-ventana">
      <div className="sis-titulo">Estado</div>
      <div className="sis-estado">
        <div>
          <div className="sis-etq">Nivel total</div>
          <div className="sis-nivel">{P.level}</div>
        </div>
        <div className="sis-estado-rango">
          <div>
            <div className="sis-etq">Mejor rango</div>
            <div className="sis-rango-nombre">{P.title}</div>
          </div>
          <Rango r={P.rank} size={36} />
        </div>
      </div>
      <div className="sis-cifras">
        <div><span className="sis-etq">Horas</span><b>{horas(P.hours)}</b></div>
        <div><span className="sis-etq">Racha</span><b className="racha"><Flame size={15} />{P.streak}</b></div>
        <div><span className="sis-etq">Misiones</span><b>{fmt(P.missions_done)}</b></div>
      </div>
      <div className="sis-stats">
        {Object.keys(ATRIBUTOS).map((k) => (
          <div key={k} className="sis-stat" title={ATRIBUTOS[k]}><span>{k}</span><b>{d.stats[k] || 0}</b></div>
        ))}
      </div>
    </div>
  );
}

/* ── Misiones ──────────────────────────────────────────── */

function MisionesDelDia({ d, hoy, accion }) {
  const hechas = d.daily.filter((m) => m.status === "hecha").length;
  const lote = d.daily.filter((m) => !m.extra);
  const completas = lote.length > 0 && lote.every((m) => m.status === "hecha");
  return (
    <div className={"sis-ventana" + (completas ? " sis-ok" : "")}>
      <div className="sis-titulo">Misiones del día</div>
      <p className="sis-sub">
        Cada misión es una sesión de práctica deliberada: hazla con toda tu atención y hasta cumplir su «hecho cuando».
      </p>
      {d.daily.map((m) => <Mision key={m.id} m={m} hoy={hoy} accion={accion} />)}
      {completas && <div className="sis-completo"><Sparkles size={15} /> Misiones de hoy completadas</div>}
      <div className="sis-pie">
        <span>Recompensa +{d.rewards.daily} XP</span>
        <span>{hechas}/{d.daily.length} completadas</span>
      </div>
      <p className="sis-nota sis-nota-centro">
        <Flame size={12} /> Racha del Sistema: {dias(d.player.streak)}. Las misiones se renuevan a medianoche.
      </p>
    </div>
  );
}

function MisionSemanal({ d, hoy, accion }) {
  const quedan = d.week.days_left;
  return (
    <div className="sis-ventana">
      <div className="sis-titulo">Misión semanal</div>
      <p className="sis-sub sis-sub-centro">
        <CalendarDays size={13} /> {quedan === 1 ? "Último día de la semana" : `Quedan ${dias(quedan)}`}
      </p>
      {d.weekly.map((m) => <Mision key={m.id} m={m} hoy={hoy} accion={accion} />)}
      <div className="sis-pie"><span>Recompensa +{d.rewards.weekly} XP</span><span>Una por habilidad</span></div>
    </div>
  );
}

function Mision({ m, hoy, accion }) {
  const [abierta, setAbierta] = useState(false);
  const [min, setMin] = useState(m.minutes || 20);
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const hecha = m.status === "hecha";
  const opciones = [...new Set([...(m.kind === "semanal" ? MIN_SEMANAL : MIN_DIARIA), m.minutes || 0])]
    .filter((x) => x > 0).sort((a, b) => a - b);

  async function run(fn, fallo) {
    if (ocupado) return false;
    setOcupado(true);
    const ok = await accion(fn, fallo);
    setOcupado(false);
    return ok;
  }
  async function completar() {
    const ok = await run(() => api.completeMission(m.id, {
      date: hoy, minutes: Math.max(0, parseInt(min, 10) || 0), note: nota.trim(),
    }), "No se pudo completar la misión.");
    if (ok) { setAbierta(false); setNota(""); }
  }

  return (
    <div className={"sis-m" + (hecha ? " hecha" : "")}>
      <div className="sis-m-tag">
        <Rango r={m.skill_rank} size={17} />
        <span className="nombre">{m.skill}</span>
        {m.rehearsal && <span className="sis-chip ensayo">Ensayo · {m.rehearsal}</span>}
        {m.extra && <span className="sis-chip">Extra</span>}
        <span className="punto" />
        <span className="rec">{m.minutes}′ · +{m.xp} XP</span>
      </div>
      <div className="sis-m-tit">{hecha && <Check size={17} />}<span>{m.title}</span></div>

      {hecha ? (
        <div className="sis-m-hecha">
          <span>Completada{m.note ? ` · «${m.note}»` : ""}</span>
          <button className="sis-link" disabled={ocupado}
            onClick={() => run(() => api.undoMission(m.id, hoy), "No se pudo deshacer.")}>
            <Undo2 size={13} /> Deshacer
          </button>
        </div>
      ) : (
        <>
          <p className="sis-m-det">{m.detail}</p>
          {abierta ? (
            <div className="sis-m-form">
              <div className="sis-etq">Minutos que le has dedicado</div>
              <div className="sis-chips">
                {opciones.map((x) => (
                  <button key={x} className={"sis-btn chip" + (Number(min) === x ? " on" : "")} onClick={() => setMin(x)}>{x}′</button>
                ))}
                <input className="sis-input mini" type="number" min={0} max={720} value={min} aria-label="Minutos"
                  onChange={(e) => setMin(e.target.value)} />
              </div>
              <textarea className="sis-input" rows={2} value={nota} maxLength={1000} onChange={(e) => setNota(e.target.value)}
                placeholder="¿Qué has notado? ¿Qué falló? (opcional)" />
              <div className="sis-nota">Si ya apuntaste esos minutos como práctica libre, pon 0.</div>
              <div className="sis-m-acciones">
                <button className="sis-btn ok" onClick={completar} disabled={ocupado}>
                  <Check size={15} /> {ocupado ? "Registrando…" : "Confirmar"}
                </button>
                <button className="sis-btn sec" onClick={() => setAbierta(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="sis-m-acciones">
              <button className="sis-btn" onClick={() => setAbierta(true)}><Check size={15} /> Completar</button>
              {m.can_reroll && (
                <button className="sis-btn sec" disabled={ocupado}
                  onClick={() => run(() => api.rerollMission(m.id, hoy), "No se pudo cambiar la misión.")}>
                  <Shuffle size={14} /> Cambiar
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Prueba de ascenso ─────────────────────────────────── */

function PruebaAscenso({ t, s, hoy, accion }) {
  const [marcas, setMarcas] = useState(() => t.criteria.map(() => false));
  const [evidencia, setEvidencia] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const listo = marcas.length > 0 && marcas.every(Boolean) && evidencia.trim().length >= 10;
  const falta = Math.max(0, (s.rank_ceil || 0) - s.xp);

  async function superar() {
    if (!listo || ocupado) return;
    setOcupado(true);
    await accion(() => api.completeMission(t.id, { date: hoy, criteria: marcas, note: evidencia.trim() }),
      "No se pudo registrar la prueba.");
    setOcupado(false);
  }

  return (
    <div className="sis-ventana sis-prueba">
      <div className="sis-titulo">Prueba de ascenso</div>
      <div className="sis-prueba-hab">{t.skill}</div>
      <div className="sis-trans">
        <div><span className="r"><Rango r={s.rank} size={32} /></span><span>{s.title}</span></div>
        <i className="flecha" aria-hidden="true" />
        <div><span className="r"><Rango r={t.target} size={44} /></span><span>{t.target_title}</span></div>
      </div>
      <div className="sis-prueba-tit">{t.title}</div>
      <p className="sis-prueba-sentido">{t.detail}</p>

      <div className="sis-etq">Demuestra que…</div>
      {t.criteria.map((c, i) => (
        <label key={i} className={"sis-check" + (marcas[i] ? " on" : "")}>
          <input type="checkbox" checked={marcas[i]}
            onChange={() => setMarcas((v) => v.map((x, j) => (j === i ? !x : x)))} />
          <span className="caja" aria-hidden="true">{marcas[i] && <Check size={13} strokeWidth={3} />}</span>
          <span>{c}</span>
        </label>
      ))}

      <div className="sis-etq" style={{ marginTop: 12 }}>Evidencia</div>
      <textarea className="sis-input" rows={3} value={evidencia} maxLength={1000}
        onChange={(e) => setEvidencia(e.target.value)}
        placeholder="Cómo lo has demostrado: una grabación, un examen, quién te evaluó…" />
      <button className="sis-btn sis-btn-prueba" disabled={!listo || ocupado} onClick={superar}>
        <ShieldCheck size={16} /> {ocupado ? "Registrando…" : "Superar la prueba"}
      </button>
      <p className="sis-nota">
        {s.sealed
          ? `Tu nivel está sellado con ${fmt(s.reserve_xp)} XP en reserva: al superarla ascenderás al instante. `
          : `Te faltan ${fmt(falta)} XP para el rango ${t.target}: si la superas ya, ascenderás al llegar. `}
        Sé honesto contigo: el rango solo vale si es verdad.
      </p>
    </div>
  );
}

/* ── Habilidades ───────────────────────────────────────── */

function BarraRango({ s, ranks }) {
  const r = ranks[s.rank_index];
  const n = r.levels[1] - r.levels[0] + 1;
  const tramo = Math.max(1, s.rank_ceil - s.rank_floor);
  const pct = Math.max(0, Math.min(100, ((s.xp - s.rank_floor) / tramo) * 100));
  const muescas = Array.from({ length: n - 1 }, (_, k) => ((k + 1) / n) ** 1.5 * 100);
  return (
    <div className={"sis-rbar" + (s.sealed ? " sellada" : "")} role="progressbar" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.round(pct)} aria-label={`Progreso en el rango ${s.rank}`}>
      <i className="fill" style={{ width: `${pct}%` }} />
      {muescas.map((p, k) => <b key={k} style={{ left: `${p}%` }} />)}
      {s.next_rank && <em style={{ left: "90%" }} title="Aquí se abre la prueba de ascenso" />}
    </div>
  );
}

function Habilidad({ s, d, hoy, accion }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className={"sis-ventana sis-hab" + (s.sealed ? " sellada" : "")}>
      <button className="sis-hab-cab" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
        <Rango r={s.rank} size={34} />
        <div className="sis-hab-nombre">
          <div className="nombre">{s.name}</div>
          <div className="sis-etq">Nv. {s.level} · {s.title} · {s.stat}</div>
        </div>
        {s.streak > 0 && <span className="sis-racha"><Flame size={14} />{s.streak}</span>}
        <ChevronDown size={18} className={"sis-chev" + (abierta ? " on" : "")} />
      </button>
      <BarraRango s={s} ranks={d.ranks} />
      <div className="sis-hab-pie">
        <span>{horas(s.hours)} h practicadas</span>
        {s.sealed ? <span className="sello"><Lock size={11} /> Sellado · prueba {s.next_rank}</span>
          : s.next_rank ? <span>{fmt(s.xp)} / {fmt(s.rank_ceil)} XP → {s.next_rank}</span>
            : <span>{fmt(s.xp)} XP · la cumbre</span>}
      </div>
      {s.plan.generating && (
        <div className="sis-gen"><span className="sis-spin" /> El Sistema está diseñando un plan a medida…</div>
      )}
      {s.plan.queued && (
        <div className="sis-gen"><Wand2 size={13} /> En cola: Claude diseñará su plan a medida en su próxima ronda.</div>
      )}
      {abierta && <Detalle s={s} d={d} hoy={hoy} accion={accion} />}
    </div>
  );
}

function Detalle({ s, d, hoy, accion }) {
  const [editando, setEditando] = useState(false);
  const actual = s.path[s.rank_index];
  const sig = s.path[s.rank_index + 1];
  return (
    <div className="sis-det">
      {s.description && <p className="sis-objetivo">«{s.description}»</p>}

      <div className="sis-bloques">
        <div className="sis-bloque">
          <div className="sis-etq">Ya dominas · {actual.rank}</div>
          <p>{actual.skill}</p>
        </div>
        {sig && (
          <div className="sis-bloque sig">
            <div className="sis-etq">Para el rango {sig.rank}</div>
            <p>{sig.skill}</p>
          </div>
        )}
      </div>

      {s.daily ? (
        <div className="sis-linea">
          <Swords size={14} /> Misión de hoy: {s.daily.status === "hecha" ? "cumplida" : "en tus misiones del día"}
        </div>
      ) : (
        <PedirMision s={s} hoy={hoy} accion={accion} />
      )}

      {s.next_trial && <PruebaSiguiente s={s} />}
      <PracticaLibre s={s} hoy={hoy} accion={accion} />
      <Camino s={s} />
      <Hitos s={s} accion={accion} />
      <Registro s={s} />
      <Plan s={s} d={d} accion={accion} />

      <div className="sis-fin">
        <button className="sis-btn sec" onClick={() => setEditando((v) => !v)}><Pencil size={13} /> Ajustes</button>
        <span style={{ flex: 1 }} />
        <button className="sis-btn peligro"
          onClick={() => { if (window.confirm(`¿Borrar «${s.name}» y todo su progreso?`)) accion(() => api.deleteSkill(s.id), "No se pudo borrar."); }}>
          <Trash2 size={13} /> Borrar
        </button>
      </div>
      {editando && <Ajustes s={s} d={d} accion={accion} onListo={() => setEditando(false)} />}
    </div>
  );
}

function PedirMision({ s, hoy, accion }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <button className="sis-btn sis-btn-ancho" disabled={ocupado || s.plan.generating}
      onClick={async () => { setOcupado(true); await accion(() => api.requestDaily(s.id, hoy), "No se pudo pedir la misión."); setOcupado(false); }}>
      <Target size={15} /> {ocupado ? "Pidiendo…" : "Pedir misión de hoy"}
    </button>
  );
}

function PruebaSiguiente({ s }) {
  const t = s.next_trial;
  const apertura = s.rank_floor + 0.9 * (s.rank_ceil - s.rank_floor);
  return (
    <div className={"sis-prev" + (t.open ? " abierta" : "")}>
      <div className="sis-etq">{t.passed ? <ShieldCheck size={12} /> : <Lock size={12} />} Prueba del rango {t.rank} · {t.title}</div>
      <ul>{t.criteria.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <div className="sis-prev-estado">
        {t.passed ? `Superada: ascenderás al llegar a ${fmt(s.rank_ceil)} XP.`
          : t.open ? "Abierta: la tienes arriba, en «Prueba de ascenso»."
            : `Se abre al 90 % del rango (${fmt(apertura)} XP). Mientras, las misiones te preparan.`}
      </div>
    </div>
  );
}

function PracticaLibre({ s, hoy, accion }) {
  const [min, setMin] = useState(s.daily_minutes || 20);
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function registrar() {
    const m = parseInt(min, 10);
    if (ocupado || !m) return;
    setOcupado(true);
    const ok = await accion(() => api.logPractice(s.id, { date: hoy, minutes: m, note: nota.trim(), today: hoy }),
      "No se pudo registrar la práctica.");
    if (ok) setNota("");
    setOcupado(false);
  }
  return (
    <div className="sis-bloque-libre">
      <div className="sis-etq">Práctica libre de hoy</div>
      <div className="sis-chips">
        {MIN_LIBRE.map((x) => (
          <button key={x} className={"sis-btn chip" + (Number(min) === x ? " on" : "")} onClick={() => setMin(x)}>{x}′</button>
        ))}
        <input className="sis-input mini" type="number" min={1} max={720} value={min} aria-label="Minutos"
          onChange={(e) => setMin(e.target.value)} />
      </div>
      <input className="sis-input" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={500}
        placeholder="Qué practicaste (opcional)" />
      <button className="sis-btn" onClick={registrar} disabled={ocupado || !parseInt(min, 10)}>
        <Check size={15} /> {ocupado ? "Registrando…" : `Registrar ${parseInt(min, 10) || 0} min`}
      </button>
      <div className="sis-nota">Hoy llevas {s.today_minutes} min · cada minuto es 1 XP.</div>
    </div>
  );
}

function Camino({ s }) {
  return (
    <div className="sis-camino">
      <div className="sis-titulo">Camino de maestría</div>
      {s.path.map((p) => (
        <div key={p.rank} className={`sis-paso ${p.state}`}>
          <Rango r={p.rank} size={22} />
          <div className="txt">
            <div className="cab">
              <b>{p.title}</b>
              <span>{p.hours ? `≈ ${p.hours.toLocaleString("es-ES")} h` : "inicio"}</span>
              {p.certified && <ShieldCheck size={13} className="ok" aria-label="Certificado" />}
              {p.state === "locked" && <Lock size={12} className="candado" aria-label="Bloqueado" />}
            </div>
            <p>{p.skill}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Hitos({ s, accion }) {
  const [titulo, setTitulo] = useState("");
  const [xp, setXp] = useState(100);
  return (
    <div className="sis-hitos">
      <div className="sis-titulo">Hitos personales</div>
      {s.quests.length === 0 && (
        <p className="sis-sub">Logros concretos que quieres conseguir («tocar en la boda de mi primo»). Al cumplirlos ganas su XP, como mucho 300.</p>
      )}
      {s.quests.map((q) => (
        <div key={q.id} className={"sis-hito" + (q.done ? " hecho" : "")}>
          <button className="caja" aria-label={q.done ? "Desmarcar" : "Cumplir"}
            onClick={() => accion(() => api.updateQuest(q.id, { done: !q.done }), "No se pudo marcar el hito.")}>
            {q.done && <Check size={13} />}
          </button>
          <span className="t">{q.title}</span>
          <span className="punto" />
          <span className="xp">+{q.xp}</span>
          <button className="borrar" aria-label="Borrar hito" onClick={() => accion(() => api.deleteQuest(q.id), "No se pudo borrar.")}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <div className="sis-fila">
        <input className="sis-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160}
          placeholder="Nuevo hito" />
        <select className="sis-input xp" value={xp} onChange={(e) => setXp(parseInt(e.target.value, 10))} aria-label="XP del hito">
          {XP_HITO.map((x) => <option key={x} value={x}>+{x}</option>)}
        </select>
        <button className="sis-btn" disabled={!titulo.trim()} aria-label="Añadir hito"
          onClick={async () => { if (await accion(() => api.createQuest(s.id, { title: titulo.trim(), xp }), "No se pudo crear el hito.")) setTitulo(""); }}>
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

function Registro({ s }) {
  const max = Math.max(30, ...s.recent.map((r) => r.minutes));
  if (!s.recent.some((r) => r.minutes > 0)) return null;
  return (
    <div className="sis-registro">
      <div className="sis-titulo">Últimos 14 días</div>
      <div className="barras">
        {s.recent.map((r) => (
          <div key={r.date} title={`${r.date}: ${r.minutes} min`}>
            <i style={{ height: r.minutes ? Math.max(5, (r.minutes / max) * 44) : 2, opacity: r.minutes ? 1 : 0.35 }} />
            <span>{Number(r.date.slice(8))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Plan({ s, d, accion }) {
  const p = s.plan;
  const [ocupado, setOcupado] = useState(false);
  async function run(fn) { setOcupado(true); await accion(fn, "No se pudo preparar el plan."); setOcupado(false); }
  const texto = p.generating ? "El Sistema está diseñando un plan a medida para esta habilidad…"
    : p.queued ? "En cola: Claude lo diseñará con tu suscripción en su próxima ronda (cada 2 horas de día, o al lanzarlo en GitHub → Actions). Mientras, sigues con el plan de su tipo."
    : p.source === "ia" ? `Diseñado a medida para «${s.name}».`
      : p.category === "general" ? "Plan general de práctica deliberada."
        : `Plan preparado para ${p.category_label.toLowerCase()}.`;
  return (
    <div className="sis-plan">
      <div className="sis-etq">Plan del Sistema</div>
      <p>{texto}{p.failed && !p.generating ? " No se pudo preparar el plan a medida, así que sigues con este." : ""}</p>
      {!p.generating && (
        <div className="sis-m-acciones">
          {d.ai.enabled && !p.queued && (
            <button className="sis-btn sec" disabled={ocupado} onClick={() => run(() => api.makePlan(s.id))}>
              <Wand2 size={14} /> {p.source === "ia" ? "Rehacer a medida" : "Diseñar a medida"}
            </button>
          )}
          {p.source === "ia" && !p.queued && (
            <button className="sis-link" disabled={ocupado} onClick={() => run(() => api.dropPlan(s.id))}>
              Volver al plan de su tipo
            </button>
          )}
          {p.queued && (
            <button className="sis-link" disabled={ocupado} onClick={() => run(() => api.dropPlan(s.id))}>
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Alta y ajustes ────────────────────────────────────── */

function PuntoDePartida({ ranks, rango, setRango, horasPrevias, setHorasPrevias }) {
  const r = ranks.find((x) => x.rank === rango) || ranks[0];
  return (
    <div className="sis-partida">
      <div className="sis-etq">Punto de partida</div>
      <div className="sis-chips">
        {ranks.slice(0, 5).map((x) => (
          <button key={x.rank} className={"sis-btn chip rango" + (rango === x.rank ? " on" : "")}
            onClick={() => setRango(x.rank)} aria-label={`Rango ${x.rank}: ${x.title}`}>
            {x.rank}
          </button>
        ))}
      </div>
      <p className="sis-sub"><b>{r.rank} · {r.title}.</b> {r.meaning}</p>
      <div className="sis-fila">
        <span className="sis-etq" style={{ flex: 1 }}>Horas que ya llevas</span>
        <input className="sis-input mini" type="number" min={r.hours} max={10000} value={horasPrevias}
          placeholder={String(r.hours)} aria-label="Horas que ya llevas"
          onChange={(e) => setHorasPrevias(e.target.value)} />
      </div>
      {rango !== "E" && (
        <p className="sis-nota">Empiezas con al menos {r.hours.toLocaleString("es-ES")} h y con las pruebas hasta el rango {rango} convalidadas.</p>
      )}
    </div>
  );
}

function NuevaHabilidad({ d, onListo, onCancelar }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [stat, setStat] = useState("INT");
  const [daily, setDaily] = useState(15);
  const [rango, setRango] = useState("E");
  const [previas, setPrevias] = useState("");
  const [honesto, setHonesto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const valido = name.trim() && (rango === "E" || honesto);

  async function crear() {
    if (!valido || ocupado) return;
    setOcupado(true);
    try {
      const h = parseFloat(String(previas).replace(",", "."));
      const r = await api.createSkillB({
        name: name.trim(), description: description.trim(), stat, daily_minutes: daily,
        category: category || null, start_rank: rango, start_hours: Number.isFinite(h) ? h : null,
      });
      avisar(r.ai_plan
        ? `[SISTEMA] ${name.trim()} registrada. Estoy diseñando su plan a medida; sus misiones llegarán en un momento.`
        : `[SISTEMA] Nueva habilidad registrada: ${name.trim()}.`, "ok");
      onListo();
    } catch (e) { avisar(e?.humano || "No se pudo crear."); }
    finally { setOcupado(false); }
  }

  return (
    <div className="sis-ventana">
      <div className="sis-titulo">Nueva habilidad</div>
      <input className="sis-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
        placeholder="Nombre (p. ej. Guitarra, Japonés, Calistenia)" />
      <textarea className="sis-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
        placeholder="¿Qué quieres conseguir? (p. ej. tocar en una jam, aprobar el C1, una parada de manos libre)" />

      <div className="sis-etq">Tipo</div>
      <select className="sis-input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Tipo de habilidad">
        <option value="">Lo detecta el Sistema</option>
        {d.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>

      <div className="sis-etq">Atributo</div>
      <div className="sis-chips">
        {Object.entries(ATRIBUTOS).map(([k, v]) => (
          <button key={k} className={"sis-btn chip" + (stat === k ? " on" : "")} onClick={() => setStat(k)} title={v}>{k}</button>
        ))}
      </div>

      <div className="sis-etq">Minutos al día</div>
      <div className="sis-chips">
        {MIN_AL_DIA.map((x) => (
          <button key={x} className={"sis-btn chip" + (daily === x ? " on" : "")} onClick={() => setDaily(x)}>
            {x === 0 ? "Pausa" : `${x}′`}
          </button>
        ))}
      </div>
      <p className="sis-nota">{daily === 0 ? "Sin misiones diarias: podrás pedirlas cuando quieras." : "El Sistema ajusta sus misiones a este tiempo."}</p>

      <PuntoDePartida ranks={d.ranks} rango={rango} setRango={setRango} horasPrevias={previas} setHorasPrevias={setPrevias} />
      {rango !== "E" && (
        <label className={"sis-check" + (honesto ? " on" : "")}>
          <input type="checkbox" checked={honesto} onChange={() => setHonesto((v) => !v)} />
          <span className="caja" aria-hidden="true">{honesto && <Check size={13} strokeWidth={3} />}</span>
          <span>Lo cumplo de verdad: sé hacer lo que pide este rango.</span>
        </label>
      )}
      {d.ai.enabled && <p className="sis-nota"><Wand2 size={12} /> {d.ai.via === "claude"
        ? "Claude diseñará un plan de misiones a medida para esta habilidad (con tu suscripción, en su próxima ronda)."
        : "El Sistema diseñará un plan de misiones a medida para esta habilidad."}</p>}

      <div className="sis-m-acciones" style={{ marginTop: 12 }}>
        <button className="sis-btn ok" onClick={crear} disabled={!valido || ocupado}>
          <Check size={14} /> {ocupado ? "Registrando…" : "Registrar"}
        </button>
        <button className="sis-btn sec" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function Ajustes({ s, d, accion, onListo }) {
  const [name, setName] = useState(s.name);
  const [description, setDescription] = useState(s.description || "");
  const [category, setCategory] = useState(s.plan.category);
  const [stat, setStat] = useState(s.stat);
  const [daily, setDaily] = useState(s.daily_minutes);
  const [rango, setRango] = useState(s.placed_rank || "E");
  const [previas, setPrevias] = useState(s.base_hours ? String(s.base_hours) : "");
  const [ocupado, setOcupado] = useState(false);

  async function guardar() {
    if (!name.trim() || ocupado) return;
    setOcupado(true);
    const datos = { name: name.trim(), description: description.trim(), category, stat,
      daily_minutes: Math.max(0, parseInt(daily, 10) || 0) };
    if (rango !== (s.placed_rank || "E")) datos.start_rank = rango;
    const h = parseFloat(String(previas).replace(",", "."));
    if (Number.isFinite(h) && h !== s.base_hours) datos.start_hours = h;
    const ok = await accion(() => api.updateSkillB(s.id, datos), "No se pudo guardar.");
    setOcupado(false);
    if (ok) onListo();
  }

  return (
    <div className="sis-ajustes">
      <input className="sis-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Nombre" />
      <textarea className="sis-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
        maxLength={500} placeholder="¿Qué quieres conseguir?" aria-label="Objetivo" />
      <div className="sis-fila">
        <select className="sis-input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Tipo">
          {d.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="sis-input" value={stat} onChange={(e) => setStat(e.target.value)} aria-label="Atributo">
          {Object.entries(ATRIBUTOS).map(([k, v]) => <option key={k} value={k}>{k} · {v}</option>)}
        </select>
      </div>
      <div className="sis-fila">
        <span className="sis-etq" style={{ flex: 1 }}>Minutos al día (0 = pausa)</span>
        <input className="sis-input mini" type="number" min={0} max={600} value={daily}
          onChange={(e) => setDaily(e.target.value)} aria-label="Minutos al día" />
      </div>
      <PuntoDePartida ranks={d.ranks} rango={rango} setRango={setRango} horasPrevias={previas} setHorasPrevias={setPrevias} />
      <button className="sis-btn ok" onClick={guardar} disabled={!name.trim() || ocupado}>
        <Check size={14} /> {ocupado ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}

/* ── Ventanas del Sistema ──────────────────────────────── */

function Ventana({ v, onClose }) {
  useEffect(() => {
    const tecla = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onClose]);
  // Se pinta en <body>: dentro de la sección, un contenedor animado con transform
  // la encerraría en su caja en lugar de cubrir toda la pantalla.
  return createPortal(
    <div className="sis">
    <div className="sis-velo" onClick={onClose} role="dialog" aria-modal="true" aria-label="Aviso del Sistema">
      {v.tipo === "ascenso" ? (
        <div className="sis-ventana sis-alerta sis-ascenso">
          <div className="sis-titulo">Sistema</div>
          <div className="sis-asc-cab">Ascenso de rango</div>
          <div className="sis-asc-rangos">
            <Rango r={v.old_rank} size={30} />
            <i className="flecha" aria-hidden="true" />
            <Rango r={v.rank} size={66} />
          </div>
          <div className="grande">{v.title}</div>
          <div className="sis-asc-hab">{v.name}</div>
          {v.competence && <p className="sis-asc-txt">{v.competence}</p>}
          {v.next_rank && <div className="sis-etq sis-asc-sig">Siguiente: {v.next_rank} · {v.next_title} · ≈ {v.next_hours.toLocaleString("es-ES")} h</div>}
          <div className="sis-etq sis-toca">Toca para continuar</div>
        </div>
      ) : v.tipo === "prueba" ? (
        <div className="sis-ventana sis-alerta sis-ascenso">
          <div className="sis-titulo">Sistema</div>
          <div className="sis-asc-cab">Prueba superada</div>
          <div className="sis-asc-rangos"><Rango r={v.next_rank || v.rank} size={56} /></div>
          <div className="sis-asc-hab">{v.name}</div>
          <p className="sis-asc-txt">
            Has demostrado el rango {v.next_rank}. Ascenderás a {v.next_title} en cuanto tu experiencia llegue al
            rango (≈ {(v.next_hours || 0).toLocaleString("es-ES")} h).
          </p>
          <div className="sis-etq sis-toca">Toca para continuar</div>
        </div>
      ) : (
        <div className="sis-ventana sis-alerta">
          <div className="sis-titulo">Sistema</div>
          <div className="grande">¡Has subido de nivel!</div>
          <div className="sis-alerta-linea">{v.name} · Nv. {v.old_level} → Nv. {v.level}</div>
          <div className="sis-etq sis-toca">Toca para continuar</div>
        </div>
      )}
    </div>
    </div>,
    document.body,
  );
}
