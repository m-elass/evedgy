"""
main.py
───────
El punto de ARRANQUE de la API. Cuando ejecutas el servidor, empieza aquí.

Hace tres cosas:
1. Crea la app FastAPI.
2. Permite que el frontend (en otro dominio) llame a la API (CORS).
3. Enchufa los routers (los módulos de endpoints).

Para arrancar en local:
    uvicorn app.main:app --reload

Luego abre http://localhost:8000/docs  → documentación interactiva automática.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import (
    routine,
    exercises, sessions, daily_tasks, random_tasks,
    notes, documents, sleep, goals, theme, insights, deliberate, summary, profile, physique, social,
)

# Crea las tablas en la base de datos si aún no existen.
# (Más adelante, cuando la app crezca, esto se gestiona con migraciones
#  Alembic; para empezar y aprender, esto es suficiente y directo.)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gym App API")

# CORS: por defecto un navegador bloquea que una web llame a una API
# de otro dominio. Aquí autorizamos a nuestro frontend a hacerlo.
# Los orígenes permitidos se leen de la configuración (variable CORS_ORIGINS,
# separados por comas) para poder añadir el dominio de Vercel sin tocar código.
from app.config import settings

allowed_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    """Ruta simple para comprobar que la API está viva."""
    return {"status": "ok", "message": "Gym App API funcionando"}


# Enchufamos el módulo de ejercicios. Cada módulo nuevo se añade con
# una línea como esta.
app.include_router(exercises.router)
app.include_router(sessions.router)
app.include_router(daily_tasks.router)
app.include_router(random_tasks.router)
app.include_router(notes.router)
app.include_router(documents.router)
app.include_router(sleep.router)
app.include_router(goals.router)
app.include_router(theme.router)
app.include_router(insights.router)
app.include_router(deliberate.router)
app.include_router(summary.router)
app.include_router(profile.router)
app.include_router(physique.router)
app.include_router(social.router)
app.include_router(routine.router)
