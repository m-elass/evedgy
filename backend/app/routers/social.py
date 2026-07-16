"""
routers/social.py
─────────────────
El modo cooperativo (deseo 2). Es el ÚNICO lugar de toda la app donde un usuario
puede ver datos de otro, así que la seguridad es máxima y explícita.

LOS CUATRO CANDADOS (se aplican en cada lectura de datos ajenos):
  1. Opt-in: el otro debe tener share_ranks=True. Si no, es invisible.
  2. Solo rango: jamás se expone peso, kg, 1RM, user_id ni nada más.
  3. Amistad aceptada y mutua: status="aceptada" entre ambos.
  4. Verificación en el momento: cada petición re-comprueba 1 y 3.

El alias (display_name) es el identificador público; el user_id real nunca sale.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas
from app import strength_standards as ss

router = APIRouter(prefix="/social", tags=["social"])


def _profile(db, user_id):
    return (db.query(models.UserProfile)
            .filter(models.UserProfile.user_id == user_id).first())


def _profile_by_name(db, display_name):
    return (db.query(models.UserProfile)
            .filter(models.UserProfile.display_name == display_name).first())


def _accepted_friendship(db, a, b):
    """Devuelve la amistad ACEPTADA entre a y b (en cualquier dirección), o None."""
    return (db.query(models.Friendship)
            .filter(models.Friendship.status == "aceptada",
                    or_(and_(models.Friendship.requester_id == a, models.Friendship.addressee_id == b),
                        and_(models.Friendship.requester_id == b, models.Friendship.addressee_id == a)))
            .first())


@router.post("/friends/request")
def send_request(data: schemas.FriendRequestCreate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    """Envía una solicitud de amistad al usuario con ese alias."""
    me = _profile(db, user_id)
    if not me or not me.display_name:
        raise HTTPException(400, "Antes de añadir amigos, pon un alias en tu perfil.")

    target = _profile_by_name(db, data.display_name)
    if not target:
        raise HTTPException(404, "No existe nadie con ese alias.")
    if target.user_id == user_id:
        raise HTTPException(400, "No puedes añadirte a ti mismo.")

    # ¿ya existe relación?
    existing = (db.query(models.Friendship)
                .filter(or_(and_(models.Friendship.requester_id == user_id, models.Friendship.addressee_id == target.user_id),
                            and_(models.Friendship.requester_id == target.user_id, models.Friendship.addressee_id == user_id)))
                .first())
    if existing:
        raise HTTPException(400, "Ya hay una solicitud o amistad con esta persona.")

    fr = models.Friendship(requester_id=user_id, addressee_id=target.user_id, status="pendiente")
    db.add(fr); db.commit()
    return {"ok": True, "message": f"Solicitud enviada a {data.display_name}."}


@router.post("/friends/{friendship_id}/accept")
def accept_request(friendship_id: int, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    """Acepta una solicitud recibida (solo el destinatario puede aceptarla)."""
    fr = (db.query(models.Friendship)
          .filter(models.Friendship.id == friendship_id,
                  models.Friendship.addressee_id == user_id,   # solo el destinatario
                  models.Friendship.status == "pendiente").first())
    if not fr:
        raise HTTPException(404, "Solicitud no encontrada.")
    fr.status = "aceptada"; db.commit()
    return {"ok": True}


@router.delete("/friends/{friendship_id}")
def remove_friend(friendship_id: int, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    """Rechaza una solicitud o elimina una amistad (solo si eres parte de ella)."""
    fr = (db.query(models.Friendship)
          .filter(models.Friendship.id == friendship_id,
                  or_(models.Friendship.requester_id == user_id,
                      models.Friendship.addressee_id == user_id)).first())
    if not fr:
        raise HTTPException(404, "Relación no encontrada.")
    db.delete(fr); db.commit()
    return {"ok": True}


@router.get("/friends", response_model=list[schemas.FriendOut])
def list_friends(db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    """Lista amistades y solicitudes, mostrando SOLO el alias del otro."""
    rels = (db.query(models.Friendship)
            .filter(or_(models.Friendship.requester_id == user_id,
                        models.Friendship.addressee_id == user_id)).all())
    out = []
    for r in rels:
        other_id = r.addressee_id if r.requester_id == user_id else r.requester_id
        other = _profile(db, other_id)
        alias = (other.display_name if other and other.display_name else "Anónimo")
        if r.status == "aceptada":
            direction = "amigos"
        elif r.requester_id == user_id:
            direction = "enviada"
        else:
            direction = "recibida"
        out.append(schemas.FriendOut(friendship_id=r.id, display_name=alias,
                                     status=r.status, direction=direction))
    return out


@router.get("/friends/{friendship_id}/ranks", response_model=list[schemas.FriendRankOut])
def friend_ranks(friendship_id: int, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    """
    Los rangos de un amigo. Aquí se aplican los cuatro candados:
    """
    # Candado 3: la amistad debe existir, ser nuestra y estar aceptada.
    fr = (db.query(models.Friendship)
          .filter(models.Friendship.id == friendship_id,
                  models.Friendship.status == "aceptada",
                  or_(models.Friendship.requester_id == user_id,
                      models.Friendship.addressee_id == user_id)).first())
    if not fr:
        raise HTTPException(403, "No tienes acceso a estos rangos.")

    friend_id = fr.addressee_id if fr.requester_id == user_id else fr.requester_id
    friend = _profile(db, friend_id)

    # Candado 1: el amigo debe tener el opt-in activado AHORA mismo.
    if not friend or not friend.share_ranks:
        return []   # no comparte: lista vacía, sin filtrar nada

    if not friend.bodyweight or friend.bodyweight <= 0:
        return []

    # Candado 2: calculamos y devolvemos SOLO ejercicio + insignia. Nada más.
    exercises = (db.query(models.Exercise)
                 .filter(models.Exercise.user_id == friend_id).all())
    result = []
    for ex in exercises:
        sessions = (db.query(models.Session)
                    .filter(models.Session.user_id == friend_id,
                            models.Session.exercise_id == ex.id).all())
        best = 0.0
        for s in sessions:
            for st in s.sets:
                if st.weight > 0:
                    best = max(best, ss.estimate_1rm(st.weight, st.reps))
        if best <= 0:
            continue
        r = ss.rank_for(best, friend.bodyweight, ex.name, friend.sex)
        if r.get("badge"):
            result.append(schemas.FriendRankOut(
                exercise=ex.name,
                badge_name=r["badge"]["name"],
                badge_color=r["badge"]["color"],
                tier=r.get("tier", "")))
    return result
