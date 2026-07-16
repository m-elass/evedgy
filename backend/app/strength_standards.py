"""
strength_standards.py
─────────────────────
Los estándares de fuerza que sostienen el sistema de rangos.

Basados en datos verificados de la industria (StrengthLevel, ExRx, Legion,
Jeff Nippard), expresados como RATIO peso-levantado / peso-corporal del 1RM,
diferenciados por sexo. Es el método estándar: compara tu fuerza relativa, no
absoluta, así un lifter de 60kg y otro de 110kg se miden con justicia.

Niveles del estándar (5) -> insignias del juego (7, desdoblando extremos):
  por debajo de principiante  -> Hierro
  principiante                -> Bronce
  novato                      -> Plata
  intermedio                  -> Oro
  avanzado                    -> Platino
  elite                       -> Diamante
  muy por encima de elite     -> Maestro

Los multiplicadores son por ejercicio. Para ejercicios sin tabla propia,
usamos una familia aproximada (empuje, tirón, pierna) como respaldo razonable.
"""

# Umbrales de ratio (1RM / peso corporal) para alcanzar cada nivel del estándar.
# [principiante, novato, intermedio, avanzado, elite]
# Hombres
_MALE = {
    "bench":    [0.50, 0.75, 1.25, 1.75, 2.00],   # press banca
    "squat":    [0.75, 1.25, 1.50, 2.25, 2.75],   # sentadilla
    "deadlift": [1.00, 1.50, 2.00, 2.50, 3.00],   # peso muerto
    "ohp":      [0.35, 0.55, 0.80, 1.10, 1.40],   # press militar
    "row":      [0.50, 0.75, 1.00, 1.50, 1.75],   # remo
    "pull":     [0.20, 0.50, 0.90, 1.30, 1.60],   # dominadas (lastre rel. al peso)
}
# Mujeres (multiplicadores menores en tren superior, cercanos en inferior)
_FEMALE = {
    "bench":    [0.25, 0.50, 0.75, 1.00, 1.50],
    "squat":    [0.50, 0.75, 1.25, 1.75, 2.25],
    "deadlift": [0.50, 1.00, 1.25, 1.75, 2.50],
    "ohp":      [0.20, 0.35, 0.50, 0.75, 1.00],
    "row":      [0.30, 0.50, 0.70, 1.00, 1.40],
    "pull":     [0.10, 0.30, 0.60, 0.90, 1.20],
}

# Palabras clave para adivinar a qué tabla pertenece un ejercicio por su nombre.
_KEYWORDS = {
    "bench":    ["banca", "bench", "press de pecho", "pecho"],
    "squat":    ["sentadilla", "squat", "cuadriceps", "pierna"],
    "deadlift": ["muerto", "deadlift", "peso muerto"],
    "ohp":      ["militar", "ohp", "hombro", "overhead", "press hombro"],
    "row":      ["remo", "row", "espalda"],
    "pull":     ["dominada", "pull", "pullup", "jalon"],
}

# Las siete insignias, de menor a mayor. Cada una con su color para el frontend.
BADGES = [
    {"id": "hierro",   "name": "Hierro",   "color": "#6E7B8B"},
    {"id": "bronce",   "name": "Bronce",   "color": "#A9743B"},
    {"id": "plata",    "name": "Plata",    "color": "#9FB2C4"},
    {"id": "oro",      "name": "Oro",      "color": "#E8B84B"},
    {"id": "platino",  "name": "Platino",  "color": "#5FD6C4"},
    {"id": "diamante", "name": "Diamante", "color": "#7FB2F0"},
    {"id": "maestro",  "name": "Maestro",  "color": "#C77DFF"},
]


def _table_for(exercise_name: str, sex: str):
    """Elige la tabla de ratios según el nombre del ejercicio y el sexo."""
    tables = _FEMALE if sex == "f" else _MALE
    low = exercise_name.lower()
    for key, words in _KEYWORDS.items():
        if any(w in low for w in words):
            return tables[key]
    # Respaldo: si no reconocemos el ejercicio, usamos 'bench' como escala media.
    return tables["bench"]


def estimate_1rm(weight: float, reps: int) -> float:
    """1RM estimado con la fórmula de Epley (la misma que usamos en records)."""
    if reps <= 1:
        return weight
    return weight * (1 + reps / 30)


