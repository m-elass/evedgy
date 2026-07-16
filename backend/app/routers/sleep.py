"""
routers/sleep.py
────────────────
Horas dormidas por día (entrada manual).
Usa upsert por fecha: si ya registraste una noche, la corrige en vez
de duplicarla.
"""

from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/sleep", tags=["sleep"])


@router.put("", response_model=schemas.SleepOut)
def set_sleep(data: schemas.SleepCreate,
              db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    """Registra o corrige las horas dormidas de una fecha."""
    log = (db.query(models.SleepLog)
           .filter(models.SleepLog.user_id == user_id,
                   models.SleepLog.date == data.date)
           .first())
    if log is None:
        log = models.SleepLog(user_id=user_id, date=data.date, hours=data.hours)
        db.add(log)
    else:
        log.hours = data.hours
    db.commit(); db.refresh(log)
    return log


@router.get("", response_model=list[schemas.SleepOut])
def list_sleep(start: date_type | None = None,
               end: date_type | None = None,
               db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    """Lista las noches, opcionalmente filtradas por rango (para gráficas)."""
    q = db.query(models.SleepLog).filter(models.SleepLog.user_id == user_id)
    if start is not None:
        q = q.filter(models.SleepLog.date >= start)
    if end is not None:
        q = q.filter(models.SleepLog.date <= end)
    return q.order_by(models.SleepLog.date.desc()).all()


@router.delete("/{log_id}")
def delete_sleep(log_id: int,
                 db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    log = (db.query(models.SleepLog)
           .filter(models.SleepLog.id == log_id,
                   models.SleepLog.user_id == user_id)
           .first())
    if log is None:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(log); db.commit()
    return {"ok": True}
