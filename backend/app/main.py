"""
main.py
───────
El punto de ARRANQUE de la API. Cuando ejecutas el servidor, empieza aquí.

Hace tres cosas:
1. Crea la app FastAPI y pone la base de datos al día.
2. Coloca las capas de protección (CORS, límite de peticiones, errores...).
3. Enchufa los routers (los módulos de endpoints).

Para arrancar en local:
    uvicorn app.main:app --reload

Luego abre http://localhost:8000/docs  → documentación interactiva automática.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.security import (
    rate_limit_middleware, security_headers_middleware,
    unhandled_errors_middleware, origenes_cors,
)
from app.migrations import aplicar_migraciones, blindar_tablas
from app.database import Base, engine
from app.routers import (
    routine,
    exercises, sessions, daily_tasks, random_tasks,
    notes, documents, sleep, goals, theme, insights, deliberate, summary, profile, physique, social,
    training, daily_letters, knowledge, quotes, skill_board, widget, push, today, planner,
)

logging.basicConfig(level=logging.INFO)

# Crea las tablas que aún no existan, añade las columnas nuevas y activa la
# seguridad por filas en todas (ver migrations.py).
Base.metadata.create_all(bind=engine)
aplicar_migraciones()
blindar_tablas()

app = FastAPI(title="Tu cuaderno API")

# ── Capas (middlewares) ──────────────────────────────────
# La ÚLTIMA que se añade es la MÁS EXTERNA. Orden de fuera a dentro:
#   CORS → cabeceras de seguridad → límite de peticiones → errores → endpoints
# CORS va por fuera de todo para que también el «429 demasiadas peticiones» y
# el «500 error del servidor» lleguen al navegador con su permiso CORS. Antes
# salían sin él, el navegador los convertía en «fallo de red» y la app pintaba
# la pantalla vacía como si no hubiera datos.
app.middleware("http")(unhandled_errors_middleware)
app.middleware("http")(rate_limit_middleware)
app.middleware("http")(security_headers_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_cors(settings.CORS_ORIGINS),
    allow_credentials=False,            # la app no usa cookies: el token va en una cabecera
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Retry-After"],     # para que la app sepa cuánto esperar tras un 429
    max_age=7200,                       # el navegador recuerda el permiso 2 h: menos viajes
)


@app.get("/")
def health_check():
    """Ruta simple para comprobar que la API está viva (y para despertarla)."""
    return {"status": "ok", "message": "Gym App API funcionando"}


for modulo in (exercises, sessions, daily_tasks, random_tasks, notes, documents, sleep,
               goals, theme, insights, deliberate, summary, profile, physique, social,
               routine, training, daily_letters, knowledge, quotes, skill_board, widget, push,
               today, planner):
    app.include_router(modulo.router)
app.include_router(random_tasks.secciones)
