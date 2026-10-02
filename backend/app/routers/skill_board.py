"""
routers/skill_board.py — EL SISTEMA: habilidades, misiones y pruebas de ascenso
───────────────────────────────────────────────────────────────────────────────
Cada habilidad sigue su camino de rangos, de E Novato a S Maestro (ver
maestria.py), y el Sistema propone cada día las misiones con las que avanzar
de verdad:

  · MISIONES DIARIAS: hasta 3 al día, para las habilidades que más lo
    necesitan (una prueba abierta, varios días sin practicar), adaptadas al
    rango de cada una. Cada habilidad puede cambiar su misión una vez al día.
  · MISIÓN SEMANAL: un reto mayor por habilidad (hasta 3), cada lunes.
  · PRUEBA DE ASCENSO: se abre al 90 % de un rango; sin superarla no se
    asciende. Mientras está abierta, algunas misiones son ensayos de la prueba.

Las misiones se crean al pedir el tablero (o la pantalla de Hoy, o el widget)
y se guardan: el mismo día son siempre las mismas, aunque recargues.

  GET    /skill-board?date=AAAA-MM-DD         → estado, misiones y habilidades
  POST   /skill-board/skills                  → nueva habilidad (con su plan)
  PATCH  /skill-board/skills/{id}             → ajustes, incluido el punto de partida
  POST   /skill-board/skills/{id}/log         → práctica libre
  POST   /skill-board/skills/{id}/daily       → pedir la misión de hoy de esa habilidad
  POST   /skill-board/skills/{id}/plan        → plan a medida con IA (o rehacerlo)
  DELETE /skill-board/skills/{id}/plan        → volver al plan de su tipo
  POST   /skill-board/missions/{id}/complete  → cumplir una misión o superar una prueba
  POST   /skill-board/missions/{id}/undo      → deshacer
  POST   /skill-board/missions/{id}/reroll    → cambiarla por otra
  DELETE /skill-board/logs/{id}
  POST   /skill-board/skills/{id}/quests · PATCH/DELETE /skill-board/quests/{id}   → hitos personales
  POST   /skill-board/from-task/{task_id}     → una tarea suelta pasa a ser habilidad
(Borrar una habilidad: DELETE /skills/{id}, que ya existía.)

Las acciones sobre misiones devuelven el tablero ya actualizado, para que la
pantalla cambie con una sola petición.
"""

import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date as date_type, datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app import ai_budget, maestria, models, schemas
from app.auth import get_current_user_id
from app.database import get_db
from app.fechas import fecha_local, hoy_utc, lunes_de, mejor_racha, racha

router = APIRouter(prefix="/skill-board", tags=["skill_board"])

MAX_DIARIAS = 3
MAX_SEMANALES = 3
PERIODO_PRUEBA = date_type(2000, 1, 1)
ATRIBUTOS = ("STR", "AGI", "VIT", "INT", "PER", "SEN")


def _semilla(*partes) -> int:
    return int.from_bytes(hashlib.sha256(":".join(map(str, partes)).encode()).digest()[:4], "big")


def _ahora():
    return datetime.now(timezone.utc)


# ── Cálculo ───────────────────────────────────────────────

@dataclass
class Ficha:
    """Una habilidad con todo lo calculado. Solo datos: no caduca al confirmar cambios."""
    id: int
    name: str
    description: str
    stat: str
    daily_minutes: int
    placed_rank: str
    base_minutes: int
    quests: list
    plan: dict
    plan_info: dict
    por_dia: dict              # fecha → minutos practicados
    hechas: dict               # {"diaria": n, "semanal": n} misiones cumplidas
    superada: int              # índice del rango más alto con su prueba superada
    xp: int = 0
    prog: dict = field(default_factory=dict)

    @property
    def sellado(self) -> int:
        """Rango más alto certificado: por prueba superada o convalidado al empezar."""
        return max(maestria.indice(self.placed_rank), self.superada)

    @property
    def minutos(self) -> int:
        return sum(self.por_dia.values())

    @property
    def ultima(self):
        return max((d for d, m in self.por_dia.items() if m > 0), default=None)


