"""
routers/routine.py — LA PLANTILLA SEMANAL Y SUS EXCEPCIONES
───────────────────────────────────────────────────────────
La estrella Ejercicios configura aquí qué ejercicios tocan cada día.
La estrella Entreno lee la semana "resuelta": para cada día, si esa
semana tiene una excepción registrada, manda la excepción; si no, la
plantilla de siempre.

  GET    /routine/week/{lunes}            → la semana resuelta (7 días)
  PUT    /routine/template/{dia}          → fijar la plantilla de un día
  PUT    /routine/week/{lunes}/{dia}      → excepción solo para esa semana
  DELETE /routine/week/{lunes}/{dia}      → quitar la excepción (volver a plantilla)
  POST   /routine/week/{lunes}/promote    → convertir las excepciones de esa
                                            semana en la nueva plantilla
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/routine", tags=["routine"])


def _own_exercises(db, user_id, ids):
    """Comprueba que todos los ejercicios pedidos son del usuario."""
    if not ids:
        return
    n = (db.query(models.Exercise)
         .filter(models.Exercise.user_id == user_id, models.Exercise.id.in_(ids))
         .count())
    if n != len(set(ids)):
        raise HTTPException(status_code=404, detail="Algún ejercicio no existe")


@router.get("/week/{week_start}")
def get_week(week_start: date, db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    """La semana resuelta: por día, sus ejercicios (excepción u plantilla)."""
    tpl_rows = (db.query(models.RoutineDay)
                .filter(models.RoutineDay.user_id == user_id)
                .order_by(models.RoutineDay.weekday, models.RoutineDay.order).all())
    ovr_rows = (db.query(models.WeekOverride)
                .filter(models.WeekOverride.user_id == user_id,
                        models.WeekOverride.week_start == week_start)
                .order_by(models.WeekOverride.weekday, models.WeekOverride.order).all())
    tpl, ovr = {}, {}
    for r in tpl_rows: tpl.setdefault(r.weekday, []).append(r.exercise_id)
    for r in ovr_rows: ovr.setdefault(r.weekday, []).append(r.exercise_id)

    names = {e.id: e.name for e in
             db.query(models.Exercise).filter(models.Exercise.user_id == user_id).all()}

    days = []
    for w in range(7):
        ids = ovr[w] if w in ovr else tpl.get(w, [])
        days.append({
            "weekday": w,
            "overridden": w in ovr,
            "exercises": [{"id": i, "name": names.get(i, "?")} for i in ids if i in names],
        })
    return {"week_start": week_start.isoformat(), "days": days}


@router.put("/template/{weekday}")
def set_template_day(weekday: int, data: schemas.RoutineDayIn,
                     db: Session = Depends(get_db),
                     user_id: str = Depends(get_current_user_id)):
    """Fija la plantilla por defecto de un día (reemplaza lo que hubiera)."""
    if not 0 <= weekday <= 6:
        raise HTTPException(status_code=400, detail="Día inválido")
    _own_exercises(db, user_id, data.exercise_ids)
    (db.query(models.RoutineDay)
     .filter(models.RoutineDay.user_id == user_id,
             models.RoutineDay.weekday == weekday).delete())
    for i, ex_id in enumerate(data.exercise_ids):
        db.add(models.RoutineDay(user_id=user_id, weekday=weekday,
                                 exercise_id=ex_id, order=i))
    db.commit()
    return {"ok": True}


@router.put("/week/{week_start}/{weekday}")
def set_week_day(week_start: date, weekday: int, data: schemas.RoutineDayIn,
                 db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    """Excepción SOLO para esa semana: ese día usará estos ejercicios."""
    if not 0 <= weekday <= 6:
        raise HTTPException(status_code=400, detail="Día inválido")
    _own_exercises(db, user_id, data.exercise_ids)
    (db.query(models.WeekOverride)
     .filter(models.WeekOverride.user_id == user_id,
             models.WeekOverride.week_start == week_start,
             models.WeekOverride.weekday == weekday).delete())
    for i, ex_id in enumerate(data.exercise_ids):
        db.add(models.WeekOverride(user_id=user_id, week_start=week_start,
                                   weekday=weekday, exercise_id=ex_id, order=i))
    db.commit()
    return {"ok": True}


@router.delete("/week/{week_start}/{weekday}")
def clear_week_day(week_start: date, weekday: int,
                   db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """Quita la excepción de ese día: vuelve a mandar la plantilla."""
    (db.query(models.WeekOverride)
     .filter(models.WeekOverride.user_id == user_id,
             models.WeekOverride.week_start == week_start,
             models.WeekOverride.weekday == weekday).delete())
    db.commit()
    return {"ok": True}


@router.post("/week/{week_start}/promote")
def promote_week(week_start: date, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    """
    "Hacer permanente": las excepciones de esa semana PASAN A SER la
    plantilla por defecto (y dejan de ser excepciones).
    """
    ovr_rows = (db.query(models.WeekOverride)
                .filter(models.WeekOverride.user_id == user_id,
                        models.WeekOverride.week_start == week_start)
                .order_by(models.WeekOverride.weekday, models.WeekOverride.order).all())
    by_day = {}
    for r in ovr_rows: by_day.setdefault(r.weekday, []).append(r.exercise_id)
    for w, ids in by_day.items():
        (db.query(models.RoutineDay)
         .filter(models.RoutineDay.user_id == user_id,
                 models.RoutineDay.weekday == w).delete())
        for i, ex_id in enumerate(ids):
            db.add(models.RoutineDay(user_id=user_id, weekday=w,
                                     exercise_id=ex_id, order=i))
    (db.query(models.WeekOverride)
     .filter(models.WeekOverride.user_id == user_id,
             models.WeekOverride.week_start == week_start).delete())
    db.commit()
    return {"ok": True, "days_promoted": len(by_day)}
