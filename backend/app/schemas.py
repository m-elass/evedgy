"""
schemas.py
──────────
Los "schemas" definen la FORMA de los datos que entran y salen de la API,
y Pydantic los valida automáticamente.

Diferencia con models.py:
- models.py  = cómo se guardan los datos en la base de datos.
- schemas.py = cómo viajan los datos por internet (lo que el frontend envía
               y lo que la API responde).

Por cada recurso solemos tener:
- ...Create : lo que el cliente ENVÍA para crear algo (sin id, sin user_id).
- ...Out    : lo que la API DEVUELVE (con id, fechas, etc.).

Empezamos solo con Ejercicios para el primer arranque. El resto de módulos
se añaden copiando este mismo patrón.
"""

from datetime import datetime
from pydantic import BaseModel


# ── Ejercicios ────────────────────────────────────────────

class ExerciseCreate(BaseModel):
    """Lo que el frontend manda para crear un ejercicio."""
    name: str
    notes: str = ""


class ExerciseUpdate(BaseModel):
    """Para editar (p. ej. cambiar las notas de ejecución o los músculos)."""
    name: str | None = None
    notes: str | None = None
    primary_muscles: str | None = None
    secondary_muscles: str | None = None


class ExerciseOut(BaseModel):
    """Lo que la API devuelve cuando pides un ejercicio."""
    id: int
    name: str
    notes: str
    primary_muscles: str = ""
    secondary_muscles: str = ""
    created_at: datetime

    # Permite a Pydantic leer directamente desde el objeto SQLAlchemy
    model_config = {"from_attributes": True}


# ── Series y Sesiones ─────────────────────────────────────
# Una sesión se crea CON sus series dentro, en una sola petición.
# Es lo que pasa en el prototipo: registras un ejercicio del día y
# rellenas las 3 series de golpe.

from datetime import date as date_type


class SetCreate(BaseModel):
    """Una serie que el frontend envía dentro de una sesión."""
    set_number: int
    reps: int = 0
    weight: float = 0


class SetOut(BaseModel):
    """Una serie tal como la devuelve la API."""
    id: int
    set_number: int
    reps: int
    weight: float

    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    """Un entrenamiento completo: ejercicio + fecha + sensaciones + las series."""
    exercise_id: int
    date: date_type
    feelings: str = ""
    sets: list[SetCreate] = []


class SessionUpdate(BaseModel):
    """Editar una sesión ya guardada: sus series y/o sus sensaciones."""
    feelings: str | None = None
    sets: list[SetCreate] | None = None


class SessionOut(BaseModel):
    """Un entrenamiento tal como lo devuelve la API, con sus series dentro."""
    id: int
    exercise_id: int
    date: date_type
    feelings: str
    created_at: datetime
    sets: list[SetOut] = []

    model_config = {"from_attributes": True}


class SessionCreatedOut(SessionOut):
    """
    Respuesta al CREAR una sesión: la sesión más la detección de récord.
    Si alguna serie supera tu mejor 1RM histórico en ese ejercicio, new_record
    es True y el frontend lo celebra en oro.
    """
    new_record: bool = False
    record_1rm: float | None = None     # el nuevo mejor 1RM estimado
    exercise_name: str = ""


# ── Hábitos diarios y sus completados ─────────────────────

class DailyTaskCreate(BaseModel):
    title: str


class DailyTaskOut(BaseModel):
    id: int
    title: str
    active: bool
    model_config = {"from_attributes": True}


class DailyTaskTodayOut(DailyTaskOut):
    """Un hábito con su estado de hoy y su racha, calculados en el servidor."""
    done_today: bool
    streak: int


class CompletionCreate(BaseModel):
    """Marca/desmarca un hábito en una fecha."""
    date: date_type
    done: bool = True


class CompletionOut(BaseModel):
    id: int
    daily_task_id: int
    date: date_type
    done: bool
    model_config = {"from_attributes": True}


# ── Tareas sueltas (acción) ───────────────────────────────

class RandomTaskCreate(BaseModel):
    content: str
    section_id: int | None = None


class RandomTaskUpdate(BaseModel):
    content: str | None = None
    done: bool | None = None
    # Se envía como campo aparte para poder poner una tarea "sin clasificar"
    # mandando null, sin que se confunda con "no quiero cambiar la sección".
    section_id: int | None = None
    clear_section: bool = False