def _fichas(db, user_id, sid=None) -> list[Ficha]:
    """Todas las habilidades (o una) con su XP, rango y nivel. 5 consultas."""
    q = (db.query(models.Skill)
         .options(selectinload(models.Skill.quests), selectinload(models.Skill.plan))
         .filter(models.Skill.user_id == user_id))
    if sid is not None:
        q = q.filter(models.Skill.id == sid)
    habilidades = q.order_by(models.Skill.created_at.asc(), models.Skill.id.asc()).all()
    if not habilidades:
        return []

    lq = (db.query(models.SkillLog.skill_id, models.SkillLog.date, func.sum(models.SkillLog.minutes))
          .filter(models.SkillLog.user_id == user_id))
    mq = (db.query(models.SkillMission.skill_id, models.SkillMission.kind,
                   models.SkillMission.rank_target, func.count(models.SkillMission.id))
          .filter(models.SkillMission.user_id == user_id, models.SkillMission.status == "hecha"))
    if sid is not None:
        lq = lq.filter(models.SkillLog.skill_id == sid)
        mq = mq.filter(models.SkillMission.skill_id == sid)

    por_dia = defaultdict(dict)
    for skill_id, dia, minutos in lq.group_by(models.SkillLog.skill_id, models.SkillLog.date).all():
        por_dia[skill_id][dia] = int(minutos or 0)
    hechas = defaultdict(lambda: {"diaria": 0, "semanal": 0})
    superada = defaultdict(int)
    for skill_id, kind, objetivo, n in mq.group_by(models.SkillMission.skill_id, models.SkillMission.kind,
                                                    models.SkillMission.rank_target).all():
        if kind == "prueba":
            superada[skill_id] = max(superada[skill_id], maestria.indice(objetivo))
        elif kind in ("diaria", "semanal"):
            hechas[skill_id][kind] += int(n)

    ahora = _ahora()
    fichas = []
    for s in habilidades:
        f = Ficha(
            id=s.id, name=s.name, description=s.description or "", stat=s.stat or "INT",
            daily_minutes=s.daily_minutes if s.daily_minutes is not None else 15,
            placed_rank=s.placed_rank or "E", base_minutes=s.base_minutes or 0,
            quests=[{"id": q.id, "title": q.title, "xp": min(q.xp or 0, maestria.XP_HITO_MAX),
                     "done": bool(q.done), "done_at": q.done_at.isoformat() if q.done_at else None}
                    for q in s.quests],
            plan=maestria.plan_de(s), plan_info=maestria.info_plan(s, ahora),
            por_dia=por_dia.get(s.id, {}), hechas=dict(hechas[s.id]), superada=superada.get(s.id, 0),
        )
        hitos = sum(q["xp"] for q in f.quests if q["done"])
        f.xp = (f.base_minutes + f.minutos + hitos
                + maestria.XP_DIARIA * f.hechas["diaria"] + maestria.XP_SEMANAL * f.hechas["semanal"])
        f.prog = maestria.progreso(f.xp, f.sellado)
        fichas.append(f)
    return fichas


def _ficha(db, user_id, sid) -> Ficha:
    fichas = _fichas(db, user_id, sid)
    if not fichas:
        raise HTTPException(status_code=404, detail="Habilidad no encontrada")
    return fichas[0]


def _misiones(db, user_id, hoy, sid=None):
    """Las misiones de las dos últimas semanas y todas las pruebas de ascenso."""
    q = (db.query(models.SkillMission)
         .filter(models.SkillMission.user_id == user_id,
                 or_(models.SkillMission.period >= hoy - timedelta(days=15),
                     models.SkillMission.kind == "prueba")))
    if sid is not None:
        q = q.filter(models.SkillMission.skill_id == sid)
    return q.order_by(models.SkillMission.id.asc()).all()


def _dias_cumplidos(db, user_id, hoy) -> set:
    """Días en que se cumplieron TODAS las misiones diarias asignadas (la racha del Sistema)."""
    filas = (db.query(models.SkillMission.period, models.SkillMission.status)
             .filter(models.SkillMission.user_id == user_id, models.SkillMission.kind == "diaria",
                     models.SkillMission.extra == False,  # noqa: E712
                     models.SkillMission.status != "cambiada",
                     models.SkillMission.period > hoy - timedelta(days=400),
                     models.SkillMission.period <= hoy).all())
    por_dia = defaultdict(list)
    for d, st in filas:
        por_dia[d].append(st == "hecha")
    return {d for d, v in por_dia.items() if v and all(v)}


# ── Elegir y crear misiones ───────────────────────────────

def _sin_punto(texto: str) -> str:
    return texto.rstrip(" .")


def _minuscula(texto: str) -> str:
    return texto[:1].lower() + texto[1:]


def _elegir(candidatas, evitar, semilla, tope_min=None, prohibido=()):
    """Una misión del plan que no se haya hecho estos días y que quepa en el tiempo diario."""
    pool = [c for c in candidatas if c["titulo"] not in prohibido] or list(candidatas)
    for filtro in (lambda c: c["titulo"] not in evitar and (tope_min is None or c["minutos"] <= tope_min),
                   lambda c: c["titulo"] not in evitar,
                   lambda c: True):
        libres = [c for c in pool if filtro(c)]
        if libres:
            return libres[semilla % len(libres)]


