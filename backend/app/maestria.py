"""
maestria.py — EL CAMINO A LA MAESTRÍA
─────────────────────────────────────
El Sistema mide cada habilidad con dos cosas que en la vida real van juntas:

  1. HORAS de práctica (la experiencia, XP). Un minuto practicado = 1 XP. Las
     misiones cumplidas suman algo más, porque la práctica con un objetivo
     concreto vale más que repetir lo que ya sale.
  2. DEMOSTRAR lo que sabes hacer. Al llegar al 90 % de un rango se abre una
     PRUEBA DE ASCENSO con criterios comprobables («tocas 2 canciones completas
     a tempo»). Sin superarla no se asciende: la XP sigue sumando en reserva,
     pero el nivel se queda sellado en el último de su rango.

Los rangos siguen las etapas de adquisición de destreza de Dreyfus y unas
horas de referencia: unas 20 h para dejar de ser novato (Kaufman), unas 100 h
para ser competente, cientos para destacar y miles para la maestría
(Ericsson). Son referencias, no leyes: por eso manda la prueba.

  E Novato        0 h    niveles 1–10
  D Aprendiz     20 h    niveles 11–25
  C Competente  100 h    niveles 26–45
  B Hábil       400 h    niveles 46–65
  A Experto   1.500 h    niveles 66–85
  S Maestro   5.000 h    niveles 86–100 (el 100 llega cerca de las 10.000 h)

Dentro de cada rango, los primeros niveles llegan antes y los últimos cuestan
más: al empezar algo nuevo se nota el avance enseguida, como en la vida.

Las misiones salen del PLAN de cada habilidad: el de su tipo (preparado a mano,
en maestria_plantillas.py) o uno hecho a medida por la IA si el servidor la
tiene configurada.
"""

import json
import logging
import unicodedata
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from app.config import settings
from app.maestria_plantillas import CATEGORIAS, PALABRAS, PLANTILLAS

logger = logging.getLogger("maestria")


@dataclass(frozen=True)
class Rango:
    letra: str
    titulo: str
    horas: int
    nivel_ini: int
    nivel_fin: int
    sentido: str        # lo que significa en la vida real


RANGOS = (
    Rango("E", "Novato", 0, 1, 10,
          "Sigues instrucciones paso a paso y aún no distingues lo importante de lo accesorio."),
    Rango("D", "Aprendiz", 20, 11, 25,
          "Lo básico ya te sale sin pensar y reconoces las situaciones que se repiten."),
    Rango("C", "Competente", 100, 26, 45,
          "Te marcas objetivos, eliges qué practicar y respondes de tus resultados."),
    Rango("B", "Hábil", 400, 46, 65,
          "Ves el conjunto de un vistazo y destacas con claridad entre los aficionados."),
    Rango("A", "Experto", 1500, 66, 85,
          "Rindes a nivel profesional, actúas por intuición y otros te consultan."),
    Rango("S", "Maestro", 5000, 86, 100,
          "Creas, enseñas y amplías el oficio: tu forma de hacerlo es referencia."),
)
LETRAS = tuple(r.letra for r in RANGOS)
TOPE_HORAS = 10_000

XP_DIARIA = 15            # recompensa extra por misión diaria cumplida (además de sus minutos)
XP_SEMANAL = 60           # ídem, misión semanal
XP_HITO_MAX = 300         # un hito personal no puede valer más que esto
APERTURA_PRUEBA = 0.9     # la prueba de ascenso se abre al 90 % del rango
BANDAS = ("base", "base", "medio", "medio", "alto", "alto")   # banda de misiones por rango


def indice(letra) -> int:
    try:
        return LETRAS.index((letra or "E").upper())
    except ValueError:
        return 0


def xp_minimo(i: int) -> int:
    """XP (minutos) con la que se entra en el rango i; pasado el S, el tope."""
    return (RANGOS[i].horas if i < len(RANGOS) else TOPE_HORAS) * 60


def umbral_nivel(i: int, k: int) -> int:
    """XP del k-ésimo nivel (0 = el primero) dentro del rango i."""
    r = RANGOS[i]
    n = r.nivel_fin - r.nivel_ini + 1
    ini, fin = xp_minimo(i), xp_minimo(i + 1)
    return ini + round((fin - ini) * (k / n) ** 1.5)


