"""
routers/notes.py
────────────────
Destellos intelectuales: versos sueltos, frases, ideas fugaces.
CRUD simple (crear, listar, borrar). Mismo patrón.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("", response_model=schemas.NoteOut)
def create(data: schemas.NoteCreate,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    n = models.Note(user_id=user_id, content=data.content)
    db.add(n); db.commit(); db.refresh(n)
    return n


@router.get("", response_model=list[schemas.NoteOut])
def list_all(db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Note)
            .filter(models.Note.user_id == user_id)
            .order_by(models.Note.created_at.desc())
            .all())


@router.delete("/{note_id}")
def delete(note_id: int,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    n = (db.query(models.Note)
         .filter(models.Note.id == note_id,
                 models.Note.user_id == user_id)
         .first())
    if n is None:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    db.delete(n); db.commit()
    return {"ok": True}
