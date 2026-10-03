"""
habitos.py — EL ESTADO DE TUS HÁBITOS Y EL PLAN DE CADA DÍA
──────────────────────────────────────────────────────────
No todo lo que sostiene un día es igual, así que los hábitos tienen cuatro
tipos (ver models.DailyTask): hábito, bloque (objetivo del día), métrica y
principio. Aquí se calcula, en un puñado de consultas:

  · estado_habitos(): cada hábito con lo de hoy (hecho, cifra, respuesta),
    lo que lleva esta semana y su racha. La racha de un hábito diario cuenta
    días; la de uno de «N veces por semana», semanas cumplidas.
  · plan_automatico(): el plan de respaldo. Elige qué toca hoy según la
    frecuencia, lo que falta esta semana, la prioridad y el tiempo del día.
    Es determinista: el mismo día da el mismo plan, aunque vayas marcando.
  · plan_de_hoy(): el plan que ve Hoy. Si Claude dejó uno esta mañana
    (DayPlan), manda el suyo; si no, el automático. Hoy nunca queda vacío.
"""

import json
from collections import defaultdict
from datetime import date, timedelta

from app import models
from app.fechas import lunes_de, racha

TIPOS = ("habito", "bloque", "metrica", "principio")
CON_TIEMPO = ("habito", "bloque")             # los que ocupan tiempo y entran en el plan
DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"]
DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
PRESUPUESTO_DEFECTO = 180                     # minutos al día si aún no lo has dicho
PESO_PRIORIDAD = {1: 3.0, 2: 2.0, 3: 1.0}


# ── Lectura de los campos (con valores seguros para hábitos antiguos) ──

def dias_de(t) -> list[int]:
    out = set()
    for x in (getattr(t, "days", "") or "").split(","):
        x = x.strip()
        if x.isdigit() and 0 <= int(x) <= 6:
            out.add(int(x))
    return sorted(out)


def tipo_de(t) -> str:
    k = getattr(t, "kind", None) or "habito"
    return k if k in TIPOS else "habito"


def meta_semana(t) -> int:
    d = dias_de(t)
    if d:
        return len(d)
    return max(1, min(7, getattr(t, "per_week", None) or 7))


def es_diario(t) -> bool:
    return not dias_de(t) and (getattr(t, "per_week", None) or 7) >= 7


def frecuencia_texto(per_week: int, days: list[int]) -> str:
    if days:
        return "·".join(DIAS_CORTOS[d] for d in days)
    if per_week >= 7:
        return "cada día"
    return f"{per_week}× por semana"


def presupuesto_de(db, user_id) -> list[int]:
    """Minutos disponibles de lunes a domingo."""
    fila = (db.query(models.PlannerSettings)
            .filter(models.PlannerSettings.user_id == user_id).first())
    return leer_presupuesto(fila.budget if fila else "")


def leer_presupuesto(texto: str) -> list[int]:
    partes = [p.strip() for p in (texto or "").split(",")]
    if len(partes) != 7:
        return [PRESUPUESTO_DEFECTO] * 7
    try:
        return [max(0, min(960, int(p))) for p in partes]
    except ValueError:
        return [PRESUPUESTO_DEFECTO] * 7


def ajustes_de(db, user_id):
    return (db.query(models.PlannerSettings)
            .filter(models.PlannerSettings.user_id == user_id).first())


# ── El estado de cada hábito ────────────────────────────────

def racha_semanas(hechos: set, hoy: date, meta: int) -> int:
    """Semanas seguidas cumpliendo la meta. La semana en curso cuenta si ya se cumplió."""
    def cumple(lunes):
        return sum(1 for k in range(7) if lunes + timedelta(days=k) in hechos) >= meta
    lunes = lunes_de(hoy)
    l = lunes if cumple(lunes) else lunes - timedelta(days=7)
    n = 0
    while n < 60 and cumple(l):
        n += 1
        l -= timedelta(days=7)
    return n


