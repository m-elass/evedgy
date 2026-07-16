"""
routers/goals.py
────────────────
Objetivos y visiones futuras. Se crean como "pendiente" y, pasado el
tiempo, los revisas marcándolos cumplido / no cumplido. Al cambiar el
estado, guardamos la fecha de revisión automáticamente.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/goals", tags=["goals"])


def _get_owned(db, goal_id, user_id):
    g = (db.query(models.Goal)
         .filter(models.Goal.id == goal_id,
                 models.Goal.user_id == user_id)
         .first())
    if g is None:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    return g


@router.post("", response_model=schemas.GoalOut)
def create(data: schemas.GoalCreate,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    g = models.Goal(user_id=user_id, description=data.description,
                    target_date=data.target_date)
    db.add(g); db.commit(); db.refresh(g)
    return g


@router.get("", response_model=list[schemas.GoalOut])
def list_all(db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Goal)
            .filter(models.Goal.user_id == user_id)
            .order_by(models.Goal.created_at.desc())
            .all())


@router.patch("/{goal_id}", response_model=schemas.GoalOut)
def update(goal_id: int,
           data: schemas.GoalUpdate,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    g = _get_owned(db, goal_id, user_id)
    if data.description is not None:
        g.description = data.description
    if data.target_date is not None:
        g.target_date = data.target_date
    if data.status is not None:
        g.status = data.status
        # al revisar el objetivo, sellamos la fecha de revisión
        g.reviewed_at = datetime.utcnow()
    db.commit(); db.refresh(g)
    return g


@router.delete("/{goal_id}")
def delete(goal_id: int,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    g = _get_owned(db, goal_id, user_id)
    db.delete(g); db.commit()
    return {"ok": True}
