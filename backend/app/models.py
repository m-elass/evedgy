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
    Column, Integer, String, Text, Float, Boolean, Date, DateTime, ForeignKey,
    UniqueConstraint, Index,
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
    # Sección a la que pertenece la tarea. Puede ser None: una tarea sin
    # clasificar sigue siendo válida y aparece en "Sin clasificar".
    section_id = Column(Integer, ForeignKey("task_sections.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AiUsage(Base):
    """
    Cuántas llamadas a la IA ha hecho un usuario cada día.

    Las funciones con IA (temas a medida, resumen semanal inteligente) cuestan
    dinero real por petición. Sin un tope, un fallo en bucle o un uso abusivo
    podrían generar una factura desagradable. Aquí se lleva la cuenta para
    poder cortar antes de que eso ocurra.
    """
    __tablename__ = "ai_usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    day = Column(Date, index=True, nullable=False)
    calls = Column(Integer, default=0)


class TaskSection(Base):
    """
    Una sección para clasificar tareas: las inventa el usuario ("Casa",
    "Trabajo", "Papeleo"…). Cada una lleva su color para distinguirlas de un
    vistazo, y un orden para que el usuario decida cómo se ordenan.
    """
    __tablename__ = "task_sections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#E8B84B")
    order = Column(Integer, default=0)
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
    """
    Una habilidad que cultivas (idioma, instrumento, programar...).
    El progreso se mide como en un juego, pero con maestría de verdad: cada
    minuto de práctica da experiencia (XP) y las misiones cumplidas dan algo
    más; la XP marca el nivel y el rango (E → S), y para ascender de rango
    hay que superar su prueba (ver maestria.py). Nada de eso se guarda: se
    CALCULA a partir de los registros.
    """
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    level = Column(Integer, default=0)             # antiguo nivel libre (ya no se usa)
    # Atributo al que suma, como las estadísticas de un cazador:
    # STR fuerza · AGI agilidad · VIT vitalidad · INT inteligencia · PER percepción · SEN sentido
    stat = Column(String, default="INT")
    daily_minutes = Column(Integer, default=15)    # minutos al día (0 = sin misiones diarias)
    # Tipo de habilidad (musica, idioma, programacion…). Vacío = lo deduce el
    # Sistema por el nombre (las habilidades anteriores a esta versión).
    category = Column(String, nullable=True)
    placed_rank = Column(String, default="E")      # rango con el que empezaste (convalidado)
    base_minutes = Column(Integer, default=0)      # práctica previa a la app, en minutos
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    logs = relationship("SkillLog", back_populates="skill",
                        cascade="all, delete-orphan")
    quests = relationship("SkillQuest", cascade="all, delete-orphan",
                          order_by="SkillQuest.order")
    plan = relationship("SkillPlan", uselist=False, cascade="all, delete-orphan")
    missions = relationship("SkillMission", cascade="all, delete-orphan")


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


class SkillQuest(Base):
    """Una misión concreta dentro de una habilidad: un hito con recompensa de XP."""
    __tablename__ = "skill_quests"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False, index=True)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    xp = Column(Integer, default=100)              # recompensa al cumplirla
    done = Column(Boolean, default=False)
    done_at = Column(DateTime(timezone=True), nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SkillPlan(Base):
    """
    El plan de misiones de una habilidad hecho a medida por la IA. Si no hay
    (o la IA no está configurada), el Sistema usa el plan preparado para su
    tipo de habilidad, así que esta tabla solo guarda lo que la IA aporta.
    """
    __tablename__ = "skill_plans"

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_id = Column(String, index=True, nullable=False)
    status = Column(String, default="lista")       # lista · generando · error
    content = Column(Text, nullable=True)          # el plan en JSON (solo si lo hizo la IA)
    model = Column(String, nullable=True)
    error = Column(String, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SkillMission(Base):
    """
    Una misión que el Sistema te asigna: diaria (un día), semanal (una semana,
    se guarda con su lunes) o prueba de ascenso (hasta que la superes).
    Los huecos (slot) evitan duplicados aunque lleguen dos peticiones a la vez:
    0 para la primera, 1 si la cambiaste; en las pruebas, el índice del rango.
    """
    __tablename__ = "skill_missions"
    __table_args__ = (
        UniqueConstraint("skill_id", "kind", "period", "slot", name="uq_skill_mission_slot"),
        Index("ix_skill_missions_user_period", "user_id", "period"),
    )

    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, index=True, nullable=False)
    kind = Column(String, nullable=False)          # diaria · semanal · prueba
    period = Column(Date, nullable=False)          # el día · el lunes · 2000-01-01 en las pruebas
    slot = Column(Integer, nullable=False, default=0)
    title = Column(String, nullable=False)
    detail = Column(Text, default="")
    minutes = Column(Integer, default=0)
    xp = Column(Integer, default=0)                # recompensa extra al cumplirla
    status = Column(String, nullable=False, default="activa")   # activa · hecha · cambiada
    extra = Column(Boolean, nullable=False, default=False)      # pedida a mano: no cuenta para la racha
    # En una prueba, el rango al que asciende; en una diaria o semanal, el
    # rango de la prueba que está ensayando (si es un ensayo).
    rank_target = Column(String, nullable=True)
    criteria = Column(Text, nullable=True)         # criterios de la prueba (JSON)
    note = Column(Text, default="")                # lo que anotaste (en las pruebas, la evidencia)
    log_id = Column(Integer, ForeignKey("skill_logs.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    done_at = Column(DateTime(timezone=True), nullable=True)


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


# ─────────────────────────────────────────────────────────
# BLOQUE 7 — CARTA DIARIA, CONOCIMIENTO Y FRASES
# ─────────────────────────────────────────────────────────

class DailyLetter(Base):
    """
    La carta de cada día, escrita al caer la noche para entregarla algún día
    a una persona. Una sola por día: la fecha es su identidad.
    """
    __tablename__ = "daily_letters"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_daily_letter_user_date"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False, index=True)
    greeting = Column(String, default="")          # «Querida…»
    body = Column(Text, nullable=False)
    closing = Column(String, default="")           # «Tuyo, …»
    seal = Column(String, default="carmesi")       # color del lacre
    words = Column(Integer, default=0)             # palabras (para el archivo, sin leer el texto)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now())


class KnowledgeItem(Base):
    """
    Algo que quieres conocer: un libro por leer, una película, una serie, un
    vídeo, un documental, un podcast o un curso. Con el porqué te interesa.
    """
    __tablename__ = "knowledge_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    kind = Column(String, default="libro")         # libro/pelicula/serie/video/documental/podcast/curso/articulo
    title = Column(String, nullable=False)
    creator = Column(String, default="")           # autor, director, canal…
    why = Column(Text, default="")                 # por qué me interesa (opcional)
    link = Column(String, default="")
    status = Column(String, default="pendiente")   # pendiente / en_curso / hecho
    priority = Column(Integer, default=0)          # 0 normal · 1 pronto · 2 imprescindible
    note = Column(Text, default="")                # qué me llevé (al terminar)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)


class Quote(Base):
    """Una frase con hondura, para que vuelva a aparecer en Hoy de vez en cuando."""
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    text = Column(Text, nullable=False)
    author = Column(String, default="")
    source = Column(String, default="")            # obra de la que sale
    favorite = Column(Boolean, default=False)      # aparece más a menudo
    in_widget = Column(Boolean, default=True)      # ¿puede salir en el widget del móvil?
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WeeklySummary(Base):
    """El resumen semanal ya redactado: se escribe una vez por semana, no en cada visita."""
    __tablename__ = "weekly_summaries"
    __table_args__ = (UniqueConstraint("user_id", "week_start", name="uq_weekly_summary"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    week_start = Column(Date, nullable=False)
    summary = Column(Text, default="")
    data = Column(Text, default="{}")              # cifras de la semana, en JSON
    narrated = Column(Boolean, default=False)      # ¿lo redactó la IA?
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────────────
# BLOQUE 8 — WIDGETS Y AVISOS
# ─────────────────────────────────────────────────────────

class WidgetToken(Base):
    """
    Llave personal de solo lectura para los widgets del móvil. Se guarda
    únicamente su huella (SHA-256): ni la base de datos conoce la llave.
    """
    __tablename__ = "widget_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, default="Mi móvil")
    token_hash = Column(String, unique=True, index=True, nullable=False)
    prefix = Column(String, default="")            # primeros caracteres, para reconocerla
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)


class PushSubscription(Base):
    """Un dispositivo que quiere recibir el aviso de la carta diaria."""
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    endpoint = Column(String(1000), unique=True, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    tz = Column(String, default="Europe/Madrid")
    remind_hour = Column(Integer, default=22)
    remind_minute = Column(Integer, default=0)
    last_sent_on = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ServerKey(Base):
    """Claves propias del servidor (p. ej. las de los avisos push). No son de ningún usuario."""
    __tablename__ = "server_keys"

    name = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
