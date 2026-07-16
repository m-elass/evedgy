"""
routers/deliberate.py
─────────────────────
Los seis instrumentos de "vida deliberada", agrupados porque comparten patrón:
- Valores (con check-ins periódicos)
- Revisiones semanales/mensuales
- Decisiones razonadas (con revisión posterior)
- Cartas al yo futuro (se abren en su fecha)
- Lecturas con cosechas
- Skills con registro de práctica

Todo filtra por user_id. Cada sub-bloque está separado por comentarios.
"""

from datetime import date as date_type, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas

router = APIRouter(tags=["deliberate"])


# ═══════════════════════════════════════════════════════════
# VALORES
# ═══════════════════════════════════════════════════════════
@router.post("/values", response_model=schemas.ValueOut)
def create_value(data: schemas.ValueCreate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    v = models.Value(user_id=user_id, title=data.title, description=data.description)
    db.add(v); db.commit(); db.refresh(v)
    return v

@router.get("/values", response_model=list[schemas.ValueOut])
def list_values(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Value).filter(models.Value.user_id == user_id)
            .order_by(models.Value.order, models.Value.created_at).all())

@router.delete("/values/{vid}")
def delete_value(vid: int, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    v = db.query(models.Value).filter(models.Value.id == vid,
                                      models.Value.user_id == user_id).first()
    if not v: raise HTTPException(404, "Valor no encontrado")
    db.delete(v); db.commit(); return {"ok": True}

@router.post("/values/{vid}/checkin", response_model=schemas.ValueCheckinOut)
def value_checkin(vid: int, data: schemas.ValueCheckinCreate, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    v = db.query(models.Value).filter(models.Value.id == vid,
                                      models.Value.user_id == user_id).first()
    if not v: raise HTTPException(404, "Valor no encontrado")
    ci = models.ValueCheckin(value_id=vid, date=data.date, score=data.score, note=data.note)
    db.add(ci); db.commit(); db.refresh(ci)
    return ci

@router.get("/values/{vid}/checkins", response_model=list[schemas.ValueCheckinOut])
def value_checkins(vid: int, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    v = db.query(models.Value).filter(models.Value.id == vid,
                                      models.Value.user_id == user_id).first()
    if not v: raise HTTPException(404, "Valor no encontrado")
    return (db.query(models.ValueCheckin).filter(models.ValueCheckin.value_id == vid)
            .order_by(models.ValueCheckin.date.desc()).all())


# ═══════════════════════════════════════════════════════════
# REVISIONES
# ═══════════════════════════════════════════════════════════
@router.post("/reviews", response_model=schemas.ReviewOut)
def create_review(data: schemas.ReviewCreate, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    r = models.Review(user_id=user_id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return r

@router.get("/reviews", response_model=list[schemas.ReviewOut])
def list_reviews(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Review).filter(models.Review.user_id == user_id)
            .order_by(models.Review.date.desc()).all())

@router.delete("/reviews/{rid}")
def delete_review(rid: int, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    r = db.query(models.Review).filter(models.Review.id == rid,
                                       models.Review.user_id == user_id).first()
    if not r: raise HTTPException(404, "Revisión no encontrada")
    db.delete(r); db.commit(); return {"ok": True}


# ═══════════════════════════════════════════════════════════
# DECISIONES
# ═══════════════════════════════════════════════════════════
@router.post("/decisions", response_model=schemas.DecisionOut)
def create_decision(data: schemas.DecisionCreate, db: Session = Depends(get_db),
                    user_id: str = Depends(get_current_user_id)):
    d = models.Decision(user_id=user_id, **data.model_dump())
    db.add(d); db.commit(); db.refresh(d)
    return d

@router.get("/decisions", response_model=list[schemas.DecisionOut])
def list_decisions(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Decision).filter(models.Decision.user_id == user_id)
            .order_by(models.Decision.created_at.desc()).all())

@router.put("/decisions/{did}/review", response_model=schemas.DecisionOut)
def review_decision(did: int, data: schemas.DecisionReview, db: Session = Depends(get_db),
                    user_id: str = Depends(get_current_user_id)):
    d = db.query(models.Decision).filter(models.Decision.id == did,
                                         models.Decision.user_id == user_id).first()
    if not d: raise HTTPException(404, "Decisión no encontrada")
    d.outcome = data.outcome; d.was_right = data.was_right
    d.reviewed_at = datetime.utcnow()
    db.commit(); db.refresh(d)
    return d

@router.delete("/decisions/{did}")
def delete_decision(did: int, db: Session = Depends(get_db),
                    user_id: str = Depends(get_current_user_id)):
    d = db.query(models.Decision).filter(models.Decision.id == did,
                                         models.Decision.user_id == user_id).first()
    if not d: raise HTTPException(404, "Decisión no encontrada")
    db.delete(d); db.commit(); return {"ok": True}


# ═══════════════════════════════════════════════════════════
# CARTAS AL FUTURO
# ═══════════════════════════════════════════════════════════
@router.post("/letters", response_model=schemas.LetterOut)
def create_letter(data: schemas.LetterCreate, db: Session = Depends(get_db),
                  user_id: str = Depends(get_current_user_id)):
    l = models.FutureLetter(user_id=user_id, body=data.body, open_date=data.open_date)
    db.add(l); db.commit(); db.refresh(l)
    return l

@router.get("/letters", response_model=list[schemas.LetterListItem])
def list_letters(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Lista las cartas SIN revelar el cuerpo de las que aún no se pueden abrir."""
    today = date_type.today()
    letters = (db.query(models.FutureLetter).filter(models.FutureLetter.user_id == user_id)
               .order_by(models.FutureLetter.open_date).all())
    return [schemas.LetterListItem(
        id=l.id, open_date=l.open_date, opened=l.opened,
        can_open=(l.open_date <= today), created_at=l.created_at) for l in letters]

@router.get("/letters/{lid}", response_model=schemas.LetterOut)
def open_letter(lid: int, db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    """Abre una carta. Solo si ya llegó su fecha; si no, se protege."""
    l = db.query(models.FutureLetter).filter(models.FutureLetter.id == lid,
                                             models.FutureLetter.user_id == user_id).first()
    if not l: raise HTTPException(404, "Carta no encontrada")
    if l.open_date > date_type.today():
        raise HTTPException(403, "Esta carta todavía no puede abrirse.")
    if not l.opened:
        l.opened = True; db.commit(); db.refresh(l)
    return l


# ═══════════════════════════════════════════════════════════
# LECTURAS Y COSECHAS
# ═══════════════════════════════════════════════════════════
@router.post("/readings", response_model=schemas.ReadingOut)
def create_reading(data: schemas.ReadingCreate, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    r = models.Reading(user_id=user_id, **data.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return r

@router.get("/readings", response_model=list[schemas.ReadingOut])
def list_readings(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Reading).filter(models.Reading.user_id == user_id)
            .order_by(models.Reading.created_at.desc()).all())

@router.patch("/readings/{rid}", response_model=schemas.ReadingOut)
def update_reading(rid: int, data: schemas.ReadingUpdate, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    r = db.query(models.Reading).filter(models.Reading.id == rid,
                                        models.Reading.user_id == user_id).first()
    if not r: raise HTTPException(404, "Lectura no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(r, k, v)
    db.commit(); db.refresh(r)
    return r

@router.delete("/readings/{rid}")
def delete_reading(rid: int, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    r = db.query(models.Reading).filter(models.Reading.id == rid,
                                        models.Reading.user_id == user_id).first()
    if not r: raise HTTPException(404, "Lectura no encontrada")
    db.delete(r); db.commit(); return {"ok": True}

@router.post("/readings/{rid}/harvest", response_model=schemas.HarvestOut)
def add_harvest(rid: int, data: schemas.HarvestCreate, db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    r = db.query(models.Reading).filter(models.Reading.id == rid,
                                        models.Reading.user_id == user_id).first()
    if not r: raise HTTPException(404, "Lectura no encontrada")
    h = models.Harvest(reading_id=rid, user_id=user_id, content=data.content, kind=data.kind)
    db.add(h); db.commit(); db.refresh(h)
    return h

@router.delete("/harvests/{hid}")
def delete_harvest(hid: int, db: Session = Depends(get_db),
                   user_id: str = Depends(get_current_user_id)):
    h = db.query(models.Harvest).filter(models.Harvest.id == hid,
                                        models.Harvest.user_id == user_id).first()
    if not h: raise HTTPException(404, "Cosecha no encontrada")
    db.delete(h); db.commit(); return {"ok": True}


# ═══════════════════════════════════════════════════════════
# SKILLS (aprendizajes)
# ═══════════════════════════════════════════════════════════
@router.post("/skills", response_model=schemas.SkillOut)
def create_skill(data: schemas.SkillCreate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    s = models.Skill(user_id=user_id, **data.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return s

@router.get("/skills", response_model=list[schemas.SkillOut])
def list_skills(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return (db.query(models.Skill).filter(models.Skill.user_id == user_id)
            .order_by(models.Skill.created_at.desc()).all())

@router.patch("/skills/{sid}", response_model=schemas.SkillOut)
def update_skill(sid: int, data: schemas.SkillUpdate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    s = db.query(models.Skill).filter(models.Skill.id == sid,
                                      models.Skill.user_id == user_id).first()
    if not s: raise HTTPException(404, "Skill no encontrada")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    db.commit(); db.refresh(s)
    return s

@router.delete("/skills/{sid}")
def delete_skill(sid: int, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    s = db.query(models.Skill).filter(models.Skill.id == sid,
                                      models.Skill.user_id == user_id).first()
    if not s: raise HTTPException(404, "Skill no encontrada")
    db.delete(s); db.commit(); return {"ok": True}

@router.post("/skills/{sid}/log", response_model=schemas.SkillLogOut)
def log_skill(sid: int, data: schemas.SkillLogCreate, db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    s = db.query(models.Skill).filter(models.Skill.id == sid,
                                      models.Skill.user_id == user_id).first()
    if not s: raise HTTPException(404, "Skill no encontrada")
    log = models.SkillLog(skill_id=sid, user_id=user_id, date=data.date,
                          minutes=data.minutes, note=data.note)
    db.add(log); db.commit(); db.refresh(log)
    return log

@router.get("/skills/{sid}/logs", response_model=list[schemas.SkillLogOut])
def skill_logs(sid: int, db: Session = Depends(get_db),
               user_id: str = Depends(get_current_user_id)):
    s = db.query(models.Skill).filter(models.Skill.id == sid,
                                      models.Skill.user_id == user_id).first()
    if not s: raise HTTPException(404, "Skill no encontrada")
    return (db.query(models.SkillLog).filter(models.SkillLog.skill_id == sid)
            .order_by(models.SkillLog.date.desc()).all())
