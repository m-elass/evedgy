"""
models.py
─────────
Aquí viven las TABLAS de la base de datos, escritas como clases de Python.
Cada clase = una tabla. Cada atributo Column = una columna.

Esto es la traducción directa del modelo de datos que diseñamos.
SQLAlchemy se encarga de convertir estas clases en SQL real.

Regla de oro: TODA tabla de datos del usuario lleva `user_id`, que es
el identificador (UUID) que nos da el login de Supabase. Así cada dato
sabe de quién es y nadie ve lo de otro.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, Date, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# ─────────────────────────────────────────────────────────
# BLOQUE 1 — GIMNASIO
# ─────────────────────────────────────────────────────────

class Exercise(Base):
    """Biblioteca de ejercicios del usuario. Cada uno con sus notas técnicas."""
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    notes = Column(Text, default="")           # recomendaciones de ejecución
    # Músculos trabajados, como listas de ids separadas por comas (p.ej. "pecho,triceps").
    # Se rellenan automáticamente al crear según el nombre, y el usuario puede editarlas.
    primary_muscles = Column(String, default="")
    secondary_muscles = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones: un ejercicio tiene muchos días-de-rutina y muchas sesiones
    routine_days = relationship("RoutineDay", back_populates="exercise",
                                cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="exercise",
                            cascade="all, delete-orphan")


class RoutineDay(Base):
    """Plantilla semanal: qué ejercicio toca qué día. Se repite cada semana."""
    __tablename__ = "routine_days"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    weekday = Column(Integer, nullable=False)   # 0=lunes ... 6=domingo
    order = Column(Integer, default=0)          # orden dentro del día

    exercise = relationship("Exercise", back_populates="routine_days")


class Session(Base):
    """Un entrenamiento real de un ejercicio en una fecha concreta."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    date = Column(Date, nullable=False)         # la fecha es la clave del historial
    feelings = Column(Text, default="")         # sensaciones de ese día
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    exercise = relationship("Exercise", back_populates="sessions")
    sets = relationship("ExerciseSet", back_populates="session",
                        cascade="all, delete-orphan")


class ExerciseSet(Base):
    """Una serie dentro de una sesión: sus repeticiones y su peso."""
    __tablename__ = "sets"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    set_number = Column(Integer, nullable=False)   # 1, 2, 3...
    reps = Column(Integer, default=0)
    weight = Column(Float, default=0)

    session = relationship("Session", back_populates="sets")


# ─────────────────────────────────────────────────────────
# BLOQUE 2 — TAREAS Y HÁBITOS
# ─────────────────────────────────────────────────────────

class DailyTask(Base):
    """Hábito recurrente que marcas cada día."""
    __tablename__ = "daily_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    active = Column(Boolean, default=True)      # para pausar sin borrar

    completions = relationship("TaskCompletion", back_populates="task",
                               cascade="all, delete-orphan")


class TaskCompletion(Base):
    """El tick de un hábito en un día concreto."""
    __tablename__ = "task_completions"

    id = Column(Integer, primary_key=True, index=True)
    daily_task_id = Column(Integer, ForeignKey("daily_tasks.id"), nullable=False)
    date = Column(Date, nullable=False)
    done = Column(Boolean, default=True)

    task = relationship("DailyTask", back_populates="completions")


class RandomTask(Base):
    """Tarea suelta de acción (una ocurrencia de algo que hacer)."""
    __tablename__ = "random_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)
    done = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────
# BLOQUE 3 — MENTE
# ─────────────────────────────────────────────────────────

class Note(Base):
    """Destello intelectual: verso suelto, frase, idea fugaz."""
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    """Escritura seria: libros cortos, poemarios. Se edita en el tiempo."""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, default="")
    type = Column(String, default="prosa")      # "verso" / "prosa"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())


# ─────────────────────────────────────────────────────────
# BLOQUE 4 — SEGUIMIENTO PERSONAL
# ─────────────────────────────────────────────────────────

class SleepLog(Base):
    """Horas dormidas en una fecha (entrada manual)."""
    __tablename__ = "sleep_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)


class Goal(Base):
    """Objetivo o visión futura, con revisión posterior de cumplimiento."""
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    target_date = Column(Date, nullable=True)
    status = Column(String, default="pendiente")  # pendiente/cumplido/no_cumplido
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


# ─────────────────────────────────────────────────────────
# BLOQUE 5 — VIDA DELIBERADA (desarrollo personal)
# ─────────────────────────────────────────────────────────

class Value(Base):
    """Un valor o principio personal. Puede revisarse para ver si la vida lo honra."""
    __tablename__ = "values"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)          # p.ej. "Honestidad"
    description = Column(Text, default="")          # qué significa para mí
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    checkins = relationship("ValueCheckin", back_populates="value",
                            cascade="all, delete-orphan")


class ValueCheckin(Base):
    """Una valoración periódica de cuánto honraste un valor (1-5) con nota."""
    __tablename__ = "value_checkins"

    id = Column(Integer, primary_key=True, index=True)
    value_id = Column(Integer, ForeignKey("values.id"), nullable=False)
    date = Column(Date, nullable=False)
    score = Column(Integer, default=3)              # 1=nada ... 5=plenamente
    note = Column(Text, default="")

    value = relationship("Value", back_populates="checkins")