def estado_habitos(db, user_id, hoy: date, todos: bool = False) -> list[dict]:
    """
    Los hábitos (activos, o todos con todos=True) con su estado de hoy, de
    esta semana y su racha. Cuatro consultas como mucho, tengas los que tengas.
    """
    q = db.query(models.DailyTask).filter(models.DailyTask.user_id == user_id)
    if not todos:
        q = q.filter(models.DailyTask.active == True)  # noqa: E712
    tareas = q.order_by(models.DailyTask.id).all()
    if not tareas:
        return []
    desde = hoy - timedelta(days=400)
    ids = [t.id for t in tareas]
    registros = defaultdict(dict)                     # id → {fecha: (done, value)}
    for tid, dia, done, valor in (db.query(models.TaskCompletion.daily_task_id, models.TaskCompletion.date,
                                           models.TaskCompletion.done, models.TaskCompletion.value)
                                  .filter(models.TaskCompletion.daily_task_id.in_(ids),
                                          models.TaskCompletion.date >= desde,
                                          models.TaskCompletion.date <= hoy).all()):
        registros[tid][dia] = (bool(done), valor)

    enlaces = {(getattr(t, "link", "") or "") for t in tareas}
    entrenos = set()
    if "entreno" in enlaces:
        entrenos = {d for (d,) in db.query(models.Session.date)
                    .filter(models.Session.user_id == user_id,
                            models.Session.date >= desde, models.Session.date <= hoy).distinct().all()}
    sueno = {}
    if "sueno" in enlaces:
        sueno = {d: h for d, h in db.query(models.SleepLog.date, models.SleepLog.hours)
                 .filter(models.SleepLog.user_id == user_id,
                         models.SleepLog.date >= desde, models.SleepLog.date <= hoy).all()}

    lunes = lunes_de(hoy)
    out = []
    for t in tareas:
        kind = tipo_de(t)
        link = getattr(t, "link", "") or ""
        regs = registros.get(t.id, {})
        valor_hoy = None
        if kind == "metrica":
            valores = {d: v for d, (done, v) in regs.items() if v is not None}
            if link == "sueno":
                valores.update(sueno)                 # Sueño manda: es donde se registran las noches
            objetivo = t.target or 0
            hechos = {d for d, v in valores.items() if (v >= objetivo if objetivo > 0 else v > 0)}
            hechos |= {d for d, (done, v) in regs.items() if v is None and done}   # ticks de antes
            valor_hoy = valores.get(hoy)
        elif kind == "principio":
            valores = {d: (v if v is not None else 1.0) for d, (done, v) in regs.items() if done or v is not None}
            hechos = set(valores)                     # «hecho» = respondido
            valor_hoy = valores.get(hoy)
        else:
            hechos = {d for d, (done, v) in regs.items() if done}
            if link == "entreno":
                hechos |= entrenos
        dias = dias_de(t)
        meta = meta_semana(t)
        semana = [d for d in hechos if lunes <= d <= hoy]
        if kind == "principio":
            streak, unidad = 0, "dias"
        elif kind == "metrica" or es_diario(t):
            streak, unidad = racha(hechos, hoy), "dias"
        else:
            streak, unidad = racha_semanas(hechos, hoy, meta), "semanas"
        antes = [d for d in hechos if d < hoy]
        out.append({
            "id": t.id, "title": t.title, "active": bool(t.active), "kind": kind,
            "minutes": t.minutes or 0, "per_week": max(1, min(7, t.per_week or 7)), "days": dias,
            "priority": t.priority if t.priority in (1, 2, 3) else 2,
            "target": t.target, "unit": t.unit or "", "step": t.step, "link": link,
            "description": t.description or "",
            "done_today": hoy in hechos, "value_today": valor_hoy,
            "week_done": len(semana), "week_before": len([d for d in semana if d < hoy]),
            "week_goal": meta, "streak": streak, "streak_unit": unidad,
            "last_done": max(antes).isoformat() if antes else None,
            "done_last_14": len([d for d in hechos if hoy - timedelta(days=14) <= d < hoy]),
            "last_7": [hoy - timedelta(days=k) in hechos for k in range(7, 0, -1)],   # de hace 7 días a ayer
        })
    return out


