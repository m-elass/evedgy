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

Este código acepta AMBOS: mira con qué algoritmo viene el token y lo valida
como corresponda. Así funciona en cualquier proyecto de Supabase, nuevo o
antiguo, hoy y a futuro.

Si algo falla, el motivo exacto se escribe en los logs (Render → Logs).
"""

import logging
from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.config import settings

logger = logging.getLogger("auth")
bearer_scheme = HTTPBearer()


@lru_cache(maxsize=1)
def _jwks():
    """
    Descarga (una vez, y cachea) las claves públicas del proyecto Supabase.
    Están en  <SUPABASE_URL>/auth/v1/.well-known/jwks.json
    Con ellas se verifican los tokens ES256 sin necesidad de secreto.
    """
    if not settings.SUPABASE_URL:
        return None
    url = settings.SUPABASE_URL.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    try:
        r = httpx.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.warning("No se pudieron descargar las claves públicas de Supabase: %s", e)
        return None


def _decode(token: str):
    """Verifica el token según su algoritmo. Devuelve el payload o lanza JWTError."""
    header = jwt.get_unverified_header(token)
    alg = header.get("alg")

    # ── Tokens nuevos: ES256 (y similares asimétricos) vía claves públicas ──
    if alg in ("ES256", "RS256"):
        jwks = _jwks()
        if not jwks:
            raise JWTError("token asimétrico pero no hay claves públicas "
                           "(¿falta la variable SUPABASE_URL?)")
        # Elegimos la clave cuyo 'kid' coincide con el del token
        kid = header.get("kid")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            # La caché puede estar vieja si Supabase rotó claves: refrescamos una vez
            _jwks.cache_clear()
            jwks = _jwks() or {}
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            raise JWTError("ninguna clave pública coincide con el token")
        return jwt.decode(token, key, algorithms=[alg],
                          options={"verify_aud": False})

    # ── Tokens legacy: HS256 vía secreto compartido ──
    if alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise JWTError("token HS256 pero falta SUPABASE_JWT_SECRET")
        return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"],
                          options={"verify_aud": False})

    raise JWTError(f"algoritmo no soportado: {alg}")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Verifica el token de Supabase y devuelve el id del usuario (un UUID)."""
    try:
        payload = _decode(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise JWTError("el token no trae 'sub' (id de usuario)")
        return user_id
    except JWTError as e:
        logger.warning("Token rechazado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o caducado",
        )
