"""
routers/today.py — LA PANTALLA DE HOY EN UNA SOLA PETICIÓN
──────────────────────────────────────────────────────────
Hoy reúne piezas de muchas estrellas: el plan del día (los hábitos que tocan
hoy, decididos por Claude cada mañana o, si no, por el plan automático), la
frase del día, un destello
del pasado, la carta de hoy, las misiones diarias y las tareas pendientes de
las secciones de Tareas que el usuario ha puesto «En Hoy». Antes eran 1 + N
peticiones (una por hábito); ahora es una, con un puñado de consultas.

  GET /today?date=AAAA-MM-DD   (la fecha local del móvil)
"""

import hashlib
from datetime import date as date_type, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app.fechas import fecha_local, racha
from app import models
from app.habitos import estado_habitos, plan_de_hoy
from app.routers.quotes import frase_del_dia
from app.routers.skill_board import misiones_de_hoy

router = APIRouter(tags=["today"])


def _semilla(user_id: str, dia: date_type, sal: str) -> int:
    return int.from_bytes(hashlib.sha256(f"{sal}:{user_id}:{dia}".encode()).digest()[:4], "big")


def estado_carta(db, user_id, hoy):
    dias = {d for (d,) in db.query(models.DailyLetter.date)
            .filter(models.DailyLetter.user_id == user_id,
                    models.DailyLetter.date >= hoy - timedelta(days=400)).all()}
    return {"written": hoy in dias, "streak": racha(dias, hoy)}


def secciones_en_hoy(db, user_id, max_por_seccion: int = 30):
    """Las secciones de Tareas marcadas «En Hoy», en su orden, con sus tareas pendientes (dos consultas)."""
    secciones = (db.query(models.TaskSection)
                 .filter(models.TaskSection.user_id == user_id,
                         models.TaskSection.in_today == True)  # noqa: E712
                 .order_by(models.TaskSection.order, models.TaskSection.id).all())
    if not secciones:
        return []
    por_seccion = {s.id: [] for s in secciones}
    tareas = (db.query(models.RandomTask)
              .filter(models.RandomTask.user_id == user_id,
                      models.RandomTask.section_id.in_(list(por_seccion)),
                      models.RandomTask.done == False)  # noqa: E712
              .order_by(models.RandomTask.created_at, models.RandomTask.id).all())
    for t in tareas:
        if len(por_seccion[t.section_id]) < max_por_seccion:
            por_seccion[t.section_id].append({"id": t.id, "content": t.content})
    return [{"id": s.id, "name": s.name, "color": s.color or "#E8B84B", "tasks": por_seccion[s.id]}
            for s in secciones]


def estado_misiones(db, user_id, hoy):
    """Misiones diarias del Sistema: cuántas hay hoy y cuántas están cumplidas (las crea si faltan)."""
    return misiones_de_hoy(db, user_id, hoy)


@router.get("/today")
def today(date: date_type, db: Session = Depends(get_db),
          user_id: str = Depends(get_current_user_id)):
    hoy = fecha_local(date)

    # Frases: la del día y unas cuantas más para «otra», sin pedir nada nuevo
    frases = db.query(models.Quote).filter(models.Quote.user_id == user_id).all()
    elegidas, vistas = [], set()
    for salto in range(12):
        q = frase_del_dia(frases, user_id, hoy, salto)
        if q is None or len(elegidas) == 5:
            break
        if q.id not in vistas:
            vistas.add(q.id)
            elegidas.append({"id": q.id, "text": q.text, "author": q.author or "",
                             "source": q.source or ""})

    # Un destello del pasado: el mismo todo el día
    ids = [i for (i,) in db.query(models.Note.id).filter(models.Note.user_id == user_id)
           .order_by(models.Note.id).all()]
    destello = None
    if ids:
        n = db.get(models.Note, ids[_semilla(user_id, hoy, "destello") % len(ids)])
        destello = {"id": n.id, "content": n.content,
                    "created_at": n.created_at.isoformat() if n.created_at else None}

    misiones = estado_misiones(db, user_id, hoy)     # antes del plan: crea las de hoy si faltan
    habitos = estado_habitos(db, user_id, hoy)
    return {
        "date": hoy.isoformat(),
        "habits": habitos,
        "plan": plan_de_hoy(db, user_id, hoy, habitos),
        "quotes": elegidas,
        "flashback": destello,
        "letter": estado_carta(db, user_id, hoy),
        "missions": misiones,
        "task_sections": secciones_en_hoy(db, user_id),
    }
