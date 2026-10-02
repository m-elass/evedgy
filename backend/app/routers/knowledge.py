"""
routers/knowledge.py — LA CONSTELACIÓN DEL CONOCIMIENTO
───────────────────────────────────────────────────────
Lo que quieres leer, ver o escuchar: libros por leer, películas, series,
vídeos, documentales, podcasts, cursos y artículos, cada uno con su «por qué
me interesa». Las lecturas en curso siguen viviendo en Lecturas: un libro
pasa de aquí a allí con «Empezar a leer».

  GET    /knowledge                      → todo, lo pendiente primero
  POST   /knowledge                      → añadir
  PATCH  /knowledge/{id}                 → editar, marcar en curso o terminado
  DELETE /knowledge/{id}
  POST   /knowledge/{id}/start-reading   → (libros) pasa a Lecturas
  POST   /knowledge/from-task/{task_id}  → convierte una tarea suelta en esto
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

_ORDEN_ESTADO = {"en_curso": 0, "pendiente": 1, "hecho": 2}


def _propio(db, user_id, item_id):
    item = (db.query(models.KnowledgeItem)
            .filter(models.KnowledgeItem.id == item_id,
                    models.KnowledgeItem.user_id == user_id).first())
    if item is None:
        raise HTTPException(status_code=404, detail="No encontrado")
    return item


@router.get("", response_model=list[schemas.KnowledgeOut])
def list_items(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    items = (db.query(models.KnowledgeItem)
             .filter(models.KnowledgeItem.user_id == user_id).all())
    items.sort(key=lambda i: (_ORDEN_ESTADO.get(i.status, 1), -(i.priority or 0),
                              -(i.created_at.timestamp() if i.created_at else 0)))
    return items


@router.post("", response_model=schemas.KnowledgeOut)
def create_item(data: schemas.KnowledgeCreate, db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    item = models.KnowledgeItem(user_id=user_id, **data.model_dump())
    item.title = item.title.strip()
    db.add(item); db.commit(); db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=schemas.KnowledgeOut)
def update_item(item_id: int, data: schemas.KnowledgeUpdate, db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    item = _propio(db, user_id, item_id)
    cambios = data.model_dump(exclude_none=True)
    if "status" in cambios and cambios["status"] != item.status:
        item.finished_at = func.now() if cambios["status"] == "hecho" else None
    for k, v in cambios.items():
        setattr(item, k, v)
    db.commit(); db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    db.delete(_propio(db, user_id, item_id)); db.commit()
    return {"ok": True}


@router.post("/{item_id}/start-reading")
def start_reading(item_id: int, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    """El libro pasa a Lecturas; su «por qué» viaja con él como primera cosecha."""
    item = _propio(db, user_id, item_id)
    if item.kind != "libro":
        raise HTTPException(status_code=422, detail="Solo los libros pasan a Lecturas.")
    lectura = models.Reading(user_id=user_id, title=item.title, author=item.creator or "",
                             status="leyendo")
    db.add(lectura)
    db.flush()
    if (item.why or "").strip():
        db.add(models.Harvest(reading_id=lectura.id, user_id=user_id, kind="idea",
                              content="Por qué quería leerlo: " + item.why.strip()))
    db.delete(item)
    db.commit()
    return {"ok": True, "reading_id": lectura.id}


@router.post("/from-task/{task_id}", response_model=schemas.KnowledgeOut)
def from_task(task_id: int, data: schemas.FromTaskIn, db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    """Una tarea suelta («ver Interstellar») se convierte en un elemento de aquí."""
    tarea = (db.query(models.RandomTask)
             .filter(models.RandomTask.id == task_id,
                     models.RandomTask.user_id == user_id).first())
    if tarea is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    item = models.KnowledgeItem(user_id=user_id, kind=data.kind,
                                title=(tarea.content or "").strip()[:200] or "Sin título")
    db.add(item)
    db.delete(tarea)
    db.commit(); db.refresh(item)
    return item
