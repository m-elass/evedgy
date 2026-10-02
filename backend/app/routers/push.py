"""
routers/push.py — EL AVISO DE LA CARTA DIARIA
─────────────────────────────────────────────
Al final del día, si aún no has escrito tu carta, el móvil recibe un aviso
aunque la app esté cerrada (Web Push: iPhone con la app añadida a la
pantalla de inicio, iOS 16.4 o posterior; Android; ordenador).

  GET    /push/config          → clave pública del servidor (para suscribirse)
  GET    /push/subscriptions   → tus dispositivos con aviso y su hora
  POST   /push/subscribe       → este dispositivo quiere el aviso (y a qué hora)
  DELETE /push/subscribe       → este dispositivo ya no lo quiere
  POST   /push/test            → aviso de prueba ahora mismo
  POST   /push/run             → lo llama un reloj externo cada 15 min por la noche

/push/run no recibe datos ni devuelve ninguno: solo envía, a quien le toque,
el aviso que pidió a la hora que pidió, como mucho una vez al día. Si en
Render se define CRON_SECRET, exige además la cabecera X-Cron-Secret.
"""

import hmac
import logging
import time
from collections import deque
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.auth import get_current_user_id
from app import models, schemas
from app.webpush import claves_vapid, enviar

logger = logging.getLogger("push")
router = APIRouter(prefix="/push", tags=["push"])

_runs: deque = deque()
_pruebas: dict[str, float] = {}


def _contacto() -> str:
    """Contacto que exige VAPID: el de la variable, o la propia web de la app."""
    if settings.VAPID_SUB:
        return settings.VAPID_SUB
    origenes = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip().startswith("https://")]
    return origenes[0] if origenes else "mailto:avisos@tucuaderno.app"


@router.get("/config")
def config(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    _, publica = claves_vapid(db)
    return {"public_key": publica}


@router.get("/subscriptions")
def subscriptions(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    filas = (db.query(models.PushSubscription)
             .filter(models.PushSubscription.user_id == user_id).all())
    return [{"id": s.id, "hour": s.remind_hour, "minute": s.remind_minute, "tz": s.tz,
             "endpoint_host": s.endpoint.split("/")[2] if s.endpoint.count("/") >= 2 else ""}
            for s in filas]


@router.post("/subscribe")
def subscribe(data: schemas.PushSubscribeIn, db: Session = Depends(get_db),
              user_id: str = Depends(get_current_user_id)):
    sub = (db.query(models.PushSubscription)
           .filter(models.PushSubscription.endpoint == data.endpoint).first())
    if sub is None:
        if db.query(models.PushSubscription).filter(
                models.PushSubscription.user_id == user_id).count() >= 10:
            raise HTTPException(status_code=409, detail="Demasiados dispositivos con aviso.")
        sub = models.PushSubscription(user_id=user_id, endpoint=data.endpoint)
        db.add(sub)
    # Un dispositivo pertenece a quien lo suscribió por última vez
    sub.user_id = user_id
    sub.p256dh = data.keys.p256dh
    sub.auth = data.keys.auth
    sub.tz = data.tz
    sub.remind_hour = data.hour
    sub.remind_minute = data.minute
    db.commit()
    return {"ok": True}


@router.delete("/subscribe")
def unsubscribe(data: schemas.PushUnsubscribeIn, db: Session = Depends(get_db),
                user_id: str = Depends(get_current_user_id)):
    (db.query(models.PushSubscription)
     .filter(models.PushSubscription.endpoint == data.endpoint,
             models.PushSubscription.user_id == user_id).delete())
    db.commit()
    return {"ok": True}


def _aviso_carta():
    return {"title": "Tu carta de hoy te espera",
            "body": "Antes de dormir, cuéntale tu día. Unas líneas bastan.",
            "url": "/?ir=dailyletter", "tag": "carta-diaria"}


@router.post("/test")
def test(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    ahora = time.time()
    if ahora - _pruebas.get(user_id, 0) < 30:
        raise HTTPException(status_code=429, detail="Espera unos segundos entre pruebas.",
                            headers={"Retry-After": "30"})
    _pruebas[user_id] = ahora
    subs = (db.query(models.PushSubscription)
            .filter(models.PushSubscription.user_id == user_id).all())
    if not subs:
        raise HTTPException(status_code=404, detail="Este usuario no tiene ningún dispositivo con aviso.")
    entregados = 0
    for s in subs:
        codigo = enviar(db, s, {**_aviso_carta(), "title": "Así llegará tu aviso",
                                "tag": "prueba"}, _contacto())
        if codigo in (404, 410):
            db.delete(s)
        elif codigo < 300:
            entregados += 1
    db.commit()
    return {"ok": entregados > 0, "delivered": entregados}


@router.post("/run")
def run(db: Session = Depends(get_db), x_cron_secret: str | None = Header(default=None)):
    if settings.CRON_SECRET and not hmac.compare_digest(x_cron_secret or "", settings.CRON_SECRET):
        raise HTTPException(status_code=403, detail="No autorizado")
    ahora = time.time()
    while _runs and ahora - _runs[0] > 60:
        _runs.popleft()
    if len(_runs) >= 10:
        raise HTTPException(status_code=429, detail="Demasiadas ejecuciones.",
                            headers={"Retry-After": "60"})
    _runs.append(ahora)

    subs = db.query(models.PushSubscription).all()
    for s in subs:
        try:
            local = datetime.now(ZoneInfo(s.tz or "Europe/Madrid"))
        except Exception:                      # noqa: BLE001 — zona rota: se usa Madrid
            local = datetime.now(ZoneInfo("Europe/Madrid"))
        dia = local.date()
        hora_aviso = local.replace(hour=22 if s.remind_hour is None else s.remind_hour,
                                   minute=s.remind_minute or 0, second=0, microsecond=0)
        if local < hora_aviso or s.last_sent_on == dia:
            continue
        escrita = (db.query(models.DailyLetter.id)
                   .filter(models.DailyLetter.user_id == s.user_id,
                           models.DailyLetter.date == dia).first())
        s.last_sent_on = dia                   # una vez al día, la haya escrito o no
        if escrita:
            continue
        try:
            codigo = enviar(db, s, _aviso_carta(), _contacto())
            if codigo in (404, 410):           # el navegador anuló la suscripción
                db.delete(s)
        except Exception as e:                 # noqa: BLE001 — un dispositivo no frena a los demás
            logger.warning("No se pudo enviar el aviso: %s", e)
    db.commit()
    return {"ok": True}
