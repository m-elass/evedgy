"""
muscles.py — LA BASE DE CONOCIMIENTO MUSCULAR
─────────────────────────────────────────────
Antes: un puñado de palabras clave genéricas ("pecho", "espalda") que
fallaban en cuanto el nombre engañaba ("jalón al pecho" ¡es espalda!).

Ahora, dos niveles de rigor:

1. MÚSCULOS FINOS: anatomía específica de verdad. No "pecho": pectoral
   mayor superior/medio/inferior. No "hombros": deltoides anterior,
   lateral y posterior. Braquial y braquiorradial además del bíceps,
   sóleo además del gastrocnemio, erectores, romboides, redondo mayor...
   Cada músculo fino pertenece a una REGIÓN (los 16 grupos del cuerpo
   dibujable) para el mapa anatómico y las agregaciones.

2. BASE DE EJERCICIOS: ~60 patrones de ejercicios reales en español
   (con sinónimos), cada uno con sus músculos finos primarios y
   secundarios correctos. Se evalúan EN ORDEN: los patrones específicos
   ganan a los genéricos, así "jalón al pecho" cae en la regla del jalón
   (dorsal) y jamás en la palabra suelta "pecho".
"""

import re
import unicodedata

# ── Regiones (el cuerpo dibujable) ─────────────────────────────────────
COARSE = {
    "pecho": "Pecho", "hombros": "Hombros", "biceps": "Bíceps",
    "triceps": "Tríceps", "antebrazo": "Antebrazos", "abdomen": "Abdomen",
    "oblicuos": "Oblicuos", "cuadriceps": "Cuádriceps", "femoral": "Femorales",
    "gluteos": "Glúteos", "gemelos": "Gemelos", "trapecio": "Trapecio",
    "dorsal": "Espalda alta", "lumbar": "Lumbares",
    "aductores": "Aductores", "abductores": "Abductores",
}

# ── Músculos FINOS: id -> (nombre, región) ─────────────────────────────
FINE = {
    "pec_sup":      ("Pectoral mayor (porción superior)", "pecho"),
    "pec_med":      ("Pectoral mayor (porción media)", "pecho"),
    "pec_inf":      ("Pectoral mayor (porción inferior)", "pecho"),
    "pec_menor":    ("Pectoral menor", "pecho"),
    "delt_ant":     ("Deltoides anterior", "hombros"),
    "delt_lat":     ("Deltoides lateral", "hombros"),
    "delt_post":    ("Deltoides posterior", "hombros"),
    "manguito":     ("Manguito rotador", "hombros"),
    "biceps_braq":  ("Bíceps braquial", "biceps"),
    "braquial":     ("Braquial", "biceps"),
    "braquiorr":    ("Braquiorradial", "antebrazo"),
    "flex_ante":    ("Flexores del antebrazo", "antebrazo"),
    "ext_ante":     ("Extensores del antebrazo", "antebrazo"),
    "tri_larga":    ("Tríceps (cabeza larga)", "triceps"),
    "tri_lat":      ("Tríceps (cabezas lateral y medial)", "triceps"),
    "dorsal_ancho": ("Dorsal ancho", "dorsal"),
    "redondo_mayor":("Redondo mayor", "dorsal"),
    "romboides":    ("Romboides", "dorsal"),
    "trap_sup":     ("Trapecio superior", "trapecio"),
    "trap_med":     ("Trapecio medio e inferior", "trapecio"),
    "erectores":    ("Erectores espinales", "lumbar"),
    "recto_abd":    ("Recto abdominal", "abdomen"),
    "oblicuos_abd": ("Oblicuos", "oblicuos"),
    "serrato":      ("Serrato anterior", "oblicuos"),
    "psoas":        ("Flexores de cadera (psoas)", "cuadriceps"),
    "recto_fem":    ("Recto femoral", "cuadriceps"),
    "vastos":       ("Vastos del cuádriceps", "cuadriceps"),
    "isquios":      ("Isquiosurales", "femoral"),
    "gluteo_mayor": ("Glúteo mayor", "gluteos"),
    "gluteo_medio": ("Glúteo medio", "abductores"),
    "aductores_m":  ("Aductores", "aductores"),
    "gastro":       ("Gastrocnemio (gemelos)", "gemelos"),
    "soleo":        ("Sóleo", "gemelos"),
}

# Compatibilidad: catálogo id->nombre que ya usa el frontend
MUSCLES = {mid: datos[0] for mid, datos in FINE.items()}
FINE_COARSE = {mid: datos[1] for mid, datos in FINE.items()}
LEGACY_IDS = set(COARSE.keys()) - {"aductores", "abductores"}  # los 14 antiguos


