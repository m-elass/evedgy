"""
auth.py
───────
Cuando un usuario inicia sesión en el frontend, Supabase le da un "token"
(un JWT: un texto que demuestra quién es). El frontend manda ese token en
cada petición a nuestra API. Aquí lo verificamos y sacamos el `user_id`.

Nota sobre Supabase: los proyectos nuevos firman con claves nuevas, pero
mantienen un "Legacy JWT secret" (HS256) que sigue sirviendo para VERIFICAR
tokens. Usamos ese secreto (la variable SUPABASE_JWT_SECRET).

Si la verificación falla, además de responder 401, ESCRIBIMOS EL MOTIVO
EXACTO en los logs del servidor (visible en Render → Logs). Eso hace que
diagnosticar un problema de login sea inmediato en vez de un misterio.
"""

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.config import settings

logger = logging.getLogger("auth")

bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Verifica el token de Supabase y devuelve el id del usuario (un UUID)."""
    token = credentials.credentials
    try:
        # Verificamos la firma con el secreto legacy (HS256), pero NO exigimos
        # un 'audience' concreto: distintos flujos de Supabase emiten el token
        # con aud="authenticated" o sin aud, y ambos son válidos para nosotros.
        # (La firma es lo que de verdad prueba que el token es legítimo.)
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise JWTError("el token no trae 'sub' (id de usuario)")
        return user_id
    except JWTError as e:
        # El motivo EXACTO queda en los logs de Render; el usuario ve un 401 limpio.
        logger.warning("Token rechazado: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o caducado",
        )
