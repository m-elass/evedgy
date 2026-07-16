"""
routers/sessions.py
────────────────────
Endpoints del registro de entrenamientos. Aquí vive lo más rico de la app:
- Crear una sesión con sus series de una vez.
- Listar sesiones filtrando por fechas (para "esta semana" o "hace 2 semanas").
- Ver el progreso de un ejercicio (datos para la gráfica).

Recuerda el patrón: todo filtra por user_id (viene del token verificado).
"""

from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _check_exercise_owned(db: Session, exercise_id: int, user_id: str):
    """Comprueba que el ejercicio existe y es del usuario antes de tocarlo."""
    ex = (
        db.query(models.Exercise)
        .filter(models.Exercise.id == exercise_id,
                models.Exercise.user_id == user_id)
        .first()
    )
    if ex is None:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    return ex


@router.post("", response_model=schemas.SessionCreatedOut)
def create_session(
    data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Registra un entrenamiento completo: crea la sesión y, dentro, sus series.
    Además detecta si has batido tu récord (mejor 1RM estimado histórico) en
    ese ejercicio, para que el frontend lo celebre.
    """
    exercise = _check_exercise_owned(db, data.exercise_id, user_id)

    # Mejor 1RM ANTES de esta sesión (fórmula de Epley, la misma de records)
    from app.strength_standards import estimate_1rm
    prev_best = 0.0
    previous = (db.query(models.Session)
                .filter(models.Session.user_id == user_id,
                        models.Session.exercise_id == data.exercise_id).all())
    for ps in previous:
        for st in ps.sets:
            if st.weight > 0:
                prev_best = max(prev_best, estimate_1rm(st.weight, st.reps))

    session = models.Session(
        user_id=user_id,
        exercise_id=data.exercise_id,
        date=data.date,
        feelings=data.feelings,
    )
    # Añadimos las series dentro de la misma sesión
    new_best = 0.0
    for s in data.sets:
        session.sets.append(models.ExerciseSet(
            set_number=s.set_number, reps=s.reps, weight=s.weight,
        ))
        if s.weight > 0:
            new_best = max(new_best, estimate_1rm(s.weight, s.reps))

    db.add(session)
    db.commit()
    db.refresh(session)

    # Récord: solo si ya había historial (la primera sesión no es "batir" nada)
    is_record = prev_best > 0 and new_best > prev_best
    out = schemas.SessionCreatedOut.model_validate(session)
    out.new_record = is_record
    out.record_1rm = round(new_best, 1) if is_record else None
    out.exercise_name = exercise.name if exercise is not None else ""
    return out


@router.get("", response_model=list[schemas.SessionOut])
def list_sessions(
    start: date_type | None = None,
    end: date_type | None = None,
    exercise_id: int | None = None,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Lista sesiones del usuario. Acepta filtros opcionales:
    - start / end : rango de fechas (así pides "esta semana" o cualquier semana).
    - exercise_id : solo las de un ejercicio.

    Sin filtros, devuelve todas (el historial completo).
    """
    q = db.query(models.Session).filter(models.Session.user_id == user_id)
    if start is not None:
        q = q.filter(models.Session.date >= start)
    if end is not None:
        q = q.filter(models.Session.date <= end)
    if exercise_id is not None:
        q = q.filter(models.Session.exercise_id == exercise_id)
    return q.order_by(models.Session.date.desc()).all()


@router.get("/progress/{exercise_id}")
def exercise_progress(
    exercise_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Datos para la GRÁFICA de progreso de un ejercicio.
    Por cada sesión (ordenadas por fecha) calcula las tres métricas que
    el prototipo deja alternar: peso máximo, peso medio y volumen total.
    El frontend elige cuál pintar.
    """
    _check_exercise_owned(db, exercise_id, user_id)

    sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == user_id,
                models.Session.exercise_id == exercise_id)
        .order_by(models.Session.date.asc())
        .all()
    )

    points = []
    for s in sessions:
        weights = [st.weight for st in s.sets] or [0]
        volume = sum(st.weight * st.reps for st in s.sets)
        points.append({
            "date": s.date.isoformat(),
            "max": max(weights),
            "avg": round(sum(weights) / len(weights), 1),
            "volume": volume,
        })
    return {"exercise_id": exercise_id, "points": points}


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Borra una sesión (y sus series, por el cascade del modelo)."""
    session = (
        db.query(models.Session)
        .filter(models.Session.id == session_id,
                models.Session.user_id == user_id)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    db.delete(session)
    db.commit()
    return {"ok": True}
