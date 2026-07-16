"""
routers/documents.py
────────────────────
Escritura seria: libros cortos, poemarios. A diferencia de las notas,
estos se EDITAN en el tiempo (tienen título, cuerpo y se actualizan).
CRUD completo con update.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_owned(db, doc_id, user_id):
    d = (db.query(models.Document)
         .filter(models.Document.id == doc_id,
                 models.Document.user_id == user_id)
         .first())
    if d is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return d


@router.post("", response_model=schemas.DocumentOut)
def create(data: schemas.DocumentCreate,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    d = models.Document(user_id=user_id, title=data.title,
                        body=data.body, type=data.type)
    db.add(d); db.commit(); db.refresh(d)
    return d


@router.get("", response_model=list[schemas.DocumentOut])
def list_all(db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Document)
            .filter(models.Document.user_id == user_id)
            .order_by(models.Document.updated_at.desc())
            .all())


@router.get("/{doc_id}", response_model=schemas.DocumentOut)
def get_one(doc_id: int,
            db: Session = Depends(get_db),
            user_id: str = Depends(get_current_user_id)):
    return _get_owned(db, doc_id, user_id)


@router.patch("/{doc_id}", response_model=schemas.DocumentOut)
def update(doc_id: int,
           data: schemas.DocumentUpdate,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    d = _get_owned(db, doc_id, user_id)
    if data.title is not None:
        d.title = data.title
    if data.body is not None:
        d.body = data.body
    if data.type is not None:
        d.type = data.type
    db.commit(); db.refresh(d)
    return d


@router.delete("/{doc_id}")
def delete(doc_id: int,
           db: Session = Depends(get_db),
           user_id: str = Depends(get_current_user_id)):
    d = _get_owned(db, doc_id, user_id)
    db.delete(d); db.commit()
    return {"ok": True}
