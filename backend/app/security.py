"""
security.py — REFUERZOS DE SEGURIDAD
────────────────────────────────────
Dos capas que no dependen de ninguna librería externa:

1. LÍMITE DE PETICIONES. Evita que alguien machaque la API a base de fuerza
   bruta (probar contraseñas, raspar datos, tumbar el servicio). Se cuenta por
   dirección IP en una ventana deslizante y en memoria: suficiente para una
   app personal y sin coste. Si el límite se supera, se responde 429.

2. CABECERAS DE SEGURIDAD. Instrucciones al navegador para reducir la
   superficie de ataque: no adivinar tipos de contenido, no permitir que la
   app se incruste en un iframe ajeno (evita el "clickjacking"), no filtrar
   la dirección completa al salir a otro sitio y desactivar permisos que la
   app no usa (cámara, micrófono, geolocalización).
"""

import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse

# Ventana y tope. Generoso para uso normal, estrecho para un atacante.
VENTANA_SEG = 60
MAX_PETICIONES = 120

_hits = defaultdict(deque)


def _ip(request: Request) -> str:
    """IP real del cliente (Render y Vercel van detrás de proxy)."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "desconocida"


async def rate_limit_middleware(request: Request, call_next):
    """Rechaza a quien pase del tope de peticiones por minuto."""
    if request.method == "OPTIONS":            # las comprobaciones CORS no cuentan
        return await call_next(request)

    ip = _ip(request)
    ahora = time.time()
    cola = _hits[ip]
    while cola and ahora - cola[0] > VENTANA_SEG:
        cola.popleft()

    if len(cola) >= MAX_PETICIONES:
        return JSONResponse(
            status_code=429,
            content={"detail": "Demasiadas peticiones. Espera un momento."},
            headers={"Retry-After": str(VENTANA_SEG)},
        )

    cola.append(ahora)
    if len(_hits) > 5000:                      # limpieza para no acumular memoria
        for k in [k for k, v in list(_hits.items()) if not v or ahora - v[-1] > 300]:
            _hits.pop(k, None)

    return await call_next(request)


async def security_headers_middleware(request: Request, call_next):
    """Añade cabeceras defensivas a todas las respuestas."""
    respuesta = await call_next(request)
    respuesta.headers["X-Content-Type-Options"] = "nosniff"
    respuesta.headers["X-Frame-Options"] = "DENY"
    respuesta.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    respuesta.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    respuesta.headers["Cache-Control"] = "no-store"      # datos personales sin caché
    return respuesta
