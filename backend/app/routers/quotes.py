"""
routers/quotes.py — FRASES CON HONDURA
──────────────────────────────────────
Frases que te han marcado, para que vuelvan a aparecer en Hoy (y en el widget
del móvil). Cada día sale una; las favoritas salen el triple de a menudo.

La elección es determinista (depende del usuario y del día): la misma frase
durante todo el día, aunque abras la app veinte veces, y otra mañana.
"""

import hashlib
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/quotes", tags=["quotes"])


def frase_del_dia(frases, user_id: str, dia: date_type, salto: int = 0):
    """Elige la frase de un día. `salto` permite pedir «otra» de forma estable."""
    if not frases:
        return None
    ordenadas = sorted(frases, key=lambda q: q.id)
    bolsa = [q for q in ordenadas for _ in range(3 if q.favorite else 1)]
    semilla = hashlib.sha256(f"{user_id}:{dia.isoformat()}".encode()).digest()
    return bolsa[(int.from_bytes(semilla[:4], "big") + salto) % len(bolsa)]


def _propia(db, user_id, quote_id):
    q = (db.query(models.Quote)
         .filter(models.Quote.id == quote_id, models.Quote.user_id == user_id).first())
    if q is None:
        raise HTTPException(status_code=404, detail="Frase no encontrada")
    return q


@router.get("", response_model=list[schemas.QuoteOut])
def list_quotes(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Quote).filter(models.Quote.user_id == user_id)
            .order_by(models.Quote.created_at.desc(), models.Quote.id.desc()).all())


@router.post("", response_model=schemas.QuoteOut)
def create_quote(data: schemas.QuoteCreate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    q = models.Quote(user_id=user_id, **data.model_dump())
    q.text = q.text.strip()
    db.add(q); db.commit(); db.refresh(q)
    return q


@router.patch("/{quote_id}", response_model=schemas.QuoteOut)
def update_quote(quote_id: int, data: schemas.QuoteUpdate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    q = _propia(db, user_id, quote_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(q, k, v)
    db.commit(); db.refresh(q)
    return q


@router.delete("/{quote_id}")
def delete_quote(quote_id: int, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    db.delete(_propia(db, user_id, quote_id)); db.commit()
    return {"ok": True}