class RandomTaskOut(BaseModel):
    id: int
    content: str
    done: bool
    section_id: int | None = None
    # Tolerante a nulo: una fila muy antigua sin fecha no debe romper la lista
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


# ── Secciones de tareas (las crea el usuario) ─────────────
class TaskSectionCreate(BaseModel):
    name: str
    color: str | None = None


class TaskSectionUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    order: int | None = None


class TaskSectionOut(BaseModel):
    id: int
    name: str
    color: str
    order: int
    model_config = {"from_attributes": True}


# ── Notas (destellos intelectuales) ───────────────────────

class NoteCreate(BaseModel):
    content: str


class NoteOut(BaseModel):
    id: int
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Documentos (escritura seria) ──────────────────────────

class DocumentCreate(BaseModel):
    title: str
    body: str = ""
    type: str = "prosa"   # "verso" / "prosa"


class DocumentUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    type: str | None = None


class DocumentOut(BaseModel):
    id: int
    title: str
    body: str
    type: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Sueño ─────────────────────────────────────────────────

class SleepCreate(BaseModel):
    date: date_type
    hours: float


class SleepOut(BaseModel):
    id: int
    date: date_type
    hours: float
    model_config = {"from_attributes": True}


# ── Objetivos / visiones futuras ──────────────────────────

class GoalCreate(BaseModel):
    description: str
    target_date: date_type | None = None


class GoalUpdate(BaseModel):
    description: str | None = None
    target_date: date_type | None = None
    status: str | None = None   # pendiente / cumplido / no_cumplido


class GoalOut(BaseModel):
    id: int
    description: str
    target_date: date_type | None
    status: str
    created_at: datetime
    reviewed_at: datetime | None
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# VIDA DELIBERADA
# ═══════════════════════════════════════════════════════════

# ── Valores ───────────────────────────────────────────────
class ValueCreate(BaseModel):
    title: str
    description: str = ""

class ValueCheckinCreate(BaseModel):
    date: date_type
    score: int = 3
    note: str = ""

class ValueCheckinOut(BaseModel):
    id: int
    date: date_type
    score: int
    note: str
    model_config = {"from_attributes": True}

class ValueOut(BaseModel):
    id: int
    title: str
    description: str
    created_at: datetime
    model_config = {"from_attributes": True}

# ── Revisiones ────────────────────────────────────────────
class ReviewCreate(BaseModel):
    period: str = "semanal"
    date: date_type
    did: str = ""
    learned: str = ""
    release: str = ""
    seed: str = ""

class ReviewOut(BaseModel):
    id: int
    period: str
    date: date_type
    did: str
    learned: str
    release: str
    seed: str
    created_at: datetime
    model_config = {"from_attributes": True}

# ── Decisiones ────────────────────────────────────────────
class DecisionCreate(BaseModel):
    title: str
    context: str = ""
    reasoning: str = ""
    expected: str = ""
    decided_option: str = ""
    review_date: date_type | None = None

class DecisionReview(BaseModel):
    outcome: str
    was_right: str  # si / no / parcial

class DecisionOut(BaseModel):
    id: int
    title: str
    context: str
    reasoning: str
    expected: str
    decided_option: str
    review_date: date_type | None
    outcome: str
    was_right: str
    created_at: datetime
    reviewed_at: datetime | None
    model_config = {"from_attributes": True}

# ── Cartas al futuro ──────────────────────────────────────
class LetterCreate(BaseModel):
    body: str
    open_date: date_type

class LetterOut(BaseModel):
    id: int
    body: str          # se omite en la lista si no está abierta (lo gestiona el router)
    open_date: date_type
    opened: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class LetterListItem(BaseModel):
    """Versión segura para listar: no revela el cuerpo si aún no toca abrirla."""
    id: int
    open_date: date_type
    opened: bool
    can_open: bool
    created_at: datetime

# ── Lecturas y cosechas ───────────────────────────────────
class ReadingCreate(BaseModel):
    title: str
    author: str = ""
    status: str = "leyendo"

class ReadingUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    status: str | None = None

class HarvestCreate(BaseModel):
    content: str
    kind: str = "idea"

class HarvestOut(BaseModel):
    id: int
    content: str
    kind: str
    created_at: datetime
    model_config = {"from_attributes": True}

class ReadingOut(BaseModel):
    id: int
    title: str
    author: str
    status: str
    created_at: datetime
    harvests: list[HarvestOut] = []
    model_config = {"from_attributes": True}

