"""
routers/exercises.py
────────────────────
Los ENDPOINTS del módulo de ejercicios: las URLs que el frontend llama
para crear, listar, ver, editar y borrar ejercicios.

Cada endpoint:
1. Recibe el user_id verificado (Depends(get_current_user_id)).
2. Abre una sesión de base de datos (Depends(get_db)).
3. Filtra SIEMPRE por user_id, para que nadie vea datos de otro.

Este archivo es la PLANTILLA mental para todos los demás módulos:
el resto (notas, objetivos, sueño...) se hace clavadito a esto.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas
from app import muscles as muscle_lib

# Todas las rutas de este archivo empiezan por /exercises
router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.post("", response_model=schemas.ExerciseOut)
def create_exercise(
    data: schemas.ExerciseCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Crea un ejercicio nuevo para el usuario actual."""
    # Adivinamos los músculos por el nombre; el usuario podrá ajustarlos luego.
    primary, secondary = muscle_lib.detect_muscles(data.name)
    exercise = models.Exercise(
        user_id=user_id,
        name=data.name,
        notes=data.notes,
        primary_muscles=",".join(primary),
        secondary_muscles=",".join(secondary),
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)   # recarga para tener el id y la fecha generados
    return exercise


@router.get("/muscles/catalog")
def muscles_catalog(user_id: str = Depends(get_current_user_id)):
    """Catálogo de grupos musculares (id -> nombre) para el editor y el diagrama."""
    return {"muscles": muscle_lib.MUSCLES}


@router.get("/catalog/known")
def known_catalog(user_id: str = Depends(get_current_user_id)):
    """
    Catálogo de ejercicios que la app reconoce con seguridad. El frontend lo
    usa para autocompletar: escribiendo dos letras aparecen las sugerencias,
    y al elegir una, los músculos salen exactos.
    """
    out = []
    for name in muscle_lib.CATALOG:
        d = muscle_lib.describe(name)
        out.append({"name": name, "primary": d["primary_names"],
                    "secondary": d["secondary_names"], "regions": d["regions"]})
    return {"exercises": out, "count": len(out)}


@router.get("/analyze")
def analyze_name(name: str, user_id: str = Depends(get_current_user_id)):
    """Vista previa: qué músculos detecta la app para un nombre, sin crear nada."""
    return muscle_lib.describe(name)


@router.post("/reanalyze-all")
def reanalyze_all(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Recalcula los músculos de TODOS tus ejercicios con la base actual."""
    items = (db.query(models.Exercise)
             .filter(models.Exercise.user_id == user_id).all())
    n = 0
    for ex in items:
        p, sec = muscle_lib.detect_muscles(ex.name)
        if p:
            ex.primary_muscles = ",".join(p)
            ex.secondary_muscles = ",".join(sec)
            n += 1
    db.commit()
    return {"ok": True, "updated": n, "total": len(items)}


@router.get("", response_model=list[schemas.ExerciseOut])
def list_exercises(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Lista los ejercicios del usuario. De paso, AUTOCURACIÓN: los ejercicios
    guardados con el sistema muscular antiguo (ids genéricos como "pecho")
    se reanalizan con la base de conocimiento nueva y quedan corregidos
    (así "Jalón al pecho" deja de figurar como pecho sin que hagas nada).
    """
    items = (
        db.query(models.Exercise)
        .filter(models.Exercise.user_id == user_id)
        .order_by(models.Exercise.name)
        .all()
    )
    changed = False
    for ex in items:
        stored = [m for m in (ex.primary_muscles or "").split(",") if m]
        # "Caducado" = sin músculos, o con ids de una versión anterior de la
        # anatomía que ya no existen. Si los ids son válidos, NO se tocan:
        # así una edición manual tuya nunca se sobrescribe sola.
        stale = (not stored) or any(m not in muscle_lib.FINE for m in stored)
        if stale:
            p, sec = muscle_lib.detect_muscles(ex.name)
            if p and set(p) != set(stored):
                ex.primary_muscles = ",".join(p)
                ex.secondary_muscles = ",".join(sec)
                changed = True
    if changed:
        db.commit()
    return items


@router.post("/{exercise_id}/reanalyze", response_model=schemas.ExerciseOut)
def reanalyze_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Recalcula los músculos de un ejercicio con la base de conocimiento."""
    exercise = _get_owned(db, exercise_id, user_id)
    p, s = muscle_lib.detect_muscles(exercise.name)
    exercise.primary_muscles = ",".join(p)
    exercise.secondary_muscles = ",".join(s)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.get("/{exercise_id}", response_model=schemas.ExerciseOut)
def get_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Devuelve un ejercicio concreto (si es del usuario)."""
    exercise = _get_owned(db, exercise_id, user_id)
    return exercise


@router.patch("/{exercise_id}", response_model=schemas.ExerciseOut)
def update_exercise(
    exercise_id: int,
    data: schemas.ExerciseUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Edita nombre, notas y/o músculos de un ejercicio."""
    exercise = _get_owned(db, exercise_id, user_id)
    if data.name is not None:
        exercise.name = data.name
    if data.notes is not None:
        exercise.notes = data.notes
    if data.primary_muscles is not None:
        exercise.primary_muscles = data.primary_muscles
    if data.secondary_muscles is not None:
        exercise.secondary_muscles = data.secondary_muscles
    db.commit()
    db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}")
def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Borra un ejercicio del usuario."""
    exercise = _get_owned(db, exercise_id, user_id)
    db.delete(exercise)
    db.commit()
    return {"ok": True}


def _get_owned(db: Session, exercise_id: int, user_id: str) -> models.Exercise:
    """
    Ayudante: busca el ejercicio y comprueba que pertenece al usuario.
    Si no existe o no es suyo, devuelve 404. (No revelamos que existe
    pero es de otro: simplemente "no encontrado".)
    """
    exercise = (
        db.query(models.Exercise)
        .filter(
            models.Exercise.id == exercise_id,
            models.Exercise.user_id == user_id,
        )
        .first()
    )
    if exercise is None:
        raise HTTPException(status_code=404, detail="Ejercicio no encontrado")
    return exercise