def progreso(xp: int, sellado: int = 0) -> dict:
    """
    Rango y nivel a partir de la XP y del rango más alto CERTIFICADO
    (superando su prueba o convalidado al empezar). Rango efectivo =
    el menor de los dos: hacen falta las horas Y demostrarlo.
    """
    xp = max(0, int(xp or 0))
    sellado = max(0, min(int(sellado or 0), len(RANGOS) - 1))
    i_xp = max(i for i in range(len(RANGOS)) if xp >= xp_minimo(i))
    i = min(i_xp, sellado)
    r = RANGOS[i]
    ini, fin = xp_minimo(i), xp_minimo(i + 1)
    n = r.nivel_fin - r.nivel_ini + 1
    k = 0
    while k + 1 < n and xp >= umbral_nivel(i, k + 1):
        k += 1
    hay_siguiente = i + 1 < len(RANGOS)
    sellada = hay_siguiente and i_xp > i          # XP de sobra, pero falta la prueba
    sig = RANGOS[i + 1] if hay_siguiente else None
    return {
        "xp": xp,
        "level": r.nivel_ini + k,
        "rank": r.letra,
        "title": r.titulo,
        "rank_index": i,
        "level_floor": umbral_nivel(i, k),
        "level_ceil": umbral_nivel(i, k + 1) if k + 1 < n else fin,
        "rank_floor": ini,
        "rank_ceil": fin,
        "rank_progress": round(min(1.0, (xp - ini) / max(1, fin - ini)), 4),
        "next_rank": sig.letra if sig else None,
        "next_title": sig.titulo if sig else None,
        "next_hours": sig.horas if sig else None,
        "sealed": sellada,
        "reserve_xp": max(0, xp - fin) if sellada else 0,
        # la prueba hacia el rango siguiente: abierta si aún no está superada y vas por el 90 %
        "trial_open": hay_siguiente and sellado == i and xp >= ini + APERTURA_PRUEBA * (fin - ini),
    }


# ── Tipo de habilidad ─────────────────────────────────────

def _normalizar(texto: str) -> str:
    t = unicodedata.normalize("NFKD", (texto or "").lower())
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    return " " + " ".join(re.findall(r"[a-z0-9+#]+", t)) + " "


def detectar_categoria(nombre: str, descripcion: str = "") -> str:
    """Música, idioma, programación… por las palabras del nombre (pesan más) y del objetivo."""
    textos = (_normalizar(nombre), _normalizar(descripcion))
    fichas = (set(textos[0].split()), set(textos[1].split()))
    mejor, puntos_max = "general", 0
    for cat, palabras in PALABRAS.items():
        puntos = 0
        for p in palabras:
            for peso, texto, tokens in ((3, textos[0], fichas[0]), (1, textos[1], fichas[1])):
                if p.endswith("*"):
                    raiz = p[:-1]
                    hit = any(t.startswith(raiz) for t in tokens)
                else:
                    hit = f" {p} " in texto
                if hit:
                    puntos += peso
                    break
        if puntos > puntos_max:
            mejor, puntos_max = cat, puntos
    return mejor


def categoria_de(skill) -> str:
    return skill.category if skill.category in CATEGORIAS else detectar_categoria(skill.name, skill.description or "")


def etiqueta(categoria: str) -> str:
    return CATEGORIAS.get(categoria, CATEGORIAS["general"])


# ── Planes ────────────────────────────────────────────────

def _sustituir(obj, nombre):
    if isinstance(obj, str):
        return obj.replace("{h}", nombre)
    if isinstance(obj, list):
        return [_sustituir(x, nombre) for x in obj]
    if isinstance(obj, dict):
        return {k: _sustituir(v, nombre) for k, v in obj.items()}
    return obj


@lru_cache(maxsize=256)
def plantilla(categoria: str, nombre: str) -> dict:
    """El plan preparado a mano para ese tipo, con el nombre de la habilidad dentro. NO modificar."""
    base = PLANTILLAS.get(categoria) or PLANTILLAS["general"]
    return _sustituir(base, (nombre or "").strip() or "tu habilidad")


def plan_de(skill) -> dict:
    """El plan con el que trabaja el Sistema: el hecho a medida si existe; si no, el de su tipo."""
    fila = skill.plan
    if fila is not None and fila.content:
        try:
            return json.loads(fila.content)
        except ValueError:
            pass
    return plantilla(categoria_de(skill), skill.name)


def _aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def info_plan(skill, ahora=None) -> dict:
    ahora = ahora or datetime.now(timezone.utc)
    fila = skill.plan
    pedido = _aware(fila.requested_at) if fila is not None else None
    generando = bool(fila is not None and fila.status == "generando" and pedido
                     and ahora - pedido < timedelta(minutes=5))
    return {
        "source": "ia" if fila is not None and fila.content else "plantilla",
        "generating": generando,
        # falló la IA, o se quedó a medias (p. ej. el servidor se reinició mientras la esperaba)
        "failed": bool(fila is not None and not generando and fila.status in ("error", "generando")),
        "category": categoria_de(skill),
        "category_label": etiqueta(categoria_de(skill)),
    }