class Review(Base):
    """Revisión semanal o mensual: un ritual de cierre estructurado."""
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    period = Column(String, default="semanal")      # semanal / mensual
    date = Column(Date, nullable=False)             # fecha del cierre
    did = Column(Text, default="")                  # qué hice
    learned = Column(Text, default="")             # qué aprendí
    release = Column(Text, default="")             # qué suelto
    seed = Column(Text, default="")                # qué siembro para el próximo
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Decision(Base):
    """Una decisión importante registrada con su razonamiento, para revisarla luego."""
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    context = Column(Text, default="")             # situación
    reasoning = Column(Text, default="")           # por qué decidí esto
    expected = Column(Text, default="")            # qué espero que pase
    decided_option = Column(String, default="")    # qué elegí
    review_date = Column(Date, nullable=True)      # cuándo revisar el resultado
    outcome = Column(Text, default="")             # qué pasó de verdad (al revisar)
    was_right = Column(String, default="")         # "si"/"no"/"parcial" (al revisar)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class FutureLetter(Base):
    """Carta a tu yo futuro, que se 'abre' en una fecha."""
    __tablename__ = "future_letters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    body = Column(Text, nullable=False)
    open_date = Column(Date, nullable=False)        # cuándo se puede abrir
    opened = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Reading(Base):
    """Una lectura (libro, artículo) con estado y de la que se cosechan ideas."""
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    author = Column(String, default="")
    status = Column(String, default="leyendo")     # por_leer / leyendo / leido
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    harvests = relationship("Harvest", back_populates="reading",
                            cascade="all, delete-orphan")


class Harvest(Base):
    """Una 'cosecha' de una lectura: frase, idea o desacuerdo que extraje."""
    __tablename__ = "harvests"

    id = Column(Integer, primary_key=True, index=True)
    reading_id = Column(Integer, ForeignKey("readings.id"), nullable=False)
    user_id = Column(String, index=True, nullable=False)
    content = Column(Text, nullable=False)
    kind = Column(String, default="idea")          # frase / idea / desacuerdo
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reading = relationship("Reading", back_populates="harvests")


class Skill(Base):
    """Algo que cultivas (idioma, instrumento...) con progreso y constancia."""
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    level = Column(Integer, default=0)             # nivel actual (0-100, libre)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    logs = relationship("SkillLog", back_populates="skill",
                        cascade="all, delete-orphan")


class SkillLog(Base):
    """Una sesión de práctica de una skill: fecha, minutos y reflexión."""
    __tablename__ = "skill_logs"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)
    user_id = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    minutes = Column(Integer, default=0)
    note = Column(Text, default="")

    skill = relationship("Skill", back_populates="logs")


# ─────────────────────────────────────────────────────────
# BLOQUE 6 — PERFIL Y SOCIAL (rangos, amigos)
# ─────────────────────────────────────────────────────────

class UserProfile(Base):
    """
    Perfil del usuario. Guarda lo necesario para calcular rangos (peso corporal
    y sexo) y los ajustes del modo cooperativo (alias visible, si comparte rangos).
    Un registro por usuario.
    """
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, default="")      # alias que ven los amigos
    bodyweight = Column(Float, default=0.0)         # kg, para el ratio de fuerza
    sex = Column(String, default="m")               # "m" / "f"
    share_ranks = Column(Boolean, default=False)    # opt-in: ¿comparto mis rangos?
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Friendship(Base):
    """
    Una relación de amistad solicitada/aceptada entre dos usuarios.
    requester pide; addressee acepta. Status: pendiente / aceptada.
    La amistad es mutua una vez aceptada (ambos se ven).
    """
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(String, index=True, nullable=False)
    addressee_id = Column(String, index=True, nullable=False)
    status = Column(String, default="pendiente")    # pendiente / aceptada
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PhysiqueGoal(Base):
    """
    Cuenta atrás al físico deseado: una meta con fecha límite. La barra se llena
    según pasan los días, y la racha crece con los entrenos semanales cumplidos.
    """
    __tablename__ = "physique_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    description = Column(Text, default="")          # el físico/meta deseado
    start_date = Column(Date, nullable=False)       # cuándo empieza la cuenta
    target_date = Column(Date, nullable=False)      # fecha objetivo
    weekly_target = Column(Integer, default=3)      # entrenos por semana esperados
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WeekOverride(Base):
    """
    Excepción de UNA semana concreta sobre la plantilla: "esta semana, el
    martes hago estos otros ejercicios". Si para (semana, día) hay filas
    aquí, mandan ellas; si no, manda la plantilla (RoutineDay).
    """
    __tablename__ = "week_overrides"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    week_start = Column(Date, index=True, nullable=False)  # lunes de esa semana
    weekday = Column(Integer, nullable=False)              # 0=lunes ... 6=domingo
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    order = Column(Integer, default=0)
