"""
routers/daily_tasks.py
──────────────────────
Hábitos recurrentes que marcas cada día (beber agua, leer...).
Dos niveles, como en el modelo:
- el hábito en sí (DailyTask).
- el "tick" de un día concreto (TaskCompletion).

El endpoint de completar usa "upsert": si ya existe un tick para ese
hábito y esa fecha, lo actualiza; si no, lo crea. Así marcar/desmarcar
el mismo día no duplica filas.
"""

from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/daily-tasks", tags=["daily_tasks"])


def _get_owned(db, task_id, user_id):
    task = (db.query(models.DailyTask)
            .filter(models.DailyTask.id == task_id,
                    models.DailyTask.user_id == user_id)
            .first())
    if task is None:
        raise HTTPException(status_code=404, detail="Hábito no encontrado")
    return task


@router.post("", response_model=schemas.DailyTaskOut)
def create_task(data: schemas.DailyTaskCreate,
                db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    task = models.DailyTask(user_id=user_id, title=data.title)
    db.add(task); db.commit(); db.refresh(task)
    return task


@router.get("", response_model=list[schemas.DailyTaskOut])
def list_tasks(db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    return (db.query(models.DailyTask)
            .filter(models.DailyTask.user_id == user_id,
                    models.DailyTask.active == True)  # noqa: E712
            .all())


@router.delete("/{task_id}")
def delete_task(task_id: int,
                db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    task = _get_owned(db, task_id, user_id)
    db.delete(task); db.commit()
    return {"ok": True}


@router.put("/{task_id}/complete", response_model=schemas.CompletionOut)
def set_completion(task_id: int,
                   data: schemas.CompletionCreate,
                   db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """Marca o desmarca el hábito en una fecha (upsert)."""
    _get_owned(db, task_id, user_id)  # verifica propiedad
    comp = (db.query(models.TaskCompletion)
            .filter(models.TaskCompletion.daily_task_id == task_id,
                    models.TaskCompletion.date == data.date)
            .first())
    if comp is None:
        comp = models.TaskCompletion(daily_task_id=task_id, date=data.date, done=data.done)
        db.add(comp)
    else:
        comp.done = data.done
    db.commit(); db.refresh(comp)
    return comp


@router.get("/{task_id}/completions", response_model=list[schemas.CompletionOut])
def list_completions(task_id: int,
                     start: date_type | None = None,
                     end: date_type | None = None,
                     db: Session = Depends(get_db),
                     user_id: str = Depends(get_current_user_id)):
    """Histórico de ticks de un hábito (para ver rachas)."""
    _get_owned(db, task_id, user_id)
    q = db.query(models.TaskCompletion).filter(
        models.TaskCompletion.daily_task_id == task_id)
    if start is not None:
        q = q.filter(models.TaskCompletion.date >= start)
    if end is not None:
        q = q.filter(models.TaskCompletion.date <= end)
    return q.order_by(models.TaskCompletion.date.desc()).all()