# ── Validación (de los planes de la IA y, en las pruebas, de las plantillas) ──

def _texto(v, minimo, maximo):
    if not isinstance(v, str):
        raise ValueError("se esperaba texto")
    v = " ".join(v.split())
    if len(v) < minimo:
        raise ValueError(f"texto demasiado corto: {v!r}")
    return v if len(v) <= maximo else v[: maximo - 1].rstrip() + "…"


def _mision(d, min_min, max_min):
    if not isinstance(d, dict):
        raise ValueError("misión mal formada")
    try:
        minutos = int(d.get("minutos"))
    except (TypeError, ValueError):
        raise ValueError("misión sin minutos")
    return {"titulo": _texto(d.get("titulo"), 3, 70),
            "detalle": _texto(d.get("detalle"), 20, 600),
            "minutos": max(min_min, min(max_min, minutos))}


def validar_plan(plan) -> dict:
    """Devuelve el plan limpio o lanza ValueError si le falta algo."""
    if not isinstance(plan, dict):
        raise ValueError("el plan no es un objeto")
    comp = plan.get("competencias")
    if not isinstance(comp, dict):
        raise ValueError("faltan las competencias")
    limpio = {"competencias": {l: _texto(comp.get(l), 8, 240) for l in LETRAS},
              "diarias": {}, "semanales": {}, "pruebas": {}}
    for banda in ("base", "medio", "alto"):
        d = (plan.get("diarias") or {}).get(banda)
        s = (plan.get("semanales") or {}).get(banda)
        if not isinstance(d, list) or not isinstance(s, list):
            raise ValueError(f"faltan misiones de la banda {banda}")
        dd = [_mision(x, 5, 120) for x in d][:8]
        ss = [_mision(x, 15, 600) for x in s][:5]
        if len(dd) < 4 or len(ss) < 2:
            raise ValueError(f"pocas misiones en la banda {banda}")
        if len({m["titulo"] for m in dd}) < len(dd) or len({m["titulo"] for m in ss}) < len(ss):
            raise ValueError(f"misiones repetidas en la banda {banda}")
        limpio["diarias"][banda], limpio["semanales"][banda] = dd, ss
    for l in LETRAS[1:]:
        p = (plan.get("pruebas") or {}).get(l)
        if not isinstance(p, dict):
            raise ValueError(f"falta la prueba del rango {l}")
        crit = p.get("criterios")
        if not isinstance(crit, list) or not 2 <= len(crit) <= 5:
            raise ValueError(f"la prueba del rango {l} necesita de 2 a 5 criterios")
        limpio["pruebas"][l] = {"titulo": _texto(p.get("titulo"), 3, 80),
                                "criterios": [_texto(c, 8, 220) for c in crit]}
    return limpio


# ── Plan a medida con IA ──────────────────────────────────

def ia_disponible() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)


SISTEMA_IA = """Eres un entrenador de élite en aprendizaje y práctica deliberada (Ericsson, Dreyfus, Kaufman). \
Diseñas el plan de misiones con el que una persona va a alcanzar la maestría REAL en una habilidad concreta, \
de novato a maestro. Escribes en español de España, claro y directo, tuteando, sin emojis.

Misiones diarias:
- Cada una es UNA sesión de práctica deliberada que se puede hacer a solas en los minutos indicados, sin comprar \
nada especial más allá de lo básico de la habilidad.
- Concreta y comprobable: qué hacer exactamente, con cifras (repeticiones, tempos, páginas, palabras, minutos), y \
una última frase que empiece por «Hecho cuando…» con un criterio objetivo.
- Al borde del nivel de su banda: ni trivial ni imposible.
- Variadas dentro de cada banda: técnica, fundamentos aplicados, situación real, grabarse o medirse para tener \
feedback, crear algo, aprender de un referente, repasar errores.
- Prohibidas las misiones vagas («practica un rato», «mejora tu técnica»). Títulos de 2 a 6 palabras, sin repetir.

Bandas: «base» = rangos E y D; «medio» = rangos C y B; «alto» = rangos A y S.

Misiones semanales: retos mayores (de 60 a 240 minutos en total en la semana) con un resultado tangible: algo \
terminado, grabado, enseñado, presentado o evaluado por otra persona. También terminan con «Hecho cuando…».

Pruebas de ascenso (rangos D, C, B, A y S): un título corto y 3 criterios objetivos y verificables que demuestran \
ese rango en la vida real. Usa referencias reales del ámbito cuando existan (niveles MCER y exámenes oficiales, \
grados o cinturones, Elo, tempos, marcas, competiciones, publicaciones, encargos, clientes). Exigentes y honestas: \
el rango solo vale si es verdad. Redáctalas en segunda persona del presente («Tocas…», «Has publicado…»).

Competencias: lo que alguien de cada rango SABE HACER en esta habilidad concreta, en una frase observable."""


