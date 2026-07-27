"""
muscles.py — BASE DE CONOCIMIENTO DE EJERCICIOS Y ANATOMÍA
══════════════════════════════════════════════════════════
Reconoce ejercicios por su nombre en ESPAÑOL o INGLÉS —incluidos los de
nombre propio y los que circulan por redes (katana extension, PJR pullover,
JM press, curl Bayesian, remo Meadows, Kelso shrug, sentadilla cosaca,
Copenhagen, ATG split squat…)— y les asigna los músculos que trabajan con
rigor anatómico.

Cuatro principios:

1. ESPECIFICIDAD DEMOSTRABLE. Se distingue lo que de verdad distingue un
   ejercicio de otro. Ejemplos que este archivo respeta:
     · El pectoral mayor tiene tres porciones y el ángulo del hombro decide
       cuál manda (inclinado → clavicular, declinado → abdominal).
     · La cabeza larga del tríceps es la única que cruza el hombro: por eso
       las extensiones por encima de la cabeza la estiran y la enfatizan.
     · Los isquiosurales son CUATRO músculos, y la cabeza corta del bíceps
       femoral solo cruza la rodilla: los peso muertos NO la entrenan; solo
       la entrenan los curls de rodilla.
     · El curl femoral SENTADO (cadera flexionada) estira los tres isquios
       biarticulares y produce más hipertrofia en ellos que el tumbado.
     · El gastrocnemio cruza la rodilla y el sóleo no: con la rodilla
       flexionada (gemelo sentado) manda el sóleo.
     · El manguito rotador no es un músculo: son cuatro, y las rotaciones
       externas trabajan infraespinoso y redondo menor, no el subescapular.

2. HONESTIDAD. No se inventa precisión donde no la hay: los vastos del
   cuádriceps van juntos porque ningún ejercicio aísla uno, y los dos
   vientres del gastrocnemio se nombran siempre a la vez.

3. EL ORDEN MANDA. Las reglas van de lo más específico a lo más genérico,
   así "jalón al pecho" cae en la regla del jalón (dorsal) y nunca en la
   palabra suelta "pecho"; "press francés" es tríceps y no un press de pecho.

4. MODIFICADORES. Después de identificar el ejercicio, se leen los matices
   del nombre (unilateral, en anillas, en multipower, agarre supino,
   lastrado…) y se ajustan los músculos estabilizadores en consecuencia.
"""

import re
import unicodedata

# ══════════════════════════════════════════════════════════════════
# REGIONES — los grupos que el cuerpo dibujable sabe pintar
# ══════════════════════════════════════════════════════════════════
COARSE = {
    "pecho": "Pecho", "hombros": "Hombros", "hombros_post": "Hombro posterior",
    "biceps": "Bíceps", "triceps": "Tríceps", "antebrazo": "Antebrazos",
    "abdomen": "Abdomen", "oblicuos": "Oblicuos", "cuadriceps": "Cuádriceps",
    "femoral": "Femorales", "gluteos": "Glúteos", "gemelos": "Gemelos",
    "trapecio": "Trapecio", "dorsal": "Espalda alta", "lumbar": "Lumbares",
    "aductores": "Aductores", "abductores": "Abductores", "cuello": "Cuello",
}

# ══════════════════════════════════════════════════════════════════
# MÚSCULOS FINOS — id: (nombre anatómico, región del cuerpo)
# ══════════════════════════════════════════════════════════════════
FINE = {
    # ── Pecho ────────────────────────────────────────────────────
    "pec_sup":      ("Pectoral mayor · porción clavicular (superior)", "pecho"),
    "pec_med":      ("Pectoral mayor · porción esternocostal (media)", "pecho"),
    "pec_inf":      ("Pectoral mayor · porción abdominal (inferior)", "pecho"),
    "pec_menor":    ("Pectoral menor", "pecho"),
    "serrato":      ("Serrato anterior", "oblicuos"),

    # ── Hombro (manguito rotador desglosado en sus cuatro músculos) ──
    "delt_ant":     ("Deltoides anterior", "hombros"),
    "delt_lat":     ("Deltoides lateral (medio)", "hombros"),
    "delt_post":    ("Deltoides posterior", "hombros_post"),
    "supraesp":     ("Supraespinoso", "hombros"),
    "infraesp":     ("Infraespinoso", "hombros_post"),
    "redondo_menor":("Redondo menor", "hombros_post"),
    "subescap":     ("Subescapular", "hombros"),
    "coracobraq":   ("Coracobraquial", "hombros"),

    # ── Brazo: flexores del codo ─────────────────────────────────
    "biceps_largo": ("Bíceps braquial · cabeza larga", "biceps"),
    "biceps_corto": ("Bíceps braquial · cabeza corta", "biceps"),
    "braquial":     ("Braquial anterior", "biceps"),

    # ── Brazo: extensores del codo ───────────────────────────────
    "tri_larga":    ("Tríceps · cabeza larga", "triceps"),
    "tri_lat":      ("Tríceps · cabeza lateral", "triceps"),
    "tri_med":      ("Tríceps · cabeza medial", "triceps"),
    "anconeo":      ("Ancóneo", "triceps"),

    # ── Antebrazo ────────────────────────────────────────────────
    "braquiorr":    ("Braquiorradial", "antebrazo"),
    "flex_ante":    ("Flexores del antebrazo (agarre)", "antebrazo"),
    "ext_ante":     ("Extensores del antebrazo", "antebrazo"),
    "pronador":     ("Pronadores (redondo y cuadrado)", "antebrazo"),
    "supinador":    ("Supinador", "antebrazo"),

    # ── Espalda ──────────────────────────────────────────────────
    "dorsal_ancho": ("Dorsal ancho", "dorsal"),
    "dorsal_inf":   ("Dorsal ancho · fibras inferiores (iliacas)", "dorsal"),
    "redondo_mayor":("Redondo mayor", "dorsal"),
    "romboides":    ("Romboides (mayor y menor)", "dorsal"),
    "trap_sup":     ("Trapecio superior", "trapecio"),
    "trap_med":     ("Trapecio medio", "trapecio"),
    "trap_inf":     ("Trapecio inferior", "trapecio"),
    "elevador":     ("Elevador de la escápula", "trapecio"),

    # ── Zona lumbar y core profundo ──────────────────────────────
    "erectores":    ("Erectores espinales (iliocostal, longísimo y espinoso)", "lumbar"),
    "multifidos":   ("Multífidos", "lumbar"),
    "cuadrado_l":   ("Cuadrado lumbar", "lumbar"),
    "transverso":   ("Transverso del abdomen", "abdomen"),

    # ── Abdomen ──────────────────────────────────────────────────
    "recto_abd":    ("Recto abdominal", "abdomen"),
    "recto_abd_sup":("Recto abdominal · porción superior", "abdomen"),
    "recto_abd_inf":("Recto abdominal · porción inferior", "abdomen"),
    "oblicuo_ext":  ("Oblicuo externo", "oblicuos"),
    "oblicuo_int":  ("Oblicuo interno", "oblicuos"),

    # ── Cadera ───────────────────────────────────────────────────
    "psoas":        ("Psoas ilíaco (flexor de cadera)", "cuadriceps"),
    "sartorio":     ("Sartorio", "cuadriceps"),
    "gluteo_mayor": ("Glúteo mayor", "gluteos"),
    "gluteo_medio": ("Glúteo medio", "abductores"),
    "gluteo_menor": ("Glúteo menor", "abductores"),
    "tfl":          ("Tensor de la fascia lata", "abductores"),
    "rotadores_cad":("Rotadores profundos de cadera (piriforme y compañía)", "gluteos"),

    # ── Muslo anterior ───────────────────────────────────────────
    "recto_fem":    ("Recto femoral", "cuadriceps"),
    "vastos":       ("Vastos del cuádriceps (lateral, medial e intermedio)", "cuadriceps"),

    # ── Aductores ────────────────────────────────────────────────
    "aductor_mayor":("Aductor mayor", "aductores"),
    "aductores_c":  ("Aductores largo y corto, y pectíneo", "aductores"),
    "gracil":       ("Grácil (recto interno)", "aductores"),

    # ── Isquiosurales: los cuatro, uno a uno ─────────────────────
    # La cabeza CORTA del bíceps femoral solo cruza la rodilla: únicamente
    # la entrenan los curls; los peso muertos no llegan a ella.
    "isq_bf_larga": ("Bíceps femoral · cabeza larga", "femoral"),
    "isq_bf_corta": ("Bíceps femoral · cabeza corta (solo cruza la rodilla)", "femoral"),
    "isq_semitend": ("Semitendinoso", "femoral"),
    "isq_semimem":  ("Semimembranoso", "femoral"),

    # ── Pierna baja ──────────────────────────────────────────────
    "gastro_med":   ("Gastrocnemio · vientre medial", "gemelos"),
    "gastro_lat":   ("Gastrocnemio · vientre lateral", "gemelos"),
    "soleo":        ("Sóleo", "gemelos"),
    "tibial_ant":   ("Tibial anterior", "gemelos"),
    "tibial_post":  ("Tibial posterior", "gemelos"),
    "peroneos":     ("Peroneos", "gemelos"),

    # ── Cuello ───────────────────────────────────────────────────
    "ecom":         ("Esternocleidomastoideo", "cuello"),
    "cervical_post":("Extensores cervicales", "cuello"),
}

