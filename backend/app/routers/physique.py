"""
routers/physique.py
───────────────────
La cuenta atrás al físico deseado (deseo 3).

Dos mecánicas:
  1. Cuenta atrás: una barra que se llena según pasan los días entre la fecha de
     inicio y la fecha objetivo. Solo cuenta días, como pediste.
  2. Racha creciente: cada semana en que cumples tu objetivo de entrenos
     (weekly_target) suma a una racha. Si una semana fallas, la racha se reinicia.
     La racha se calcula mirando las sesiones reales, semana a semana.
"""

from datetime import date as date_type, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/physique", tags=["physique"])


def _monday_of(d: date_type) -> date_type:
    """El lunes de la semana de una fecha (las semanas empiezan en lunes)."""
    return d - timedelta(days=d.weekday())


def _streak_weeks(db, user_id, weekly_target, start_date):
    """
    Cuenta cuántas semanas consecutivas (hasta la actual) se cumplió el objetivo
    de entrenos. Mira hacia atrás desde esta semana hasta que una semana falle.
    La semana en curso solo rompe la racha si ya es imposible alcanzar el objetivo;
    mientras se pueda cumplir, no la penalizamos (cuenta como "en progreso").
    """
    today = date_type.today()
    this_monday = _monday_of(today)

    # Nº de entrenos (días distintos con sesión) por semana
    sessions = (db.query(models.Session)
                .filter(models.Session.user_id == user_id,
                        models.Session.date >= start_date).all())
    by_week = {}
    for s in sessions:
        wk = _monday_of(s.date).isoformat()
        by_week.setdefault(wk, set()).add(s.date)
    counts = {wk: len(days) for wk, days in by_week.items()}

    streak = 0
    # Empezar por la semana pasada hacia atrás (la actual se trata aparte)
    wk = this_monday - timedelta(days=7)
    start_monday = _monday_of(start_date)
    while wk >= start_monday:
        if counts.get(wk.isoformat(), 0) >= weekly_target:
            streak += 1
            wk -= timedelta(days=7)
        else:
            break

    # La semana en curso: si ya se cumplió, suma; si aún se puede, no rompe.
    this_count = counts.get(this_monday.isoformat(), 0)
    current_week_done = this_count >= weekly_target
    if current_week_done:
        streak += 1

    return streak, this_count, current_week_done


@router.post("/goal", response_model=schemas.PhysiqueGoalOut)
def set_goal(data: schemas.PhysiqueGoalCreate, db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    """Crea o reemplaza la meta física (solo una activa a la vez)."""
    if data.target_date <= data.start_date:
        raise HTTPException(400, "La fecha objetivo debe ser posterior a la de inicio.")
    # borrar metas anteriores (mantenemos una activa)
    db.query(models.PhysiqueGoal).filter(models.PhysiqueGoal.user_id == user_id).delete()
    g = models.PhysiqueGoal(user_id=user_id, **data.model_dump())
    db.add(g); db.commit(); db.refresh(g)
    return g


@router.get("/goal")
def get_goal(db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    """Devuelve la meta activa con su progreso de días y su racha calculada."""
    g = (db.query(models.PhysiqueGoal)
         .filter(models.PhysiqueGoal.user_id == user_id)
         .order_by(models.PhysiqueGoal.created_at.desc()).first())
    if g is None:
        return {"has_goal": False}

    today = date_type.today()
    total_days = (g.target_date - g.start_date).days
    elapsed = (today - g.start_date).days
    elapsed = max(0, min(elapsed, total_days))
    remaining = max(0, (g.target_date - today).days)
    progress = round(elapsed / total_days, 3) if total_days > 0 else 1.0

    streak, this_count, current_done = _streak_weeks(db, user_id, g.weekly_target, g.start_date)

    return {
        "has_goal": True,
        "goal": {
            "id": g.id, "description": g.description,
            "start_date": g.start_date.isoformat(),
            "target_date": g.target_date.isoformat(),
            "weekly_target": g.weekly_target,
        },
        "total_days": total_days,
        "elapsed_days": elapsed,
        "remaining_days": remaining,
        "progress": progress,
        "streak_weeks": streak,
        "this_week_sessions": this_count,
        "this_week_done": current_done,
    }


@router.delete("/goal")
def delete_goal(db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    db.query(models.PhysiqueGoal).filter(models.PhysiqueGoal.user_id == user_id).delete()
    db.commit()
    return {"ok": True}
