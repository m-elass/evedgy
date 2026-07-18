"""
routers/insights.py
───────────────────
La "inteligencia" de la app: convierte el historial en conocimiento útil.
Todo son cálculos sobre datos que el usuario ya tiene (cero coste de IA):

- /insights/next-set/{exercise_id}  → sugiere peso y reps para hoy.
- /insights/records                 → récords personales (PR) por ejercicio.
- /insights/deload/{exercise_id}    → detecta estancamiento y sugiere descarga.

La lógica de entrenamiento está comentada para que se entienda el "por qué".
"""

from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models

router = APIRouter(prefix="/insights", tags=["insights"])


def _sessions_of(db, user_id, exercise_id):
    """Sesiones de un ejercicio, de la más antigua a la más reciente."""
    return (db.query(models.Session)
            .filter(models.Session.user_id == user_id,
                    models.Session.exercise_id == exercise_id)
            .order_by(models.Session.date.asc())
            .all())


def _best_set(sets):
    """La 'mejor' serie de una sesión: la de más peso (desempata por reps)."""
    if not sets:
        return None
    return max(sets, key=lambda s: (s.weight, s.reps))


@router.get("/next-set/{exercise_id}")
def next_set(exercise_id: int,
             db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    """
    Sugiere qué hacer hoy en este ejercicio, mirando la última sesión.
    Regla de progresión sencilla y prudente:
      - Si en la última sesión completaste reps altas (>=10) en tu mejor serie,
        sube el peso un pequeño incremento (2.5 kg) y baja un poco las reps.
      - Si las reps fueron bajas (<6), mantén el peso y busca más reps.
      - En medio, repite el mismo peso intentando una repetición más.
    No es dogma: es un punto de partida, el usuario decide.
    """
    ex = (db.query(models.Exercise)
          .filter(models.Exercise.id == exercise_id,
                  models.Exercise.user_id == user_id).first())
    if ex is None:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")

    sessions = _sessions_of(db, user_id, exercise_id)
    if not sessions:
        return {"has_history": False,
                "message": "Primera vez con este ejercicio. Empieza con un peso cómodo."}

    last = sessions[-1]
    best = _best_set(last.sets)
    if best is None:
        return {"has_history": False, "message": "Sin series en la última sesión."}

    weight, reps = best.weight, best.reps
    if reps >= 10:
        suggestion = {"weight": round(weight + 2.5, 1), "reps": max(6, reps - 2),
                      "reason": "Hiciste muchas reps: toca subir peso."}
    elif reps < 6:
        suggestion = {"weight": weight, "reps": reps + 1,
                      "reason": "Mantén el peso y suma una repetición."}
    else:
        suggestion = {"weight": weight, "reps": reps + 1,
                      "reason": "Intenta una repetición más al mismo peso."}

    return {"has_history": True,
            "last": {"weight": weight, "reps": reps, "date": last.date.isoformat()},
            "suggestion": suggestion}


@router.get("/records")
def records(db: Session = Depends(get_db),
            user_id: str = Depends(get_current_user_id)):
    """
    Récords personales por ejercicio:
      - max_weight: el peso máximo levantado alguna vez.
      - best_1rm: estimación de 1RM (fuerza máxima teórica) con la fórmula de
        Epley: peso * (1 + reps/30). Permite comparar series de distinto peso/reps.
    Devuelve una lista ordenada, lista para mostrar con su sello dorado.
    """
    exercises = (db.query(models.Exercise)
                 .filter(models.Exercise.user_id == user_id).all())
    out = []
    for ex in exercises:
        sessions = _sessions_of(db, user_id, ex.id)
        all_sets = [s for sess in sessions for s in sess.sets if s.weight > 0]
        if not all_sets:
            continue
        max_weight = max(s.weight for s in all_sets)
        best_1rm = max(s.weight * (1 + s.reps / 30) for s in all_sets)
        # ¿en qué fecha se logró el peso máximo?
        pr_date = None
        for sess in sessions:
            if any(s.weight == max_weight for s in sess.sets):
                pr_date = sess.date.isoformat()
        out.append({
            "exercise_id": ex.id, "exercise": ex.name,
            "max_weight": max_weight,
            "best_1rm": round(best_1rm, 1),
            "pr_date": pr_date,
        })
    out.sort(key=lambda r: r["best_1rm"], reverse=True)
    return {"records": out}


@router.get("/deload/{exercise_id}")
def deload(exercise_id: int,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    """
    Detecta estancamiento para sugerir una semana de descarga (deload).
    Heurística prudente: mira las últimas 4 sesiones; si el mejor peso no ha
    mejorado (o ha bajado) en ese tramo, sugiere bajar ~10% una semana para
    recuperar y volver con más fuerza. Si hay progreso, no molesta.
    """
    sessions = _sessions_of(db, user_id, exercise_id)
    recent = sessions[-4:]
    if len(recent) < 4:
        return {"suggest_deload": False,
                "message": "Aún no hay suficiente historial para evaluar estancamiento."}

    peaks = [max((s.weight for s in sess.sets), default=0) for sess in recent]
    improved = peaks[-1] > max(peaks[:-1])  # ¿el último supera a los previos?
    if improved:
        return {"suggest_deload": False,
                "message": "Vas progresando, sin necesidad de descarga."}

    base = max(peaks)
    return {"suggest_deload": True,
            "message": "Llevas 4 sesiones sin mejorar. Una semana de descarga puede ayudarte.",
            "suggested_weight": round(base * 0.9, 1)}


@router.get("/tapestry")
def tapestry(db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    """
    El 'tapiz de constancia': por cada día del último año, cuánta actividad hubo.
    Suma señales de varios módulos para tejer un mapa de calor:
      - entrenamientos (sessions)
      - hábitos completados (task_completions con done=True)
      - prácticas de skills (skill_logs)
    Devuelve {fecha: intensidad}, donde intensidad es el nº de señales ese día.
    El frontend lo pinta como un tapiz donde más intensidad = hilo más dorado.
    """
    from datetime import date as date_type, timedelta
    from collections import defaultdict

    today = date_type.today()
    start = today - timedelta(days=364)  # un año hacia atrás
    counts = defaultdict(int)

    # Entrenamientos
    for s in (db.query(models.Session)
              .filter(models.Session.user_id == user_id,
                      models.Session.date >= start).all()):
        counts[s.date.isoformat()] += 1

    # Hábitos completados (solo los que están hechos)
    completions = (db.query(models.TaskCompletion)
                   .join(models.DailyTask,
                         models.TaskCompletion.daily_task_id == models.DailyTask.id)
                   .filter(models.DailyTask.user_id == user_id,
                           models.TaskCompletion.done == True,  # noqa: E712
                           models.TaskCompletion.date >= start).all())
    for c in completions:
        counts[c.date.isoformat()] += 1

    # Prácticas de skills
    for log in (db.query(models.SkillLog)
                .filter(models.SkillLog.user_id == user_id,
                        models.SkillLog.date >= start).all()):
        counts[log.date.isoformat()] += 1

    active_days = len(counts)
    total_signals = sum(counts.values())
    return {
        "start": start.isoformat(),
        "end": today.isoformat(),
        "days": dict(counts),
        "active_days": active_days,
        "total_signals": total_signals,
    }


@router.get("/muscle-week")
def muscle_week(db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    """
    Tu semana sobre el cuerpo, ahora con anatomía FINA: la carga se calcula
    por músculo específico (dorsal ancho, deltoides lateral, sóleo…) y se
    agrega a regiones solo para pintar el cuerpo dibujable.
    """
    from datetime import date as date_type, timedelta
    from collections import defaultdict
    from app import muscles as muscle_lib

    start = date_type.today() - timedelta(days=6)
    load = defaultdict(float)   # músculo FINO -> carga (series ponderadas)

    sessions = (db.query(models.Session)
                .filter(models.Session.user_id == user_id,
                        models.Session.date >= start).all())
    for s in sessions:
        ex = (db.query(models.Exercise)
              .filter(models.Exercise.id == s.exercise_id).first())
        if ex is None:
            continue
        n_sets = len(s.sets)
        for m in (ex.primary_muscles or "").split(","):
            if m: load[m] += n_sets * 1.0
        for m in (ex.secondary_muscles or "").split(","):
            if m: load[m] += n_sets * 0.5

    if not load:
        return {"has_data": False, "primary": [], "secondary": [], "loads": {},
                "names": {}, "sessions_count": 0}

    top = max(load.values())
    strong = [m for m, v in load.items() if v >= top * 0.5]
    light = [m for m, v in load.items() if 0 < v < top * 0.5]
    primary = muscle_lib.to_coarse(strong)
    secondary = [c for c in muscle_lib.to_coarse(light) if c not in primary]
    return {"has_data": True, "primary": primary, "secondary": secondary,
            "loads": {k: round(v, 1) for k, v in load.items()},
            "names": {k: muscle_lib.MUSCLES.get(k, k) for k in load},
            "sessions_count": len(sessions)}
