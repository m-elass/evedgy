"""
migrations.py — PONER AL DÍA UNA BASE DE DATOS QUE YA EXISTE
────────────────────────────────────────────────────────────
Al arrancar, la app crea las tablas que falten (Base.metadata.create_all).
Pero eso NO añade columnas nuevas a tablas que ya existen: si tu base lleva
meses guardando tareas y hoy aparece la columna "section_id", create_all no
la crearía y la app fallaría al leerla.

Aquí se resuelve con migraciones mínimas y seguras:
  · Se comprueba si la columna existe antes de tocar nada.
  · Solo se AÑADEN columnas opcionales; nunca se borra ni se reescribe nada.
  · Es idempotente: se puede ejecutar en cada arranque sin efecto alguno si
    la base ya está al día.
  · Funciona igual en PostgreSQL (producción) y en SQLite (pruebas locales).
"""

import logging

from sqlalchemy import inspect, text

from app.database import engine

logger = logging.getLogger("migraciones")

# (tabla, columna, definición SQL) — solo columnas opcionales
COLUMNAS = [
    ("random_tasks", "section_id", "INTEGER"),
]


def aplicar_migraciones() -> None:
    """Añade las columnas que falten. Silencioso si no hay nada que hacer."""
    try:
        inspector = inspect(engine)
        tablas = set(inspector.get_table_names())
    except Exception as e:                     # base inaccesible: que arranque igual
        logger.warning("No se pudo inspeccionar la base de datos: %s", e)
        return

    for tabla, columna, tipo in COLUMNAS:
        if tabla not in tablas:
            continue                            # la creará create_all con todo dentro
        existentes = {c["name"] for c in inspector.get_columns(tabla)}
        if columna in existentes:
            continue
        try:
            with engine.begin() as con:
                con.execute(text(f'ALTER TABLE {tabla} ADD COLUMN {columna} {tipo}'))
            logger.info("Migración aplicada: %s.%s añadida", tabla, columna)
        except Exception as e:
            logger.warning("No se pudo añadir %s.%s: %s", tabla, columna, e)