def to_coarse(fine_ids):
    """Convierte músculos finos a regiones del cuerpo (sin duplicados)."""
    out = []
    for f in fine_ids:
        c = FINE_COARSE.get(f) or (f if f in COARSE else None)
        if c and c not in out:
            out.append(c)
    return out


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


# ── LA BASE DE EJERCICIOS ──────────────────────────────────────────────
# (patrón_regex, primarios, secundarios) — EL ORDEN IMPORTA: lo específico
# va antes que lo genérico.
KB = [
    # ═ Espalda (antes que nada: "jalón AL PECHO" es espalda) ═
    (r"dominada|pull.?up|chin.?up",
     ["dorsal_ancho", "biceps_braq"], ["redondo_mayor", "romboides", "trap_med", "braquial"]),
    (r"jalon|pull.?down|polea al pecho|tras ?nuca",
     ["dorsal_ancho"], ["biceps_braq", "redondo_mayor", "trap_med", "romboides"]),
    (r"remo al menton|remo vertical|upright",
     ["delt_lat", "trap_sup"], ["biceps_braq", "delt_ant"]),
    (r"remo gironda|remo (en |con )?polea|remo sentado|remo bajo",
     ["dorsal_ancho", "romboides", "trap_med"], ["biceps_braq", "delt_post", "erectores"]),
    (r"remo (con |en )?(barra|pendlay)|remo inclinado",
     ["dorsal_ancho", "romboides", "trap_med"], ["erectores", "biceps_braq", "delt_post"]),
    (r"remo (con |a )?(una )?man(o|cuerna)|serrucho",
     ["dorsal_ancho", "romboides"], ["biceps_braq", "delt_post", "trap_med"]),
    (r"remo en maquina|remo t|barra t",
     ["dorsal_ancho", "romboides", "trap_med"], ["biceps_braq", "delt_post"]),
    (r"pull.?over",
     ["dorsal_ancho", "pec_med"], ["tri_larga", "serrato"]),
    (r"encogimiento|shrug",
     ["trap_sup"], ["trap_med"]),
    (r"face ?pull|jalon a la cara",
     ["delt_post", "trap_med"], ["manguito", "romboides"]),
    (r"pajaro|reverse ?fly|apertura(s)? invertida|deltoide posterior|posteriores",
     ["delt_post"], ["romboides", "trap_med"]),
    # ═ Cadena posterior / peso muerto ═
    (r"buenos dias|good ?morning|hiperextension|extension lumbar",
     ["erectores", "isquios"], ["gluteo_mayor"]),
    (r"(peso )?muerto rumano|rumano|rdl",
     ["isquios", "gluteo_mayor"], ["erectores", "flex_ante"]),
    (r"(peso )?muerto sumo",
     ["gluteo_mayor", "aductores_m", "vastos"], ["isquios", "erectores", "trap_sup"]),
    (r"peso muerto|deadlift",
     ["isquios", "gluteo_mayor", "erectores"], ["dorsal_ancho", "trap_sup", "flex_ante", "vastos"]),
    # ═ Pecho ═
    (r"(press|apertura|cruce|fly).{0,20}inclinad|inclinad.{0,15}(press|apertura|mancuerna)",
     ["pec_sup", "delt_ant"], ["tri_lat", "pec_med"]),
    (r"(press|apertura|cruce).{0,20}declinad|declinad",
     ["pec_inf"], ["pec_med", "tri_lat"]),
    (r"press (de )?banca|press plano|press (de )?pecho|press (con )?mancuernas",
     ["pec_med"], ["delt_ant", "tri_lat", "pec_inf"]),
    (r"apertura|fly|flie|cruce|cross ?over|contractor|pec ?deck",
     ["pec_med"], ["pec_sup", "delt_ant"]),
    (r"fondos (en |de )?(paralelas)?|dips",
     ["pec_inf", "tri_lat"], ["delt_ant", "pec_med"]),
    (r"flexion|push.?up|lagartija",
     ["pec_med"], ["tri_lat", "delt_ant", "recto_abd"]),
    # ═ Hombro ═
    (r"press militar|press (de )?hombro|overhead|ohp|press arnold|press tras nuca",
     ["delt_ant", "delt_lat"], ["tri_lat", "trap_sup", "serrato"]),
    (r"elevacion(es)? lateral|lateral raise",
     ["delt_lat"], ["trap_sup"]),
    (r"elevacion(es)? frontal|front raise",
     ["delt_ant"], ["pec_sup"]),
    # ═ Brazo ═
    (r"curl martillo|hammer",
     ["braquial", "braquiorr"], ["biceps_braq"]),
    (r"curl inverso|curl (con )?agarre prono",
     ["braquiorr", "ext_ante"], ["braquial"]),
    (r"curl.{0,25}(biceps|barra|alterno|predicador|concentrad|scott|polea|araña|bayesian|banco)|curl$|^curl ",
     ["biceps_braq"], ["braquial", "flex_ante"]),
    (r"press frances|frances|skull|rompecraneos|extension.{0,20}(sobre|tras|encima).{0,10}cabeza|copa|katana",
     ["tri_larga"], ["tri_lat"]),
    (r"(jalon|extension|empuje).{0,15}triceps|push.?down|triceps en polea|patada de triceps|kick.?back",
     ["tri_lat"], ["tri_larga"]),
    (r"fondos entre bancos",
     ["tri_lat"], ["pec_inf", "delt_ant"]),
    (r"press (con )?agarre cerrado|press cerrado",
     ["tri_lat", "tri_larga"], ["pec_med", "delt_ant"]),
    # ═ Pierna ═
    (r"sentadilla frontal|front squat",
     ["vastos", "recto_fem"], ["gluteo_mayor", "erectores", "recto_abd"]),
    (r"bulgara|zancada|lunge|split squat|subida al cajon|step ?up|tijera",
     ["vastos", "gluteo_mayor"], ["isquios", "gluteo_medio", "aductores_m"]),
    (r"sentadilla|squat|hack",
     ["vastos", "gluteo_mayor"], ["recto_fem", "isquios", "erectores", "aductores_m"]),
    (r"prensa|leg ?press",
     ["vastos", "gluteo_mayor"], ["isquios", "aductores_m"]),
    (r"extension(es)? de (cuadriceps|pierna|rodilla)|leg extension",
     ["vastos", "recto_fem"], []),
    (r"curl femoral|curl de pierna|leg curl|femoral (tumbado|sentado)",
     ["isquios"], ["gastro"]),
    (r"hip ?thrust|puente de gluteo|empuje de cadera|elevacion de cadera",
     ["gluteo_mayor"], ["isquios"]),
    (r"patada de gluteo|gluteo en polea|kickback de gluteo",
     ["gluteo_mayor"], ["isquios"]),
    (r"abduccion|abductor",
     ["gluteo_medio"], ["gluteo_mayor"]),
    (r"aduccion|aductor",
     ["aductores_m"], []),
    (r"gemelo(s)? sentado|soleo|calf sentado",
     ["soleo"], ["gastro"]),
    (r"gemelo|pantorrilla|calf|elevacion de talon",
     ["gastro"], ["soleo"]),
    # ═ Core ═
    (r"plancha lateral|side plank",
     ["oblicuos_abd"], ["recto_abd", "gluteo_medio"]),
    (r"plancha|plank",
     ["recto_abd"], ["oblicuos_abd", "erectores"]),
    (r"rueda|ab ?wheel|rollout",
     ["recto_abd"], ["dorsal_ancho", "serrato"]),
    (r"giro ruso|russian|lenador|woodchop|rotacion|pallof",
     ["oblicuos_abd"], ["recto_abd"]),
    (r"elevacion(es)? de piernas|leg raise",
     ["recto_abd", "psoas"], ["oblicuos_abd"]),
    (r"crunch|abdominal|encogimiento abdominal|sit.?up",
     ["recto_abd"], ["oblicuos_abd"]),
    # ═ Otros ═
    (r"farmer|paseo del granjero|caminata del granjero",
     ["flex_ante", "trap_sup"], ["erectores", "recto_abd"]),
    (r"curl de muñeca|flexion de muñeca",
     ["flex_ante"], []),
    (r"extension de muñeca",
     ["ext_ante"], []),
]

