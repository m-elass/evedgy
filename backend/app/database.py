"""
database.py
───────────
Prepara la conexión con la base de datos PostgreSQL (en Supabase).

Tres piezas clave:
- engine:   el "motor" que mantiene la conexión con Postgres.
- SessionLocal: fábrica de sesiones; cada petición a la API abre una
                sesión, hace sus consultas y la cierra.
- Base:     la clase de la que heredarán todas nuestras tablas (models.py).

Ajustes del grupo de conexiones (pool), y por qué:
- pool_pre_ping: antes de usar una conexión guardada se comprueba que sigue
  viva. El pooler de Supabase cierra las conexiones ociosas; sin esta
  comprobación, la primera petición tras un rato fallaba con «server closed
  the connection» y la app mostraba la pantalla vacía.
- pool_recycle: además, ninguna conexión se reutiliza pasados 5 minutos.
- pool_size / max_overflow: como mucho 6 conexiones por servidor. El pooler
  gratuito de Supabase admite pocas a la vez y, durante una mudanza, puede
  haber dos servidores conectados a la misma base.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

_es_sqlite = settings.DATABASE_URL.startswith("sqlite")

if _es_sqlite:
    # SQLite solo se usa en pruebas locales: sin pool que ajustar.
    engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=4,
        max_overflow=2,
        pool_timeout=20,
        connect_args={"connect_timeout": 10},
    )

# Cada sesión es una "conversación" temporal con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Todas las tablas heredarán de esta Base
Base = declarative_base()


def get_db():
    """
    Dependencia de FastAPI: abre una sesión para una petición y la cierra
    al terminar, pase lo que pase. Se usa así en los endpoints:

        def mi_endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
