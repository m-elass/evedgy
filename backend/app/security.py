"""
security.py — REFUERZOS DE SEGURIDAD
────────────────────────────────────
Capas que no dependen de ninguna librería externa:

1. LÍMITE DE PETICIONES, en dos niveles:
   · Por dirección IP, amplio, en la entrada: frena a quien machaque la API
     sin estar identificado.
   · Por usuario verificado (lo aplica auth.py tras comprobar el token): es el
     límite fino, y no se puede esquivar inventándose cabeceras, porque la
     identidad sale de un token firmado por Supabase.
   Se cuenta en memoria con ventana deslizante. El número de claves que se
   vigilan tiene techo: nadie puede hacer crecer la memoria sin límite.

2. ERRORES COMO ERRORES. Cualquier fallo no previsto se convierte en una
   respuesta 500 limpia (con el detalle en los logs, no en la respuesta).
   Así llega al navegador CON sus cabeceras CORS y la app sabe que fue un
   fallo del servidor, en vez de confundirlo con «no tienes datos».

3. CABECERAS DE SEGURIDAD. Instrucciones al navegador para reducir la
   superficie de ataque (sin adivinar tipos, sin iframes ajenos, sin filtrar
   la dirección completa, sin permisos que la app no usa, sin indexar).
"""

import logging
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("seguridad")

VENTANA_SEG = 60
MAX_POR_IP = 300          # por IP y minuto (entrada, sin identificar)
MAX_POR_USUARIO = 240     # por usuario verificado y minuto
MAX_CLAVES = 10_000       # techo de claves vigiladas en memoria

_hits_ip: dict[str, deque] = defaultdict(deque)
_hits_usuario: dict[str, deque] = defaultdict(deque)
_ultima_limpieza = [0.0]


def _ip(request: Request) -> str:
    """
    IP del cliente. Detrás del proxy de Render, la fiable es la que pone el
    propio borde (CF-Connecting-IP / True-Client-IP); X-Forwarded-For solo
    como último recurso, porque su primer valor lo puede escribir el cliente.
    Si alguien falsifica cabeceras solo esquiva este límite amplio: el límite
    que importa es el de usuario, que va ligado a un token firmado.
    """
    for cabecera in ("cf-connecting-ip", "true-client-ip"):
        valor = request.headers.get(cabecera)
        if valor:
            return valor.strip()[:64]
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()[:64]
    return request.client.host if request.client else "desconocida"


def _limpiar(ahora: float) -> None:
    """Quita las claves sin actividad reciente. Como mucho, cada 30 s."""
    if ahora - _ultima_limpieza[0] < 30:
        return
    _ultima_limpieza[0] = ahora
    for tabla in (_hits_ip, _hits_usuario):
        for k in [k for k, v in list(tabla.items()) if not v or ahora - v[-1] > VENTANA_SEG]:
            tabla.pop(k, None)
        if len(tabla) > MAX_CLAVES:          # avalancha de claves: se empieza de cero
            logger.warning("Límite de peticiones: %d claves, se vacía la tabla", len(tabla))
            tabla.clear()


def _supera(tabla: dict, clave: str, maximo: int, ahora: float) -> bool:
    cola = tabla[clave]
    while cola and ahora - cola[0] > VENTANA_SEG:
        cola.popleft()
    if len(cola) >= maximo:
        return True
    cola.append(ahora)
    return False


def _respuesta_429() -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiadas peticiones. Espera un momento."},
        headers={"Retry-After": str(VENTANA_SEG)},
    )


async def rate_limit_middleware(request: Request, call_next):
    """Rechaza a quien pase del tope de peticiones por minuto y por IP."""
    if request.method == "OPTIONS":            # las comprobaciones CORS no cuentan
        return await call_next(request)
    ahora = time.time()
    _limpiar(ahora)
    if _supera(_hits_ip, _ip(request), MAX_POR_IP, ahora):
        return _respuesta_429()
    return await call_next(request)


def limitar_usuario(user_id: str) -> None:
    """Límite por usuario verificado. Lo llama auth.py tras validar el token."""
    ahora = time.time()
    if _supera(_hits_usuario, user_id, MAX_POR_USUARIO, ahora):
        raise HTTPException(
            status_code=429,
            detail="Demasiadas peticiones. Espera un momento.",
            headers={"Retry-After": str(VENTANA_SEG)},
        )


async def unhandled_errors_middleware(request: Request, call_next):
    """
    Convierte cualquier excepción no prevista en un 500 limpio. Va por dentro
    de CORS, así que el navegador recibe la cabecera y la app puede decir
    «el servidor ha fallado» en vez de pintar la pantalla vacía.
    """
    try:
        return await call_next(request)
    except Exception:                          # noqa: BLE001 — se registra entero
        logger.exception("Error no controlado en %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500,
                            content={"detail": "Error interno del servidor."})


async def security_headers_middleware(request: Request, call_next):
    """Añade cabeceras defensivas a todas las respuestas."""
    respuesta = await call_next(request)
    respuesta.headers["X-Content-Type-Options"] = "nosniff"
    respuesta.headers["X-Frame-Options"] = "DENY"
    respuesta.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    respuesta.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    respuesta.headers["Cache-Control"] = "no-store"      # datos personales sin caché HTTP
    # Que ningún buscador indexe la API: todo está tras login.
    respuesta.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive, nosnippet"
    return respuesta


def origenes_cors(valor: str) -> list[str]:
    """
    Lista de dominios autorizados, depurada. Se descartan los comodines y
    'null' (abrirían la API a cualquier web) y se avisa de los http:// que no
    sean locales.
    """
    limpios = []
    for o in (x.strip().rstrip("/") for x in valor.split(",")):
        if not o:
            continue
        if o in ("*", "null"):
            logger.warning("CORS_ORIGINS: se ignora el valor inseguro %r", o)
            continue
        if o.startswith("http://") and not o.startswith(("http://localhost", "http://127.0.0.1")):
            logger.warning("CORS_ORIGINS: %s usa http:// sin cifrar", o)
        limpios.append(o)
    return limpios
