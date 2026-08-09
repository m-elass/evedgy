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
    t = models.RandomTask(user_id=user_id, content=data.content, section_id=data.section_id)
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
    # Clasificar: mover a una sección, o sacarla de todas ("Sin clasificar").
    # Son dos acciones distintas y por eso hay dos campos: mandar section_id
    # la mueve; mandar clear_section la deja sin clasificar.
    if data.clear_section:
        t.section_id = None
    elif data.section_id is not None:
        existe = (db.query(models.TaskSection)
                  .filter(models.TaskSection.id == data.section_id,
                          models.TaskSection.user_id == user_id).first())
        if existe is None:
            raise HTTPException(status_code=404, detail="Sección no encontrada")
        t.section_id = data.section_id
    db.commit(); db.refresh(t)
    return t


@router.delete("/{task_id}")
def delete(task_id: int,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    t = _get_owned(db, task_id, user_id)
    db.delete(t); db.commit()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════
# SECCIONES: la clasificación visual que define el usuario
# ═══════════════════════════════════════════════════════════
secciones = APIRouter(prefix="/task-sections", tags=["task-sections"])


@secciones.get("", response_model=list[schemas.TaskSectionOut])
def list_sections(db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    """Las secciones del usuario, en su orden."""
    return (db.query(models.TaskSection)
            .filter(models.TaskSection.user_id == user_id)
            .order_by(models.TaskSection.order, models.TaskSection.id).all())


@secciones.post("", response_model=schemas.TaskSectionOut)
def create_section(data: schemas.TaskSectionCreate,
                   db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """Crea una sección nueva; se coloca la última."""
    ultimo = (db.query(models.TaskSection)
              .filter(models.TaskSection.user_id == user_id).count())
    seccion = models.TaskSection(
        user_id=user_id, name=data.name.strip(),
        color=data.color or "#E8B84B", order=ultimo)
    db.add(seccion)
    db.commit()
    db.refresh(seccion)
    return seccion


@secciones.patch("/{section_id}", response_model=schemas.TaskSectionOut)
def update_section(section_id: int, data: schemas.TaskSectionUpdate,
                   db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """Renombra, recolorea o reordena una sección."""
    seccion = (db.query(models.TaskSection)
               .filter(models.TaskSection.id == section_id,
                       models.TaskSection.user_id == user_id).first())
    if seccion is None:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    for campo, valor in data.model_dump(exclude_unset=True).items():
        if valor is not None:
            setattr(seccion, campo, valor)
    db.commit()
    db.refresh(seccion)
    return seccion


@secciones.delete("/{section_id}")
def delete_section(section_id: int, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """
    Borra la sección. Las tareas que contenía NO se borran: vuelven a
    "Sin clasificar". Perder una carpeta nunca debe costarte el contenido.
    """
    seccion = (db.query(models.TaskSection)
               .filter(models.TaskSection.id == section_id,
                       models.TaskSection.user_id == user_id).first())
    if seccion is None:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    (db.query(models.RandomTask)
     .filter(models.RandomTask.user_id == user_id,
             models.RandomTask.section_id == section_id)
     .update({models.RandomTask.section_id: None}))
    db.delete(seccion)
    db.commit()
    return {"ok": True}
