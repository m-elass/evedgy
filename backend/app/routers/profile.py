"""
routers/profile.py
──────────────────
Perfil del usuario (peso corporal, sexo, alias, opt-in de compartir) y el
cálculo de RANGOS de fuerza por ejercicio, que es el corazón del deseo 1.

El rango sale de comparar tu mejor 1RM estimado con estándares reales de la
industria (ver strength_standards.py), ajustado por tu peso corporal y sexo.
Sin peso corporal no se puede calcular: el endpoint lo indica con claridad.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_, text
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas
from app import strength_standards as ss

logger = logging.getLogger("perfil")
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


# ── Exportación y borrado: recorren TODAS las tablas ─────
# Se trabaja sobre Base.metadata, no sobre una lista escrita a mano: una tabla
# nueva queda incluida sola, sin depender de que alguien se acuerde de añadirla.

def _modelos_por_tabla():
    return {m.class_.__tablename__: m.class_ for m in models.Base.registry.mappers}


# Tablas sin user_id que cuelgan de otra que sí lo tiene: (columna, tabla madre)
_HIJAS = {
    "sets": ("session_id", "sessions"),
    "task_completions": ("daily_task_id", "daily_tasks"),
    "value_checkins": ("value_id", "values"),
}
# No se exportan: credenciales, datos técnicos o contadores internos
_SIN_EXPORTAR = {"widget_tokens", "push_subscriptions", "ai_usage", "server_keys"}


def _filtro_de_usuario(modelo, tabla, user_id, mapa):
    """La condición que selecciona las filas de este usuario en una tabla, o None."""
    if tabla in _HIJAS:
        col, madre = _HIJAS[tabla]
        M = mapa[madre]
        ids = db_select_ids(M, user_id)
        return getattr(modelo, col).in_(ids)
    if tabla == "friendships":
        return or_(modelo.requester_id == user_id, modelo.addressee_id == user_id)
    if hasattr(modelo, "user_id"):
        return modelo.user_id == user_id
    return None


def db_select_ids(M, user_id):
    from sqlalchemy import select
    return select(M.id).where(M.user_id == user_id)


def _fila(row):
    d = {}
    for col in row.__table__.columns:
        v = getattr(row, col.name)
        d[col.name] = v.isoformat() if hasattr(v, "isoformat") else v
    return d


@router.get("/export")
def export_all(db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    """
    Exporta TODOS los datos del usuario en un único JSON, tabla a tabla. Tus
    datos son tuyos: puedes llevártelos (o guardarlos como copia) cuando quieras.
    Detalle deliberado: las cartas al futuro aún selladas se exportan SIN su
    texto (solo la fecha de apertura), para no romper su propio sello.
    """
    from datetime import date as date_type
    mapa = _modelos_por_tabla()
    data = {"_exportado": date_type.today().isoformat(), "_cuentas": {}}
    for tabla in models.Base.metadata.sorted_tables:
        if tabla.name in _SIN_EXPORTAR or tabla.name not in mapa:
            continue
        modelo = mapa[tabla.name]
        cond = _filtro_de_usuario(modelo, tabla.name, user_id, mapa)
        if cond is None:
            continue
        filas = [_fila(r) for r in db.query(modelo).filter(cond).all()]
        if tabla.name == "future_letters":
            hoy = date_type.today()
            for f in filas:
                if f.get("open_date") and f["open_date"] > hoy.isoformat():
                    f["body"] = None
                    f["sealed"] = True
        data[tabla.name] = filas
        data["_cuentas"][tabla.name] = len(filas)
    return data


@router.delete("/profile/account")
def delete_account(
    confirm: str = "",
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Borra TODO lo que la app guarda de este usuario. Sin vuelta atrás.

    El RGPD reconoce el «derecho de supresión». Se recorren todas las tablas de
    hijas a madres (para no chocar con las claves ajenas de PostgreSQL), en una
    sola transacción: o se borra todo o no se borra nada.

    Lo único que se conserva es el contador de IA de HOY (sin contenido): así
    borrar la cuenta no sirve para saltarse el tope diario de gasto.
    Exige ?confirm=BORRAR para que un clic accidental no destruya un año de registro.
    """
    if confirm != "BORRAR":
        raise HTTPException(
            status_code=400,
            detail="Falta la confirmación. Esta acción borra todos tus datos "
                   "y no se puede deshacer.")

    from datetime import date as date_type
    mapa = _modelos_por_tabla()
    borradas = {}
    for tabla in reversed(models.Base.metadata.sorted_tables):   # hijas antes que madres
        modelo = mapa.get(tabla.name)
        if modelo is None:
            continue
        cond = _filtro_de_usuario(modelo, tabla.name, user_id, mapa)
        if cond is None:
            continue
        if tabla.name == "ai_usage":
            cond = and_(cond, modelo.day < date_type.today())
        n = db.query(modelo).filter(cond).delete(synchronize_session=False)
        if n:
            borradas[tabla.name] = n
    db.commit()

    # La cuenta de acceso (email y contraseña) vive en Supabase Auth. El
    # backend se conecta como dueño de la base y puede borrarla; si en algún
    # proyecto no tuviera permiso, los datos ya están borrados y se avisa.
    cuenta_borrada = False
    if db.bind.dialect.name == "postgresql":
        try:
            db.execute(text("DELETE FROM auth.users WHERE id = CAST(:uid AS uuid)"), {"uid": user_id})
            db.commit()
            cuenta_borrada = True
        except Exception as e:                 # noqa: BLE001
            db.rollback()
            logger.warning("No se pudo borrar la cuenta de acceso: %s", e)

    return {
        "ok": True,
        "borrado": borradas,
        "cuenta_de_acceso_borrada": cuenta_borrada,
        "aviso": ("Tus datos y tu cuenta de acceso han sido eliminados." if cuenta_borrada else
                  "Tus datos han sido eliminados de la aplicación. La cuenta de acceso "
                  "(email y contraseña) puede borrarse desde Supabase → Authentication."),
    }