def rank_for(best_1rm: float, bodyweight: float, exercise_name: str, sex: str):
    """
    Devuelve la insignia actual y el progreso hacia la siguiente.
    - best_1rm: tu mejor 1RM estimado en el ejercicio.
    - bodyweight: tu peso corporal (necesario para el ratio).
    - exercise_name: para elegir la tabla.
    - sex: 'm' o 'f'.
    """
    if not bodyweight or bodyweight <= 0:
        return {"badge": None, "reason": "Falta tu peso corporal para calcular rangos."}

    ratio = best_1rm / bodyweight
    thresholds = _table_for(exercise_name, sex)  # 5 umbrales

    # Determinar el índice de insignia (0=Hierro ... 6=Maestro)
    # thresholds marca el inicio de Bronce(0), Plata(1), Oro(2), Platino(3), Diamante(4).
    badge_idx = 0  # Hierro por defecto
    for i, t in enumerate(thresholds):
        if ratio >= t:
            badge_idx = i + 1   # superar umbral i sube a la insignia i+1
    badge_idx = min(badge_idx, 6)  # tope: Maestro

    badge = BADGES[badge_idx]

    # ── Tramo de ratio que ocupa el rango ACTUAL [rank_start, rank_end) ──
    # Para los rangos centrales, el tramo va de un umbral al siguiente.
    # Hierro (idx 0): de 0 hasta el primer umbral.
    # Maestro (idx 6): desde el último umbral hacia arriba (tramo abierto: le damos
    #   un ancho igual al del rango anterior para poder mostrar subdivisiones).
    if badge_idx == 0:
        rank_start, rank_end = 0.0, thresholds[0]
    elif badge_idx <= 4:
        rank_start = thresholds[badge_idx - 1]
        rank_end = thresholds[badge_idx]
    elif badge_idx == 5:  # Diamante: del último umbral (elite) en adelante
        rank_start = thresholds[4]
        # ancho del tramo Diamante: el mismo que el de Platino, como referencia
        rank_end = thresholds[4] + (thresholds[4] - thresholds[3])
    else:  # Maestro (idx 6): tramo abierto a partir de donde "acabaría" Diamante
        prev_end = thresholds[4] + (thresholds[4] - thresholds[3])
        rank_start = prev_end
        rank_end = prev_end + (thresholds[4] - thresholds[3])

    # ── Subdivisión III / II / I dentro del tramo del rango ──
    # Dividimos el tramo en tres tercios. III = primer tercio (más bajo), I = último.
    span = max(rank_end - rank_start, 1e-6)
    frac = max(0.0, min(0.999, (ratio - rank_start) / span))   # posición dentro del rango (0..1)
    tier_idx = int(frac * 3)                                   # 0,1,2
    tier_idx = min(tier_idx, 2)
    TIER_LABELS = ["III", "II", "I"]                           # 0→III (bajo), 2→I (alto)
    tier = TIER_LABELS[tier_idx]

    # Inicio y fin del tercio actual, para la barra y el objetivo
    tier_start = rank_start + span * (tier_idx / 3)
    tier_end = rank_start + span * ((tier_idx + 1) / 3)
    progress = max(0.0, min(1.0, (ratio - tier_start) / (tier_end - tier_start)))

    # ── ¿Cuál es el siguiente escalón? (siguiente subdivisión, o siguiente rango) ──
    if tier_idx < 2:
        # siguiente subdivisión dentro del mismo rango
        next_badge = badge
        next_tier = TIER_LABELS[tier_idx + 1]
        target_ratio = tier_end
    elif badge_idx < 6:
        # saltamos al siguiente rango, subdivisión III
        next_badge = BADGES[badge_idx + 1]
        next_tier = "III"
        target_ratio = rank_end
    else:
        # Maestro I: tope máximo
        next_badge = None
        next_tier = None
        target_ratio = None
        progress = 1.0

    return {
        "badge": badge,
        "tier": tier,                       # subdivisión actual: "III"/"II"/"I"
        "next_badge": next_badge,
        "next_tier": next_tier,             # subdivisión a la que se asciende
        "ratio": round(ratio, 2),
        "progress": round(progress, 2),
        "target_weight": round(target_ratio * bodyweight, 1) if target_ratio else None,
    }
