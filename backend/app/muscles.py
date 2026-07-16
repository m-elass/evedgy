"""
muscles.py
──────────
El catálogo de grupos musculares y la lógica que adivina, por el nombre de un
ejercicio, qué músculos trabaja (primarios y secundarios). Alimenta el diagrama
anatómico del frontend, que ilumina esos músculos en el cuerpo.

Los ids de músculo coinciden con las zonas dibujadas en el SVG del frontend, así
que deben mantenerse sincronizados (ver components/BodyMap.jsx).
"""

# Catálogo: id -> nombre legible. Cubre los grupos principales del cuerpo.
MUSCLES = {
    "pecho":       "Pecho",
    "hombros":     "Hombros",
    "biceps":      "Bíceps",
    "triceps":     "Tríceps",
    "antebrazo":   "Antebrazos",
    "abdomen":     "Abdomen",
    "oblicuos":    "Oblicuos",
    "cuadriceps":  "Cuádriceps",
    "femoral":     "Femorales",
    "gluteos":     "Glúteos",
    "gemelos":     "Gemelos",
    "trapecio":    "Trapecio",
    "dorsal":      "Dorsales",
    "lumbar":      "Lumbares",
}

# Patrones: por cada palabra clave en el nombre, qué músculos (primarios, secundarios).
# Se evalúan todos; se acumulan los que coincidan.
_PATTERNS = [
    (["banca", "bench", "press de pecho", "pecho", "fondos", "dip"],
        ["pecho"], ["triceps", "hombros"]),
    (["militar", "ohp", "press hombro", "overhead", "press de hombro", "elevacion"],
        ["hombros"], ["triceps", "trapecio"]),
    (["sentadilla", "squat", "prensa", "zancada", "lunge"],
        ["cuadriceps", "gluteos"], ["femoral", "lumbar"]),
    (["muerto", "deadlift", "hip thrust", "puente"],
        ["femoral", "gluteos", "lumbar"], ["dorsal", "trapecio"]),
    (["remo", "row", "jalon", "pull", "dominada", "pullup"],
        ["dorsal"], ["biceps", "trapecio"]),
    (["curl", "biceps"],
        ["biceps"], ["antebrazo"]),
    (["extension triceps", "triceps", "press frances", "patada"],
        ["triceps"], []),
    (["abdomen", "crunch", "plancha", "abdominal", "elevacion piernas"],
        ["abdomen"], ["oblicuos"]),
    (["oblicuo", "russian twist", "giro"],
        ["oblicuos"], ["abdomen"]),
    (["gemelo", "calf", "pantorrilla"],
        ["gemelos"], []),
    (["femoral", "curl femoral", "peso muerto rumano", "rumano"],
        ["femoral"], ["gluteos"]),
    (["trapecio", "encogimiento", "shrug"],
        ["trapecio"], ["hombros"]),
]


def detect_muscles(exercise_name: str):
    """
    Devuelve (primarios, secundarios) como listas de ids, adivinados del nombre.
    Si no reconoce nada, devuelve listas vacías (el usuario podrá asignarlos a mano).
    """
    low = exercise_name.lower()
    primary, secondary = [], []
    for words, prim, sec in _PATTERNS:
        if any(w in low for w in words):
            for m in prim:
                if m not in primary:
                    primary.append(m)
            for m in sec:
                if m not in secondary:
                    secondary.append(m)
    # un músculo primario no debe figurar también como secundario
    secondary = [m for m in secondary if m not in primary]
    return primary, secondary