# Atajos útiles: grupos que casi siempre se nombran juntos
GASTRO = ["gastro_med", "gastro_lat"]
ISQ_BI = ["isq_bf_larga", "isq_semitend", "isq_semimem"]   # los que cruzan la cadera
ISQ_ALL = ISQ_BI + ["isq_bf_corta"]                        # los cuatro
ROT_EXT = ["infraesp", "redondo_menor"]                    # rotadores externos
ADUCT = ["aductor_mayor", "aductores_c", "gracil"]

# Catálogo id -> nombre (lo consume el frontend)
MUSCLES = {mid: d[0] for mid, d in FINE.items()}
FINE_COARSE = {mid: d[1] for mid, d in FINE.items()}


def to_coarse(fine_ids):
    """Convierte músculos finos en regiones del cuerpo (sin duplicados)."""
    out = []
    for f in fine_ids:
        c = FINE_COARSE.get(f) or (f if f in COARSE else None)
        if c and c not in out:
            out.append(c)
    return out


def _norm(s: str) -> str:
    """Minúsculas, sin acentos ni signos: 'Press Francés (barra-Z)' → 'press frances barra z'."""
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[-_/,.;:()\[\]'\"°º]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# ══════════════════════════════════════════════════════════════════
# EL REPERTORIO — cada regla: (patrón, primarios, secundarios)
# SE EVALÚA EN ORDEN: lo específico antes que lo genérico.
# ══════════════════════════════════════════════════════════════════

# ── BLOQUE 1: NOMBRES PROPIOS, EXÓTICOS Y VIRALES ─────────────────
# Primero de todo: su nombre no revela su anatomía y suelen contener
# palabras que despistarían a las reglas generales.
KB_NAMED = [
    # ═══ Tríceps con nombre ═══
    # Katana: extensión en polea sobre la cabeza, gesto de desenvainar.
    (r"\bkatana\b|kitana",
     ["tri_larga"], ["tri_lat", "tri_med", "anconeo"]),
    # PJR pullover (Paul Carter): pullover-extensión; el mejor estímulo en
    # estiramiento para la cabeza larga, con dorsal y pecho asistiendo.
    (r"\bpjr\b|pullover de triceps|triceps pullover",
     ["tri_larga"], ["dorsal_ancho", "pec_med", "tri_lat"]),
    # JM press (JM Blakley): híbrido de press cerrado y skull crusher.
    (r"\bjm press\b|\bjm\b.{0,10}press|press jm",
     ["tri_lat", "tri_med", "tri_larga"], ["pec_med", "delt_ant", "anconeo"]),
    (r"tate press|press tate",
     ["tri_lat", "tri_med"], ["tri_larga", "delt_ant"]),
    (r"california press|press california",
     ["tri_larga", "tri_lat"], ["pec_med", "delt_ant", "tri_med"]),
    (r"skull ?crusher|skullcrusher|rompecraneos|rompe ?craneos|press frances|french press|frances (con|en|de)",
     ["tri_larga"], ["tri_lat", "tri_med", "anconeo"]),
    (r"rolling (triceps )?extension|extension rodante",
     ["tri_larga", "tri_lat"], ["tri_med", "dorsal_ancho"]),
    # ═══ Bíceps con nombre ═══
    # Bayesian (Menno Henselmans): polea baja a la espalda; el brazo queda
    # detrás del tronco y la cabeza larga trabaja en estiramiento profundo.
    (r"bayesian|bayesiano|curl (de )?espaldas a la polea|behind the back cable curl|curl tras el cuerpo",
     ["biceps_largo"], ["biceps_corto", "braquial", "braquiorr"]),
    (r"drag curl|curl arrastrado|curl de arrastre",
     ["biceps_largo"], ["braquial", "delt_post", "biceps_corto"]),
    (r"zottman",
     ["biceps_largo", "biceps_corto", "braquiorr"], ["ext_ante", "braquial", "pronador", "supinador"]),
    (r"waiter curl|curl (del )?camarero|curl copa",
     ["biceps_corto", "biceps_largo"], ["braquial", "supinador"]),
    (r"\b21s?\b|veintiun|21 curl",
     ["biceps_largo", "biceps_corto"], ["braquial", "flex_ante"]),
    (r"curl crucifijo|crucifix curl|curl en cruz",
     ["biceps_corto"], ["biceps_largo", "delt_ant"]),
    # ═══ Espalda con nombre ═══
    # Meadows (John Meadows): landmine unilateral, postura escalonada; la
    # línea de tracción diagonal carga las fibras bajas del dorsal.
    (r"meadows",
     ["dorsal_inf", "dorsal_ancho", "redondo_mayor"], ["trap_med", "delt_post", "flex_ante", "erectores"]),
    (r"\bkroc\b",
     ["dorsal_ancho", "romboides", "trap_med"], ["biceps_largo", "flex_ante", "erectores", "delt_post"]),
    (r"pendlay|remo (con )?parada muerta|dead ?stop row",
     ["dorsal_ancho", "romboides", "trap_med"], ["delt_post", "erectores", "biceps_largo"]),
    # Yates: remo con agarre supino y torso más erguido.
    (r"\byates\b|remo yates",
     ["dorsal_ancho", "dorsal_inf"], ["biceps_largo", "biceps_corto", "trap_med", "romboides", "erectores"]),
    # Kelso: encogimiento inclinado, tracción horizontal de la escápula.
    (r"kelso",
     ["trap_med", "romboides"], ["trap_inf", "elevador", "erectores"]),
    (r"\bhise\b",
     ["trap_sup"], ["erectores", "trap_med"]),
    (r"seal row|remo (de |en )?foca|remo tumbado en banco",
     ["dorsal_ancho", "romboides", "trap_med"], ["delt_post", "biceps_largo"]),
    (r"helms row|remo helms",
     ["dorsal_ancho", "romboides"], ["trap_med", "biceps_largo"]),
    (r"gorilla row|remo gorila",
     ["dorsal_ancho", "romboides"], ["trap_med", "biceps_largo", "erectores"]),
    (r"renegade row|remo renegado",
     ["dorsal_ancho", "romboides"], ["recto_abd", "oblicuo_ext", "delt_ant", "trap_med", "transverso"]),
    (r"remo (a lo )?jay cutler|jay cutler row",
     ["dorsal_ancho", "trap_med"], ["romboides", "biceps_largo", "delt_post"]),
    # ═══ Hombro con nombre ═══
    (r"arnold",
     ["delt_ant", "delt_lat"], ["tri_lat", "trap_sup"] + ROT_EXT),
    (r"bradford",
     ["delt_ant", "delt_lat"], ["trap_sup", "tri_lat", "supraesp"]),
    (r"\bz press\b|press z\b|press sentado en el suelo",
     ["delt_ant", "delt_lat"], ["tri_lat", "recto_abd", "erectores", "transverso"]),
    (r"powell raise|elevacion powell",
     ["delt_post"], ROT_EXT + ["trap_med", "romboides"]),
    (r"cuban (press|rotation)|press cubano|rotacion cubana",
     ["infraesp", "redondo_menor", "delt_post"], ["delt_lat", "trap_med", "supraesp"]),
    (r"\blu raise|lu xiaojun",
     ["delt_lat", "trap_sup"], ["delt_ant", "trap_inf", "supraesp"]),
    (r"viking press",
     ["delt_ant", "delt_lat"], ["tri_lat", "trap_sup", "recto_abd"]),
    (r"klokov press|press klokov",
     ["delt_ant", "delt_lat", "trap_sup"], ["tri_lat", "trap_med", "supraesp"]),
    (r"scott press|press scott",
     ["delt_lat", "delt_ant"], ["trap_sup", "supraesp"]),
    # Elevación lateral "egipcia" o inclinada: el cuerpo se inclina para
    # cargar el deltoides lateral desde más estiramiento.
    (r"elevacion(es)? lateral(es)? (egipcia|inclinad|apoyad)|egyptian (lateral )?raise|lean ?away (lateral )?raise|elevacion lateral tumbad",
     ["delt_lat"], ["supraesp", "trap_sup"]),
    (r"bus driver|volante",
     ["delt_ant"], ["pec_sup", "supinador", "pronador"]),
    (r"\b6 ?way|seis vias|six way raise",
     ["delt_lat", "delt_ant", "delt_post"], ["trap_med", "trap_inf", "supraesp"]),
    (r"bottoms ?up press|press invertido con kettlebell",
     ["delt_ant", "delt_lat"], ["flex_ante", "transverso"] + ROT_EXT),
    # ═══ Pecho con nombre ═══
    (r"larsen press|press larsen",
     ["pec_med"], ["delt_ant", "tri_lat", "pec_inf"]),
    (r"spoto press|press spoto",
     ["pec_med"], ["tri_lat", "tri_med", "delt_ant"]),
    (r"guillotina|guillotine press",
     ["pec_sup", "pec_med"], ["delt_ant", "tri_lat"]),
    (r"svend press",
     ["pec_med"], ["pec_sup", "delt_ant", "serrato"]),
    (r"board press|press (con )?tabla|pin press|press (desde )?pines",
     ["tri_lat", "pec_med"], ["delt_ant", "tri_med"]),
    # ═══ Pierna con nombre ═══
    (r"zercher",
     ["vastos", "gluteo_mayor"], ["erectores", "recto_abd", "trap_med", "biceps_corto", "aductor_mayor"]),
    (r"jefferson curl",
     ["erectores", "multifidos"] , ISQ_BI + ["gluteo_mayor", "trap_med"]),
    (r"jefferson (deadlift|squat|peso muerto)|straddle deadlift",
     ["gluteo_mayor", "vastos"] + ISQ_BI, ["aductor_mayor", "erectores", "cuadrado_l"]),
    (r"cosac|cossack|sentadilla cosaca",
     ADUCT + ["vastos", "gluteo_mayor"], ["gluteo_medio", "isq_bf_larga", "tfl", "sartorio"]),
    # Nordic: curl de rodilla excéntrico; enfatiza cabeza larga y semitendinoso.
    (r"reverse nordic|nordico invertido|nordic invertido",
     ["recto_fem", "vastos"], ["psoas", "recto_abd", "sartorio"]),
    (r"nordic|nordico",
     ["isq_bf_larga", "isq_semitend", "isq_bf_corta"], ["isq_semimem", "gluteo_mayor", "erectores"] + GASTRO),
    (r"razor curl",
     ISQ_ALL, ["gluteo_mayor", "recto_abd"]),
    (r"copenhagen|copenhague",
     ADUCT, ["oblicuo_ext", "oblicuo_int", "recto_abd", "transverso", "cuadrado_l"]),
    (r"\bsissy\b|sentadilla sissy",
     ["recto_fem", "vastos"], ["psoas", "recto_abd"]),
    (r"poliquin (step|subida)|step ?up poliquin|petersen|patrick step|\batg\b|split squat atg",
     ["vastos"], ["gluteo_mayor", "recto_fem"] + GASTRO),
    (r"pistol squat|sentadilla pistola",
     ["vastos", "gluteo_mayor"], ["gluteo_medio", "isq_bf_larga", "recto_abd", "tibial_ant"]),
    (r"skater squat|shrimp squat|sentadilla (patinador|camaron)",
     ["vastos", "gluteo_mayor"], ["gluteo_medio", "recto_abd", "isq_bf_larga"]),
    (r"curtsy|zancada (en )?reverencia",
     ["gluteo_mayor", "gluteo_medio"], ["vastos"] + ADUCT + ["tfl"]),
    (r"\bharop\b|harop curl",
     ["isq_bf_larga", "isq_semitend", "gluteo_mayor"], ["erectores", "isq_semimem"] + GASTRO),
    (r"kang squat",
     ["gluteo_mayor", "erectores"] + ISQ_BI, ["vastos", "multifidos"]),
    (r"anderson squat|sentadilla anderson",
     ["vastos", "gluteo_mayor"], ["erectores", "aductor_mayor", "recto_abd"]),
    (r"frankenstein|zombie squat|sentadilla zombi",
     ["vastos"], ["gluteo_mayor", "erectores", "recto_abd", "trap_sup"]),
    (r"hatfield|sentadilla hatfield",
     ["vastos", "gluteo_mayor"], ["aductor_mayor", "erectores"]),
    (r"steinborn",
     ["vastos", "gluteo_mayor"], ["erectores", "oblicuo_ext", "trap_sup", "cuadrado_l"]),
    (r"reeves deadlift|peso muerto reeves",
     ISQ_BI + ["gluteo_mayor", "erectores"], ["trap_sup", "flex_ante", "delt_post", "romboides"]),
    (r"snatch ?grip deadlift|peso muerto agarre (de )?arrancada",
     ISQ_BI + ["gluteo_mayor", "erectores"], ["trap_sup", "trap_med", "flex_ante", "vastos"]),
    (r"deficit deadlift|peso muerto (con |en )?deficit",
     ISQ_BI + ["gluteo_mayor", "vastos"], ["erectores", "trap_sup", "flex_ante"]),
    (r"block pull|peso muerto (desde )?bloques",
     ["erectores", "trap_sup", "gluteo_mayor"], ISQ_BI + ["flex_ante", "dorsal_ancho"]),
    # ═══ Cuerpo entero con nombre ═══
    (r"turkish get ?up|levantada turca|get ?up turco",
     ["delt_ant", "recto_abd", "oblicuo_ext"], ["gluteo_mayor", "vastos", "tri_lat", "serrato", "transverso"]),
    (r"windmill|molino (con )?(kettlebell|pesa)",
     ["oblicuo_ext", "oblicuo_int"], ["delt_lat", "cuadrado_l"] + ISQ_BI + ["gluteo_medio"]),
    (r"halo (con )?(kettlebell|pesa)?|halos",
     ["delt_ant", "delt_lat"], ROT_EXT + ["trap_sup", "tri_larga"]),
    (r"figure ?8|ocho(s)? con kettlebell",
     ["gluteo_mayor", "oblicuo_ext"], ["vastos", "flex_ante", "erectores"]),
]


# ── BLOQUE 2: ESPALDA (antes que pecho: "jalón AL PECHO" es espalda) ──
KB_BACK = [
    (r"face ?pull|jalon a la cara|tiron a la cara",
     ["delt_post", "trap_med"], ROT_EXT + ["romboides", "trap_inf"]),
    (r"band pull ?apart|apertura(s)? con banda|separacion con banda",
     ["delt_post", "trap_med"], ["romboides", "infraesp", "trap_inf"]),
    (r"remo al menton|remo vertical|upright row|jalon al menton",
     ["delt_lat", "trap_sup"], ["delt_ant", "biceps_largo", "braquial", "supraesp"]),
    (r"pull ?over (con |en )?polea|cable pull ?over",
     ["dorsal_ancho", "dorsal_inf"], ["tri_larga", "pec_med", "redondo_mayor", "serrato"]),
    (r"pull ?over|pullover",
     ["dorsal_ancho"], ["pec_med", "tri_larga", "redondo_mayor", "serrato"]),
    (r"(jalon|pulldown)[a-z ]{0,12}(brazos? )?rect|straight ?arm (pulldown|pull)|pull ?around|jalon de brazo recto",
     ["dorsal_ancho", "dorsal_inf"], ["tri_larga", "redondo_mayor", "trap_inf", "pec_menor"]),
    (r"dominada(s)? (supina|agarre supino)|chin ?up",
     ["dorsal_ancho", "biceps_largo", "biceps_corto"], ["braquial", "redondo_mayor", "romboides", "trap_med", "flex_ante"]),
    (r"dominada(s)? (arquero|archer)|archer pull ?up",
     ["dorsal_ancho", "redondo_mayor"], ["biceps_largo", "romboides", "oblicuo_ext", "flex_ante"]),
    (r"typewriter|maquina de escribir|dominada lateral",
     ["dorsal_ancho", "redondo_mayor"], ["biceps_largo", "trap_med", "oblicuo_ext"]),
    (r"commando|dominada(s)? comando|mixed ?grip pull ?up",
     ["dorsal_ancho", "biceps_largo"], ["romboides", "oblicuo_ext", "braquial", "flex_ante"]),
    (r"dominada|pull ?up|traccion(es)? en barra",
     ["dorsal_ancho", "redondo_mayor"], ["biceps_largo", "biceps_corto", "braquial", "romboides", "trap_med", "delt_post", "flex_ante"]),
    (r"muscle ?up",
     ["dorsal_ancho", "pec_med", "tri_lat"], ["biceps_largo", "delt_ant", "recto_abd", "trap_med", "serrato"]),
    (r"remo invertido|inverted row|remo australiano|australian row",
     ["dorsal_ancho", "romboides", "trap_med"], ["biceps_largo", "delt_post", "recto_abd", "trap_inf"]),
    (r"jalon (tras|detras de la) nuca|behind (the )?neck pulldown",
     ["dorsal_ancho", "redondo_mayor"], ["trap_med", "romboides", "biceps_largo", "delt_post"]),
    (r"jalon (con )?agarre (cerrado|estrecho|neutro)|close ?grip pulldown|neutral grip pulldown",
     ["dorsal_ancho", "dorsal_inf"], ["biceps_largo", "braquial", "redondo_mayor", "trap_med"]),
    (r"jalon|pull ?down|polea al pecho|lat ?pulldown",
     ["dorsal_ancho"], ["redondo_mayor", "biceps_largo", "biceps_corto", "braquial", "romboides", "trap_med"]),
    (r"remo (con |en |a )?(una |1 )?(mancuerna|brazo|mano)|one ?arm (dumbbell )?row|serrucho|remo unilateral",
     ["dorsal_ancho", "redondo_mayor", "romboides"], ["biceps_largo", "delt_post", "trap_med", "flex_ante"]),
    (r"remo (en |con )?(maquina|polea|gironda|sentado|bajo)|seated (cable )?row|machine row|chest supported row|remo apoyado",
     ["dorsal_ancho", "romboides", "trap_med"], ["biceps_largo", "delt_post", "braquial", "trap_inf"]),
    (r"remo t\b|t ?bar row|barra t|remo en barra t|remo en punta",
     ["dorsal_ancho", "romboides", "trap_med"], ["biceps_largo", "erectores", "delt_post"]),
    (r"remo|bent ?over row|barbell row|\brow\b",
     ["dorsal_ancho", "romboides", "trap_med"], ["delt_post", "erectores", "biceps_largo", "braquial"]),
    (r"encogimiento|shrug|elevacion(es)? de hombros",
     ["trap_sup"], ["elevador", "trap_med", "flex_ante"]),
    (r"pajaro|reverse ?(pec ?deck|fly|flye)|rear ?delt|apertura(s)? invertida|deltoide(s)? posterior|posteriores|contractora invertida",
     ["delt_post"], ["romboides", "trap_med"] + ROT_EXT),
    (r"\b(y|w|t) raise|prone (y|t) raise|elevacion(es)? en (y|t)\b|no money",
     ["trap_inf", "trap_med"], ["delt_post", "romboides"] + ROT_EXT),
    (r"retraccion escapular|scapular (pull|retraction)|pull ?up escapular|dominada escapular",
     ["trap_med", "romboides"], ["trap_inf", "dorsal_ancho"]),
    (r"rack pull|tiron desde rack|peso muerto (desde|con) rack",
     ["erectores", "trap_sup", "dorsal_ancho"], ["gluteo_mayor", "isq_bf_larga", "flex_ante", "trap_med"]),
    (r"front lever|plancha frontal invertida",
     ["dorsal_ancho", "recto_abd"], ["redondo_mayor", "tri_larga", "trap_inf", "gluteo_mayor", "transverso"]),
    (r"back lever",
     ["dorsal_ancho", "pec_med"], ["biceps_largo", "delt_ant", "erectores", "gluteo_mayor"]),
    (r"rope climb|trepa (de )?cuerda",
     ["dorsal_ancho", "biceps_largo", "flex_ante"], ["braquial", "romboides", "recto_abd"]),
    (r"around the world|circulo(s)? (con|de) disco|molinete con disco",
     ["delt_ant", "pec_sup"], ["delt_lat", "trap_med", "serrato"]),
]

# ── BLOQUE 3: CADERA Y CADENA POSTERIOR (bisagra) ──
# Ojo anatómico: en toda bisagra de cadera trabajan los TRES isquios que
# cruzan la cadera; la cabeza corta del bíceps femoral no participa.
KB_HINGE = [
    (r"(peso )?muerto rumano|rumano|\brdl\b|romanian deadlift|stiff ?leg|piernas rigidas|peso muerto piernas",
     ISQ_BI + ["gluteo_mayor"], ["erectores", "flex_ante", "dorsal_ancho", "cuadrado_l", "aductor_mayor"]),
    (r"(peso )?muerto sumo|sumo deadlift",
     ["gluteo_mayor", "vastos", "aductor_mayor"], ISQ_BI + ["erectores", "trap_sup", "flex_ante", "aductores_c"]),
    (r"(peso )?muerto (a |con )?(una |1 )?pierna|single ?leg (rdl|deadlift)|peso muerto unilateral",
     ISQ_BI + ["gluteo_mayor"], ["gluteo_medio", "erectores", "cuadrado_l", "tibial_post", "tfl"]),
    (r"(peso )?muerto (con )?(trap|hex) ?bar|trap bar deadlift",
     ["gluteo_mayor", "vastos"] + ISQ_BI, ["erectores", "trap_sup", "flex_ante"]),
    (r"peso muerto|deadlift|levantamiento de peso muerto",
     ISQ_BI + ["gluteo_mayor", "erectores"], ["dorsal_ancho", "trap_sup", "flex_ante", "vastos", "cuadrado_l", "multifidos"]),
    (r"buenos dias|good ?morning",
     ISQ_BI + ["erectores"], ["gluteo_mayor", "multifidos", "aductor_mayor"]),
    (r"hiperextension|hyperextension|extension(es)? lumbar|back extension|banco romano|silla romana|banco (a |de )?45|45 (grados|degree)[a-z ]{0,12}(hyper|hiper|extension)",
     ["erectores", "gluteo_mayor"], ISQ_BI + ["multifidos"]),
    (r"reverse hyper|hiperextension invertida",
     ["gluteo_mayor"] + ISQ_BI, ["erectores", "multifidos"]),
    (r"glute ?ham|\bghr\b|banco nordico",
     ISQ_ALL + ["gluteo_mayor"], ["erectores"] + GASTRO),
    (r"hip ?thrust|empuje de cadera|elevacion de cadera con barra",
     ["gluteo_mayor"], ISQ_BI + ["vastos", "gluteo_medio", "aductor_mayor"]),
    (r"frog pump|bombeo de rana|hip thrust de rana",
     ["gluteo_mayor"], ["gluteo_medio", "rotadores_cad"]),
    (r"puente (de )?gluteo|glute bridge|puente de cadera",
     ["gluteo_mayor"], ISQ_BI + ["erectores"]),
    (r"patada (de )?gluteo|kick ?back de gluteo|glute kickback|extension de cadera en polea|patada de cadera",
     ["gluteo_mayor"], ISQ_BI + ["erectores"]),
    (r"clamshell|almeja|concha",
     ["gluteo_medio", "rotadores_cad"], ["gluteo_menor", "tfl"]),
    (r"fire hydrant|hidrante|perro (a la )?boca de riego",
     ["gluteo_medio", "gluteo_mayor"], ["rotadores_cad", "gluteo_menor", "transverso"]),
    (r"swing|balanceo (con )?(kettlebell|pesa rusa)",
     ["gluteo_mayor"] + ISQ_BI, ["erectores", "recto_abd", "delt_ant", "trap_sup", "flex_ante"]),
    (r"pull ?through|jalon entre piernas",
     ["gluteo_mayor"] + ISQ_BI, ["erectores", "transverso"]),
]

# ── BLOQUE 4: PIERNA ──
# Las pantorrillas van primero: "gemelo en prensa" no es una prensa.
KB_LEGS = [
    (r"gemelo(s)? sentad|calf (raise )?sentad|seated calf|soleo|elevacion de talon(es)? sentado",
     ["soleo"], GASTRO + ["tibial_post", "peroneos"]),
    (r"gemelo|pantorrilla|calf raise|heel raise|elevacion de talon|donkey calf|calf press|burro",
     GASTRO, ["soleo", "tibial_post", "peroneos", "flex_ante"]),
    (r"tibial(es)?( anterior)?|tibialis raise|elevacion de punta(s)?|dorsiflexion",
     ["tibial_ant"], ["peroneos"]),
    (r"eversion|inversion de tobillo|peroneo",
     ["peroneos"], ["tibial_post", "tibial_ant"]),
    # Curl femoral SENTADO: la cadera flexionada estira los tres isquios
    # biarticulares y produce más hipertrofia en ellos que el tumbado.
    (r"curl femoral sentad|seated (leg|hamstring) curl|femoral sentad",
     ISQ_BI + ["isq_bf_corta"], GASTRO + ["gracil", "sartorio"]),
    (r"curl femoral (tumbad|acostad|prono)|lying (leg|hamstring) curl|femoral tumbad|prone (leg )?curl",
     ["isq_bf_corta", "isq_bf_larga", "isq_semitend"], ["isq_semimem", "sartorio"] + GASTRO),
    (r"curl femoral (de pie|unilateral)|standing (leg )?curl",
     ["isq_bf_corta", "isq_bf_larga"], ["isq_semitend", "isq_semimem"] + GASTRO),
    (r"curl femoral|curl (de )?pierna|leg ?curl|curl isquio|femoral en (maquina|camilla)|camilla de femoral",
     ISQ_ALL, GASTRO + ["gracil"]),
    (r"curl (nordico )?deslizante|slider (leg )?curl|curl con fitball|ball (leg )?curl|curl con toalla",
     ISQ_ALL, ["gluteo_mayor", "recto_abd", "transverso"]),
    (r"extension(es)? (de )?(cuadriceps|pierna|rodilla)|leg ?extension|cuadriceps en maquina|silla de cuadriceps",
     ["vastos", "recto_fem"], []),
    (r"sentadilla frontal|front squat",
     ["vastos", "gluteo_mayor"], ["erectores", "recto_abd", "aductor_mayor", "trap_sup", "recto_fem"]),
    (r"hack squat|sentadilla hack|maquina hack|v ?squat",
     ["vastos"], ["gluteo_mayor", "aductor_mayor", "isq_bf_larga"]),
    (r"sentadilla bulgara|bulgarian split|split squat|zancada bulgara",
     ["vastos", "gluteo_mayor"], ["isq_bf_larga", "gluteo_medio", "aductor_mayor", "tfl", "recto_fem"]),
    (r"zancada (inversa|atras)|reverse lunge|desplante inverso",
     ["gluteo_mayor", "vastos"], ["isq_bf_larga", "gluteo_medio", "aductor_mayor"]),
    (r"zancada|lunge|desplante|tijera(s)?|paso (largo|de zancada)",
     ["vastos", "gluteo_mayor"], ["isq_bf_larga", "gluteo_medio", "aductor_mayor", "recto_abd"]),
    (r"subida al (cajon|banco)|step ?up|escalon",
     ["vastos", "gluteo_mayor"], ["gluteo_medio", "isq_bf_larga"] + GASTRO),
    (r"sentadilla goblet|goblet squat|sentadilla copa",
     ["vastos", "gluteo_mayor"], ["recto_abd", "aductor_mayor", "delt_ant", "erectores", "transverso"]),
    (r"sentadilla (en |al )?(cajon|caja)|box squat",
     ["gluteo_mayor", "vastos"], ISQ_BI + ["erectores", "aductor_mayor"]),
    (r"sentadilla (isometrica|a la pared)|wall sit|silla contra la pared",
     ["vastos"], ["gluteo_mayor", "aductor_mayor"]),
    (r"sentadilla (con )?talones elevad|heels? elevated squat|sentadilla ciclista|cyclist squat",
     ["vastos", "recto_fem"], ["gluteo_mayor", "aductor_mayor"]),
    (r"sentadilla sumo|sumo squat|sentadilla ancha",
     ["gluteo_mayor", "aductor_mayor", "vastos"], ["aductores_c", "gracil", "erectores"]),
    (r"sentadilla|squat|sentadillas",
     ["vastos", "gluteo_mayor"], ["aductor_mayor", "isq_bf_larga", "erectores", "recto_abd", "recto_fem"]),
    (r"prensa|leg ?press|press (de )?pierna",
     ["vastos", "gluteo_mayor"], ISQ_BI + ["aductor_mayor", "soleo"]),
    (r"pendulum squat|sentadilla pendulo|belt squat|sentadilla con cinturon",
     ["vastos", "gluteo_mayor"], ["aductor_mayor", "isq_bf_larga"]),
    (r"abduccion|abductor|hip abduction|monster walk|banda lateral|paseo lateral con banda|caminata lateral",
     ["gluteo_medio", "gluteo_menor"], ["tfl", "gluteo_mayor", "rotadores_cad"]),
    (r"aduccion|aductor|hip adduction|maquina de aductores",
     ADUCT, ["gluteo_mayor"]),
    (r"sled (push|drag)|trineo|prowler|empuje de trineo|arrastre de trineo",
     ["vastos", "gluteo_mayor"] + GASTRO, ISQ_BI + ["soleo", "erectores", "recto_abd"]),
    (r"box jump|salto al cajon|salto vertical|jump squat|sentadilla con salto|pliometr|saltos",
     ["vastos", "gluteo_mayor"] + GASTRO, ISQ_BI + ["soleo", "recto_abd"]),
    (r"sprint|carrera|correr|esprint",
     ISQ_BI + ["gluteo_mayor", "vastos"], GASTRO + ["soleo", "psoas", "recto_abd", "tibial_ant"]),
    (r"bear crawl|oso|crab walk|cangrejo|inchworm|oruga",
     ["delt_ant", "recto_abd", "vastos"], ["serrato", "transverso", "oblicuo_ext", "tri_lat"]),
]


# ── BLOQUE 5: PECHO ──
KB_CHEST = [
    (r"press (con )?(agarre )?cerrado|close ?grip (bench )?press|press estrecho",
     ["tri_lat", "tri_med", "tri_larga"], ["pec_med", "delt_ant", "anconeo"]),
    (r"(press|apertura|fly|flye|cruce)[a-z ]{0,22}inclinad|inclinad[a-z]{0,3}[a-z ]{0,18}(press|apertura|fly|mancuerna|banca)|incline[a-z ]{0,16}(press|fly|flye|bench|dumbbell|db)",
     ["pec_sup", "delt_ant"], ["tri_lat", "tri_med", "pec_med", "coracobraq"]),
    (r"(press|apertura|fly|flye|cruce)[a-z ]{0,22}declinad|declinad|decline[a-z ]{0,16}(press|fly|flye|bench|dumbbell|db)|\bdecline\b",
     ["pec_inf"], ["pec_med", "tri_lat", "tri_med"]),
    (r"cruce (de )?polea(s)? (alta|superior)|high (to low )?cable (fly|cross)|cruce de arriba",
     ["pec_inf", "pec_med"], ["pec_menor", "delt_ant", "dorsal_ancho"]),
    (r"cruce (de )?polea(s)? (baja|inferior)|low (to high )?cable (fly|cross)|cruce de abajo",
     ["pec_sup"], ["pec_med", "delt_ant", "coracobraq"]),
    (r"press (de )?banca|bench press|press plano|press (de )?pecho|press (con )?mancuernas?|press (en )?maquina|chest press|press pectoral|dumbbell (bench )?press|barbell (bench )?press",
     ["pec_med"], ["pec_inf", "delt_ant", "tri_lat", "tri_med"]),
    (r"press (en el |de )?suelo|floor press",
     ["tri_lat", "pec_med"], ["delt_ant", "tri_med", "tri_larga"]),
    (r"apertura|fly\b|flye|cruce|cross ?over|pec ?deck|contractora|peck ?deck|mariposa|butterfly",
     ["pec_med"], ["pec_sup", "pec_inf", "delt_ant", "pec_menor", "coracobraq"]),
    (r"fondo(s)? (entre|en) banco(s)?|bench dip|fondos de triceps|triceps dip",
     ["tri_lat", "tri_med"], ["pec_inf", "delt_ant", "tri_larga"]),
    (r"fondo(s)?|dips?\b|paralelas",
     ["pec_inf", "tri_lat"], ["delt_ant", "pec_med", "tri_med", "serrato", "pec_menor"]),
    (r"flexion(es)? (de brazos )?(diamante|diamond)|diamond push ?up",
     ["tri_lat", "tri_med"], ["pec_med", "delt_ant", "anconeo"]),
    (r"flexion(es)? (de brazos )?(pica|pike)|pike push ?up|flexion vertical|handstand push ?up|\bhspu\b|pino",
     ["delt_ant", "delt_lat"], ["tri_lat", "trap_sup", "serrato", "tri_larga"]),
    (r"pseudo ?planche|flexion(es)? planche|planche",
     ["delt_ant", "pec_sup"], ["serrato", "recto_abd", "tri_lat", "biceps_largo"]),
    (r"flexion(es)? (arquero|archer)|archer push ?up",
     ["pec_med"], ["tri_lat", "delt_ant", "oblicuo_ext", "serrato"]),
    (r"flexion(es)? hindu|hindu push ?up|dive ?bomber",
     ["delt_ant", "pec_med"], ["tri_lat", "erectores", "serrato"]),
    (r"flexion(es)?|push ?up|lagartija|pechada",
     ["pec_med"], ["tri_lat", "tri_med", "delt_ant", "serrato", "recto_abd"]),
]

# ── BLOQUE 6: HOMBRO ──
KB_SHOULDER = [
    (r"elevacion(es)? lateral|lateral raise|vuelo(s)? lateral|elevacion(es)? en abduccion",
     ["delt_lat"], ["supraesp", "trap_sup"]),
    (r"elevacion(es)? frontal|front raise|vuelo frontal",
     ["delt_ant"], ["pec_sup", "delt_lat", "coracobraq"]),
    (r"scaption|elevacion (en el )?plano escapular",
     ["delt_lat", "supraesp"], ["delt_ant", "trap_sup", "trap_inf"]),
    (r"rotacion externa|external rotation|rotador(es)? extern",
     ROT_EXT, ["delt_post", "trap_med"]),
    (r"rotacion interna|internal rotation|rotador(es)? intern",
     ["subescap"], ["pec_med", "delt_ant", "dorsal_ancho"]),
    (r"manguito( rotador)?|rotator cuff",
     ROT_EXT + ["supraesp"], ["subescap", "delt_post"]),
    (r"wall slide|deslizamiento en pared|slide escapular",
     ["trap_inf", "serrato"], ["trap_med", "supraesp", "delt_lat"]),
    (r"press militar|military press|overhead press|\bohp\b|press (de )?hombro(s)?|shoulder press|press por encima de la cabeza|press (tras|detras de la) nuca",
     ["delt_ant", "delt_lat"], ["tri_lat", "tri_med", "trap_sup", "serrato", "supraesp"]),
    (r"push press|press (con )?impulso",
     ["delt_ant", "delt_lat", "tri_lat"], ["vastos", "gluteo_mayor", "trap_sup", "recto_abd"]),
    (r"(push|split) jerk|\bjerk\b|envion",
     ["delt_ant", "tri_lat", "vastos"], ["gluteo_mayor", "trap_sup", "erectores", "recto_abd"]),
    (r"landmine press|press landmine|press (con )?barra en esquina",
     ["delt_ant", "pec_sup"], ["tri_lat", "serrato", "recto_abd", "oblicuo_ext"]),
    (r"log press|press (con )?tronco",
     ["delt_ant", "delt_lat", "tri_lat"], ["trap_sup", "erectores", "recto_abd", "vastos"]),
    (r"sots press",
     ["delt_ant", "delt_lat"], ["tri_lat", "vastos", "erectores", "trap_med", "aductor_mayor"]),
    (r"overhead squat|sentadilla (con barra )?sobre la cabeza",
     ["vastos", "gluteo_mayor", "delt_lat"], ["trap_med", "erectores", "recto_abd", "tri_lat", "supraesp"]),
    (r"snatch balance|balance de arrancada",
     ["delt_lat", "vastos", "trap_sup"], ["tri_lat", "gluteo_mayor", "erectores"]),
]

# ── BLOQUE 7: BRAZO (el cuello va primero: "neck curl" no es un curl) ──
KB_ARMS = [
    (r"cuello|neck (curl|extension|harness|raise)|\bneck\b",
     ["ecom", "cervical_post"], ["trap_sup"]),
    # ═══ Tríceps ═══
    (r"(extension|extensiones)[a-z ]{0,25}(sobre|tras|encima|detras)[a-z ]{0,12}cabeza|overhead (triceps )?extension|extension de triceps (en polea )?(alta|arriba)|copa|triceps sobre la cabeza|extension a una mano sobre",
     ["tri_larga"], ["tri_lat", "tri_med", "anconeo"]),
    (r"patada (de )?triceps|kick ?back|triceps (hacia )?atras",
     ["tri_lat", "tri_larga"], ["tri_med", "anconeo"]),
    (r"(jalon|empuje|extension|push)[a-z ]{0,18}(de )?triceps|push ?down|pushdown|triceps (en |con )?(polea|cuerda|barra|maquina)|triceps cuerda",
     ["tri_lat", "tri_med"], ["tri_larga", "anconeo"]),
    (r"extension(es)? de codo|elbow extension|\btriceps\b",
     ["tri_lat", "tri_med"], ["tri_larga", "anconeo"]),
    # ═══ Flexores del codo ═══
    (r"martillo|hammer curl|curl neutro",
     ["braquial", "braquiorr"], ["biceps_largo", "biceps_corto"]),
    (r"curl (cruzado|cross ?body)|cross ?body (hammer )?curl",
     ["braquial", "braquiorr"], ["biceps_corto"]),
    (r"curl invertido|reverse curl|curl prono|curl agarre prono",
     ["braquiorr", "ext_ante"], ["braquial", "biceps_largo", "pronador"]),
    (r"curl (en |con |de )?(banco )?(inclinado|incline)|incline (dumbbell )?curl|curl tumbado inclinado",
     ["biceps_largo"], ["biceps_corto", "braquial", "coracobraq"]),
    (r"predicador|preacher|scott|curl en banco scott",
     ["biceps_corto"], ["braquial", "biceps_largo", "braquiorr"]),
    (r"curl araña|spider curl",
     ["biceps_corto"], ["braquial", "biceps_largo"]),
    (r"curl concentrad|concentration curl",
     ["biceps_corto", "biceps_largo"], ["braquial", "supinador"]),
    (r"curl (en |de )?polea alta|high cable curl|curl doble biceps",
     ["biceps_corto"], ["biceps_largo", "braquial"]),
    (r"curl (de )?muneca|wrist curl|flexion(es)? de muneca",
     ["flex_ante"], []),
    (r"extension(es)? de muneca|reverse wrist curl",
     ["ext_ante"], []),
    (r"pronacion|supinacion|giro de muneca|rotacion de antebrazo",
     ["pronador", "supinador"], ["braquiorr", "biceps_largo"]),
    (r"rodillo (de muneca)?|wrist roller|rueda de antebrazo",
     ["flex_ante", "ext_ante"], ["braquiorr"]),
    (r"\bcurl\b|biceps",
     ["biceps_largo", "biceps_corto"], ["braquial", "braquiorr", "flex_ante", "supinador"]),
    # ═══ Agarre y transportes ═══
    (r"farmer|paseo del granjero|granjero|carry pesado|yoke walk|paseo con yugo",
     ["flex_ante", "trap_sup"], ["erectores", "recto_abd", "gluteo_medio", "cuadrado_l", "soleo"]),
    (r"suitcase carry|paseo (de |con )?maleta|carga unilateral",
     ["cuadrado_l", "oblicuo_ext"], ["flex_ante", "trap_sup", "gluteo_medio", "transverso"]),
    (r"dead ?hang|colgarse|colgado de la barra|plate pinch|pinza de discos|\bagarre\b|captains of crush|grip",
     ["flex_ante"], ["dorsal_ancho", "braquiorr", "ext_ante"]),
]

# ── BLOQUE 8: CORE ──
KB_CORE = [
    (r"plancha lateral|side plank",
     ["oblicuo_ext", "oblicuo_int"], ["gluteo_medio", "recto_abd", "cuadrado_l", "transverso"]),
    (r"body ?saw|sierra|stir the pot|remover la olla",
     ["recto_abd", "transverso"], ["oblicuo_ext", "serrato", "dorsal_ancho"]),
    (r"plancha|plank|isometrico abdominal",
     ["recto_abd", "transverso"], ["oblicuo_ext", "erectores", "delt_ant", "gluteo_mayor", "serrato"]),
    (r"rueda (abdominal)?|ab ?wheel|roll ?out",
     ["recto_abd", "transverso"], ["oblicuo_ext", "dorsal_ancho", "tri_larga", "serrato"]),
    (r"dragon flag|bandera (del )?dragon",
     ["recto_abd", "recto_abd_inf"], ["oblicuo_ext", "dorsal_ancho", "gluteo_mayor", "transverso"]),
    (r"hollow|barco|hueco isometrico|candlestick|vela",
     ["recto_abd"], ["psoas", "transverso", "recto_abd_inf"]),
    (r"\bl ?sit\b|\bl ?hang\b",
     ["recto_abd", "psoas"], ["tri_lat", "vastos", "dorsal_ancho", "recto_abd_inf"]),
    (r"giro ruso|russian twist|rotacion (con |de )?(balon|disco|polea)|pallof|antirrotacion|woodchop|lenador|penacho",
     ["oblicuo_ext", "oblicuo_int"], ["recto_abd", "transverso", "serrato"]),
    (r"limpiaparabrisas|windshield wiper",
     ["oblicuo_ext", "oblicuo_int", "recto_abd"], ["psoas", "dorsal_ancho", "recto_abd_inf"]),
    (r"crunch invertido|reverse crunch|elevacion de pelvis|encogimiento invertido",
     ["recto_abd_inf"], ["psoas", "oblicuo_ext", "transverso"]),
    (r"elevacion(es)? de (pierna|rodilla)s?|leg raise|knee raise|toes ?to ?bar|rodillas al pecho|jackknife|navaja|flutter|tijeras? (de piernas)?",
     ["recto_abd_inf", "psoas"], ["recto_abd", "oblicuo_ext", "flex_ante", "dorsal_ancho"]),
    (r"crunch (en |con )?polea|cable crunch|crunch arrodillado",
     ["recto_abd_sup", "recto_abd"], ["oblicuo_ext", "transverso"]),
    (r"crunch bicicleta|bicycle crunch|bicicleta abdominal",
     ["oblicuo_ext", "oblicuo_int"], ["recto_abd", "psoas", "recto_abd_inf"]),
    (r"crunch|abdominal|sit ?up|encogimiento abdominal|v ?up|abdominales|\bghd\b",
     ["recto_abd_sup", "recto_abd"], ["oblicuo_ext", "psoas", "transverso"]),
    (r"bird ?dog|perro pajaro|superman|nadador",
     ["erectores", "multifidos"], ["gluteo_mayor", "recto_abd", "delt_post", "trap_inf"]),
    (r"dead ?bug|bicho muerto",
     ["recto_abd", "transverso"], ["oblicuo_ext", "psoas"]),
    (r"mountain climber|escalador",
     ["recto_abd", "psoas"], ["oblicuo_ext", "delt_ant", "serrato"]),
    (r"vacuum|vacio abdominal|hipopresivo",
     ["transverso"], ["oblicuo_int"]),
    (r"\bcore\b|estabilidad central",
     ["recto_abd", "transverso"], ["oblicuo_ext", "oblicuo_int", "erectores"]),
]

# ── BLOQUE 9: OLÍMPICOS, STRONGMAN Y ACONDICIONAMIENTO ──
KB_MISC = [
    (r"muscle snatch|arrancada de fuerza",
     ["trap_sup", "delt_lat", "delt_ant"], ["vastos", "gluteo_mayor", "erectores", "tri_lat"]),
    (r"power clean|cargada de potencia|hang clean|cargada colgante",
     ["vastos", "gluteo_mayor", "trap_sup"], ISQ_BI + ["erectores", "delt_ant"] + GASTRO),
    (r"cargada|\bclean\b|clean (and|&) jerk|dos tiempos",
     ["vastos", "gluteo_mayor", "trap_sup"], ISQ_BI + ["erectores", "delt_ant", "flex_ante"] + GASTRO),
    (r"arrancada|snatch",
     ["vastos", "gluteo_mayor", "trap_sup", "delt_lat"], ISQ_BI + ["erectores", "tri_lat", "flex_ante"]),
    (r"thruster",
     ["vastos", "gluteo_mayor", "delt_ant"], ["tri_lat", "recto_abd", "trap_sup", "erectores"]),
    (r"wall ball|balon (a la )?pared",
     ["vastos", "gluteo_mayor", "delt_ant"], ["tri_lat", "recto_abd", "trap_sup"]),
    (r"high pull|tiron alto",
     ["trap_sup", "delt_lat", "erectores"], ["vastos", "gluteo_mayor", "biceps_largo", "romboides"]),
    (r"burpee",
     ["pec_med", "vastos", "recto_abd"], ["tri_lat", "delt_ant", "gluteo_mayor"] + GASTRO),
    (r"battle rope|cuerda(s)? de batalla|soga(s)?",
     ["delt_ant", "recto_abd"], ["flex_ante", "oblicuo_ext", "trap_sup", "delt_lat"]),
    (r"atlas stone|piedra de atlas|sandbag|saco de arena|keg|barril|tire flip|volteo de rueda",
     ["gluteo_mayor", "erectores", "vastos"], ISQ_BI + ["dorsal_ancho", "trap_sup", "biceps_largo", "recto_abd"]),
    (r"remada?|remo ergometro|rowing machine|maquina de remo|remoergometro|remo indoor",
     ["dorsal_ancho", "vastos", "erectores"], ["romboides", "trap_med", "biceps_largo", "gluteo_mayor"] + ISQ_BI),
    (r"asalto|assault bike|bici de aire|air bike|eliptica|cinta|escaladora|stair",
     ["vastos", "gluteo_mayor"], ISQ_BI + GASTRO + ["delt_ant", "recto_abd"]),
    (r"comba|saltar a la cuerda|jump rope|skipping",
     GASTRO + ["soleo"], ["vastos", "tibial_ant", "flex_ante", "delt_lat"]),
    (r"90 ?90|world greatest stretch|estiramiento del mundo|movilidad de cadera",
     ["rotadores_cad", "psoas"], ADUCT + ["gluteo_medio", "sartorio"]),
]

# Repertorio completo, en el orden en que se evalúa
KB = (KB_NAMED + KB_BACK + KB_HINGE + KB_LEGS + KB_CHEST +
      KB_SHOULDER + KB_ARMS + KB_CORE + KB_MISC)


# ══════════════════════════════════════════════════════════════════
# MODIFICADORES — el matiz del nombre ajusta los estabilizadores
# Se aplican DESPUÉS de identificar el ejercicio. Nunca cambian el
# músculo principal: solo añaden o quitan asistentes, que es justo lo
# que cambia en la vida real al variar agarre, apoyo o implemento.
# ══════════════════════════════════════════════════════════════════
MODIFIERS = [
    # (patrón, añadir a secundarios, quitar de secundarios)
    # Unilateral: el tronco tiene que frenar la rotación y la inclinación
    (r"unilateral|a una mano|(a|con) un brazo|one ?arm|single ?arm|a un lado",
     ["cuadrado_l", "oblicuo_ext", "transverso"], []),
    # Un solo apoyo: el glúteo medio sostiene la pelvis
    (r"a una pierna|single ?leg|unipodal|bulgara|pistol|skater|shrimp|a un pie",
     ["gluteo_medio", "tfl", "tibial_post"], []),
    # Anillas: todo baila, los rotadores y el serrato estabilizan
    (r"anilla|\brings?\b|\btrx\b|suspension",
     ["infraesp", "redondo_menor", "serrato", "transverso"], []),
    # Lastrado: el agarre sujeta el peso extra
    (r"lastrad|weighted|con chaleco|con lastre|con disco colgando",
     ["flex_ante"], []),
    # Máquina guiada: la máquina hace de estabilizador, tú no
    (r"multipower|smith|maquina guiada|en maquina|machine|guiad",
     [], ["erectores", "multifidos", "cuadrado_l", "transverso"]),
    # Agarre supino en tracciones: más bíceps
    (r"agarre supino|supinad|underhand|palmas hacia arriba",
     ["biceps_largo", "biceps_corto", "supinador"], []),
    # Agarre neutro: entra el braquial
    (r"agarre neutro|neutral grip|palmas enfrentadas|martillo",
     ["braquial", "braquiorr"], []),
    # Agarre ancho en tracciones: más redondo mayor y posterior
    (r"agarre ancho|wide grip|abierto",
     ["redondo_mayor", "delt_post"], []),
    # Explosivo: el tríceps sural amortigua y propulsa
    (r"explosiv|con salto|jump|pliometr|balistico",
     ["gastro_med", "gastro_lat", "soleo"], []),
    # De pie y sin apoyo: la columna sostiene
    (r"de pie|standing|sin apoyo|libre",
     ["erectores", "transverso"], []),
]


# ── ÚLTIMO RECURSO: si ninguna regla encaja, buscamos el músculo nombrado ──
FALLBACK = [
    (r"pectoral|\bpecho\b|\bchest\b", ["pec_med"], ["pec_sup", "delt_ant", "tri_lat"]),
    (r"dorsal|espalda|\bback\b|\blat(s)?\b", ["dorsal_ancho"], ["romboides", "trap_med", "biceps_largo"]),
    (r"trapecio|\btrap(s)?\b", ["trap_sup"], ["trap_med", "elevador"]),
    (r"lumbar|zona baja|low(er)? back|espinal", ["erectores"], ["multifidos", "cuadrado_l"]),
    (r"hombro|deltoide|shoulder|\bdelt(s)?\b", ["delt_lat", "delt_ant"], ["delt_post", "supraesp"]),
    (r"tricep", ["tri_lat", "tri_med"], ["tri_larga"]),
    (r"bicep", ["biceps_largo", "biceps_corto"], ["braquial"]),
    (r"antebrazo|forearm|muneca", ["flex_ante"], ["ext_ante", "braquiorr"]),
    (r"cuadricep|\bquad(s)?\b|muslo anterior", ["vastos"], ["recto_fem", "gluteo_mayor"]),
    (r"femoral|isquio|hamstring|jamon", ISQ_BI, ["gluteo_mayor", "isq_bf_corta"]),
    (r"gluteo|\bglute(s)?\b|cadera", ["gluteo_mayor"], ["gluteo_medio", "isq_bf_larga"]),
    (r"gemelo|pantorrilla|\bcalf|calves|soleo", GASTRO, ["soleo"]),
    (r"aductor|adductor|ingle", ADUCT, []),
    (r"abductor|gluteo medio", ["gluteo_medio"], ["tfl", "gluteo_menor"]),
    (r"oblicuo|oblique|cintura", ["oblicuo_ext", "oblicuo_int"], ["recto_abd", "transverso"]),
    (r"abdomen|\babs\b|abdominal", ["recto_abd"], ["transverso", "oblicuo_ext"]),
    (r"\bpress\b", ["pec_med"], ["delt_ant", "tri_lat"]),
    (r"\braise\b|elevacion", ["delt_lat"], ["delt_ant"]),
]


def _apply_modifiers(name_norm, primary, secondary):
    """Ajusta los estabilizadores según los matices del nombre."""
    sec = list(secondary)
    for pattern, add, drop in MODIFIERS:
        if re.search(pattern, name_norm):
            for m in add:
                if m not in sec and m not in primary:
                    sec.append(m)
            for m in drop:
                if m in sec:
                    sec.remove(m)
    return primary, sec


def detect_muscles(name: str):
    """
    Devuelve (primarios, secundarios) como ids de músculos FINOS.
    Reconoce el nombre en español o inglés, con o sin acentos, y afina
    los estabilizadores según los matices (unilateral, anillas, máquina…).
    """
    n = _norm(name)
    if not n:
        return [], []
    for pattern, primary, secondary in KB:
        if re.search(pattern, n):
            return _apply_modifiers(n, list(primary), list(secondary))
    for pattern, primary, secondary in FALLBACK:
        if re.search(pattern, n):
            return _apply_modifiers(n, list(primary), list(secondary))
    return [], []


def describe(name: str):
    """Ficha completa: músculos finos, sus nombres y las regiones del cuerpo."""
    p, s = detect_muscles(name)
    return {
        "recognized": bool(p),
        "primary": p, "secondary": s,
        "primary_names": [MUSCLES.get(m, m) for m in p],
        "secondary_names": [MUSCLES.get(m, m) for m in s],
        "regions": to_coarse(p),
    }


# ══════════════════════════════════════════════════════════════════
# CATÁLOGO SUGERIDO — nombres canónicos para el autocompletado.
# Puedes escribir lo que quieras; esto solo ahorra teclear y garantiza
# que el ejercicio se reconozca a la primera.
# ══════════════════════════════════════════════════════════════════
CATALOG = [
    # ── Pecho ──
    "Press de banca", "Press de banca con mancuernas", "Press inclinado con barra",
    "Press inclinado con mancuernas", "Press declinado", "Press en máquina (chest press)",
    "Press cerrado (close grip)", "Press Larsen", "Press Spoto", "Press guillotina",
    "Floor press (press en el suelo)", "Aperturas con mancuernas", "Aperturas inclinadas",
    "Cruce de poleas altas", "Cruce de poleas bajas", "Contractora (pec deck)",
    "Fondos en paralelas", "Fondos lastrados", "Flexiones", "Flexiones diamante",
    "Flexiones arquero", "Flexiones hindú", "Svend press", "Pullover con mancuerna",
    # ── Espalda ──
    "Dominadas", "Dominadas supinas (chin-up)", "Dominadas lastradas", "Dominadas arquero",
    "Muscle-up", "Jalón al pecho", "Jalón agarre neutro", "Jalón agarre supino",
    "Jalón tras nuca", "Jalón con brazos rectos", "Pullover en polea",
    "Remo con barra", "Remo Pendlay", "Remo Yates", "Remo con mancuerna a una mano",
    "Remo Meadows", "Remo Kroc", "Remo en máquina", "Remo gironda (sentado en polea)",
    "Remo en barra T", "Seal row (remo de foca)", "Remo Helms", "Remo invertido",
    "Remo renegado", "Encogimientos (shrugs)", "Kelso shrug", "Hise shrug",
    "Face pull", "Band pull-apart", "Pájaros (rear delt fly)", "Powell raise",
    "Y-raise en banco inclinado", "Rack pull", "Front lever", "Dead hang",
    # ── Cadera y cadena posterior ──
    "Peso muerto", "Peso muerto rumano", "Peso muerto sumo", "Peso muerto a una pierna",
    "Peso muerto con trap bar", "Peso muerto con déficit", "Snatch-grip deadlift",
    "Buenos días (good morning)", "Hip thrust", "Hip thrust a una pierna",
    "Puente de glúteo", "Frog pump", "Patada de glúteo en polea",
    "Hiperextensiones (banco romano)", "Reverse hyper", "Glute-ham raise (GHR)",
    "Kettlebell swing", "Pull-through en polea", "Clamshell", "Fire hydrant",
    # ── Pierna ──
    "Sentadilla", "Sentadilla frontal", "Sentadilla búlgara", "Sentadilla goblet",
    "Sentadilla hack", "Sentadilla en cajón", "Sentadilla sumo", "Sentadilla cosaca",
    "Sentadilla sissy", "Sentadilla con talones elevados", "Zercher squat",
    "Anderson squat", "Frankenstein squat", "Pistol squat", "Skater squat",
    "ATG split squat", "Prensa de pierna", "Pendulum squat", "Belt squat",
    "Extensión de cuádriceps", "Curl femoral sentado", "Curl femoral tumbado",
    "Curl femoral de pie", "Curl nórdico (Nordic)", "Reverse nordic", "Razor curl",
    "Zancadas", "Zancada inversa", "Zancada en reverencia (curtsy)",
    "Subida al cajón (step-up)", "Abducción de cadera", "Aducción de cadera",
    "Copenhagen plank", "Gemelos de pie", "Gemelos sentado", "Gemelos en prensa",
    "Tibialis raise", "Jefferson curl", "Empuje de trineo", "Salto al cajón",
    # ── Hombro ──
    "Press militar", "Press militar con mancuernas", "Press Arnold", "Press tras nuca",
    "Z press", "Push press", "Bradford press", "Klokov press", "Log press",
    "Press en landmine", "Elevaciones laterales", "Elevaciones laterales en polea",
    "Elevación lateral egipcia", "Elevaciones frontales", "Scaption",
    "Remo al mentón", "Rotación externa (manguito)", "Rotación interna",
    "Cuban press", "Lu raise", "Wall slide", "Overhead squat", "Snatch balance",
    # ── Brazo ──
    "Curl con barra", "Curl con mancuernas alterno", "Curl inclinado", "Curl Bayesian",
    "Curl martillo", "Curl cruzado (cross-body)", "Curl invertido", "Curl Zottman",
    "Curl en banco predicador", "Curl araña", "Curl concentrado", "Drag curl",
    "Waiter curl", "Curl 21s", "Curl de muñeca", "Extensión de muñeca",
    "Press francés (skull crusher)", "JM press", "Tate press", "California press",
    "Katana extension", "PJR pullover", "Extensión de tríceps sobre la cabeza",
    "Jalón de tríceps en polea", "Patada de tríceps", "Fondos entre bancos",
    "Rodillo de muñeca", "Paseo del granjero", "Suitcase carry", "Pinza de discos",
    # ── Core ──
    "Plancha", "Plancha lateral", "Rueda abdominal", "Crunch en polea",
    "Crunch invertido", "Crunch bicicleta", "Elevación de piernas colgado",
    "Toes to bar", "Giro ruso", "Pallof press", "Leñador en polea", "Dragon flag",
    "Hollow body", "L-sit", "Bird dog", "Dead bug", "Body saw", "Mountain climbers",
    "Limpiaparabrisas", "Vacuum abdominal",
    # ── Olímpicos, strongman y acondicionamiento ──
    "Cargada (clean)", "Power clean", "Arrancada (snatch)", "Muscle snatch",
    "Clean and jerk", "Thruster", "Wall ball", "High pull", "Burpees",
    "Turkish get-up", "Windmill con kettlebell", "Halo con kettlebell",
    "Atlas stone", "Volteo de rueda", "Cuerdas de batalla", "Comba",
    "Remo en ergómetro", "Assault bike", "Sprint",
]