# ── El plan automático (respaldo) ──────────────────────────

def plan_automatico(habitos: list[dict], hoy: date, disponible: int) -> list[dict]:
    """
    Qué toca hoy, en orden, cabiendo en `disponible` minutos. Devuelve
    [{"id", "why", "extra"}]: lo que no cabe va como extra («si te da tiempo»).
    """
    wd = hoy.weekday()
    quedan = 7 - wd                                       # días que quedan en la semana, hoy incluido
    candidatos = []
    for h in habitos:
        if h["kind"] not in CON_TIEMPO or not h["active"]:
            continue
        dias = h["days"]
        if dias:
            if wd not in dias:
                continue
            urgencia, motivo = 1.0, f"Toca hoy ({frecuencia_texto(0, dias)})"
        elif h["per_week"] >= 7:
            urgencia, motivo = 1.0, "Cada día"
        else:
            faltan = h["week_goal"] - h["week_before"]
            if faltan <= 0:
                continue                                  # la semana ya está cumplida
            urgencia = min(1.0, faltan / quedan)
            motivo = (f"Te quedan {faltan} de {h['week_goal']} y solo {quedan} "
                      f"{'día' if quedan == 1 else 'días'}" if urgencia >= 1
                      else f"Te quedan {faltan} de {h['week_goal']} esta semana")
            if urgencia < 1 and h["last_done"] == (hoy - timedelta(days=1)).isoformat():
                urgencia -= 0.3                           # mejor no repetir dos días seguidos
        if h["priority"] == 1:
            motivo += " · imprescindible"
        puntos = PESO_PRIORIDAD.get(h["priority"], 2.0) + 1.5 * urgencia
        candidatos.append((puntos, h, motivo))
    candidatos.sort(key=lambda c: (-c[0], c[1]["minutes"], c[1]["id"]))
    # Lo imprescindible tiene su sitio reservado; lo demás entra mientras quepa.
    # Sin mirar lo ya hecho: así el plan no se recoloca mientras vas marcando.
    por_id = {h["id"]: h for _, h, _m in candidatos}
    items = [{"id": h["id"], "why": motivo, "extra": False} for _, h, motivo in candidatos]
    return ajustar_al_tiempo(items, por_id, disponible, imprescindibles(habitos, hoy))


def principio_rotado(habitos: list[dict], hoy: date):
    principios = [h for h in habitos if h["kind"] == "principio" and h["active"]]
    if not principios:
        return None
    return principios[hoy.toordinal() % len(principios)]


def minutos_misiones(db, user_id, hoy: date) -> int:
    """Lo que ocupan hoy las misiones diarias del Sistema (habilidades)."""
    return sum(m or 0 for (m,) in db.query(models.SkillMission.minutes)
               .filter(models.SkillMission.user_id == user_id, models.SkillMission.kind == "diaria",
                       models.SkillMission.period == hoy, models.SkillMission.status != "cambiada").all())


def imprescindibles(habitos: list[dict], hoy: date) -> dict:
    """Lo imprescindible que toca hoy: diario, o de días fijos y hoy es su día. {id: motivo}"""
    wd = hoy.weekday()
    out = {}
    for h in habitos:
        if h["kind"] not in CON_TIEMPO or not h["active"] or h["priority"] != 1:
            continue
        if h["days"] and wd in h["days"]:
            out[h["id"]] = "Toca hoy · imprescindible"
        elif not h["days"] and h["per_week"] >= 7:
            out[h["id"]] = "Cada día · imprescindible"
    return out


def imprescindibles_primero(items: list[dict], habitos: list[dict], hoy: date) -> list[dict]:
    """
    Garantía: lo imprescindible que toca hoy siempre está en el plan, aunque
    Claude lo olvide o ya esté hecho. Lo que olvidó va delante; lo que puso se
    queda donde lo puso (y nunca como extra).
    """
    esenciales = imprescindibles(habitos, hoy)
    dentro = {i["id"] for i in items}
    faltan = [{"id": i, "why": m, "extra": False} for i, m in esenciales.items() if i not in dentro]
    return faltan + [({**i, "extra": False} if i["id"] in esenciales else i) for i in items]


