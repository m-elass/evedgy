"""
routers/training.py — LA SEMANA DE ENTRENO EN UNA SOLA PETICIÓN
───────────────────────────────────────────────────────────────
La estrella Entreno necesitaba, para pintarse, la rutina de la semana, las
sesiones de esta semana y de la anterior, y por CADA ejercicio del día su
mejor serie, la sugerencia de hoy y el aviso de descarga: decenas de
peticiones. Aquí va todo junto, con tres consultas a la base.

  GET /training/week/{lunes} →
    { routine, sessions, prev_sessions,
      insights: { "<exercise_id>": { best, next, deload } } }

Cada pieza tiene exactamente la misma forma que su endpoint suelto (que
sigue existiendo para las versiones antiguas de la app).
"""

from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.auth import get_current_user_id
from app.fechas import exigir_lunes
from app import models, schemas
from app.routers.routine import get_week
from app.routers.insights import calcular_siguiente, calcular_descarga
from app.routers.sessions import calcular_mejor

router = APIRouter(prefix="/training", tags=["training"])


@router.get("/week/{week_start}")
def training_week(week_start: date, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    exigir_lunes(week_start)
    if abs((week_start - date.today()).days) > 3660:
        raise HTTPException(status_code=422, detail="Semana fuera de rango.")

    rutina = get_week(week_start, db, user_id)
    prev_start = week_start - timedelta(days=7)
    week_end = week_start + timedelta(days=6)

    # Sesiones de las dos semanas, con sus series, en una consulta
    dos_semanas = (db.query(models.Session).options(selectinload(models.Session.sets))
                   .filter(models.Session.user_id == user_id,
                           models.Session.date >= prev_start,
                           models.Session.date <= week_end)
                   .order_by(models.Session.date.desc()).all())
    sesiones = [schemas.SessionOut.model_validate(s).model_dump(mode="json")
                for s in dos_semanas if s.date >= week_start]
    anteriores = [schemas.SessionOut.model_validate(s).model_dump(mode="json")
                  for s in dos_semanas if s.date < week_start]

    # Historial completo de los ejercicios del plan, para las sugerencias
    ids = sorted({e["id"] for d in rutina["days"] for e in d["exercises"]})
    por_ejercicio = defaultdict(list)
    if ids:
        historial = (db.query(models.Session).options(selectinload(models.Session.sets))
                     .filter(models.Session.user_id == user_id,
                             models.Session.exercise_id.in_(ids))
                     .order_by(models.Session.date.asc(), models.Session.id.asc()).all())
        for s in historial:
            por_ejercicio[s.exercise_id].append(s)

    insights = {
        str(i): {
            "best": calcular_mejor(por_ejercicio[i]),
            "next": calcular_siguiente(por_ejercicio[i]),
            "deload": calcular_descarga(por_ejercicio[i]),
        }
        for i in ids
    }
    return {"routine": rutina, "sessions": sesiones, "prev_sessions": anteriores,
            "insights": insights}
