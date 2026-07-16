"""
database.py
───────────
Prepara la conexión con la base de datos PostgreSQL (en Supabase).

Tres piezas clave:
- engine:   el "motor" que mantiene la conexión con Postgres.
- SessionLocal: fábrica de sesiones; cada petición a la API abre una
                sesión, hace sus consultas y la cierra.
- Base:     la clase de la que heredarán todas nuestras tablas (models.py).
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# El motor usa la URL de conexión que pusiste en el .env.
# El connect_args extra SOLO hace falta si usas SQLite (para pruebas locales);
# con PostgreSQL (Supabase) se ignora.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

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