# ── Skills ────────────────────────────────────────────────
class SkillCreate(BaseModel):
    name: str
    description: str = ""

class SkillUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    level: int | None = None

class SkillLogCreate(BaseModel):
    date: date_type
    minutes: int = 0
    note: str = ""

class SkillLogOut(BaseModel):
    id: int
    date: date_type
    minutes: int
    note: str
    model_config = {"from_attributes": True}

class SkillOut(BaseModel):
    id: int
    name: str
    description: str
    level: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# PERFIL Y RANGOS
# ═══════════════════════════════════════════════════════════
class ProfileUpdate(BaseModel):
    display_name: str | None = None
    bodyweight: float | None = None
    sex: str | None = None
    share_ranks: bool | None = None

class ProfileOut(BaseModel):
    user_id: str
    display_name: str
    bodyweight: float
    sex: str
    share_ranks: bool
    model_config = {"from_attributes": True}

# ═══════════════════════════════════════════════════════════
# META FÍSICA (cuenta atrás)
# ═══════════════════════════════════════════════════════════
class PhysiqueGoalCreate(BaseModel):
    description: str = ""
    start_date: date_type
    target_date: date_type
    weekly_target: int = 3

class PhysiqueGoalOut(BaseModel):
    id: int
    description: str
    start_date: date_type
    target_date: date_type
    weekly_target: int
    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════
# SOCIAL (amigos y rangos compartidos)
# ═══════════════════════════════════════════════════════════
class FriendRequestCreate(BaseModel):
    # Se solicita amistad por el alias (display_name) del otro usuario.
    display_name: str

class FriendOut(BaseModel):
    # Lo que se muestra de un amigo: SOLO su alias y el id de la relación.
    # Nunca su user_id real ni datos sensibles.
    friendship_id: int
    display_name: str
    status: str
    direction: str   # "enviada" / "recibida" / "amigos"

class FriendRankOut(BaseModel):
    # El rango de un amigo en un ejercicio. SOLO nombre de ejercicio e insignia
    # (con su subdivisión). Nada de pesos ni datos sensibles.
    exercise: str
    badge_name: str
    badge_color: str
    tier: str = ""


class RoutineDayIn(BaseModel):
    """Los ejercicios (en orden) que ocupan un día de la rutina."""
    exercise_ids: list[int]


# ═════════════════════════════════════════════════════════
# NUEVO: carta diaria, conocimiento, frases, habilidades,
# widgets y avisos. Todo lo que entra tiene límites de tamaño.
# ═════════════════════════════════════════════════════════
from typing import Literal
from pydantic import Field, field_validator

SELLOS = Literal["carmesi", "oro", "esmeralda", "zafiro", "amatista", "noche"]


class DailyLetterIn(BaseModel):
    greeting: str = Field("", max_length=120)
    body: str = Field(..., min_length=1, max_length=20000)
    closing: str = Field("", max_length=120)
    seal: SELLOS = "carmesi"


TIPOS_CONOCIMIENTO = Literal["libro", "pelicula", "serie", "video", "documental",
                             "podcast", "curso", "articulo"]
ESTADOS_CONOCIMIENTO = Literal["pendiente", "en_curso", "hecho"]


def _enlace_valido(v: str) -> str:
    v = (v or "").strip()
    if v and not v.lower().startswith(("https://", "http://")):
        raise ValueError("El enlace debe empezar por https://")
    return v


class KnowledgeCreate(BaseModel):
    kind: TIPOS_CONOCIMIENTO = "libro"
    title: str = Field(..., min_length=1, max_length=200)
    creator: str = Field("", max_length=160)
    why: str = Field("", max_length=2000)
    link: str = Field("", max_length=500)
    priority: int = Field(0, ge=0, le=2)

    _link = field_validator("link")(_enlace_valido)


class KnowledgeUpdate(BaseModel):
    kind: TIPOS_CONOCIMIENTO | None = None
    title: str | None = Field(None, min_length=1, max_length=200)
    creator: str | None = Field(None, max_length=160)
    why: str | None = Field(None, max_length=2000)
    link: str | None = Field(None, max_length=500)
    priority: int | None = Field(None, ge=0, le=2)
    status: ESTADOS_CONOCIMIENTO | None = None
    note: str | None = Field(None, max_length=4000)

    @field_validator("link")
    @classmethod
    def _link(cls, v):
        return None if v is None else _enlace_valido(v)


