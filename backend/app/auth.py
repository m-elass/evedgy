"""
auth.py
───────
Verifica el token (JWT) que Supabase da al usuario al iniciar sesión y saca
su `user_id`.

Supabase puede firmar los tokens de dos formas según la edad del proyecto:
  · ES256 (proyectos nuevos): firma asimétrica. Se verifica con la CLAVE
    PÚBLICA del proyecto, que Supabase publica en una URL (su "JWKS").
    No hace falta ningún secreto.
  · HS256 (legacy): firma simétrica. Se verifica con el "Legacy JWT secret".

Este código acepta AMBOS. Si algo falla, el motivo exacto se escribe en los
logs (Render → Logs).

App privada: si la variable USUARIOS_PERMITIDOS tiene correos, solo esas
cuentas pasan (las demás reciben 403 aunque su token sea bueno).

Las claves públicas se guardan en memoria unas horas. Detalles que importan:
  · Un fallo al descargarlas NO se guarda: se reintenta (como mucho cada 30 s).
    Antes, una caída momentánea de Supabase dejaba el login roto hasta
    reiniciar el servidor.
  · Un token con un 'kid' desconocido puede forzar una recarga, pero como
    mucho una cada 5 minutos: nadie puede usar tokens inventados para que el
    servidor descargue las claves sin parar.
"""

import logging
import threading
import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.config import settings
from app.security import limitar_usuario

logger = logging.getLogger("auth")
bearer_scheme = HTTPBearer()

_JWKS_TTL = 6 * 3600          # claves válidas en memoria: 6 h
_JWKS_REFRESCO_MIN = 300      # recarga forzada: como mucho cada 5 min
_JWKS_REINTENTO = 30          # tras un fallo, no reintentar antes de 30 s
_jwks_estado = {"claves": None, "cargadas": 0.0, "fallo": 0.0, "forzada": 0.0}
_jwks_cerrojo = threading.Lock()


def _descargar_jwks():
    url = settings.SUPABASE_URL.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    r = httpx.get(url, timeout=5)
    r.raise_for_status()
    datos = r.json()
    if not isinstance(datos, dict) or not isinstance(datos.get("keys"), list):
        raise ValueError("respuesta JWKS sin lista de claves")
    return datos


def _jwks(forzar: bool = False):
    """Claves públicas del proyecto (con caché y sin martillear a Supabase)."""
    if not settings.SUPABASE_URL:
        return None
    ahora = time.time()
    e = _jwks_estado
    with _jwks_cerrojo:
        frescas = e["claves"] is not None and ahora - e["cargadas"] < _JWKS_TTL
        if frescas and not forzar:
            return e["claves"]
        if forzar and ahora - e["forzada"] < _JWKS_REFRESCO_MIN:
            return e["claves"]
        if ahora - e["fallo"] < _JWKS_REINTENTO:
            return e["claves"]
        if forzar:
            e["forzada"] = ahora
        try:
            e["claves"] = _descargar_jwks()
            e["cargadas"] = ahora
        except Exception as exc:               # noqa: BLE001 — se registra y se reintenta
            e["fallo"] = ahora
            logger.warning("No se pudieron descargar las claves públicas de Supabase: %s", exc)
        return e["claves"]


def _clave_para(kid):
    claves = _jwks() or {}
    clave = next((k for k in claves.get("keys", []) if k.get("kid") == kid), None)
    if clave is None:
        # Supabase pudo rotar sus claves: recarga forzada (con freno)
        claves = _jwks(forzar=True) or {}
        clave = next((k for k in claves.get("keys", []) if k.get("kid") == kid), None)
    return clave


def _decode(token: str):
    """Verifica el token según su algoritmo. Devuelve el payload o lanza JWTError."""
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")

    # ── Tokens nuevos: ES256 (y similares asimétricos) vía claves públicas ──
    if alg in ("ES256", "RS256"):
        if not settings.SUPABASE_URL:
            raise JWTError("token asimétrico pero falta la variable SUPABASE_URL")
        clave = _clave_para(header.get("kid"))
        if clave is None:
            raise JWTError("ninguna clave pública coincide con el token")
        return jwt.decode(token, clave, algorithms=[alg], options={"verify_aud": False})

    # ── Tokens legacy: HS256 vía secreto compartido ──
    if alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise JWTError("token HS256 pero falta SUPABASE_JWT_SECRET")
        return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"],
                          options={"verify_aud": False})

    raise JWTError(f"algoritmo no soportado: {alg}")


def permitidos() -> set:
    """Los correos con acceso (en minúsculas). Vacío = cualquier cuenta."""
    return {c.strip().lower() for c in (settings.USUARIOS_PERMITIDOS or "").split(",") if c.strip()}


def acceso_permitido(payload: dict) -> bool:
    """¿Puede esta cuenta usar la API? Se mira el correo que Supabase firma dentro del token."""
    lista = permitidos()
    if not lista:
        return True
    correo = str(payload.get("email") or "").strip().lower()
    return bool(correo) and correo in lista


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Verifica el token de Supabase y devuelve el id del usuario (un UUID)."""
    try:
        payload = _decode(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("el token no trae 'sub' (id de usuario)")
    except JWTError as e:
        logger.warning("Token rechazado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o caducado",
        )
    limitar_usuario(user_id)
    if not acceso_permitido(payload):
        logger.warning("Cuenta sin acceso (USUARIOS_PERMITIDOS): %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta app es privada: tu cuenta no tiene acceso.",
        )
    return user_id