def _esquema() -> dict:
    mision = {"type": "object", "properties": {
        "titulo": {"type": "string"}, "detalle": {"type": "string"}, "minutos": {"type": "integer"}},
        "required": ["titulo", "detalle", "minutos"]}

    def bandas(n):
        return {"type": "object", "required": ["base", "medio", "alto"], "properties": {
            b: {"type": "array", "items": mision, "minItems": n, "maxItems": n} for b in ("base", "medio", "alto")}}

    prueba = {"type": "object", "required": ["titulo", "criterios"], "properties": {
        "titulo": {"type": "string"},
        "criterios": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 3}}}
    return {"type": "object", "required": ["competencias", "diarias", "semanales", "pruebas"], "properties": {
        "competencias": {"type": "object", "required": list(LETRAS),
                         "properties": {l: {"type": "string"} for l in LETRAS}},
        "diarias": bandas(6),
        "semanales": bandas(3),
        "pruebas": {"type": "object", "required": list(LETRAS[1:]),
                    "properties": {l: prueba for l in LETRAS[1:]}},
    }}


def generar_plan_ia(nombre: str, objetivo: str, categoria: str, minutos_dia: int, rango_inicio: str) -> dict:
    """Pide el plan a la IA y lo devuelve validado. Lanza excepción si algo falla."""
    import anthropic
    cliente = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=150.0, max_retries=1)
    tope = max(20, min(90, (minutos_dia or 15) * 2))
    r = RANGOS[indice(rango_inicio)]
    escala = " · ".join(f"{x.letra} {x.titulo} {x.horas:,} h".replace(",", ".") for x in RANGOS)
    peticion = (
        f"Habilidad: {nombre}\n"
        f"Lo que quiere conseguir: {objetivo.strip() or '(no lo ha dicho)'}\n"
        f"Tipo de habilidad (orientativo): {etiqueta(categoria)}\n"
        f"Tiempo diario que le dedica: {minutos_dia or 15} minutos\n"
        f"Rango de partida: {r.letra} ({r.titulo})\n\n"
        f"Escala de rangos del Sistema (horas de práctica de referencia): {escala}.\n\n"
        "Diseña el plan completo para ESTA habilidad y guárdalo con la herramienta guardar_plan: las 6 "
        "competencias (E a S), 6 misiones diarias por banda (entre 10 y "
        f"{tope} minutos cada una), 3 misiones semanales por banda y las 5 pruebas de ascenso."
    )
    msg = cliente.messages.create(
        model=settings.AI_MODELO,
        max_tokens=8000,
        system=SISTEMA_IA,
        tools=[{"name": "guardar_plan", "description": "Guarda el plan de misiones de la habilidad.",
                "input_schema": _esquema()}],
        tool_choice={"type": "tool", "name": "guardar_plan"},
        messages=[{"role": "user", "content": peticion}],
    )
    for bloque in msg.content:
        if getattr(bloque, "type", "") == "tool_use":
            return validar_plan(bloque.input)
    raise ValueError("la IA no devolvió ningún plan")


def preparar_plan(skill_id: int, user_id: str) -> None:
    """
    Tarea en segundo plano: pide el plan a la IA y lo guarda. Si falla, la
    habilidad sigue con el plan de su tipo (o con el anterior, si lo había).
    """
    from app import models
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        s = (db.query(models.Skill)
             .filter(models.Skill.id == skill_id, models.Skill.user_id == user_id).first())
        if s is None or s.plan is None:
            return
        fila = s.plan
        try:
            plan = generar_plan_ia(s.name, s.description or "", categoria_de(s),
                                   s.daily_minutes or 15, s.placed_rank or "E")
            fila.content = json.dumps(plan, ensure_ascii=False)
            fila.model = settings.AI_MODELO
            fila.status = "lista"
            fila.error = None
        except Exception as e:                  # noqa: BLE001 — se registra y se sigue con la plantilla
            logger.warning("No se pudo preparar el plan con IA de la habilidad %s: %s", skill_id, e)
            fila.status = "error"
            fila.error = str(e)[:300] or e.__class__.__name__
        db.commit()
    finally:
        db.close()