# Último recurso si NINGÚN patrón coincidió (palabra suelta genérica)
FALLBACK = [
    (r"pech", ["pec_med"], ["delt_ant", "tri_lat"]),
    (r"espalda|dorsal", ["dorsal_ancho"], ["biceps_braq", "romboides"]),
    (r"hombro|deltoide", ["delt_lat"], ["delt_ant"]),
    (r"bicep", ["biceps_braq"], ["braquial"]),
    (r"tricep", ["tri_lat"], ["tri_larga"]),
    (r"cuadricep|pierna", ["vastos"], ["gluteo_mayor"]),
    (r"femoral|isquio", ["isquios"], ["gluteo_mayor"]),
    (r"gluteo", ["gluteo_mayor"], ["isquios"]),
    (r"trapecio", ["trap_sup"], ["trap_med"]),
    (r"lumbar", ["erectores"], []),
    (r"antebrazo", ["flex_ante"], ["braquiorr"]),
    (r"core|abdomen", ["recto_abd"], ["oblicuos_abd"]),
]


def detect_muscles(name: str):
    """Devuelve (primarios, secundarios) en músculos FINOS para un nombre."""
    n = _norm(name or "")
    for pattern, primary, secondary in KB:
        if re.search(pattern, n):
            return list(primary), list(secondary)
    for pattern, primary, secondary in FALLBACK:
        if re.search(pattern, n):
            return list(primary), list(secondary)
    return [], []
