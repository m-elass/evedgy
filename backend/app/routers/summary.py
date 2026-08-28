"""
routers/summary.py
──────────────────
Resumen semanal narrado. Reúne los datos REALES de la semana del usuario
(entrenos, hábitos cumplidos, sueño, prácticas, revisiones) y le pide a Claude
que escriba una crónica breve, cálida y honesta. No inventa: solo narra lo que pasó.

La clave de Anthropic vive en el backend (.env). Si no está configurada, se
devuelve un resumen "manual" con los números, para que la función no dependa de la IA.
"""

from datetime import date as date_type, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import ai_budget
from app.auth import get_current_user_id
from app.config import settings
from app import models

router = APIRouter(prefix="/summary", tags=["summary"])


def _gather_week(db, user_id):
    """Recopila los hechos de los últimos 7 días en un diccionario simple."""
    today = date_type.today()
    start = today - timedelta(days=6)

    # Entrenos
    sessions = (db.query(models.Session)
                .filter(models.Session.user_id == user_id,
                        models.Session.date >= start).all())
    train_days = len({s.date for s in sessions})
    train_detail = []
    for s in sessions:
        if s.sets:
            top = max(s.sets, key=lambda x: x.weight)
            ex = db.query(models.Exercise).filter(models.Exercise.id == s.exercise_id).first()
            train_detail.append(f"{ex.name if ex else 'ejercicio'} {top.weight}kg x{top.reps}")

    # Hábitos cumplidos
    comps = (db.query(models.TaskCompletion)
             .join(models.DailyTask, models.TaskCompletion.daily_task_id == models.DailyTask.id)
             .filter(models.DailyTask.user_id == user_id,
                     models.TaskCompletion.done == True,  # noqa: E712
                     models.TaskCompletion.date >= start).all())
    habit_count = len(comps)

    # Sueño
    sleeps = (db.query(models.SleepLog)
              .filter(models.SleepLog.user_id == user_id,
                      models.SleepLog.date >= start).all())
    avg_sleep = round(sum(s.hours for s in sleeps) / len(sleeps), 1) if sleeps else None

    # Prácticas de skills
    skill_logs = (db.query(models.SkillLog)
                  .filter(models.SkillLog.user_id == user_id,
                          models.SkillLog.date >= start).all())
    skill_min = sum(l.minutes for l in skill_logs)

    return {
        "train_days": train_days,
        "train_detail": train_detail,
        "habit_count": habit_count,
        "avg_sleep": avg_sleep,
        "skill_minutes": skill_min,
        "start": start.isoformat(),
        "end": today.isoformat(),
    }


def _manual_summary(d):
    """Resumen sin IA: una frase con los números. Siempre disponible."""
    parts = []
    if d["train_days"]:
        parts.append(f"entrenaste {d['train_days']} {'día' if d['train_days']==1 else 'días'}")
    if d["habit_count"]:
        parts.append(f"cumpliste {d['habit_count']} hábitos")
    if d["avg_sleep"]:
        parts.append(f"dormiste {d['avg_sleep']}h de media")
    if d["skill_minutes"]:
        parts.append(f"practicaste {d['skill_minutes']} min")
    if not parts:
        return "Esta semana no hay registros todavía. Cada pequeño paso cuenta."
    return "Esta semana " + ", ".join(parts) + "."


@router.get("/week")
def week_summary(db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    data = _gather_week(db, user_id)
    manual = _manual_summary(data)

    api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
    if not api_key:
        # Sin IA configurada: devolvemos el resumen manual (la función no se rompe).
        return {"narrated": False, "summary": manual, "data": data}

    # Con IA sí hay coste. Si no queda presupuesto, en lugar de fallar
    # devolvemos el resumen calculado sin IA: el usuario nunca se queda sin nada.
    try:
        ai_budget.consumir(db, user_id)
    except Exception:
        return {"narrated": False, "summary": manual, "data": data}

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        facts = (
            f"Días entrenados: {data['train_days']}. "
            f"Detalle entrenos: {'; '.join(data['train_detail']) or 'ninguno'}. "
            f"Hábitos cumplidos: {data['habit_count']}. "
            f"Sueño medio: {data['avg_sleep'] if data['avg_sleep'] else 'sin datos'}h. "
            f"Minutos de práctica: {data['skill_minutes']}."
        )
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            system=(
                "Eres un compañero sereno que escribe el resumen semanal de alguien "
                "a partir de sus datos reales. Escribe en español, en segunda persona, "
                "3-4 frases cálidas y honestas. Celebra lo conseguido sin exagerar y, si "
                "algo flojeó, menciónalo con amabilidad, no con reproche. No inventes datos "
                "que no estén en los hechos. No uses listas ni emojis."
            ),
            messages=[{"role": "user", "content": f"Hechos de mi semana: {facts}"}],
        )
        text = "".join(b.text for b in msg.content if b.type == "text").strip()
        return {"narrated": True, "summary": text, "data": data}
    except Exception:
        # Si la IA falla, caemos al resumen manual: nunca dejamos al usuario sin nada.
        return {"narrated": False, "summary": manual, "data": data}
