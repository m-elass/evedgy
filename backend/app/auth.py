"""
auth.py
───────
Cuando un usuario inicia sesión en el frontend, Supabase le da un "token"
(un JWT: un texto cifrado que demuestra quién es). El frontend manda ese
token en cada petición a nuestra API.

Aquí lo verificamos y sacamos el `user_id`. Si el token es válido, sabemos
quién hace la petición y podemos filtrar sus datos. Si no, la rechazamos.

Esto es lo que hace que la experiencia sea individual y privada.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.config import settings

# Lee la cabecera "Authorization: Bearer <token>" de cada petición
bearer_scheme = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """
    Verifica el token de Supabase y devuelve el id del usuario (un UUID).
    Se usa en los endpoints así:

        def listar(user_id: str = Depends(get_current_user_id)):
            ...
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",   # Supabase marca así a los usuarios logueados
        )
        user_id = payload.get("sub")    # "sub" = subject = el id del usuario
        if user_id is None:
            raise JWTError("token sin 'sub'")
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o caducado",
        )
