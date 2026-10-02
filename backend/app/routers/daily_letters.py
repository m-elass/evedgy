"""
routers/daily_letters.py — LA CARTA DE CADA DÍA
───────────────────────────────────────────────
Una carta por día, escrita al caer la noche para entregarla algún día a una
persona. La FECHA es la identidad de cada carta: escribir otra vez el mismo
día la reescribe (no crea una segunda).

  GET    /daily-letters?date=AAAA-MM-DD  → resumen: ¿escrita hoy?, racha, archivo
  GET    /daily-letters/book              → todas, completas y en orden (para encuadernarlas)
  GET    /daily-letters/{fecha}           → una carta completa
  PUT    /daily-letters/{fecha}           → escribir o reescribir la de ese día
  DELETE /daily-letters/{fecha}           → borrarla

`date` es el «día lógico» del móvil: de madrugada (antes de las 4:00) todavía
cuenta como el día anterior, para quien escribe pasada la medianoche.
"""

from datetime import date as date_type, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app.fechas import fecha_local, hoy_utc, racha, mejor_racha
from app import models, schemas

router = APIRouter(prefix="/daily-letters", tags=["daily_letters"])


def _completa(carta):
    return {"date": carta.date.isoformat(), "greeting": carta.greeting or "",
            "body": carta.body, "closing": carta.closing or "", "seal": carta.seal or "carmesi",
            "words": carta.words or 0,
            "updated_at": carta.updated_at.isoformat() if carta.updated_at else None}


@router.get("")
def overview(date: date_type, db: Session = Depends(get_db),
             user_id: str = Depends(get_current_user_id)):
    """El estado de hoy, la racha y el archivo (sin el texto: solo un adelanto)."""
    hoy = fecha_local(date)
    filas = (db.query(models.DailyLetter.date, models.DailyLetter.greeting,
                      func.substr(models.DailyLetter.body, 1, 160),
                      models.DailyLetter.words, models.DailyLetter.seal)
             .filter(models.DailyLetter.user_id == user_id)
             .order_by(models.DailyLetter.date.desc()).all())
    dias = {f[0] for f in filas}
    ultima = (db.query(models.DailyLetter.greeting, models.DailyLetter.closing)
              .filter(models.DailyLetter.user_id == user_id)
              .order_by(models.DailyLetter.date.desc()).first())
    return {
        "last_greeting": (ultima[0] or "") if ultima else "",
        "last_closing": (ultima[1] or "") if ultima else "",
        "today": hoy.isoformat(),
        "written_today": hoy in dias,
        "streak": racha(dias, hoy),
        "best_streak": mejor_racha(dias),
        "total": len(filas),
        "words": sum(f[3] or 0 for f in filas),
        "letters": [{"date": f[0].isoformat(), "greeting": f[1] or "", "preview": f[2] or "",
                     "words": f[3] or 0, "seal": f[4] or "carmesi"} for f in filas],
    }


@router.get("/book")
def book(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Todas las cartas completas, de la primera a la última: el libro para entregarlas."""
    cartas = (db.query(models.DailyLetter).filter(models.DailyLetter.user_id == user_id)
              .order_by(models.DailyLetter.date.asc()).all())
    return [_completa(c) for c in cartas]


def _propia(db, user_id, dia):
    return (db.query(models.DailyLetter)
            .filter(models.DailyLetter.user_id == user_id,
                    models.DailyLetter.date == dia).first())


@router.get("/{dia}")
def get_letter(dia: date_type, db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    carta = _propia(db, user_id, dia)
    if carta is None:
        raise HTTPException(status_code=404, detail="No hay carta ese día")
    return _completa(carta)


@router.put("/{dia}")
def put_letter(dia: date_type, data: schemas.DailyLetterIn, db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    """Escribe (o reescribe) la carta de un día. No se escriben cartas del futuro."""
    if dia > hoy_utc() + timedelta(days=1):
        raise HTTPException(status_code=422, detail="No se puede escribir la carta de un día que no ha llegado.")
    cuerpo = data.body.strip()
    if not cuerpo:
        raise HTTPException(status_code=422, detail="La carta está vacía.")
    campos = {"greeting": data.greeting.strip(), "body": cuerpo, "closing": data.closing.strip(),
              "seal": data.seal, "words": len(cuerpo.split())}
    carta = _propia(db, user_id, dia)
    if carta is None:
        carta = models.DailyLetter(user_id=user_id, date=dia, **campos)
        db.add(carta)
        try:
            db.commit()
        except IntegrityError:                 # dos guardados a la vez: gana la última versión
            db.rollback()
            carta = _propia(db, user_id, dia)
            for k, v in campos.items():
                setattr(carta, k, v)
            db.commit()
    else:
        for k, v in campos.items():
            setattr(carta, k, v)
        db.commit()
    db.refresh(carta)
    return _completa(carta)


@router.delete("/{dia}")
def delete_letter(dia: date_type, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    carta = _propia(db, user_id, dia)
    if carta is None:
        raise HTTPException(status_code=404, detail="No hay carta ese día")
    db.delete(carta)
    db.commit()
    return {"ok": True}
