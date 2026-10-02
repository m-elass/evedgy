"""
routers/widget.py — LOS WIDGETS DEL MÓVIL
─────────────────────────────────────────
Los widgets de la pantalla de inicio y de bloqueo (en iPhone, con la app
gratuita Scriptable) no pueden iniciar sesión ni renovar el token de
Supabase, que caduca cada hora. Por eso usan una LLAVE PERSONAL de solo
lectura que generas en Ajustes:

  · Se crea con 256 bits aleatorios y se muestra UNA vez. La base de datos
    solo guarda su huella SHA-256: ni quien vea la base puede usarla.
  · Caduca a los 90 días. Se revoca al instante borrándola. Máximo 3.
  · Solo abre GET /widget, que devuelve un resumen mínimo: nunca cartas,
    escritos, perfil, amigos ni identificadores.
  · Viaja en la cabecera Authorization, nunca en la URL (las URL acaban en
    los registros de los servidores).

  GET    /widget/tokens         (sesión normal) → tus llaves, sin el secreto
  POST   /widget/tokens         (sesión normal) → crea una y la muestra una vez
  DELETE /widget/tokens/{id}    (sesión normal) → revocar
  GET    /widget                (llave de widget) → el resumen
"""

import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user_id
from app.security import _ip
from app import models, schemas
from app.routers.daily_tasks import tasks_today
from app.routers.quotes import frase_del_dia
from app.routers.today import estado_carta, estado_misiones

router = APIRouter(tags=["widget"])

PREFIJO = "tcw_"
DIAS_VALIDEZ = 90
MAX_LLAVES = 3
_lector = HTTPBearer(auto_error=False)
_usos_llave: dict[str, deque] = defaultdict(deque)       # 30 por hora y llave
_fallos_ip: dict[str, deque] = defaultdict(deque)        # 20 por minuto y IP con llave mala


def huella(llave: str) -> str:
    return hashlib.sha256(llave.encode()).hexdigest()


def _frenar(tabla, clave, maximo, ventana):
    ahora = time.time()
    cola = tabla[clave]
    while cola and ahora - cola[0] > ventana:
        cola.popleft()
    if len(cola) >= maximo:
        raise HTTPException(status_code=429, detail="Demasiadas peticiones.",
                            headers={"Retry-After": str(ventana)})
    cola.append(ahora)
    if len(tabla) > 5000:
        tabla.clear()


# ── Gestión de llaves (con la sesión normal de la app) ────

@router.get("/widget/tokens")
def list_tokens(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    filas = (db.query(models.WidgetToken).filter(models.WidgetToken.user_id == user_id)
             .order_by(models.WidgetToken.created_at.desc()).all())
    return [{"id": t.id, "name": t.name, "prefix": t.prefix,
             "created_at": t.created_at.isoformat() if t.created_at else None,
             "expires_at": t.expires_at.isoformat() if t.expires_at else None,
             "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None}
            for t in filas]


@router.post("/widget/tokens")
def create_token(data: schemas.WidgetTokenCreate, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    n = db.query(models.WidgetToken).filter(models.WidgetToken.user_id == user_id).count()
    if n >= MAX_LLAVES:
        raise HTTPException(status_code=409,
                            detail=f"Ya tienes {MAX_LLAVES} llaves. Revoca una antes de crear otra.")
    llave = PREFIJO + secrets.token_urlsafe(32)
    caduca = datetime.now(timezone.utc) + timedelta(days=DIAS_VALIDEZ)
    t = models.WidgetToken(user_id=user_id, name=data.name.strip(), token_hash=huella(llave),
                           prefix=llave[:10], expires_at=caduca)
    db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id, "name": t.name, "prefix": t.prefix, "token": llave,
            "expires_at": caduca.isoformat()}


@router.delete("/widget/tokens/{token_id}")
def revoke_token(token_id: int, db: Session = Depends(get_db),
                 user_id: str = Depends(get_current_user_id)):
    t = (db.query(models.WidgetToken)
         .filter(models.WidgetToken.id == token_id, models.WidgetToken.user_id == user_id).first())
    if t is None:
        raise HTTPException(status_code=404, detail="Llave no encontrada")
    db.delete(t); db.commit()
    return {"ok": True}


# ── El resumen para el widget (con la llave) ──────────────

def _llave_valida(request: Request,
                  cred: HTTPAuthorizationCredentials | None = Depends(_lector),
                  db: Session = Depends(get_db)) -> models.WidgetToken:
    """Dependencia exclusiva de /widget: el token normal de la app no sirve aquí, ni al revés."""
    llave = cred.credentials if cred else ""
    if not llave.startswith(PREFIJO) or len(llave) > 100:
        _frenar(_fallos_ip, _ip(request), 20, 60)
        raise HTTPException(status_code=401, detail="Llave de widget no válida")
    h = huella(llave)
    t = db.query(models.WidgetToken).filter(models.WidgetToken.token_hash == h).first()
    if t is None or not hmac.compare_digest(t.token_hash, h):
        _frenar(_fallos_ip, _ip(request), 20, 60)
        raise HTTPException(status_code=401, detail="Llave de widget no válida")
    caduca = t.expires_at if t.expires_at.tzinfo else t.expires_at.replace(tzinfo=timezone.utc)
    if caduca < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Llave de widget caducada: crea otra en Ajustes")
    _frenar(_usos_llave, h, 30, 3600)
    return t


def _corta(texto: str, n: int) -> str:
    texto = " ".join((texto or "").split())
    return texto if len(texto) <= n else texto[: n - 1].rstrip() + "…"


@router.get("/widget")
def widget(tz: str = "Europe/Madrid", t: models.WidgetToken = Depends(_llave_valida),
           db: Session = Depends(get_db)):
    try:
        zona = ZoneInfo(tz)
    except Exception:
        raise HTTPException(status_code=422, detail="Zona horaria desconocida")
    ahora = datetime.now(zona)
    # Día lógico: de madrugada aún cuenta el día anterior (como la carta)
    hoy = (ahora - timedelta(hours=4)).date() if ahora.hour < 4 else ahora.date()
    user_id = t.user_id

    t.last_used_at = datetime.now(timezone.utc)
    db.commit()

    frases = (db.query(models.Quote)
              .filter(models.Quote.user_id == user_id, models.Quote.in_widget == True)  # noqa: E712
              .all())
    q = frase_del_dia(frases, user_id, hoy)
    habitos = tasks_today(hoy, db, user_id)
    tareas = (db.query(models.RandomTask.content)
              .filter(models.RandomTask.user_id == user_id, models.RandomTask.done == False)  # noqa: E712
              .order_by(models.RandomTask.created_at.desc()).limit(3).all())
    return {
        "date": hoy.isoformat(),
        "quote": {"text": _corta(q.text, 280), "author": _corta(q.author or "", 60)} if q else None,
        "habits": {"done": sum(1 for h in habitos if h["done_today"]), "total": len(habitos),
                   "pending": [_corta(h["title"], 40) for h in habitos if not h["done_today"]][:4]},
        "tasks": [_corta(c, 60) for (c,) in tareas],
        "letter": estado_carta(db, user_id, hoy),
        "missions": estado_misiones(db, user_id, hoy),
    }