def ajustar_al_tiempo(items: list[dict], por_id: dict, disponible: int, esenciales=()) -> list[dict]:
    """
    Garantía: lo que no es extra cabe en el tiempo del día. Primero se reserva
    el tiempo de lo imprescindible; lo demás entra en su orden mientras quepa y
    lo que sobra pasa a extra. El orden de lo que queda dentro no cambia.
    """
    esenciales = set(esenciales)
    usado = sum(por_id[i["id"]]["minutes"] or 0 for i in items if i["id"] in esenciales)
    out = []
    for it in items:
        if it["id"] in esenciales:
            out.append({**it, "extra": False})
            continue
        m = por_id[it["id"]]["minutes"] or 0
        if not it["extra"] and usado + m > disponible:
            it = {**it, "extra": True}
        if not it["extra"]:
            usado += m
        out.append(it)
    return [i for i in out if not i["extra"]] + [i for i in out if i["extra"]]


def plan_de_hoy(db, user_id, hoy: date, habitos: list[dict] | None = None) -> dict:
    habitos = habitos if habitos is not None else estado_habitos(db, user_id, hoy)
    por_id = {h["id"]: h for h in habitos}
    presupuesto = presupuesto_de(db, user_id)[hoy.weekday()]
    misiones = minutos_misiones(db, user_id, hoy)
    disponible = max(0, presupuesto - misiones)
    fila = (db.query(models.DayPlan)
            .filter(models.DayPlan.user_id == user_id, models.DayPlan.date == hoy).first())

    metricas = [h for h in habitos if h["kind"] == "metrica"]
    principio = None
    if fila is not None and fila.source != "descartado":
        try:
            crudo = json.loads(fila.items or "[]")
        except ValueError:
            crudo = []
        vistos, items = set(), []
        for it in crudo if isinstance(crudo, list) else []:
            i = it.get("id") if isinstance(it, dict) else None
            if i in por_id and por_id[i]["kind"] in CON_TIEMPO and i not in vistos:
                vistos.add(i)
                items.append({"id": i, "why": str(it.get("why") or "")[:160], "extra": bool(it.get("extra"))})
        items = imprescindibles_primero(items, habitos, hoy)
        items = ajustar_al_tiempo(items, por_id, disponible, imprescindibles(habitos, hoy))
        if fila.metrics:
            try:
                elegidas = set(json.loads(fila.metrics))
                if elegidas:
                    metricas = [m for m in metricas if m["id"] in elegidas]
            except (ValueError, TypeError):
                pass
        p = por_id.get(fila.principle_id)
        principio = p if p is not None and p["kind"] == "principio" else principio_rotado(habitos, hoy)
        fuente = {"source": "claude", "model": fila.model or "",
                  "made_at": fila.created_at.isoformat() if fila.created_at else None,
                  "note": fila.note or ""}
    else:
        items = plan_automatico(habitos, hoy, disponible)
        principio = principio_rotado(habitos, hoy)
        fuente = {"source": "auto", "model": "", "made_at": None, "note": ""}

    en_plan = {i["id"] for i in items}
    elegidos = [{**por_id[i["id"]], "why": i["why"], "extra": i["extra"]} for i in items]
    principales = [h for h in elegidos if not h["extra"]]
    return {
        **fuente,
        "date": hoy.isoformat(),
        "weekday": DIAS_LARGOS[hoy.weekday()],
        "budget": presupuesto,
        "missions_minutes": misiones,
        "planned_minutes": sum(h["minutes"] for h in principales),
        "done_minutes": sum(h["minutes"] for h in principales if h["done_today"]),
        "items": principales,
        "extras": [h for h in elegidos if h["extra"]],
        "metrics": metricas,
        "principle": principio,
        "others": [h for h in habitos if h["kind"] in CON_TIEMPO and h["id"] not in en_plan],
    }
