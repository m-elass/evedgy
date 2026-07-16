"""
routers/random_tasks.py
───────────────────────
Tareas sueltas de acción: ocurrencias de cosas que hacer.
CRUD simple. Mismo patrón que exercises.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/random-tasks", tags=["random_tasks"])


def _get_owned(db, task_id, user_id):
    t = (db.query(models.RandomTask)
         .filter(models.RandomTask.id == task_id,
                 models.RandomTask.user_id == user_id)
         .first())
    if t is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return t


@router.post("", response_model=schemas.RandomTaskOut)
def create(data: schemas.RandomTaskCreate,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    t = models.RandomTask(user_id=user_id, content=data.content)
    db.add(t); db.commit(); db.refresh(t)
    return t


@router.get("", response_model=list[schemas.RandomTaskOut])
def list_all(db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    return (db.query(models.RandomTask)
            .filter(models.RandomTask.user_id == user_id)
            .order_by(models.RandomTask.created_at.desc())
            .all())


@router.patch("/{task_id}", response_model=schemas.RandomTaskOut)
def update(task_id: int,
           data: schemas.RandomTaskUpdate,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    t = _get_owned(db, task_id, user_id)
    if data.content is not None:
        t.content = data.content
    if data.done is not None:
        t.done = data.done
    db.commit(); db.refresh(t)
    return t


@router.delete("/{task_id}")
def delete(task_id: int,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    t = _get_owned(db, task_id, user_id)
    db.delete(t); db.commit()
    return {"ok": True}
