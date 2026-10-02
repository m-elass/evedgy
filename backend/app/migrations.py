"""
migrations.py — PONER AL DÍA UNA BASE DE DATOS QUE YA EXISTE
────────────────────────────────────────────────────────────
Al arrancar, la app crea las tablas que falten (Base.metadata.create_all).
Pero eso NO añade columnas nuevas a tablas que ya existen: si tu base lleva
meses guardando tareas y hoy aparece la columna "section_id", create_all no
la crearía y la app fallaría al leerla.

Aquí se resuelve con migraciones mínimas y seguras:
  · Solo se AÑADEN columnas opcionales; nunca se borra ni se reescribe nada.
  · Es idempotente: se puede ejecutar en cada arranque sin efecto alguno si
    la base ya está al día (en PostgreSQL, con ADD COLUMN IF NOT EXISTS).
  · Si una columna no se puede añadir, el arranque FALLA a propósito: es
    mejor que Render siga sirviendo la versión anterior que arrancar una
    versión que da error en cada consulta a esa tabla.

Además, `blindar_tablas()` activa la seguridad por filas (RLS) en TODAS las
tablas de la app tras crearlas. La API pública de Supabase (la «anon key»
que viaja en el navegador) no puede leer ni escribir ninguna tabla con RLS
activa y sin políticas: así una tabla nueva nunca nace desprotegida, aunque
no se vuelva a ejecutar el script SQL de blindaje. El backend no se ve
afectado: es el dueño de las tablas.
"""

import logging

from sqlalchemy import inspect, text

from app.database import Base, engine

logger = logging.getLogger("migraciones")

# (tabla, columna, definición SQL) — solo columnas opcionales, con valor por defecto
COLUMNAS = [
    ("random_tasks", "section_id", "INTEGER"),
    ("skills", "stat", "VARCHAR DEFAULT 'INT'"),
    ("skills", "daily_minutes", "INTEGER DEFAULT 15"),
    ("skills", "category", "VARCHAR"),
    ("skills", "placed_rank", "VARCHAR DEFAULT 'E'"),
    ("skills", "base_minutes", "INTEGER DEFAULT 0"),
]


def _es_postgres() -> bool:
    return engine.dialect.name == "postgresql"


def aplicar_migraciones() -> None:
    """Añade las columnas que falten. Lanza excepción si alguna no se puede añadir."""
    inspector = inspect(engine)
    tablas = set(inspector.get_table_names())

    for tabla, columna, tipo in COLUMNAS:
        if tabla not in tablas:
            continue                            # la creará create_all con todo dentro
        existentes = {c["name"] for c in inspector.get_columns(tabla)}
        if columna in existentes:
            continue                            # caso normal: nada que tocar, ni bloqueos
        # IF NOT EXISTS por si otro servidor la añadió en este mismo instante
        si_no_existe = "IF NOT EXISTS " if _es_postgres() else ""
        with engine.begin() as con:
            con.execute(text(f'ALTER TABLE "{tabla}" ADD COLUMN {si_no_existe}"{columna}" {tipo}'))
        logger.info("Migración aplicada: %s.%s añadida", tabla, columna)


# Un único viaje a la base: recorre las tablas y solo toca las que lo necesitan
# (si la tabla ya tiene RLS y los roles públicos no tienen permisos, no hace
# nada, ni siquiera bloquearla).
_BLINDAJE_SQL = """
DO $blindaje$
DECLARE t text; r text;
BEGIN
  FOREACH t IN ARRAY :tablas
  LOOP
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relname = t AND NOT c.relrowsecurity) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r)
         AND has_table_privilege(r, format('public.%I', t),
                                 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', t, r);
      END IF;
    END LOOP;
  END LOOP;
END
$blindaje$;
"""


def blindar_tablas() -> None:
    """
    Activa RLS en todas las tablas de la app y retira los permisos de los
    roles públicos de Supabase. Solo en PostgreSQL. Si algo falla, se avisa en
    los logs y la app arranca igual: el blindaje principal es el script SQL.
    """
    if not _es_postgres():
        return
    nombres = [t.name for t in Base.metadata.sorted_tables]
    # psycopg2 no sustituye parámetros dentro de un bloque DO: se incrusta la
    # lista, que sale del propio código (nombres de tabla), nunca del usuario.
    lista = "ARRAY[" + ", ".join("'" + n.replace("'", "''") + "'" for n in nombres) + "]::text[]"
    try:
        with engine.begin() as con:
            con.execute(text(_BLINDAJE_SQL.replace(":tablas", lista)))
    except Exception as e:                     # noqa: BLE001 — se registra, no se oculta
        logger.warning("No se pudo completar el blindaje automático de tablas: %s", e)