def _nueva(f, user_id, kind, period, slot, datos, xp, extra=False, rank_target=None, criterios=None):
    return models.SkillMission(
        skill_id=f.id, user_id=user_id, kind=kind, period=period, slot=slot,
        title=datos["titulo"], detail=datos["detalle"], minutes=int(datos["minutos"]), xp=xp,
        status="activa", extra=extra, rank_target=rank_target,
        criteria=json.dumps(criterios, ensure_ascii=False) if criterios else None)


def _diaria(f, user_id, hoy, slot, extra, evitar, prohibido=(), ensayo=True):
    p = f.prog
    dia = hoy.toordinal()
    if ensayo and p["trial_open"] and (dia + f.id) % 2 == 0:
        # Con la prueba abierta, un día de cada dos la misión es ensayarla
        letra = p["next_rank"]
        criterios = f.plan["pruebas"][letra]["criterios"]
        titulo = f"Ensayo de la prueba {letra}"
        if titulo not in prohibido:
            c = _sin_punto(criterios[(dia // 2) % len(criterios)])
            datos = {"titulo": titulo, "minutos": max(15, min(60, f.daily_minutes or 20)),
                     "detalle": (f"Trabaja hoy uno de los criterios de tu prueba de ascenso al rango {letra}: «{c}». "
                                 "Ensáyalo en condiciones reales, como si fuera el examen, y apunta qué te separa de "
                                 "cumplirlo. Hecho cuando hayas hecho un intento completo y sepas qué te queda "
                                 "por pulir.")}
            return _nueva(f, user_id, "diaria", hoy, slot, datos, maestria.XP_DIARIA, extra, rank_target=letra)
    banda = maestria.BANDAS[p["rank_index"]]
    tope = max(15, (f.daily_minutes or 15) * 2)
    datos = _elegir(f.plan["diarias"][banda], evitar, _semilla(user_id, f.id, hoy, slot), tope, prohibido)
    return _nueva(f, user_id, "diaria", hoy, slot, datos, maestria.XP_DIARIA, extra)


def _semanal(f, user_id, lunes, slot, evitar, prohibido=(), simulacro=True):
    p = f.prog
    if simulacro and p["trial_open"] and (lunes.toordinal() // 7 + f.id) % 2 == 0:
        letra = p["next_rank"]
        titulo = f"Simulacro de la prueba {letra}"
        if titulo not in prohibido:
            crit = "; ".join(_minuscula(_sin_punto(c)) for c in f.plan["pruebas"][letra]["criterios"])
            datos = {"titulo": titulo, "minutos": 60,
                     "detalle": (f"Reserva una sesión larga y haz completa la prueba de ascenso al rango {letra}, "
                                 f"como si fuera de verdad: {crit}. Grábate o busca a alguien que te evalúe. Hecho "
                                 "cuando hayas intentado todos los criterios y sepas cuáles cumples ya.")}
            return _nueva(f, user_id, "semanal", lunes, slot, datos, maestria.XP_SEMANAL, rank_target=letra)
    banda = maestria.BANDAS[p["rank_index"]]
    datos = _elegir(f.plan["semanales"][banda], evitar, _semilla(user_id, f.id, lunes, slot), None, prohibido)
    return _nueva(f, user_id, "semanal", lunes, slot, datos, maestria.XP_SEMANAL)


def _prueba(f, user_id):
    letra = f.prog["next_rank"]
    i = maestria.indice(letra)
    pr = f.plan["pruebas"][letra]
    datos = {"titulo": pr["titulo"], "detalle": maestria.RANGOS[i].sentido, "minutos": 0}
    return _nueva(f, user_id, "prueba", PERIODO_PRUEBA, i, datos, 0, rank_target=letra, criterios=pr["criterios"])


def _recientes(misiones, sid, kind, desde) -> set:
    return {m.title for m in misiones if m.skill_id == sid and m.kind == kind and m.period >= desde}


def _prioridad(f, hoy, user_id) -> int:
    """Qué habilidades reciben misión hoy: las que tienen la prueba abierta y las más abandonadas."""
    p = 1000 if f.prog["trial_open"] else 0
    dias = (hoy - f.ultima).days if f.ultima else 30
    return p + min(max(dias, 0), 30) * 10 + _semilla(user_id, hoy, f.id) % 10


def _asegurar(db, user_id, hoy, fichas, misiones, completo=True) -> bool:
    """
    Crea lo que falte: las misiones de hoy, la semanal de esta semana y las
    pruebas que se hayan abierto. Devuelve True si ha creado algo.
    """
    nuevas = []
    listas = [f for f in fichas if not f.plan_info["generating"]]   # sin plan aún, se espera
    activas = sorted((f for f in listas if (f.daily_minutes or 0) > 0),
                     key=lambda f: _prioridad(f, hoy, user_id), reverse=True)

    de_hoy = [m for m in misiones if m.kind == "diaria" and m.period == hoy]
    con_mision = {m.skill_id for m in de_hoy}
    huecos = MAX_DIARIAS - len({m.skill_id for m in de_hoy if not m.extra})
    # el primer lote del día es «el de hoy»; lo que se añada después (una habilidad nueva) es extra
    extra = bool(de_hoy)
    for f in [f for f in activas if f.id not in con_mision][:max(0, huecos)]:
        nuevas.append(_diaria(f, user_id, hoy, 0, extra,
                              _recientes(misiones, f.id, "diaria", hoy - timedelta(days=6))))

    if completo:
        lunes = lunes_de(hoy)
        con_semanal = {m.skill_id for m in misiones if m.kind == "semanal" and m.period == lunes}
        huecos = MAX_SEMANALES - len(con_semanal)
        for f in [f for f in activas if f.id not in con_semanal][:max(0, huecos)]:
            nuevas.append(_semanal(f, user_id, lunes, 0,
                                   _recientes(misiones, f.id, "semanal", lunes - timedelta(days=14))))
        abiertas = {(m.skill_id, m.rank_target) for m in misiones if m.kind == "prueba"}
        for f in listas:
            if f.prog["trial_open"] and (f.id, f.prog["next_rank"]) not in abiertas:
                nuevas.append(_prueba(f, user_id))

    if not nuevas:
        return False
    db.add_all(nuevas)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()          # otra petición las creó a la vez: valen las suyas
    return True


def misiones_de_hoy(db, user_id, hoy) -> dict:
    """Para Hoy y el widget: cuántas misiones diarias hay hoy y cuántas están cumplidas."""
    def contar():
        return [st for (st,) in db.query(models.SkillMission.status)
                .filter(models.SkillMission.user_id == user_id, models.SkillMission.kind == "diaria",
                        models.SkillMission.period == hoy, models.SkillMission.status != "cambiada").all()]

    estados = contar()
    if not estados:
        activa = (db.query(models.Skill.id)
                  .filter(models.Skill.user_id == user_id, models.Skill.daily_minutes > 0).first())
        if activa is not None:
            fichas = _fichas(db, user_id)
            if _asegurar(db, user_id, hoy, fichas, _misiones(db, user_id, hoy), completo=False):
                estados = contar()
    return {"total": len(estados), "done": sum(1 for st in estados if st == "hecha")}


# ── Lo que ve la pantalla ─────────────────────────────────

def _mision_json(m, por_id, cambiadas) -> dict:
    f = por_id.get(m.skill_id)
    prueba = m.kind == "prueba"
    return {
        "id": m.id, "skill_id": m.skill_id, "skill": f.name if f else "",
        "skill_rank": f.prog["rank"] if f else "E",
        "kind": m.kind, "title": m.title, "detail": m.detail or "", "minutes": m.minutes or 0,
        "xp": m.xp or 0, "status": m.status, "extra": bool(m.extra),
        "rehearsal": None if prueba else m.rank_target,
        "target": m.rank_target if prueba else None,
        "target_title": maestria.RANGOS[maestria.indice(m.rank_target)].titulo if prueba else None,
        "criteria": json.loads(m.criteria) if m.criteria else [],
        "note": m.note or "",
        "period": m.period.isoformat(),
        "done_at": m.done_at.isoformat() if m.done_at else None,
        "can_reroll": (not prueba and m.status == "activa"
                       and (m.skill_id, m.kind, m.period) not in cambiadas),
    }


def _habilidad_json(f, hoy, diaria=None) -> dict:
    p = f.prog
    i = p["rank_index"]
    camino = [{"rank": r.letra, "title": r.titulo, "hours": r.horas,
               "skill": f.plan["competencias"].get(r.letra, ""),
               "state": ("done" if j < i else "current" if j == i else "next" if j == i + 1 else "locked"),
               "certified": 0 < j <= f.sellado}
              for j, r in enumerate(maestria.RANGOS)]
    siguiente = None
    if p["next_rank"]:
        pr = f.plan["pruebas"][p["next_rank"]]
        siguiente = {"rank": p["next_rank"], "title": pr["titulo"], "criteria": pr["criterios"],
                     "open": p["trial_open"], "passed": f.sellado > i}
    practicados = {d for d, m in f.por_dia.items() if m > 0}
    return {
        "id": f.id, "name": f.name, "description": f.description, "stat": f.stat,
        "daily_minutes": f.daily_minutes, "placed_rank": f.placed_rank,
        "base_hours": round(f.base_minutes / 60, 1),
        **p,
        "hours": round((f.base_minutes + f.minutos) / 60, 1),
        "meaning": maestria.RANGOS[i].sentido,
        "today_minutes": f.por_dia.get(hoy, 0),
        "streak": racha(practicados, hoy),
        "best_streak": mejor_racha(practicados),
        "missions_done": f.hechas["diaria"] + f.hechas["semanal"],
        "plan": f.plan_info,
        "path": camino,
        "next_trial": siguiente,
        "daily": {"id": diaria.id, "status": diaria.status} if diaria else None,
        "quests": f.quests,
        "recent": [{"date": (hoy - timedelta(days=k)).isoformat(),
                    "minutes": f.por_dia.get(hoy - timedelta(days=k), 0)} for k in range(13, -1, -1)],
    }


def _tablero(db, user_id, hoy) -> dict:
    fichas = _fichas(db, user_id)
    misiones = _misiones(db, user_id, hoy)
    if fichas and _asegurar(db, user_id, hoy, fichas, misiones):
        misiones = _misiones(db, user_id, hoy)

    por_id = {f.id: f for f in fichas}
    lunes = lunes_de(hoy)
    cambiadas = {(m.skill_id, m.kind, m.period) for m in misiones if m.status == "cambiada"}
    vigentes = [m for m in misiones if m.skill_id in por_id and m.status != "cambiada"]
    # en el orden de las habilidades: al cambiar una misión, la nueva no salta al final
    orden = {f.id: i for i, f in enumerate(fichas)}
    vigentes.sort(key=lambda m: (orden[m.skill_id], m.id))
    diarias = [m for m in vigentes if m.kind == "diaria" and m.period == hoy]
    semanales = [m for m in vigentes if m.kind == "semanal" and m.period == lunes]
    pruebas = [m for m in vigentes if m.kind == "prueba" and m.status == "activa"]
    diaria_de = {m.skill_id: m for m in diarias}

    cumplidos = _dias_cumplidos(db, user_id, hoy) if fichas else set()
    atributos = {a: 0 for a in ATRIBUTOS}
    for f in fichas:
        atributos[f.stat if f.stat in atributos else "INT"] += f.prog["level"]
    mejor = max(fichas, key=lambda f: (f.prog["rank_index"], f.prog["level"]), default=None)
    ia = maestria.ia_disponible()
    return {
        "date": hoy.isoformat(),
        "player": {
            "level": sum(f.prog["level"] for f in fichas),
            "rank": mejor.prog["rank"] if mejor else "E",
            "title": mejor.prog["title"] if mejor else maestria.RANGOS[0].titulo,
            "hours": round(sum(f.base_minutes + f.minutos for f in fichas) / 60, 1),
            "xp": sum(f.xp for f in fichas),
            "streak": racha(cumplidos, hoy),
            "best_streak": mejor_racha(cumplidos),
            "missions_done": sum(f.hechas["diaria"] + f.hechas["semanal"] for f in fichas),
        },
        "stats": atributos,
        "daily": [_mision_json(m, por_id, cambiadas) for m in diarias],
        "weekly": [_mision_json(m, por_id, cambiadas) for m in semanales],
        "week": {"start": lunes.isoformat(), "days_left": 7 - hoy.weekday()},
        "trials": [_mision_json(m, por_id, cambiadas) for m in pruebas],
        "skills": [_habilidad_json(f, hoy, diaria_de.get(f.id)) for f in fichas],
        "ai": {"enabled": ia, "remaining": ai_budget.restante(db, user_id)["restantes"] if ia else 0},
        "ranks": [{"rank": r.letra, "title": r.titulo, "hours": r.horas, "meaning": r.sentido,
                   "levels": [r.nivel_ini, r.nivel_fin]} for r in maestria.RANGOS],
        "categories": [{"id": k, "label": v} for k, v in maestria.CATEGORIAS.items()],
        "rewards": {"daily": maestria.XP_DIARIA, "weekly": maestria.XP_SEMANAL,
                    "quest_max": maestria.XP_HITO_MAX},
    }


def _cambio(a: Ficha, d: Ficha) -> dict:
    """Qué ha cambiado en una habilidad tras una acción: para las ventanas de nivel y de ascenso."""
    pa, pd = a.prog, d.prog
    return {
        "xp_gained": d.xp - a.xp,
        "level_up": pd["level"] > pa["level"],
        "rank_up": pd["rank_index"] > pa["rank_index"],
        "sealed": pd["sealed"] and not pa["sealed"],
        "trial_opened": pd["trial_open"] and not pa["trial_open"],
        "skill": {
            "id": d.id, "name": d.name, "level": pd["level"], "old_level": pa["level"],
            "rank": pd["rank"], "old_rank": pa["rank"], "title": pd["title"],
            "meaning": maestria.RANGOS[pd["rank_index"]].sentido,
            "competence": d.plan["competencias"].get(pd["rank"], ""),
            "next_rank": pd["next_rank"], "next_title": pd["next_title"], "next_hours": pd["next_hours"],
            "hours": round((d.base_minutes + d.minutos) / 60, 1),
        },
    }


@router.get("")
def board(date: date_type, db: Session = Depends(get_db),
          user_id: str = Depends(get_current_user_id)):
    return _tablero(db, user_id, fecha_local(date))


# ── Habilidades ───────────────────────────────────────────

def _habilidad(db, user_id, sid) -> models.Skill:
    s = (db.query(models.Skill)
         .filter(models.Skill.id == sid, models.Skill.user_id == user_id).first())
    if s is None:
        raise HTTPException(status_code=404, detail="Habilidad no encontrada")
    return s


def _fijar_partida(s, rango=None, horas=None):
    """Punto de partida: el rango convalidado exige al menos sus horas."""
    if rango is not None:
        s.placed_rank = rango
    if horas is not None:
        s.base_minutes = int(round(horas * 60))
    s.base_minutes = max(s.base_minutes or 0, maestria.xp_minimo(maestria.indice(s.placed_rank)))


def _nueva_habilidad(db, user_id, nombre, descripcion="", stat="INT", minutos=15,
                     categoria=None, rango="E", horas=None) -> models.Skill:
    nombre = " ".join((nombre or "").split())[:80] or "Nueva habilidad"
    descripcion = (descripcion or "").strip()
    s = models.Skill(user_id=user_id, name=nombre, description=descripcion, stat=stat,
                     daily_minutes=minutos, level=0, placed_rank="E", base_minutes=0,
                     category=categoria or maestria.detectar_categoria(nombre, descripcion))
    _fijar_partida(s, rango, horas)
    db.add(s)
    db.flush()
    return s


def _encargar_plan(db, user_id, s, tareas: BackgroundTasks, obligatorio=False) -> bool:
    """Pide a la IA un plan a medida, en segundo plano. Sin IA o sin presupuesto, sigue la plantilla."""
    if not maestria.ia_disponible():
        if obligatorio:
            raise HTTPException(status_code=409,
                                detail="El servidor no tiene la IA configurada: el Sistema usa el plan "
                                       "preparado para este tipo de habilidad.")
        return False
    try:
        ai_budget.consumir(db, user_id)
    except HTTPException:
        if obligatorio:
            raise
        return False
    fila = s.plan
    if fila is None:
        fila = models.SkillPlan(skill_id=s.id, user_id=user_id)
        db.add(fila)
    fila.status = "generando"
    fila.requested_at = _ahora()
    fila.error = None
    db.commit()
    tareas.add_task(maestria.preparar_plan, s.id, user_id)
    return True


@router.post("/skills")
def create_skill(data: schemas.SkillBoardCreate, tareas: BackgroundTasks, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    s = _nueva_habilidad(db, user_id, data.name, data.description, data.stat, data.daily_minutes,
                         data.category, data.start_rank, data.start_hours)
    db.commit()
    db.refresh(s)
    con_ia = _encargar_plan(db, user_id, s, tareas)
    return {"id": s.id, "category": s.category, "ai_plan": con_ia}


@router.patch("/skills/{sid}")
def update_skill(sid: int, data: schemas.SkillBoardUpdate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    s = _habilidad(db, user_id, sid)
    c = data.model_dump(exclude_none=True)
    if "name" in c:
        s.name = " ".join(c["name"].split())[:80] or s.name
    if "description" in c:
        s.description = c["description"].strip()
    for k in ("stat", "daily_minutes", "category"):
        if k in c:
            setattr(s, k, c[k])
    if "start_rank" in c or "start_hours" in c:
        _fijar_partida(s, c.get("start_rank"), c.get("start_hours"))
    db.commit()
    return {"ok": True}


class PracticaIn(BaseModel):
    date: date_type                              # el día de la práctica
    minutes: int = Field(..., ge=1, le=720)
    note: str = Field("", max_length=500)
    today: date_type | None = None               # el «hoy» del móvil, para devolver el tablero


class FechaIn(BaseModel):
    date: date_type                              # el «hoy» del móvil


@router.post("/skills/{sid}/log")
def log_practice(sid: int, data: PracticaIn, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    """Práctica libre: también cuenta, minuto a minuto."""
    if data.date > hoy_utc() + timedelta(days=1):
        raise HTTPException(status_code=422, detail="No se puede registrar práctica del futuro.")
    antes = _ficha(db, user_id, sid)
    db.add(models.SkillLog(skill_id=sid, user_id=user_id, date=data.date,
                           minutes=data.minutes, note=data.note.strip()))
    db.commit()
    despues = _ficha(db, user_id, sid)
    return {"result": _cambio(antes, despues),
            "board": _tablero(db, user_id, fecha_local(data.today)) if data.today else None}


@router.post("/skills/{sid}/daily")
def request_daily(sid: int, data: FechaIn, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    """Pedir hoy una misión para una habilidad que no la tenía (no cuenta para la racha)."""
    hoy = fecha_local(data.date)
    f = _ficha(db, user_id, sid)
    if f.plan_info["generating"]:
        raise HTTPException(status_code=409,
                            detail="El Sistema aún está preparando el plan de esta habilidad. Prueba en un momento.")
    misiones = _misiones(db, user_id, hoy, sid)
    de_hoy = [m for m in misiones if m.kind == "diaria" and m.period == hoy]
    if any(m.status != "cambiada" for m in de_hoy):
        raise HTTPException(status_code=409, detail="Esta habilidad ya tiene su misión de hoy.")
    nueva = _diaria(f, user_id, hoy, max((m.slot for m in de_hoy), default=-1) + 1, True,
                    _recientes(misiones, sid, "diaria", hoy - timedelta(days=6)),
                    prohibido={m.title for m in de_hoy})
    db.add(nueva)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Esta habilidad ya tiene su misión de hoy.")
    return {"result": {"ok": True}, "board": _tablero(db, user_id, hoy)}


@router.post("/skills/{sid}/plan")
def make_plan(sid: int, tareas: BackgroundTasks, db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    """Plan a medida con IA (o rehacerlo). Se prepara en segundo plano: el tablero dice cuándo está."""
    s = _habilidad(db, user_id, sid)
    if maestria.info_plan(s)["generating"]:
        raise HTTPException(status_code=409, detail="El Sistema ya está preparando este plan.")
    _encargar_plan(db, user_id, s, tareas, obligatorio=True)
    return {"status": "generando"}


@router.delete("/skills/{sid}/plan")
def drop_plan(sid: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Volver al plan preparado para su tipo de habilidad."""
    s = _habilidad(db, user_id, sid)
    if s.plan is not None:
        db.delete(s.plan)
        db.commit()
    return {"ok": True}


# ── Misiones ──────────────────────────────────────────────

def _mision_de(db, user_id, mid) -> models.SkillMission:
    m = (db.query(models.SkillMission)
         .filter(models.SkillMission.id == mid, models.SkillMission.user_id == user_id).first())
    if m is None:
        raise HTTPException(status_code=404, detail="Misión no encontrada")
    return m


def _vigente(m, hoy) -> bool:
    """Una diaria vale su día (con un día de margen); una semanal, su semana (y el lunes siguiente)."""
    if m.kind == "diaria":
        return abs((m.period - hoy).days) <= 1
    if m.kind == "semanal":
        lunes = lunes_de(hoy)
        return m.period == lunes or (m.period == lunes - timedelta(days=7) and hoy.weekday() == 0)
    return True


@router.post("/missions/{mid}/complete")
def complete_mission(mid: int, data: schemas.MissionDoneIn, db: Session = Depends(get_db),
                     user_id: str = Depends(get_current_user_id)):
    hoy = fecha_local(data.date)
    m = _mision_de(db, user_id, mid)
    if m.status == "hecha":
        raise HTTPException(status_code=409, detail="Esta misión ya está cumplida.")
    if m.status == "cambiada":
        raise HTTPException(status_code=409, detail="Esta misión se cambió por otra.")
    if not _vigente(m, hoy):
        raise HTTPException(status_code=409, detail="Esta misión ya caducó.")
    nota = data.note.strip()
    kind = m.kind
    if kind == "prueba":
        criterios = json.loads(m.criteria or "[]")
        marcados = data.criteria or []
        if len(marcados) != len(criterios) or not all(marcados):
            raise HTTPException(status_code=422,
                                detail="Para superar la prueba tienes que cumplir todos sus criterios.")
        if len(nota) < 10:
            raise HTTPException(status_code=422,
                                detail="Cuenta cómo lo has demostrado: con una frase basta.")
    antes = _ficha(db, user_id, m.skill_id)
    if kind in ("diaria", "semanal"):
        minutos = m.minutes if data.minutes is None else data.minutes
        if minutos > 0:
            log = models.SkillLog(skill_id=m.skill_id, user_id=user_id,
                                  date=m.period if kind == "diaria" else hoy, minutes=minutos,
                                  note=f"Misión: {m.title}" + (f" — {nota}" if nota else ""))
            db.add(log)
            db.flush()
            m.log_id = log.id
    m.status = "hecha"
    m.done_at = _ahora()
    m.note = nota
    db.commit()
    despues = _ficha(db, user_id, antes.id)
    return {"result": {**_cambio(antes, despues), "kind": kind, "trial_passed": kind == "prueba"},
            "board": _tablero(db, user_id, hoy)}


@router.post("/missions/{mid}/undo")
def undo_mission(mid: int, data: FechaIn, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    hoy = fecha_local(data.date)
    m = _mision_de(db, user_id, mid)
    if m.status != "hecha":
        raise HTTPException(status_code=409, detail="Esta misión no estaba cumplida.")
    if not _vigente(m, hoy):
        raise HTTPException(status_code=409, detail="Ya no se puede deshacer: es de otro día.")
    if m.log_id:
        log = (db.query(models.SkillLog)
               .filter(models.SkillLog.id == m.log_id, models.SkillLog.user_id == user_id).first())
        m.log_id = None
        if log is not None:
            db.delete(log)
    m.status = "activa"
    m.done_at = None
    m.note = ""
    db.commit()
    return {"result": {"ok": True}, "board": _tablero(db, user_id, hoy)}


@router.post("/missions/{mid}/reroll")
def reroll_mission(mid: int, data: FechaIn, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """Cambiar una misión por otra del plan: una vez al día (diarias) o a la semana (semanales)."""
    hoy = fecha_local(data.date)
    m = _mision_de(db, user_id, mid)
    if m.kind == "prueba":
        raise HTTPException(status_code=422, detail="Las pruebas de ascenso no se cambian.")
    if m.status != "activa":
        raise HTTPException(status_code=409, detail="Solo se puede cambiar una misión pendiente.")
    if not _vigente(m, hoy) or (m.kind == "diaria" and m.period != hoy):
        raise HTTPException(status_code=409, detail="Esta misión ya caducó.")
    hermanas = (db.query(models.SkillMission)
                .filter(models.SkillMission.skill_id == m.skill_id, models.SkillMission.kind == m.kind,
                        models.SkillMission.period == m.period).all())
    if any(h.status == "cambiada" for h in hermanas):
        raise HTTPException(status_code=409,
                            detail="Ya cambiaste hoy la misión de esta habilidad." if m.kind == "diaria"
                            else "Ya cambiaste esta semana la misión semanal de esta habilidad.")
    f = _ficha(db, user_id, m.skill_id)
    misiones = _misiones(db, user_id, hoy, m.skill_id)
    slot = max(h.slot for h in hermanas) + 1
    if m.kind == "diaria":
        nueva = _diaria(f, user_id, m.period, slot, m.extra,
                        _recientes(misiones, f.id, "diaria", hoy - timedelta(days=6)),
                        prohibido={m.title}, ensayo=False)
    else:
        nueva = _semanal(f, user_id, m.period, slot,
                         _recientes(misiones, f.id, "semanal", m.period - timedelta(days=14)),
                         prohibido={m.title}, simulacro=False)
    m.status = "cambiada"
    db.add(nueva)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Esa misión ya se había cambiado.")
    return {"result": {"ok": True}, "board": _tablero(db, user_id, hoy)}


@router.delete("/logs/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    log = (db.query(models.SkillLog)
           .filter(models.SkillLog.id == log_id, models.SkillLog.user_id == user_id).first())
    if log is None:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(log)
    db.commit()
    return {"ok": True}


# ── Hitos personales ──────────────────────────────────────

@router.post("/skills/{sid}/quests")
def create_quest(sid: int, data: schemas.QuestCreate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    s = _habilidad(db, user_id, sid)
    q = models.SkillQuest(skill_id=s.id, user_id=user_id, title=data.title.strip(), xp=data.xp,
                          order=len(s.quests))
    db.add(q)
    db.commit()
    db.refresh(q)
    return {"id": q.id}


def _hito(db, user_id, qid) -> models.SkillQuest:
    q = (db.query(models.SkillQuest)
         .filter(models.SkillQuest.id == qid, models.SkillQuest.user_id == user_id).first())
    if q is None:
        raise HTTPException(status_code=404, detail="Hito no encontrado")
    return q


@router.patch("/quests/{qid}")
def update_quest(qid: int, data: schemas.QuestUpdate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    q = _hito(db, user_id, qid)
    cambios = data.model_dump(exclude_none=True)
    if "done" in cambios and cambios["done"] != bool(q.done):
        q.done_at = func.now() if cambios["done"] else None
    for k, v in cambios.items():
        setattr(q, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/quests/{qid}")
def delete_quest(qid: int, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    db.delete(_hito(db, user_id, qid))
    db.commit()
    return {"ok": True}


@router.post("/from-task/{task_id}")
def from_task(task_id: int, tareas: BackgroundTasks, db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    """Una tarea suelta («aprender a dibujar») pasa a ser una habilidad con su camino y su plan."""
    tarea = (db.query(models.RandomTask)
             .filter(models.RandomTask.id == task_id,
                     models.RandomTask.user_id == user_id).first())
    if tarea is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    s = _nueva_habilidad(db, user_id, (tarea.content or "").strip()[:80])
    db.delete(tarea)
    db.commit()
    db.refresh(s)
    _encargar_plan(db, user_id, s, tareas)
    return {"id": s.id}
