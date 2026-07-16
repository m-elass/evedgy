"""
routers/profile.py
──────────────────
Perfil del usuario (peso corporal, sexo, alias, opt-in de compartir) y el
cálculo de RANGOS de fuerza por ejercicio, que es el corazón del deseo 1.

El rango sale de comparar tu mejor 1RM estimado con estándares reales de la
industria (ver strength_standards.py), ajustado por tu peso corporal y sexo.
Sin peso corporal no se puede calcular: el endpoint lo indica con claridad.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas
from app import strength_standards as ss

router = APIRouter(tags=["profile"])


def _get_or_create_profile(db, user_id):
    p = (db.query(models.UserProfile)
         .filter(models.UserProfile.user_id == user_id).first())
    if p is None:
        p = models.UserProfile(user_id=user_id)
        db.add(p); db.commit(); db.refresh(p)
    return p


@router.get("/profile", response_model=schemas.ProfileOut)
def get_profile(db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    return _get_or_create_profile(db, user_id)


@router.patch("/profile", response_model=schemas.ProfileOut)
def update_profile(data: schemas.ProfileUpdate, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    p = _get_or_create_profile(db, user_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return p


def _best_1rm_for_exercise(db, user_id, exercise_id):
    """El mejor 1RM estimado del usuario en un ejercicio, sobre todo su historial."""
    sessions = (db.query(models.Session)
                .filter(models.Session.user_id == user_id,
                        models.Session.exercise_id == exercise_id).all())
    best = 0.0
    for s in sessions:
        for st in s.sets:
            if st.weight > 0:
                best = max(best, ss.estimate_1rm(st.weight, st.reps))
    return best


@router.get("/ranks/{exercise_id}")
def rank_for_exercise(exercise_id: int, db: Session = Depends(get_db),
                      user_id: str = Depends(get_current_user_id)):
    """El rango del usuario en un ejercicio concreto."""
    ex = (db.query(models.Exercise)
          .filter(models.Exercise.id == exercise_id,
                  models.Exercise.user_id == user_id).first())
    if ex is None:
        raise HTTPException(404, "Ejercicio no encontrado")

    profile = _get_or_create_profile(db, user_id)
    if not profile.bodyweight or profile.bodyweight <= 0:
        return {"has_rank": False,
                "reason": "Añade tu peso corporal en el perfil para ver tus rangos."}

    best = _best_1rm_for_exercise(db, user_id, exercise_id)
    if best <= 0:
        return {"has_rank": False,
                "reason": "Registra alguna serie de este ejercicio para calcular tu rango."}

    result = ss.rank_for(best, profile.bodyweight, ex.name, profile.sex)
    return {"has_rank": True, "exercise": ex.name, "best_1rm": round(best, 1), **result}


@router.get("/ranks")
def all_ranks(db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    """Los rangos del usuario en todos sus ejercicios con historial."""
    profile = _get_or_create_profile(db, user_id)
    exercises = (db.query(models.Exercise)
                 .filter(models.Exercise.user_id == user_id).all())
    out = []
    needs_bw = not profile.bodyweight or profile.bodyweight <= 0
    for ex in exercises:
        best = _best_1rm_for_exercise(db, user_id, ex.id)
        if best <= 0:
            continue
        if needs_bw:
            out.append({"exercise_id": ex.id, "exercise": ex.name, "has_rank": False})
            continue
        r = ss.rank_for(best, profile.bodyweight, ex.name, profile.sex)
        out.append({"exercise_id": ex.id, "exercise": ex.name, "has_rank": True,
                    "best_1rm": round(best, 1), **r})
    # ordenar por nivel de insignia (los más altos primero)
    badge_order = {b["id"]: i for i, b in enumerate(ss.BADGES)}
    out.sort(key=lambda x: badge_order.get(x.get("badge", {}).get("id", "hierro"), 0)
             if x.get("has_rank") else -1, reverse=True)
    return {"needs_bodyweight": needs_bw, "ranks": out, "badges": ss.BADGES}


# ── Exportación de datos: todo lo tuyo, en un JSON descargable ──
def _rows(db, model, user_id, order_by=None):
    """Serializa todas las filas de un modelo del usuario a dicts simples."""
    q = db.query(model).filter(model.user_id == user_id)
    out = []
    for row in q.all():
        d = {}
        for col in row.__table__.columns:
            v = getattr(row, col.name)
            d[col.name] = v.isoformat() if hasattr(v, "isoformat") else v
        out.append(d)
    return out


@router.get("/export")
def export_all(db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    """
    Exporta TODOS los datos del usuario en un único JSON. Tus datos son tuyos:
    puedes llevártelos cuando quieras.
    Detalle deliberado: las cartas al futuro aún selladas se exportan SIN su
    texto (solo la fecha de apertura), para no romper su propio sello.
    """
    from datetime import date as date_type
    data = {
        "profile": _rows(db, models.UserProfile, user_id),
        "exercises": _rows(db, models.Exercise, user_id),
        "sessions": [],
        "daily_tasks": _rows(db, models.DailyTask, user_id),
        "random_tasks": _rows(db, models.RandomTask, user_id),
        "notes": _rows(db, models.Note, user_id),
        "documents": _rows(db, models.Document, user_id),
        "sleep": _rows(db, models.SleepLog, user_id),
        "goals": _rows(db, models.Goal, user_id),
        "values": _rows(db, models.Value, user_id),
        "reviews": _rows(db, models.Review, user_id),
        "decisions": _rows(db, models.Decision, user_id),
        "letters": [],
        "readings": _rows(db, models.Reading, user_id),
        "skills": _rows(db, models.Skill, user_id),
        "physique_goals": _rows(db, models.PhysiqueGoal, user_id),
    }

    # Sesiones con sus series dentro
    for s in db.query(models.Session).filter(models.Session.user_id == user_id).all():
        data["sessions"].append({
            "exercise_id": s.exercise_id, "date": s.date.isoformat(),
            "feelings": s.feelings,
            "sets": [{"set_number": st.set_number, "reps": st.reps, "weight": st.weight}
                     for st in s.sets],
        })

    # Cartas: las selladas van sin cuerpo
    today = date_type.today()
    for l in db.query(models.FutureLetter).filter(models.FutureLetter.user_id == user_id).all():
        sealed = l.open_date > today
        data["letters"].append({
            "open_date": l.open_date.isoformat(),
            "sealed": sealed,
            "body": None if sealed else l.body,
        })

    return data