class KnowledgeOut(BaseModel):
    id: int
    kind: str
    title: str
    creator: str | None = ""
    why: str | None = ""
    link: str | None = ""
    status: str
    priority: int | None = 0
    note: str | None = ""
    created_at: datetime | None = None
    finished_at: datetime | None = None
    model_config = {"from_attributes": True}


class FromTaskIn(BaseModel):
    kind: TIPOS_CONOCIMIENTO = "libro"


class QuoteCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    author: str = Field("", max_length=120)
    source: str = Field("", max_length=160)
    favorite: bool = False
    in_widget: bool = True


class QuoteUpdate(BaseModel):
    text: str | None = Field(None, min_length=1, max_length=1000)
    author: str | None = Field(None, max_length=120)
    source: str | None = Field(None, max_length=160)
    favorite: bool | None = None
    in_widget: bool | None = None


class QuoteOut(BaseModel):
    id: int
    text: str
    author: str | None = ""
    source: str | None = ""
    favorite: bool | None = False
    in_widget: bool | None = True
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


ATRIBUTOS = Literal["STR", "AGI", "VIT", "INT", "PER", "SEN"]


# Tipos de habilidad que conoce el Sistema (ver maestria_plantillas.py)
CATEGORIAS = Literal["musica", "idioma", "programacion", "arte", "deporte", "escritura",
                     "estudio", "comunicacion", "estrategia", "cocina", "general"]
# Rango con el que empiezas si ya dominas algo (el S no se convalida)
RANGOS_PARTIDA = Literal["E", "D", "C", "B", "A"]


class SkillBoardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str = Field("", max_length=500)          # lo que quieres conseguir
    stat: ATRIBUTOS = "INT"
    daily_minutes: int = Field(15, ge=0, le=600)
    category: CATEGORIAS | None = None                     # vacío = lo detecta el Sistema
    start_rank: RANGOS_PARTIDA = "E"
    start_hours: float | None = Field(None, ge=0, le=10000)  # horas que ya llevabas


class SkillBoardUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    description: str | None = Field(None, max_length=500)
    stat: ATRIBUTOS | None = None
    daily_minutes: int | None = Field(None, ge=0, le=600)
    category: CATEGORIAS | None = None
    start_rank: RANGOS_PARTIDA | None = None
    start_hours: float | None = Field(None, ge=0, le=10000)


class QuestCreate(BaseModel):
    """Un hito personal («tocar en la boda de mi primo»): da XP al cumplirlo, como mucho 300."""
    title: str = Field(..., min_length=1, max_length=160)
    xp: int = Field(100, ge=10, le=300)


class QuestUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=160)
    xp: int | None = Field(None, ge=10, le=300)
    done: bool | None = None


class MissionDoneIn(BaseModel):
    """Cumplir una misión del Sistema (o superar una prueba de ascenso)."""
    date: date_type                                        # la fecha local del móvil
    minutes: int | None = Field(None, ge=0, le=720)        # vacío = los de la misión
    note: str = Field("", max_length=1000)                 # en las pruebas, la evidencia
    criteria: list[bool] | None = Field(None, max_length=10)


class WidgetTokenCreate(BaseModel):
    name: str = Field("Mi móvil", min_length=1, max_length=40)


class PushKeys(BaseModel):
    p256dh: str = Field(..., min_length=40, max_length=200)
    auth: str = Field(..., min_length=10, max_length=100)


class PushSubscribeIn(BaseModel):
    endpoint: str = Field(..., min_length=20, max_length=1000)
    keys: PushKeys
    tz: str = Field("Europe/Madrid", max_length=64)
    hour: int = Field(22, ge=0, le=23)
    minute: int = Field(0, ge=0, le=59)

    @field_validator("endpoint")
    @classmethod
    def _https(cls, v):
        if not v.startswith("https://"):
            raise ValueError("El endpoint push debe ser https://")
        return v

    @field_validator("tz")
    @classmethod
    def _zona(cls, v):
        from zoneinfo import ZoneInfo
        try:
            ZoneInfo(v)
        except Exception:
            raise ValueError("Zona horaria desconocida")
        return v


class PushUnsubscribeIn(BaseModel):
    endpoint: str = Field(..., min_length=20, max_length=1000)
