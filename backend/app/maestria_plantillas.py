"""
maestria_plantillas.py — LOS PLANES DE MISIONES PREPARADOS A MANO
─────────────────────────────────────────────────────────────────
Cuando creas una habilidad, el Sistema reconoce de qué tipo es (música,
idioma, programación…) y usa uno de estos planes. Si el servidor tiene la IA
configurada, además diseña uno a medida para esa habilidad concreta; si la IA
falla o no está, se queda este, que funciona igual de bien.

Cada plan tiene:
  · competencias: lo que de verdad sabe hacer alguien de cada rango (E → S).
  · diarias: 6 misiones por banda («base» para E–D, «medio» para C–B, «alto»
    para A–S). Cada una es UNA sesión de práctica deliberada: un objetivo
    concreto, al borde de tu nivel, con una forma de comprobar si lo lograste
    («Hecho cuando…»). Nada de «practica un rato».
  · semanales: 3 retos mayores por banda, con un resultado tangible.
  · pruebas: los criterios para ascender a D, C, B, A y S. Son exigentes a
    propósito: el rango solo vale si es verdad.

«{h}» se sustituye por el nombre de la habilidad («Boxeo», «Rubik»…).
"""

CATEGORIAS = {
    "musica": "Música",
    "idioma": "Idioma",
    "programacion": "Programación",
    "arte": "Dibujo y pintura",
    "deporte": "Deporte y técnica física",
    "escritura": "Escritura",
    "estudio": "Estudio académico",
    "comunicacion": "Comunicación y oratoria",
    "estrategia": "Ajedrez y estrategia",
    "cocina": "Cocina",
    "general": "Otra habilidad",
}

# Palabras que delatan el tipo de habilidad (sin tildes y en minúsculas; un
# «*» final acepta cualquier terminación: «guitarr*» → guitarra, guitarrista).
# El orden importa en los empates: gana la categoría que aparece antes.
PALABRAS = {
    "musica": ["guitarr*", "piano", "pianista", "violin*", "violonchelo", "chelo", "bajo electrico", "bajista",
               "contrabajo", "bateria", "percusion", "ukelele", "canto", "cantar", "vocal", "saxo*", "trompeta",
               "trombon", "flauta", "clarinete", "acordeon", "arpa", "musica", "musical", "instrumento", "solfeo",
               "armonia", "produccion musical", "producir musica", "dj", "teclado", "sintetizador", "laud", "gaita",
               "cajon", "oboe", "fagot", "trompa", "banjo", "mandolina", "beatbox", "rap"],
    "idioma": ["ingles", "frances", "aleman", "italiano", "portugues", "japones", "chino", "mandarin", "coreano",
               "arabe", "ruso", "holandes", "neerlandes", "sueco", "noruego", "danes", "polaco", "griego", "turco",
               "hebreo", "hindi", "catalan", "euskera", "gallego", "latin", "idioma*", "lengua", "lenguas", "english",
               "french", "german", "b1", "b2", "c1", "c2", "ielts", "toefl", "cambridge", "dele", "delf", "dalf",
               "goethe", "jlpt", "hsk", "toeic", "cae", "cpe", "vocabulario", "pronunciacion", "conversacion en",
               "lengua de signos", "esperanto"],
    "programacion": ["programar", "programacion", "programador*", "codigo", "coding", "python", "javascript",
                     "typescript", "java", "kotlin", "swift", "c++", "c#", "rust", "golang", "ruby", "php", "react",
                     "angular", "vue", "node", "django", "flask", "fastapi", "sql", "web", "frontend", "backend",
                     "fullstack", "software", "desarrollo de software", "desarrollo web", "desarrollador*", "algoritm*",
                     "estructuras de datos", "machine learning", "aprendizaje automatico", "inteligencia artificial",
                     "ia", "data science", "ciencia de datos", "devops", "linux", "ciberseguridad", "hacking",
                     "arduino", "raspberry", "videojuegos", "unity", "unreal", "godot", "leetcode", "informatica",
                     "excel", "automatizacion"],
    "arte": ["dibuj*", "pintura", "pintar", "acuarela", "oleo", "acrilico", "ilustracion", "ilustrar", "boceto*",
             "retrato*", "caligrafia", "lettering", "arte", "artistico", "comic", "manga", "concept art", "sketch*",
             "carboncillo", "grabado", "escultura", "modelado 3d", "blender", "pixel art", "animacion",
             "diseno grafico", "tatuaje*", "grafiti", "graffiti", "storyboard"],
    "deporte": ["natacion", "nadar", "boxeo", "kickboxing", "muay thai", "mma", "judo", "jiu jitsu", "jiujitsu", "bjj",
                "karate", "taekwondo", "aikido", "kung fu", "wing chun", "esgrima", "lucha", "escalada", "escalar",
                "boulder", "calistenia", "parada de manos", "handstand", "dominadas", "planche", "front lever",
                "yoga", "pilates", "correr", "running", "maraton", "trail", "ciclismo", "bici*", "baile*", "bailar",
                "salsa", "bachata", "danza", "ballet", "breakdance", "tenis", "padel", "futbol", "baloncesto",
                "voleibol", "balonmano", "golf", "surf", "skate*", "snowboard", "esqui", "patinaje", "gimnasia",
                "acrobacia*", "parkour", "tiro con arco", "atletismo", "triatlon", "crossfit", "halterofilia",
                "powerlifting", "remo", "equitacion", "deporte*", "flexibilidad", "spagat", "malabares",
                "defensa personal", "krav maga", "capoeira", "sambo", "wrestling"],
    "escritura": ["escribir", "escritura", "escritor*", "novela*", "relato*", "cuento*", "poesia", "poema*", "poeta",
                  "guion", "guiones", "guionista", "redaccion", "redactar", "ensayo*", "blog", "copywriting",
                  "periodismo", "literatura", "narrativa", "microrrelato*", "fanfic*"],
    "estudio": ["matematica*", "calculo", "algebra", "geometria", "estadistica", "probabilidad", "fisica", "quimica",
                "biologia", "anatomia", "fisiologia", "bioquimica", "farmacologia", "medicina", "derecho",
                "economia", "contabilidad", "finanzas", "historia", "filosofia", "psicologia", "examen*",
                "oposicion*", "selectividad", "evau", "pau", "mir", "asignatura*", "carrera", "universidad",
                "estudiar", "estudio", "electronica", "electrotecnia", "senales", "biomecanica", "termodinamica",
                "mecanica", "ingenieria", "circuitos", "neurociencia", "genetica", "astronomia", "tesis", "tfg",
                "tfm", "investigacion", "temario", "apuntes"],
    "comunicacion": ["hablar en publico", "oratoria", "presentaciones", "presentar", "debate", "debatir", "carisma",
                     "liderazgo", "negociacion", "negociar", "entrevista*", "comunicacion", "persuasion", "ventas",
                     "vender", "diccion", "voz", "storytelling", "conversacion", "habilidades sociales",
                     "networking", "asertividad", "teatro", "teatral", "impro", "actuar", "actuacion", "locucion",
                     "podcast"],
    "estrategia": ["ajedrez", "chess", "go", "baduk", "weiqi", "damas", "shogi", "xiangqi", "estrategia",
                   "lichess", "chesscom", "elo"],
    "cocina": ["cocina*", "cocinar", "cocinero*", "reposteria", "pasteleria", "panaderia", "pan", "masa madre",
               "barista", "cafe", "cocteleria", "chef", "gastronomia", "receta*", "parrilla", "barbacoa", "sushi",
               "pizza*", "fermentacion", "fermentados", "chocolate*", "panes"],
}


def _m(titulo, minutos, detalle):
    return {"titulo": titulo, "minutos": minutos, "detalle": detalle}


def _p(titulo, *criterios):
    return {"titulo": titulo, "criterios": list(criterios)}


def _plan(competencias, diarias, semanales, pruebas):
    return {
        "competencias": dict(zip("EDCBAS", competencias)),
        "diarias": dict(zip(("base", "medio", "alto"), diarias)),
        "semanales": dict(zip(("base", "medio", "alto"), semanales)),
        "pruebas": dict(zip("DCBAS", pruebas)),
    }


# ═══════════════════════════════════════════════════════════════════
# MÚSICA — instrumento o canto
# ═══════════════════════════════════════════════════════════════════
MUSICA = _plan(
    [
        "Tocas notas y acordes sueltos y sigues tutoriales paso a paso.",
        "Tocas canciones sencillas completas, a tempo y sin pararte.",
        "Tienes repertorio de memoria, sacas canciones de oído e improvisas sobre bases sencillas.",
        "Tocas piezas exigentes con musicalidad y te defiendes en público o en grupo.",
        "Interpretas, compones o arreglas a nivel profesional y con identidad propia.",
        "Eres referente: actúas, enseñas o creas obra que otros músicos estudian.",
    ],
    [
        [
            _m("Cambios limpios a 60 bpm", 15,
               "Elige los 2 acordes, notas o posiciones que peor te salen y alterna entre ellos con metrónomo a 60 bpm, "
               "un cambio por pulso. Hecho cuando encadenes 2 minutos seguidos sin un solo fallo."),
            _m("Técnica lenta y consciente", 15,
               "Toca una escala o un ejercicio de técnica a la mitad de tu velocidad, vigilando postura, tensión y "
               "sonido. Hecho cuando salga 5 veces seguidas limpio y con el cuerpo relajado."),
            _m("Una frase, diez veces", 20,
               "Elige 2–4 compases de una canción que te cuesten y tócalos 10 veces seguidas sin error; si fallas, "
               "baja el tempo y la cuenta vuelve a cero. Hecho cuando completes las 10."),
            _m("Grábate un minuto", 20,
               "Graba un minuto de lo que estás aprendiendo y escúchalo con atención. Apunta 2 cosas que suenan mal "
               "y repite ese fragmento corrigiéndolas. Hecho cuando la segunda toma suene mejor que la primera."),
            _m("Oído: saca una melodía", 15,
               "Escucha una melodía sencilla (una canción infantil, un himno) y sácala de oído, nota a nota, sin "
               "partitura. Hecho cuando toques o cantes las 8 primeras notas correctas."),
            _m("Teoría útil del día", 15,
               "Aprende un acorde, una escala o una figura rítmica nueva y úsala hoy mismo en algo que ya sepas "
               "tocar. Hecho cuando la toques de memoria y sepas para qué sirve."),
        ],
        [
            _m("El pasaje al 110 %", 20,
               "Toma el pasaje más difícil de tu pieza actual. Tócalo limpio a tu tempo y súbelo un 10 % con "
               "metrónomo. Hecho cuando salga 3 veces seguidas sin fallos al tempo nuevo."),
            _m("Improvisa sobre una base", 20,
               "Pon una base en una tonalidad e improvisa 10 minutos con una sola escala, construyendo frases que "
               "pregunten y respondan. Hecho cuando grabes un minuto de improvisación que te guste."),
            _m("Transcribe 4 compases", 30,
               "Saca de oído 4 compases de una grabación de un músico que admires y escríbelos (partitura, tablatura "
               "o notas). Hecho cuando los toques a la vez que la grabación y suenen igual."),
            _m("Dinámica con intención", 20,
               "Toca una pieza que domines tres veces: muy suave, muy fuerte y con crescendos y diminuendos "
               "pensados. Hecho cuando una grabación demuestre las diferencias con claridad."),
            _m("Repertorio sin red", 25,
               "Toca de memoria y sin pararte 3 piezas de tu repertorio, como si hubiera público. Apunta dónde "
               "dudaste. Hecho cuando las 3 lleguen al final aunque haya errores."),
            _m("Escucha de oficio", 20,
               "Escucha 3 veces una grabación de referencia de tu instrumento o estilo: forma, técnica y expresión. "
               "Apunta 3 recursos concretos. Hecho cuando hayas probado uno en tu instrumento."),
        ],
        [
            _m("Sesión de estudio dirigida", 45,
               "Plantea una sesión con un objetivo medible (un tempo, un pasaje, un matiz) en tres bloques: "
               "calentamiento, trabajo lento del problema y tocarlo en contexto. Hecho cuando hayas medido el antes "
               "y el después."),
            _m("Compón 8 compases", 40,
               "Compón o arregla 8 compases con una idea clara (un motivo, una armonía, un ritmo) y grábalos. Hecho "
               "cuando tengas la grabación y una frase sobre qué buscabas."),
            _m("Tócala en otro estilo", 30,
               "Toca una pieza conocida en un estilo que no es el tuyo (jazz, flamenco, barroco, funk…), respetando "
               "su ritmo y su articulación. Hecho cuando alguien que la escuche reconozca el estilo."),
            _m("Toca para alguien", 30,
               "Toca una pieza completa para una persona, en directo o por videollamada, y pídele una crítica "
               "sincera. Hecho cuando apuntes su opinión y una mejora concreta."),
            _m("Microdetalles", 40,
               "Elige 30 segundos de una pieza de tu repertorio y perfecciónalos: sonido, articulación, respiración "
               "y silencios. Graba antes y después. Hecho cuando la diferencia se oiga."),
            _m("Enseña algo", 30,
               "Explica a alguien, o en un vídeo, una técnica o un concepto que domines, con un ejemplo tocado. "
               "Hecho cuando la otra persona sepa hacerlo o la explicación quede grabada."),
        ],
    ],
    [
        [
            _m("Canción completa", 90,
               "Elige una canción sencilla y apréndela de principio a fin esta semana. Hecho cuando la toques entera "
               "a tempo y sin pararte, aunque haya algún fallo."),
            _m("Grabación lunes y domingo", 60,
               "Graba el mismo fragmento el lunes y el domingo, en una sola toma. Hecho cuando las escuches seguidas "
               "y apuntes qué ha mejorado."),
            _m("Cinco días seguidos", 100,
               "Practica al menos 20 minutos cinco días de esta semana. Hecho cuando sumes los cinco días."),
        ],
        [
            _m("Saca una canción de oído", 120,
               "Saca una canción completa de oído, sin tablaturas ni partituras. Hecho cuando la toques entera "
               "junto a la grabación."),
            _m("Mini concierto", 60,
               "Prepara 3 piezas y tócalas seguidas ante alguien o grabándote en una sola toma. Hecho cuando la "
               "grabación de las 3 esté hecha."),
            _m("Teoría aplicada", 90,
               "Aprende una herramienta de armonía (dominantes secundarias, modos, inversiones…) y crea un "
               "ejercicio o un arreglo que la use. Hecho cuando esté grabado."),
        ],
        [
            _m("Pieza de exhibición", 180,
               "Lleva una pieza exigente a nivel de concierto: limpia, a tempo y con interpretación propia. Hecho "
               "cuando tengas una toma completa que podrías publicar."),
            _m("Composición terminada", 180,
               "Termina una composición o un arreglo completo, con estructura y final. Hecho cuando esté grabado de "
               "principio a fin."),
            _m("Clase o colaboración", 120,
               "Da una clase, toca con otros músicos o recibe una clase de alguien mejor que tú. Hecho cuando te "
               "lleves por escrito 3 ideas para tu práctica."),
        ],
    ],
    [
        _p("Canciones completas a tempo",
           "Tocas 2 canciones completas a tempo y sin pararte.",
           "Haces los cambios básicos limpios con metrónomo a 80 bpm.",
           "Una grabación tuya suena reconocible y agradable para alguien que no te conoce."),
        _p("Repertorio propio",
           "Tocas 8 piezas de memoria.",
           "Has sacado una canción completa de oído.",
           "Improvisas 2 minutos sobre una base sin perderte."),
        _p("Ante el público",
           "Has tocado en público o en grupo y salió bien.",
           "Grabas una pieza exigente en una sola toma limpia.",
           "Sacas de oído con fluidez la melodía y los acordes de canciones nuevas."),
        _p("Nivel profesional",
           "Tienes composiciones o arreglos propios con identidad.",
           "Explicas la teoría de lo que tocas y la aplicas a voluntad.",
           "Tus grabaciones tienen calidad profesional o te pagan por tocar."),
        _p("Referente",
           "Actúas, enseñas o publicas de forma profesional y continuada.",
           "Otros músicos aprenden de ti o estudian tu forma de tocar.",
           "No tienes lagunas técnicas ni de estilo en tu terreno."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# IDIOMA — con el Marco Común Europeo (A1 → C2) como referencia
# ═══════════════════════════════════════════════════════════════════
IDIOMA = _plan(
    [
        "Entiendes y usas frases muy básicas (A1): saludar, presentarte, pedir algo.",
        "Te desenvuelves en situaciones cotidianas y mantienes conversaciones sencillas (A2–B1).",
        "Conversas con fluidez sobre temas generales y sigues series y artículos (B2).",
        "Te expresas con soltura y precisión, también en el trabajo o en la universidad (C1).",
        "Dominio casi nativo: matices, humor, registros y textos complejos (C2).",
        "Usas el idioma como un nativo culto: traduces, enseñas o escribes con estilo propio.",
    ],
    [
        [
            _m("20 palabras con repaso espaciado", 15,
               "Repasa tus tarjetas pendientes (Anki o similar) y añade 20 palabras nuevas sacadas de algo que hayas "
               "leído u oído, cada una con su frase de ejemplo. Hecho cuando no te queden tarjetas pendientes hoy."),
            _m("Shadowing de 5 minutos", 15,
               "Pon un audio corto con transcripción y repítelo en voz alta a la vez que el hablante, imitando ritmo "
               "y entonación. Hecho cuando digas el fragmento entero a la vez que el audio."),
            _m("Diario de 5 frases", 15,
               "Escribe 5 frases sobre tu día sin traductor. Corrígelas con un diccionario o un corrector y apunta "
               "cada error. Hecho cuando reescribas las 5 ya corregidas."),
            _m("Escucha activa", 20,
               "Escucha un audio de tu nivel dos veces: sin texto y después con la transcripción, apuntando lo que "
               "no entendiste. Hecho cuando entiendas la idea principal sin mirar el texto."),
            _m("Habla solo 3 minutos", 15,
               "Grábate 3 minutos hablando de algo sencillo (tu casa, tu trabajo, tu plan de mañana) sin pararte. "
               "Busca las palabras que te faltaron. Hecho cuando repitas la grabación usándolas."),
            _m("Gramática en contexto", 20,
               "Aprende una estructura (un tiempo verbal, una preposición) con 5 ejemplos reales sacados de textos y "
               "escribe 5 frases tuyas con ella. Hecho cuando las 5 estén corregidas."),
        ],
        [
            _m("Episodio con subtítulos en el idioma", 30,
               "Mira un episodio con subtítulos en el idioma, nunca en español. Apunta 10 expresiones nuevas y "
               "pásalas a tus tarjetas. Hecho cuando tengas las 10 con su contexto."),
            _m("Conversación real", 20,
               "Habla 15 minutos con un nativo o un compañero de intercambio (Tandem, HelloTalk, italki) sin pasar "
               "al español. Hecho cuando apuntes 3 errores que te corrigieron o que notaste."),
            _m("Lectura intensiva", 25,
               "Lee un artículo de un periódico en el idioma y resúmelo por escrito en 5 líneas con tus palabras. "
               "Hecho cuando el resumen esté escrito sin volver a mirar el texto."),
            _m("Pronunciación fina", 15,
               "Trabaja un par de sonidos que confundes con pares mínimos (como ship/sheep): escucha, repite y "
               "grábate. Hecho cuando tu grabación distinga claramente los dos sonidos."),
            _m("150 palabras corregidas", 25,
               "Escribe 150 palabras dando tu opinión sobre un tema y que te las corrija alguien o una herramienta. "
               "Hecho cuando reescribas el texto final sin errores."),
            _m("Piensa en el idioma", 15,
               "Durante un paseo o una tarea, narra en voz baja lo que haces y piensas, solo en el idioma. Apunta "
               "cada palabra que te falte. Hecho cuando las hayas buscado todas."),
        ],
        [
            _m("Registro formal", 30,
               "Escribe 300 palabras en registro formal (un correo profesional, una carta, un ensayo breve) con "
               "conectores avanzados. Hecho cuando lo revises y no queden errores ni repeticiones."),
            _m("Debate grabado", 20,
               "Elige un tema polémico y grábate 5 minutos defendiendo una postura y después la contraria. Hecho "
               "cuando la grabación no tenga muletillas en español ni silencios largos."),
            _m("Literatura sin diccionario", 40,
               "Lee 20 páginas de una novela o un ensayo escritos para nativos, consultando solo palabras clave. "
               "Hecho cuando puedas contar lo leído con detalle."),
            _m("Modismos y humor", 20,
               "Aprende 5 expresiones idiomáticas o chistes del idioma, entiende por qué funcionan y úsalos. Hecho "
               "cuando hayas usado al menos 2 en una conversación o un texto real."),
            _m("Traducción de ida y vuelta", 30,
               "Traduce al español un párrafo de un buen autor y, sin mirar el original, devuélvelo al idioma. "
               "Compara las dos versiones. Hecho cuando apuntes 3 diferencias de estilo."),
            _m("Acento y prosodia", 20,
               "Imita durante 10 minutos a un hablante concreto (un actor, un periodista): ritmo, entonación y "
               "enlaces entre palabras. Hecho cuando tu grabación suene a ese acento."),
        ],
    ],
    [
        [
            _m("Primera conversación", 60,
               "Ten esta semana una conversación de al menos 10 minutos con un nativo o un profesor. Hecho cuando "
               "apuntes lo que entendiste y lo que no."),
            _m("Siete días de tarjetas", 70,
               "Repasa tus tarjetas los 7 días de la semana sin saltarte ninguno. Hecho cuando cierres el domingo "
               "con el mazo al día."),
            _m("Mini presentación", 60,
               "Prepara y graba una presentación de 3 minutos sobre ti o tu trabajo, sin leer. Hecho cuando la "
               "grabación esté completa."),
        ],
        [
            _m("Película completa y reseña", 120,
               "Mira una película entera con subtítulos en el idioma y escribe una reseña de 150 palabras. Hecho "
               "cuando la reseña esté corregida."),
            _m("Tres conversaciones", 90,
               "Ten tres conversaciones de 20 minutos con personas distintas. Hecho cuando sumes las tres."),
            _m("Sección de examen oficial", 90,
               "Haz cronometrada una sección completa (comprensión lectora o auditiva) de un examen oficial de tu "
               "nivel objetivo (Cambridge, DELF, Goethe…). Hecho cuando la corrijas y apuntes la nota."),
        ],
        [
            _m("Libro de la semana", 240,
               "Termina un libro (o la mitad de uno largo) en el idioma. Hecho cuando escribas una reseña crítica de "
               "300 palabras."),
            _m("Examen completo C1/C2", 240,
               "Haz un examen de práctica completo de nivel C1 o C2, cronometrado. Hecho cuando lo corrijas y sepas "
               "qué parte flojea."),
            _m("Contenido propio", 180,
               "Publica algo en el idioma para nativos: un artículo, un vídeo, un hilo. Hecho cuando esté publicado."),
        ],
    ],
    [
        _p("Conversación sin red",
           "Mantienes una conversación de 10 minutos sin pasar al español.",
           "Escribes un correo sencillo que un nativo entiende sin esfuerzo.",
           "Superas una prueba de comprensión auditiva de nivel A2 o B1."),
        _p("Nivel B2",
           "Apruebas un examen de práctica B2 (o el oficial).",
           "Sigues una serie con subtítulos en el idioma sin pausar.",
           "Debates 10 minutos sobre un tema de actualidad."),
        _p("Nivel C1",
           "Apruebas un examen de práctica C1 (o el oficial).",
           "Has leído un libro completo escrito para nativos.",
           "Pasas una hora hablando con nativos sin agotarte ni perderte."),
        _p("Nivel C2",
           "Apruebas un C2 oficial o de práctica con holgura.",
           "Escribes textos profesionales que no necesitan corrección.",
           "Entiendes el humor, la ironía y los dobles sentidos."),
        _p("Nativo culto",
           "Trabajas, enseñas o traduces profesionalmente en el idioma.",
           "Los nativos no detectan errores en tu forma de hablar ni de escribir.",
           "Disfrutas la literatura compleja sin esfuerzo."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# PROGRAMACIÓN
# ═══════════════════════════════════════════════════════════════════
PROGRAMACION = _plan(
    [
        "Escribes programas pequeños siguiendo tutoriales y entiendes variables, condiciones y bucles.",
        "Resuelves ejercicios sin mirar la solución, usas Git y terminas programas propios pequeños.",
        "Construyes y despliegas aplicaciones completas, con pruebas y código legible.",
        "Diseñas sistemas, depuras código ajeno grande y escribes código que otros quieren mantener.",
        "Nivel sénior: arquitectura, rendimiento, seguridad y mentoría.",
        "Eres referente: resuelves lo que otros séniors no pueden y tus contribuciones se reconocen.",
    ],
    [
        [
            _m("Kata de 20 minutos", 20,
               "Resuelve un ejercicio corto (Exercism, Codewars, LeetCode fácil) sin mirar soluciones. Después lee "
               "dos soluciones ajenas y mejora la tuya. Hecho cuando tu versión final pase todas las pruebas."),
            _m("Lee código ajeno", 15,
               "Lee 50 líneas de un proyecto de código abierto bien hecho y explica en comentarios qué hace cada "
               "función. Hecho cuando puedas contar el flujo sin mirar."),
            _m("Un commit con sentido", 25,
               "Avanza tu proyecto propio con un cambio pequeño y completo, con un mensaje de commit que explique el "
               "porqué. Hecho cuando el commit esté subido."),
            _m("Rompe y arregla", 15,
               "Mete a propósito un error en un programa que funcione, lee el mensaje y la traza completos y "
               "arréglalo sin buscar en internet. Hecho cuando sepas explicar qué decía el error."),
            _m("Documentación oficial", 15,
               "Lee una sección de la documentación oficial de tu lenguaje (no un tutorial) y ejecuta cada ejemplo. "
               "Hecho cuando hayas escrito un ejemplo propio que funcione."),
            _m("Escribe tus pruebas", 20,
               "Escribe pruebas automáticas para una función tuya: un caso normal, un caso límite y un caso de "
               "error. Hecho cuando las 3 pasen."),
        ],
        [
            _m("Algoritmo del día", 30,
               "Resuelve un problema de nivel medio y escribe su complejidad en tiempo y en memoria. Hecho cuando la "
               "solución pase y sepas justificar la complejidad."),
            _m("Refactor de 30 minutos", 30,
               "Elige el peor trozo de tu código y mejóralo sin cambiar lo que hace: nombres, funciones pequeñas, "
               "duplicados fuera. Hecho cuando las pruebas sigan en verde."),
            _m("Depuración con método", 30,
               "Investiga un error real: reprodúcelo, aísla la causa con un depurador o con registros y escribe una "
               "prueba que lo capture. Hecho cuando la causa raíz quede anotada."),
            _m("Un concepto a fondo", 30,
               "Estudia algo que usas sin entender del todo (closures, el event loop, los índices, la concurrencia) "
               "y escribe un ejemplo mínimo que lo demuestre. Hecho cuando se lo puedas explicar a alguien."),
            _m("Revisión de código", 20,
               "Revisa un pull request ajeno, o tu propio código de hace un mes, y deja 5 comentarios concretos. "
               "Hecho cuando cada comentario proponga una mejora."),
            _m("Mide antes de optimizar", 30,
               "Perfila una parte lenta de un programa, cambia solo lo que el perfil señala y vuelve a medir. Hecho "
               "cuando tengas las dos cifras."),
        ],
        [
            _m("Diseño antes que código", 40,
               "Escribe un documento de decisión breve (ADR) para una funcionalidad: contexto, opciones, decisión y "
               "consecuencias. Hecho cuando otra persona pudiera implementarla leyéndolo."),
            _m("Contribución de código abierto", 45,
               "Avanza una contribución a un proyecto ajeno: lee su guía, elige un issue y prepara el cambio. Hecho "
               "cuando el pull request esté enviado o avance claramente."),
            _m("Auditoría de seguridad", 40,
               "Revisa tu proyecto contra el OWASP Top 10 y corrige el hallazgo más grave. Hecho cuando el arreglo "
               "tenga su prueba."),
            _m("Enseña o escribe", 40,
               "Escribe un artículo o graba una explicación de algo que dominas, con código de ejemplo. Hecho cuando "
               "esté listo para publicar."),
            _m("Sistema a escala", 40,
               "Diseña en papel un sistema real (un acortador de enlaces, un chat) para un millón de usuarios: "
               "datos, colas, caché y cuellos de botella. Hecho cuando identifiques el primer cuello de botella."),
            _m("Herramienta propia", 45,
               "Automatiza con un script o una herramienta una tarea que repites a menudo. Hecho cuando la hayas "
               "usado de verdad."),
        ],
    ],
    [
        [
            _m("Mini proyecto en GitHub", 120,
               "Termina un programa pequeño y útil (un conversor, un juego simple, una utilidad) y súbelo a GitHub "
               "con su README. Hecho cuando el repositorio esté publicado."),
            _m("Cinco katas", 100,
               "Resuelve 5 ejercicios en días distintos de la semana. Hecho cuando sumes los 5."),
            _m("Git sin miedo", 60,
               "Practica ramas, fusiones, conflictos y deshacer cambios en un repositorio de prueba. Hecho cuando "
               "hayas resuelto un conflicto tú solo."),
        ],
        [
            _m("Funcionalidad en producción", 180,
               "Añade a tu proyecto una funcionalidad completa, con pruebas, y despliégala. Hecho cuando funcione en "
               "producción."),
            _m("Concurso de programación", 120,
               "Participa en un concurso (Codeforces, Advent of Code, un hackathon). Hecho cuando hayas enviado "
               "soluciones."),
            _m("Tecnología nueva", 150,
               "Aprende lo básico de una herramienta nueva para ti (un framework, una base de datos, Docker) y "
               "construye algo pequeño con ella. Hecho cuando funcione."),
        ],
        [
            _m("Calidad de producción", 240,
               "Lleva un proyecto a calidad de producción: pruebas, integración continua, registros, gestión de "
               "errores y documentación. Hecho cuando supere una revisión exigente."),
            _m("Pull request aceptado", 180,
               "Consigue que acepten un pull request tuyo en un proyecto que no es tuyo. Hecho cuando esté fusionado."),
            _m("Charla o artículo técnico", 180,
               "Prepara una charla o un artículo técnico de fondo. Hecho cuando lo presentes o lo publiques."),
        ],
    ],
    [
        _p("Programas propios",
           "Has publicado un programa propio que funciona.",
           "Resuelves 10 ejercicios básicos sin mirar soluciones.",
           "Usas Git con soltura: ramas, commits y fusiones."),
        _p("Aplicación completa",
           "Has desplegado una aplicación o API que otros pueden usar.",
           "Tu proyecto tiene pruebas automáticas y un README claro.",
           "Resuelves problemas de nivel medio y justificas su complejidad."),
        _p("Código ajeno y diseño",
           "Te orientas y contribuyes en una base de código ajena y grande.",
           "Diseñas, depuras y refactorizas con método.",
           "Un programador experto ha revisado tu código y lo valora bien."),
        _p("Sénior",
           "Mantienes un sistema en producción con usuarios reales.",
           "Dominas rendimiento, seguridad y arquitectura.",
           "Mentorizas a otros programadores."),
        _p("Referente",
           "La comunidad reconoce tus contribuciones.",
           "Resuelves problemas que otros séniors no saben resolver.",
           "Eres referente en tu área técnica."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# DIBUJO Y PINTURA
# ═══════════════════════════════════════════════════════════════════
ARTE = _plan(
    [
        "Dibujas líneas y formas sencillas y copias objetos con dificultad.",
        "Construyes objetos con formas básicas, perspectiva sencilla y luz y sombra creíbles.",
        "Dibujas del natural con buenas proporciones, figura humana básica y composición.",
        "Tu obra transmite intención: anatomía, luz y color con soltura y un estilo reconocible.",
        "Trabajas a nivel profesional: encargos, exposiciones o publicaciones con calidad constante.",
        "Eres referente: tu estilo es inconfundible y otros artistas aprenden de ti.",
    ],
    [
        [
            _m("Cien líneas y elipses", 15,
               "Llena una página de líneas rectas trazadas desde el hombro y otra de elipses, a un solo trazo y sin "
               "corregir. Hecho cuando la última fila esté claramente más limpia que la primera."),
            _m("Cubos en perspectiva", 20,
               "Dibuja 15 cubos en perspectiva de 2 puntos, girados y a distintas alturas, y comprueba con regla "
               "hacia dónde fugan sus líneas. Hecho cuando los 5 últimos fuguen bien."),
            _m("Del natural con 3 valores", 25,
               "Dibuja un objeto real con luz lateral usando solo 3 tonos: luz, sombra y sombra proyectada. Hecho "
               "cuando se entienda de dónde viene la luz."),
            _m("Gestos de 60 segundos", 15,
               "Haz 10 dibujos de gesto de figuras humanas con fotos de referencia, 60 segundos cada uno: solo "
               "movimiento y línea de acción. Hecho cuando completes los 10."),
            _m("Copia de un maestro", 25,
               "Copia un dibujo de un maestro (Loomis, Vilppu, Da Vinci) intentando entender cada trazo. Hecho "
               "cuando, puestos uno al lado del otro, las proporciones coincidan."),
            _m("Escala de valores", 15,
               "Pinta una escala de 5 pasos del blanco al negro con tu material y sombrea una esfera usándola. Hecho "
               "cuando la esfera parezca redonda."),
        ],
        [
            _m("Figuras de 5 minutos", 25,
               "Dibuja 5 figuras de 5 minutos con referencia: gesto, construcción con volúmenes y proporciones. "
               "Hecho cuando las 5 tengan proporciones creíbles."),
            _m("Estudio de anatomía", 25,
               "Estudia una zona (la mano, el torso, la rodilla) y dibújala desde 3 ángulos con referencias "
               "anatómicas. Hecho cuando puedas dibujarla una vez de memoria."),
            _m("Miniaturas de composición", 20,
               "Haz 6 miniaturas de una misma escena con composiciones distintas (tercios, diagonal, contraluz…). "
               "Hecho cuando elijas la mejor y sepas explicar por qué funciona."),
            _m("Estudio de luz", 25,
               "Dibuja o pinta la misma escena con dos luces distintas (cálida lateral y fría cenital). Hecho cuando "
               "cada versión transmita un ambiente diferente."),
            _m("De memoria", 20,
               "Mira una referencia 2 minutos, apártala y dibújala de memoria. Compara y marca los errores en rojo. "
               "Hecho cuando una segunda versión corrija lo marcado."),
            _m("Paleta limitada", 30,
               "Pinta un estudio rápido con solo 3 colores más blanco. Hecho cuando consigas armonía sin echar de "
               "menos ningún color."),
        ],
        [
            _m("Pieza con intención", 45,
               "Avanza una obra con un objetivo expresivo escrito antes de empezar: qué emoción, qué foco. Hecho "
               "cuando el foco de la imagen se lea en 3 segundos."),
            _m("Estudio profundo de un maestro", 45,
               "Analiza una obra maestra (composición, valores, color, bordes) y haz un estudio que reproduzca uno "
               "de esos aspectos. Hecho cuando puedas explicar cómo lo resolvió su autor."),
            _m("Ilustración en 30 minutos", 30,
               "Haz una ilustración completa sobre un tema al azar con 30 minutos cerrados. Hecho cuando esté "
               "terminada a tiempo."),
            _m("Diseño de personaje", 40,
               "Diseña un personaje con 3 variaciones de silueta, elige una y dale paleta. Hecho cuando la silueta "
               "se reconozca rellena de negro."),
            _m("Crítica de artistas", 30,
               "Enseña una obra reciente a artistas mejores que tú y pide críticas concretas. Hecho cuando hayas "
               "corregido algo siguiendo una de ellas."),
            _m("La debilidad del mes", 40,
               "Dedica la sesión a lo que peor dibujas (manos, pies, perfiles, vehículos…) con referencias. Hecho "
               "cuando completes 10 estudios rápidos de esa debilidad."),
        ],
    ],
    [
        [
            _m("Lámina de formas", 60,
               "Dibuja una lámina de cilindros, esferas, conos y cubos en distintas perspectivas y con sombra. Hecho "
               "cuando la lámina esté completa."),
            _m("Bodegón terminado", 90,
               "Dibuja del natural un bodegón de 3 objetos con sombras y texturas, en varias sesiones si hace falta. "
               "Hecho cuando esté terminado y firmado."),
            _m("Cuaderno de 7 días", 70,
               "Dibuja algo en tu cuaderno los 7 días de la semana, aunque sean 10 minutos. Hecho cuando haya 7 "
               "páginas nuevas."),
        ],
        [
            _m("Figura completa", 120,
               "Dibuja una figura humana completa de 1–2 horas con referencia: construcción, anatomía y luz. Hecho "
               "cuando esté terminada."),
            _m("Escena en perspectiva", 120,
               "Dibuja una escena (una calle, una habitación) en perspectiva de 2 o 3 puntos, con personas a escala. "
               "Hecho cuando las proporciones cuadren."),
            _m("Copia en color", 120,
               "Copia en color un cuadro de un maestro, atento a la temperatura del color. Hecho cuando se reconozca "
               "el ambiente del original."),
        ],
        [
            _m("Obra de portafolio", 240,
               "Termina una obra completa con calidad de portafolio. Hecho cuando puedas enseñarla sin justificarte."),
            _m("Serie de tres", 240,
               "Crea una serie de 3 piezas con un tema y un estilo comunes. Hecho cuando las tres estén terminadas."),
            _m("Expón o publica", 120,
               "Publica tu mejor obra reciente donde la vean artistas (exposición, redes, concurso). Hecho cuando "
               "esté publicada y hayas recogido opiniones."),
        ],
    ],
    [
        _p("Construcción y valor",
           "Dibujas 30 cubos en perspectiva sin errores de fuga.",
           "Sombreas un objeto con 5 valores y se ve tridimensional.",
           "Llevas un cuaderno de unas 50 páginas de práctica."),
        _p("Del natural",
           "Dibujas una figura humana proporcionada en 10 minutos.",
           "Dibujas una escena en perspectiva convincente.",
           "Alguien ajeno al dibujo considera buena una de tus piezas."),
        _p("Portafolio",
           "Tienes un portafolio de 10 obras de calidad constante.",
           "Dibujas de memoria figuras y objetos con soltura.",
           "Has aplicado críticas de artistas mejores que tú."),
        _p("Nivel profesional",
           "Tu trabajo tiene calidad de encargo profesional.",
           "Dominas anatomía, luz y color.",
           "Has vendido, expuesto o publicado obra."),
        _p("Referente",
           "Tu estilo es propio y reconocible.",
           "Expones o publicas de forma recurrente.",
           "Enseñas o eres referencia para otros artistas."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# DEPORTE Y TÉCNICA FÍSICA — artes marciales, escalada, calistenia, baile…
# ═══════════════════════════════════════════════════════════════════
DEPORTE = _plan(
    [
        "Conoces los gestos básicos de {h} y los haces despacio, con correcciones.",
        "Ejecutas la técnica básica con buena forma y conoces las reglas y la seguridad.",
        "Tu técnica aguanta el cansancio y compites o te examinas a nivel intermedio.",
        "Lees la táctica, combinas recursos con fluidez y consigues resultados en competición.",
        "Nivel alto o de instructor: corriges a otros y tus marcas destacan.",
        "Maestría reconocida: podios, nivel profesional o una técnica que sirve de modelo.",
    ],
    [
        [
            _m("Técnica a cámara lenta", 20,
               "Repite el gesto básico de {h} a cámara lenta, 3 series de 10, pendiente de una sola clave técnica "
               "(apoyo, postura o respiración). Hecho cuando las 10 últimas salgan igual que la primera."),
            _m("Movilidad específica", 15,
               "Haz 15 minutos de movilidad de las articulaciones que más exige {h}. Hecho cuando completes la "
               "rutina entera sin prisas."),
            _m("Grábate desde dos ángulos", 20,
               "Grábate haciendo el gesto principal desde dos ángulos y compáralo con el vídeo de alguien de nivel "
               "alto. Hecho cuando apuntes 2 diferencias concretas."),
            _m("5×5 perfectas", 20,
               "Haz 5 series de 5 repeticiones de un fundamento de {h} con forma perfecta; la que salga mal no "
               "cuenta. Hecho cuando sumes 25 buenas."),
            _m("Equilibrio y control", 15,
               "Trabaja equilibrio y control del cuerpo con ejercicios propios de {h}: apoyos a una pierna, pausas, "
               "isometrías. Hecho cuando aguantes cada posición el tiempo marcado."),
            _m("Reglas y táctica básica", 15,
               "Estudia una regla o un principio táctico básico de {h} y busca un ejemplo en vídeo. Hecho cuando "
               "puedas explicarlo con tus palabras."),
        ],
        [
            _m("Técnica bajo fatiga", 25,
               "Tras un bloque intenso de esfuerzo, haz 3 series del gesto técnico clave cuidando la forma. Hecho "
               "cuando la técnica aguante igual que en fresco."),
            _m("Combinaciones", 25,
               "Encadena 2 o 3 recursos técnicos de {h}, primero despacio y luego a ritmo. Hecho cuando salgan 5 "
               "veces seguidas con fluidez."),
            _m("Análisis de élite", 20,
               "Mira 15 minutos a un deportista de élite de {h} fijándote solo en una cosa (apoyos, ritmo, "
               "decisiones). Hecho cuando apuntes 3 detalles que vas a probar."),
            _m("Práctica con oposición", 30,
               "Practica con un compañero o en una situación real controlada (sparring, partido, vía, pareja de "
               "baile) con un objetivo técnico. Hecho cuando sepas si lo cumpliste."),
            _m("Fuerza específica", 25,
               "Haz una sesión corta de fuerza para los músculos que más exige {h}. Hecho cuando completes todas las "
               "series con buena técnica."),
            _m("Ritmo y respiración", 20,
               "Trabaja el ritmo y la respiración del gesto principal con metrónomo, conteo o música. Hecho cuando "
               "lo mantengas 3 minutos sin perderlo."),
        ],
        [
            _m("Sesión con objetivo medible", 45,
               "Planifica y haz una sesión con un objetivo que se pueda medir (tiempo, repeticiones, precisión, "
               "carga). Hecho cuando apuntes el resultado y lo compares con la última vez."),
            _m("Simulación de competición", 45,
               "Reproduce las condiciones de una competición: calentamiento, tiempos, presión y sin repetir "
               "intentos. Hecho cuando completes la simulación entera."),
            _m("Corrección experta", 40,
               "Entrena con un entrenador o alguien de nivel superior y pídele una corrección concreta. Hecho cuando "
               "la hayas aplicado en la misma sesión."),
            _m("Plan táctico", 30,
               "Analiza a un rival o una situación típica y prepara un plan táctico con alternativas. Hecho cuando "
               "lo hayas ensayado."),
            _m("Recuperación inteligente", 30,
               "Haz una sesión de recuperación activa (movilidad, técnica suave) y revisa tu descanso y tu "
               "alimentación de la semana. Hecho cuando apuntes un ajuste concreto."),
            _m("Enseña el gesto", 30,
               "Enseña un gesto técnico de {h} a alguien con menos nivel. Hecho cuando esa persona lo haga mejor que "
               "al empezar."),
        ],
    ],
    [
        [
            _m("Clase con alguien mejor", 90,
               "Toma una clase o entrena una sesión con alguien de más nivel en {h}. Hecho cuando apuntes las "
               "correcciones que te dio."),
            _m("Tres sesiones de técnica", 120,
               "Haz tres sesiones centradas solo en técnica, sin buscar cansarte. Hecho cuando sumes las tres."),
            _m("Vídeo comparado", 60,
               "Grábate el lunes y el domingo haciendo lo mismo y compara. Hecho cuando apuntes qué ha mejorado."),
        ],
        [
            _m("Competición o reto", 120,
               "Participa en una competición, un examen de grado o un reto con marca. Hecho cuando tengas el "
               "resultado."),
            _m("Plan de 4 sesiones", 180,
               "Planifica y cumple 4 sesiones con objetivos distintos: técnica, físico, táctica y recuperación. "
               "Hecho cuando las 4 estén hechas."),
            _m("Marca personal", 90,
               "Intenta batir una marca personal medible de {h}. Hecho cuando hayas hecho el intento y anotado la "
               "cifra."),
        ],
        [
            _m("Competición seria", 180,
               "Compite o examínate al nivel más alto que tengas a tu alcance. Hecho cuando analices el resultado "
               "por escrito."),
            _m("Bloque de entrenamiento", 240,
               "Diseña el bloque de las próximas 4 semanas con su progresión y cumple esta semana. Hecho cuando la "
               "primera semana esté completa."),
            _m("Imparte una clase", 90,
               "Dirige una clase o un entrenamiento para otras personas. Hecho cuando hayas recogido su opinión."),
        ],
    ],
    [
        _p("Forma validada",
           "Un instructor, o un vídeo comparado, valida tu forma en los gestos básicos.",
           "Completas una sesión típica de {h} sin perder la técnica.",
           "Conoces las reglas y las normas de seguridad."),
        _p("Nivel intermedio",
           "Has competido o superado un grado o examen intermedio.",
           "Tu técnica se mantiene aunque estés cansado.",
           "Un instructor te considera de nivel intermedio."),
        _p("Nivel avanzado",
           "Consigues resultados en competición o un grado avanzado.",
           "Lees la táctica y adaptas tu plan durante la acción.",
           "Sigues un plan de entrenamiento periodizado."),
        _p("Experto",
           "Compites a nivel alto o eres instructor.",
           "Corriges con acierto la técnica de otros.",
           "Tus marcas destacan en tu categoría."),
        _p("Maestro",
           "Logras podios o compites a nivel profesional.",
           "La comunidad de {h} reconoce tu maestría.",
           "Tu técnica es modelo para otros."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# ESCRITURA
# ═══════════════════════════════════════════════════════════════════
ESCRITURA = _plan(
    [
        "Escribes de vez en cuando y te cuesta terminar lo que empiezas.",
        "Escribes con constancia y terminas textos breves claros y correctos.",
        "Tienes voz propia, estructuras bien y reescribes con criterio.",
        "Tus textos enganchan a lectores reales: dominas ritmo, diálogo y edición.",
        "Publicas con filtro editorial o profesional y terminas proyectos largos.",
        "Tu obra es reconocida e influye en tu género.",
    ],
    [
        [
            _m("300 palabras sin parar", 15,
               "Escribe 300 palabras seguidas sobre lo que quieras, sin borrar ni corregir. Hecho cuando llegues a "
               "300."),
            _m("Imita a un autor", 20,
               "Copia a mano un párrafo de un autor que admires y escribe uno tuyo con su misma estructura sobre "
               "otro tema. Hecho cuando el tuyo suene a ese estilo."),
            _m("Recorta un 30 %", 15,
               "Toma un texto tuyo y quítale un 30 % de palabras sin perder información. Hecho cuando quede más "
               "corto y mejor."),
            _m("Descripción con cuatro sentidos", 15,
               "Describe un lugar real en 150 palabras con al menos 4 sentidos y ningún adjetivo vago (bonito, "
               "increíble). Hecho cuando alguien pueda imaginarlo."),
            _m("Diálogo con conflicto", 20,
               "Escribe una página de diálogo entre dos personajes que quieren cosas distintas, sin acotaciones de "
               "más. Hecho cuando el conflicto se entienda solo por lo que dicen."),
            _m("Lectura de oficio", 20,
               "Lee 10 páginas de un buen libro como escritor: subraya 3 recursos (un comienzo, una transición, una "
               "imagen) y explica por qué funcionan. Hecho cuando los tengas anotados."),
        ],
        [
            _m("Escena completa", 30,
               "Escribe una escena con planteamiento, conflicto y giro. Hecho cuando tenga un final que cambie algo."),
            _m("Reescritura profunda", 30,
               "Reescribe un texto tuyo antiguo desde cero, sin copiar ninguna frase. Hecho cuando la nueva versión "
               "sea claramente mejor."),
            _m("Ensayo de 500 palabras", 30,
               "Escribe un ensayo breve con una tesis clara y 3 argumentos. Hecho cuando la tesis quepa en una línea."),
            _m("Ritmo en voz alta", 20,
               "Lee en voz alta tu último texto y corrige cada frase que te haga tropezar. Hecho cuando lo leas "
               "entero sin tropiezos."),
            _m("Pide una crítica", 20,
               "Envía un texto a un lector de confianza con 3 preguntas concretas. Hecho cuando tengas sus respuestas "
               "y un plan de cambios."),
            _m("Poema con forma fija", 25,
               "Escribe un poema con forma fija (soneto, haiku, décima). Hecho cuando cumpla la métrica."),
        ],
        [
            _m("Mil palabras del proyecto", 45,
               "Avanza 1.000 palabras de tu proyecto largo. Hecho cuando las sumes."),
            _m("Edición con lupa", 40,
               "Edita un capítulo: estructura, ritmo, coherencia y estilo. Hecho cuando esté listo para un lector de "
               "fuera."),
            _m("Envío", 30,
               "Prepara un envío a una revista, un concurso, una editorial o un agente. Hecho cuando esté enviado."),
            _m("Análisis de un maestro", 30,
               "Analiza un capítulo de un maestro de tu género: estructura, información y tensión. Hecho cuando "
               "apliques uno de sus recursos a tu texto."),
            _m("Relato en 45 minutos", 45,
               "Escribe un relato completo con tiempo cerrado. Hecho cuando tenga final."),
            _m("Taller de escritura", 40,
               "Participa en un taller o un club de escritura: comparte y critica. Hecho cuando hayas dado y "
               "recibido crítica."),
        ],
    ],
    [
        [
            _m("Relato de 1.000 palabras", 90,
               "Escribe y termina un relato de unas 1.000 palabras. Hecho cuando lo hayas revisado al menos una vez."),
            _m("Cinco días escribiendo", 100,
               "Escribe al menos 20 minutos cinco días de esta semana. Hecho cuando sumes los cinco."),
            _m("Lector de prueba", 60,
               "Consigue que alguien lea un texto tuyo y te dé su opinión sincera. Hecho cuando la tengas."),
        ],
        [
            _m("Publica", 120,
               "Publica un texto en un blog, una revista digital o un boletín. Hecho cuando esté publicado."),
            _m("Tres borradores", 150,
               "Escribe tres borradores distintos de una misma idea y elige el mejor. Hecho cuando tengas los tres."),
            _m("Concurso literario", 120,
               "Presenta un texto a un concurso literario. Hecho cuando esté enviado."),
        ],
        [
            _m("Capítulo terminado", 240,
               "Termina y edita un capítulo del proyecto largo. Hecho cuando esté listo para un lector."),
            _m("Envío profesional", 180,
               "Prepara un envío completo (sinopsis, muestra y carta) a editoriales o agentes. Hecho cuando esté "
               "enviado."),
            _m("Lectura pública", 120,
               "Lee tu obra en público: un recital, una presentación, un pódcast. Hecho cuando la hayas leído."),
        ],
    ],
    [
        _p("Constancia",
           "Has escrito con regularidad durante un mes.",
           "Has terminado 3 textos completos.",
           "Has reescrito un texto aplicando críticas."),
        _p("Voz propia",
           "Has terminado 10 textos.",
           "Tienes un estilo que otros reconocen.",
           "Has publicado o presentado algo a concurso."),
        _p("Lectores reales",
           "Tienes lectores reales que vuelven.",
           "Has escrito un proyecto de más de 20.000 palabras.",
           "Has aplicado críticas de escritores con experiencia."),
        _p("Publicación",
           "Has publicado con filtro editorial o profesional.",
           "Has terminado un proyecto largo.",
           "Has ganado un premio o has quedado finalista."),
        _p("Obra reconocida",
           "Tu obra está reconocida.",
           "Influyes en otros escritores.",
           "Dominas tu género."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# ESTUDIO ACADÉMICO — una asignatura, una carrera, unas oposiciones
# ═══════════════════════════════════════════════════════════════════
ESTUDIO = _plan(
    [
        "Lees apuntes y te cuesta distinguir lo importante.",
        "Explicas los conceptos básicos sin apuntes y resuelves los ejercicios tipo.",
        "Apruebas con nota, resuelves problemas nuevos y estudias con método.",
        "Dominas la materia: la explicas a otros y relacionas temas.",
        "Aplicas el conocimiento en proyectos o investigación y lees literatura científica.",
        "Generas conocimiento nuevo: publicas, enseñas o investigas.",
    ],
    [
        [
            _m("Recuperación activa", 20,
               "Cierra los apuntes y escribe todo lo que recuerdes de un tema. Compara y marca en rojo lo que "
               "faltaba. Hecho cuando hayas repasado lo marcado."),
            _m("Tarjetas al día", 15,
               "Repasa tus tarjetas de repaso espaciado y crea 10 nuevas del último tema. Hecho cuando no te queden "
               "tarjetas pendientes."),
            _m("Tres ejercicios sin mirar", 25,
               "Resuelve 3 ejercicios del tema sin consultar la solución hasta terminar. Hecho cuando los corrijas y "
               "entiendas cada error."),
            _m("Técnica Feynman", 20,
               "Explica un concepto difícil en una hoja como si se lo contaras a alguien de 12 años; donde te "
               "atasques, vuelve al libro. Hecho cuando la explicación no tenga lagunas."),
            _m("Mapa conceptual", 20,
               "Haz un mapa conceptual de un tema con sus relaciones. Hecho cuando cada flecha lleve un verbo que "
               "explique la relación."),
            _m("Dos pomodoros profundos", 50,
               "Haz 2 bloques de 25 minutos sin móvil ni distracciones, con un objetivo concreto. Hecho cuando "
               "cumplas el objetivo de los dos."),
        ],
        [
            _m("Problema nuevo", 30,
               "Resuelve un problema de examen que no hayas visto nunca. Hecho cuando lo resuelvas o sepas "
               "exactamente dónde te bloqueas."),
            _m("Cuaderno de errores", 20,
               "Repasa tu lista de errores y rehaz los 3 últimos ejercicios fallados. Hecho cuando salgan bien."),
            _m("Práctica intercalada", 30,
               "Mezcla ejercicios de 3 temas distintos en la misma sesión, sin saber de qué tema es cada uno. Hecho "
               "cuando hayas hecho al menos 6."),
            _m("Enseña un tema", 25,
               "Explica un tema a un compañero o grábate explicándolo. Hecho cuando respondas sus preguntas sin "
               "mirar."),
            _m("Fuente primaria", 30,
               "Lee el capítulo del libro de referencia o el artículo original de un tema, no los apuntes. Hecho "
               "cuando anotes algo que los apuntes no decían."),
            _m("Test relámpago", 15,
               "Hazte un test de 10 preguntas rápidas de temas pasados. Hecho cuando tengas la nota y hayas "
               "repasado los fallos."),
        ],
        [
            _m("Proyecto aplicado", 45,
               "Avanza un proyecto que aplique la materia a un problema real (una simulación, un prototipo, un "
               "análisis de datos). Hecho cuando tengas un resultado nuevo."),
            _m("Crítica de un artículo", 40,
               "Lee un artículo científico de tu campo y escribe su crítica: pregunta, método, resultados y límites. "
               "Hecho cuando la crítica esté escrita."),
            _m("Pregunta de investigación", 30,
               "Formula una pregunta abierta de tu campo y busca qué se sabe. Hecho cuando tengas 3 fuentes y una "
               "hipótesis."),
            _m("Clase de 20 minutos", 30,
               "Prepara y da, o graba, una clase de 20 minutos sobre un tema avanzado. Hecho cuando esté dada o "
               "grabada."),
            _m("Demostración sin mirar", 30,
               "Reproduce sin mirar una demostración o una derivación importante. Hecho cuando la completes."),
            _m("Conexiones", 25,
               "Relaciona un concepto de tu materia con otra disciplina y escribe una página. Hecho cuando la "
               "conexión aporte algo nuevo."),
        ],
    ],
    [
        [
            _m("Tema dominado", 120,
               "Elige un tema y domínalo esta semana: teoría, ejercicios y tarjetas. Hecho cuando lo expliques "
               "entero sin apuntes."),
            _m("Examen de otro año", 90,
               "Haz en tiempo real un examen de una convocatoria anterior. Hecho cuando lo corrijas con la solución."),
            _m("Cinco días de repaso", 100,
               "Repasa al menos 20 minutos cinco días de la semana. Hecho cuando sumes los cinco."),
        ],
        [
            _m("Simulacro completo", 180,
               "Haz un simulacro de examen completo en condiciones reales. Hecho cuando lo corrijas y sepas tu nota."),
            _m("Grupo de estudio", 120,
               "Organiza una sesión con compañeros en la que cada uno explique un tema. Hecho cuando hayas explicado "
               "el tuyo."),
            _m("Capítulo del manual", 150,
               "Estudia un capítulo entero del manual de referencia con sus ejercicios. Hecho cuando los resuelvas."),
        ],
        [
            _m("Mini investigación", 240,
               "Haz una pequeña investigación (datos, experimento o revisión bibliográfica) y escribe un informe. "
               "Hecho cuando el informe esté terminado."),
            _m("Ponencia", 180,
               "Presenta un trabajo en un seminario, una clase o un congreso. Hecho cuando la hayas dado."),
            _m("Colaboración académica", 120,
               "Colabora con un profesor o un investigador en algo concreto. Hecho cuando entregues tu parte."),
        ],
    ],
    [
        _p("Lo básico",
           "Explicas los conceptos básicos sin apuntes.",
           "Resuelves los ejercicios tipo del temario.",
           "Sacas un 5 o más en un examen de práctica."),
        _p("Con método",
           "Sacas un 7 o más en un examen real o un simulacro.",
           "Resuelves problemas nuevos, no solo los que ya has visto.",
           "Mantienes tus tarjetas de repaso al día."),
        _p("Dominio",
           "Sacas notable alto o sobresaliente.",
           "Explicas la materia a otros con claridad.",
           "Relacionas temas distintos de la materia."),
        _p("Aplicación",
           "Has aplicado la materia en un proyecto o una investigación.",
           "Lees literatura científica de tu campo.",
           "Un trabajo académico tuyo ha sido bien evaluado."),
        _p("Conocimiento nuevo",
           "Publicas o enseñas la materia.",
           "Eres una referencia en tu entorno académico.",
           "Generas conocimiento nuevo."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# COMUNICACIÓN Y ORATORIA
# ═══════════════════════════════════════════════════════════════════
COMUNICACION = _plan(
    [
        "Te pones nervioso al hablar en público y te cuesta ordenar las ideas.",
        "Hablas unos minutos ante un grupo con una estructura clara y pocas muletillas.",
        "Presentas sin leer, improvisas y respondes preguntas con calma.",
        "Convences a una audiencia y manejas preguntas hostiles y conversaciones difíciles.",
        "Das conferencias, lideras negociaciones y te invitan a hablar.",
        "Tus discursos mueven a la acción y formas a otros oradores.",
    ],
    [
        [
            _m("Dos minutos grabados", 15,
               "Grábate 2 minutos hablando de cualquier tema y cuenta tus muletillas (eh, o sea, ¿vale?). Hecho "
               "cuando repitas la grabación con la mitad de muletillas."),
            _m("Voz y respiración", 15,
               "Haz 10 minutos de respiración diafragmática y proyección: lee un texto en voz alta a distintas "
               "intensidades sin forzar la garganta. Hecho cuando la voz se mantenga estable."),
            _m("Estructura en tres", 15,
               "Prepara una intervención de 1 minuto con estructura: idea, 3 razones y cierre. Hecho cuando la digas "
               "sin notas."),
            _m("Escucha activa", 20,
               "En una conversación de hoy, escucha sin interrumpir y resume lo que te han dicho antes de responder. "
               "Hecho cuando la otra persona confirme que la has entendido."),
            _m("Mirada que sostiene", 15,
               "Habla 3 minutos a la cámara o a una persona, terminando cada frase con la mirada fija. Hecho cuando "
               "no la hayas apartado a mitad de frase."),
            _m("Analiza un discurso", 20,
               "Mira un buen discurso (una charla TED, un profesor brillante) y apunta cómo empieza, cómo se "
               "estructura y cómo cierra. Hecho cuando tengas 3 recursos para copiar."),
        ],
        [
            _m("Improvisación de 3 minutos", 15,
               "Saca un tema al azar y habla 3 minutos sin preparación, con estructura. Hecho cuando no te quedes en "
               "blanco."),
            _m("Historia personal", 20,
               "Prepara una anécdota tuya de 2 minutos con inicio, conflicto y aprendizaje, y cuéntasela a alguien. "
               "Hecho cuando la cuentes sin notas."),
            _m("Pausas en lugar de muletillas", 15,
               "Graba una intervención sustituyendo cada muletilla por un segundo de silencio. Hecho cuando la "
               "grabación tenga pausas y no muletillas."),
            _m("Argumenta las dos caras", 20,
               "Prepara los mejores argumentos a favor y en contra de una idea y defiéndela 3 minutos en voz alta. "
               "Hecho cuando hayas rebatido el mejor contraargumento."),
            _m("Lenguaje corporal", 20,
               "Grábate en vídeo hablando y analiza manos, postura y desplazamientos. Hecho cuando una segunda toma "
               "corrija lo peor."),
            _m("Conversación difícil", 20,
               "Prepara por escrito una conversación difícil que tengas pendiente (un no, un límite, una crítica): "
               "hechos, sentimiento y petición. Hecho cuando esté lista o la hayas tenido."),
        ],
        [
            _m("Ensayo completo", 30,
               "Ensaya de pie, con cronómetro, una charla de 10 minutos como si fuera real. Hecho cuando la termines "
               "a tiempo y sin leer."),
            _m("Propuesta persuasiva", 25,
               "Prepara una propuesta para un público concreto: su problema, tu solución y una llamada a la acción. "
               "Hecho cuando se la presentes a alguien."),
            _m("Preguntas incómodas", 20,
               "Escribe las 5 preguntas más incómodas que te podrían hacer y responde cada una en voz alta en menos "
               "de un minuto. Hecho cuando las 5 respuestas estén grabadas."),
            _m("Una idea, una historia", 25,
               "Construye una historia con personaje, conflicto y desenlace que ilustre una idea abstracta. Hecho "
               "cuando la cuentes en 3 minutos."),
            _m("Feedback experto", 30,
               "Pide a alguien que hable muy bien en público que vea una grabación tuya y te dé 3 mejoras. Hecho "
               "cuando hayas aplicado una."),
            _m("Sin notas", 20,
               "Da una intervención de 5 minutos sin notas ni diapositivas. Hecho cuando termines sin perder el hilo."),
        ],
    ],
    [
        [
            _m("Toma la palabra", 30,
               "Esta semana, toma la palabra en una reunión, una clase o un grupo para defender una idea. Hecho "
               "cuando lo hayas hecho."),
            _m("Presentación grabada", 60,
               "Prepara y graba una presentación de 5 minutos sobre algo que domines. Hecho cuando la veas y apuntes "
               "3 mejoras."),
            _m("Club o taller", 90,
               "Ve a un club de oratoria (como Toastmasters) o a un taller y haz una intervención. Hecho cuando "
               "hayas intervenido."),
        ],
        [
            _m("Presentación real", 90,
               "Da una presentación real de 5 a 10 minutos ante público. Hecho cuando la hayas dado y pedido opinión."),
            _m("Debate", 60,
               "Participa en un debate o defiende tu postura ante alguien que piense lo contrario. Hecho cuando hayas "
               "debatido."),
            _m("Entrevista simulada", 60,
               "Haz una entrevista de trabajo simulada con alguien que te ponga a prueba. Hecho cuando apuntes su "
               "valoración."),
        ],
        [
            _m("Charla de 15 minutos", 180,
               "Prepara y da una charla de 15 minutos o más. Hecho cuando la hayas dado."),
            _m("Dirige una reunión", 60,
               "Dirige una reunión con agenda, tiempos y decisiones. Hecho cuando termine con acuerdos claros."),
            _m("Negociación real", 90,
               "Prepara y lleva a cabo una negociación real (precio, condiciones, un acuerdo). Hecho cuando termine "
               "y analices el resultado."),
        ],
    ],
    [
        _p("Ante un grupo",
           "Hablas 3 minutos ante 5 o más personas.",
           "Dices menos de una muletilla por minuto.",
           "Respondes con calma una pregunta del público."),
        _p("Sin leer",
           "Presentas 10 minutos sin leer.",
           "Improvisas una intervención con estructura.",
           "Tu público te da opiniones positivas."),
        _p("Convencer",
           "Convences a una audiencia de algo concreto.",
           "Das una charla de 20 minutos con soltura.",
           "Manejas preguntas hostiles con calma."),
        _p("Conferenciante",
           "Das conferencias o charlas a públicos amplios.",
           "Lideras negociaciones importantes.",
           "Te invitan a hablar."),
        _p("Maestro orador",
           "Tus discursos se difunden y se citan.",
           "Formas a otros oradores.",
           "Mueves a la acción a quien te escucha."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# AJEDREZ Y ESTRATEGIA — con el Elo como referencia
# ═══════════════════════════════════════════════════════════════════
ESTRATEGIA = _plan(
    [
        "Conoces las reglas y juegas sin plan; pierdes material sin darte cuenta.",
        "No dejas piezas colgadas, ves tácticas sencillas y sigues los principios de apertura.",
        "Calculas variantes, conoces los finales básicos y tienes un repertorio de aperturas.",
        "Juegas con plan estratégico, calculas a fondo y compites en torneos oficiales.",
        "Nivel de experto o titulado: preparas a tus rivales y ganas torneos locales.",
        "Maestro titulado o de nivel internacional: entrenas a otros.",
    ],
    [
        [
            _m("10 problemas tácticos", 15,
               "Resuelve 10 problemas tácticos de tu nivel sin mover piezas hasta tener la solución completa. Hecho "
               "cuando aciertes 7 o más."),
            _m("Revisa tu última partida", 20,
               "Repasa tu última partida sin motor y marca el momento en que cambió todo; después compruébalo con el "
               "motor. Hecho cuando sepas cuál fue tu error principal."),
            _m("Principios de apertura", 15,
               "Juega 3 aperturas contra ti mismo aplicando los principios: centro, desarrollo y enroque. Hecho "
               "cuando completes las 3 sin saltarte ninguno."),
            _m("Un final básico", 15,
               "Aprende un final básico (rey y dama contra rey, rey y torre contra rey, la oposición) y practícalo "
               "contra el ordenador. Hecho cuando lo ganes 3 veces seguidas."),
            _m("Visualización", 15,
               "Sigue una partida corta en notación sin tablero, imaginando la posición, y después compruébala. "
               "Hecho cuando la posición final que imaginaste sea la correcta."),
            _m("Partida pensada", 30,
               "Juega una partida de al menos 15+10 preguntándote en cada jugada qué amenaza tu rival. Hecho cuando "
               "la termines y la revises."),
        ],
        [
            _m("Cálculo por escrito", 25,
               "Elige una posición compleja y escribe todas las variantes que calcules antes de mirar la solución. "
               "Hecho cuando compares tu cálculo con el motor."),
            _m("Las ideas de tu apertura", 20,
               "Estudia las ideas, no solo las jugadas, de una de tus aperturas con partidas modelo. Hecho cuando "
               "sepas explicar su plan típico."),
            _m("Adivina la jugada", 30,
               "Estudia una partida comentada de un maestro intentando adivinar cada jugada antes de verla. Hecho "
               "cuando apuntes cuántas acertaste."),
            _m("Final teórico", 25,
               "Estudia un final teórico importante (Lucena, Philidor…) hasta poder demostrarlo. Hecho cuando lo "
               "ganes o hagas tablas contra el motor."),
            _m("Errores recurrentes", 20,
               "Revisa tus 10 últimas derrotas y clasifica los errores. Hecho cuando sepas cuál es tu error más "
               "frecuente."),
            _m("Ritmo de torneo", 45,
               "Juega una partida de ritmo largo anotando las jugadas, como en un torneo. Hecho cuando la analices "
               "después."),
        ],
        [
            _m("Prepara a un rival", 40,
               "Prepara una partida contra un rival concreto estudiando sus aperturas. Hecho cuando tengas un plan "
               "de apertura contra él."),
            _m("Cálculo a ciegas", 30,
               "Calcula durante 10 minutos variantes de una posición sin mover piezas y escríbelas. Hecho cuando el "
               "motor confirme tu línea principal."),
            _m("Partida clásica", 60,
               "Juega una partida a ritmo clásico con concentración total. Hecho cuando la analices a fondo."),
            _m("Estrategia avanzada", 30,
               "Estudia un tema estratégico (estructuras de peones, piezas malas, profilaxis) con partidas modelo. "
               "Hecho cuando lo apliques en una partida."),
            _m("Torneo relámpago", 60,
               "Juega un torneo corto en línea. Hecho cuando hayas revisado tus errores."),
            _m("Juega con alguien mejor", 40,
               "Juega con alguien de más nivel y analizad juntos la partida. Hecho cuando apuntes su consejo."),
        ],
    ],
    [
        [
            _m("50 problemas", 90,
               "Resuelve 50 problemas tácticos esta semana. Hecho cuando sumes los 50."),
            _m("Tres partidas analizadas", 120,
               "Juega y analiza 3 partidas lentas. Hecho cuando las tres tengan sus comentarios."),
            _m("Final dominado", 60,
               "Domina esta semana un final básico nuevo. Hecho cuando lo ganes contra el motor."),
        ],
        [
            _m("Torneo", 180,
               "Juega un torneo, en línea o presencial. Hecho cuando analices tus partidas."),
            _m("Repertorio", 120,
               "Construye o revisa tu repertorio con blancas o con negras. Hecho cuando tengas las líneas "
               "principales anotadas."),
            _m("Libro de táctica", 150,
               "Avanza un capítulo de un libro de táctica o de estrategia. Hecho cuando resuelvas sus ejercicios."),
        ],
        [
            _m("Torneo oficial", 240,
               "Juega un torneo oficial con ranking. Hecho cuando lo hayas jugado y analizado."),
            _m("Preparación profunda", 180,
               "Prepara a fondo una línea de apertura nueva con motor y bases de datos. Hecho cuando la hayas jugado."),
            _m("Sesión con entrenador", 90,
               "Ten una sesión con un entrenador titulado. Hecho cuando apuntes el plan que te propone."),
        ],
    ],
    [
        _p("Sin regalar piezas",
           "Juegas 10 partidas seguidas sin dejar piezas colgadas.",
           "Resuelves con soltura problemas tácticos básicos.",
           "Aplicas los principios de apertura en tus partidas."),
        _p("Jugador de club",
           "Alcanzas un Elo de 1.400–1.600 (o su equivalente en tu juego).",
           "Ganas los finales básicos.",
           "Tienes un repertorio de aperturas."),
        _p("Jugador de torneo",
           "Alcanzas un Elo de 1.800–2.000.",
           "Calculas variantes de 5 o más jugadas.",
           "Juegas torneos oficiales."),
        _p("Experto",
           "Alcanzas 2.200 de Elo o un título.",
           "Preparas tus partidas contra rivales concretos.",
           "Ganas torneos locales."),
        _p("Maestro titulado",
           "Tienes un título de maestro (MF, MI o GM) o su equivalente.",
           "Compites a nivel internacional.",
           "Entrenas a otros jugadores."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# COCINA
# ═══════════════════════════════════════════════════════════════════
COCINA = _plan(
    [
        "Sigues recetas paso a paso y los resultados son irregulares.",
        "Cocinas platos básicos sin receta, con cortes uniformes y buen punto de sal.",
        "Improvisas con lo que hay, dominas salsas y puntos de cocción y das cenas completas.",
        "Dominas masas, fermentaciones y emplatado, y agradas a comensales exigentes.",
        "Cocinas a nivel profesional: para grupos y con calidad de restaurante.",
        "Tienes un estilo propio reconocido y formas a otros cocineros.",
    ],
    [
        [
            _m("Cortes uniformes", 15,
               "Practica un corte (juliana, brunoise, picado de cebolla) con 2 hortalizas, cuidando la mano que "
               "guía. Hecho cuando los trozos salgan uniformes."),
            _m("Una técnica, un plato", 30,
               "Aprende una técnica básica (saltear, pochar, la pasta en su punto) y aplícala al plato de hoy. Hecho "
               "cuando el plato salga en su punto."),
            _m("Prueba y ajusta", 15,
               "Mientras cocinas, prueba en tres momentos y ajusta sal, acidez y grasa. Hecho cuando apuntes qué "
               "cambiaste y por qué."),
            _m("Mise en place", 15,
               "Antes de encender el fuego, deja todo cortado, medido y ordenado. Hecho cuando cocines sin buscar "
               "nada a mitad."),
            _m("Huevos de dos maneras", 20,
               "Haz huevos de dos formas (pochados, en tortilla francesa, revueltos cremosos) buscando el punto "
               "exacto. Hecho cuando las dos salgan bien."),
            _m("Equilibrio de sabores", 15,
               "Prepara una vinagreta o una salsa y equilibra sal y acidez probando cada cambio. Hecho cuando sepas "
               "explicar por qué quedó equilibrada."),
        ],
        [
            _m("Sin receta", 40,
               "Cocina un plato completo con lo que tengas en casa, sin receta. Hecho cuando esté rico y apuntes qué "
               "harías distinto."),
            _m("Salsa madre", 30,
               "Prepara una salsa madre (bechamel, velouté, española, de tomate u holandesa). Hecho cuando tenga la "
               "textura correcta."),
            _m("Punto exacto", 30,
               "Cocina una proteína al punto exacto con termómetro. Hecho cuando el centro marque la temperatura "
               "objetivo."),
            _m("Fondo casero", 45,
               "Prepara un fondo o un caldo casero y úsalo en un plato. Hecho cuando el plato lo note."),
            _m("Emplatado", 20,
               "Emplata el mismo plato de 3 maneras y fotografíalas. Hecho cuando elijas la mejor y sepas por qué."),
            _m("Masa o fermentación", 40,
               "Trabaja una masa (pan, pasta fresca, hojaldre rápido) o una fermentación. Hecho cuando el resultado "
               "tenga la textura buscada."),
        ],
        [
            _m("Plato de autor", 60,
               "Crea un plato propio con una idea clara (un contraste, la temporada, un recuerdo). Hecho cuando "
               "puedas describirlo en una frase y esté rico."),
            _m("Técnica avanzada", 60,
               "Practica una técnica avanzada (emulsiones, baja temperatura, laminado). Hecho cuando te salga bien "
               "dos veces seguidas."),
            _m("Cocina regional", 60,
               "Estudia y cocina un plato tradicional de una región que no conozcas, fiel a su receta original. "
               "Hecho cuando lo hayas probado y conozcas su historia."),
            _m("Menú de tres pases", 90,
               "Diseña un menú equilibrado de 3 pases y cocínalo. Hecho cuando los tres estén servidos."),
            _m("Servicio a tiempo", 60,
               "Cocina varios platos que deban salir a la vez y a su temperatura. Hecho cuando todo salga a tiempo."),
            _m("Opinión de los comensales", 30,
               "Pide a tus comensales una crítica sincera de un plato y ajústalo. Hecho cuando hayas mejorado algo "
               "concreto."),
        ],
    ],
    [
        [
            _m("Cinco comidas caseras", 150,
               "Cocina cinco comidas caseras esta semana. Hecho cuando sumes las cinco."),
            _m("La misma receta tres veces", 90,
               "Haz la misma receta tres veces esta semana, mejorando algo cada vez. Hecho cuando la tercera sea la "
               "mejor."),
            _m("Cocina para otros", 90,
               "Cocina esta semana para otra persona. Hecho cuando hayas recogido su opinión."),
        ],
        [
            _m("Cena para cuatro", 150,
               "Organiza y cocina una cena para cuatro personas o más. Hecho cuando todos hayan comido a tiempo."),
            _m("Pan de verdad", 180,
               "Haz pan de masa madre o de fermentación larga. Hecho cuando tenga buena miga y buena corteza."),
            _m("Cocina del mundo", 120,
               "Cocina tres platos de una cocina del mundo que no conozcas. Hecho cuando los hayas hecho."),
        ],
        [
            _m("Menú degustación", 240,
               "Diseña y sirve un menú degustación. Hecho cuando lo hayas servido."),
            _m("Stage", 240,
               "Pasa unas horas de stage o de voluntario en una cocina profesional. Hecho cuando apuntes lo "
               "aprendido."),
            _m("Receta propia", 180,
               "Desarrolla una receta propia hasta que sea reproducible. Hecho cuando esté escrita y probada dos "
               "veces."),
        ],
    ],
    [
        _p("Sin receta",
           "Cocinas 5 platos sin mirar la receta.",
           "Tus cortes son uniformes.",
           "Has cocinado para otros y les ha gustado."),
        _p("Cocinero de casa",
           "Improvisas un plato rico con lo que hay.",
           "Dominas 2 salsas madre y los puntos de cocción.",
           "Has servido una cena completa."),
        _p("Cocinero avanzado",
           "Tus masas y fermentaciones salen constantes.",
           "Tu emplatado está cuidado.",
           "Agradas a comensales exigentes."),
        _p("Profesional",
           "Has trabajado o hecho un stage en una cocina profesional.",
           "Cocinas menús para grupos.",
           "Tu nivel es de restaurante."),
        _p("Chef",
           "Tu cocina tiene reconocimiento.",
           "Tienes un estilo propio.",
           "Formas a otros cocineros."),
    ],
)


# ═══════════════════════════════════════════════════════════════════
# OTRA HABILIDAD — principios de práctica deliberada que sirven para todo
# ═══════════════════════════════════════════════════════════════════
GENERAL = _plan(
    [
        "Das tus primeros pasos en {h}: sigues instrucciones y aún no distingues lo importante.",
        "Lo básico de {h} ya te sale sin ayuda y reconoces tus errores.",
        "Haces {h} con resultados constantes y planificas tu propia práctica.",
        "Resuelves los casos difíciles de {h} y destacas entre los aficionados.",
        "Haces {h} a nivel profesional y otros te consultan.",
        "Eres referente en {h}: aportas algo nuevo y formas a expertos.",
    ],
    [
        [
            _m("Práctica deliberada", 20,
               "Elige la parte de {h} que peor te sale y trabájala 20 minutos con un objetivo concreto y sin "
               "distracciones. Hecho cuando notes una mejora que puedas medir."),
            _m("Aprende de un referente", 15,
               "Mira o lee cómo lo hace alguien que domina {h} y apunta 3 detalles que tú haces distinto. Hecho "
               "cuando hayas probado uno."),
            _m("Mídete", 15,
               "Grábate o mide tu resultado en {h} (tiempo, aciertos, calidad) y apúntalo. Hecho cuando tengas la "
               "cifra de hoy."),
            _m("Vuelve a los fundamentos", 15,
               "Repasa un fundamento de {h} que creas que ya sabes, como si empezaras de cero. Hecho cuando "
               "descubras algo que hacías mal."),
            _m("Diez repeticiones limpias", 15,
               "Repite 10 veces seguidas un gesto o un paso clave de {h} sin errores; si fallas, la cuenta vuelve a "
               "cero. Hecho cuando completes las 10."),
            _m("Diario de práctica", 10,
               "Escribe 5 líneas: qué practicaste, qué salió, qué falló y qué harás mañana. Hecho cuando esté "
               "escrito."),
        ],
        [
            _m("Al borde de tu nivel", 25,
               "Practica algo de {h} un poco más difícil de lo que dominas, hasta fallar 1 de cada 5 intentos. "
               "Hecho cuando la tasa de fallos empiece a bajar."),
            _m("Feedback inmediato", 25,
               "Prepara una forma de saber al momento si lo haces bien (espejo, grabación, cronómetro, alguien que "
               "mire) y practica con ella. Hecho cuando hayas corregido algo gracias a ese feedback."),
            _m("Situación real", 30,
               "Practica {h} en condiciones reales o lo más parecidas posible. Hecho cuando apuntes cómo te fue."),
            _m("Desmonta la habilidad", 20,
               "Divide {h} en 5 subhabilidades y puntúate del 1 al 10 en cada una. Hecho cuando elijas la que vas a "
               "entrenar esta semana."),
            _m("Enséñalo", 20,
               "Explica a alguien un aspecto de {h}. Hecho cuando esa persona lo entienda."),
            _m("Variación", 25,
               "Practica lo de siempre con una variación (otro ritmo, otro contexto, otra herramienta). Hecho cuando "
               "te salga bien también así."),
        ],
        [
            _m("Sesión con objetivo medible", 40,
               "Planifica una sesión con un objetivo medible y mide antes y después. Hecho cuando tengas las dos "
               "cifras."),
            _m("Crea algo completo", 45,
               "Produce un resultado completo de {h}, de principio a fin. Hecho cuando esté terminado."),
            _m("Cómo lo resuelve un maestro", 30,
               "Analiza a fondo cómo resuelve un maestro de {h} algo que a ti te cuesta. Hecho cuando apliques su "
               "forma de hacerlo."),
            _m("Mentoría", 30,
               "Ayuda a alguien que empieza en {h}. Hecho cuando progrese gracias a ti."),
            _m("La debilidad crónica", 40,
               "Ataca con un ejercicio específico el punto débil que arrastras desde hace tiempo. Hecho cuando lo "
               "hayas medido."),
            _m("Bajo presión", 30,
               "Practica {h} con presión añadida: tiempo, público o algo en juego. Hecho cuando completes el reto."),
        ],
    ],
    [
        [
            _m("Un primer resultado", 90,
               "Consigue un primer resultado completo en {h}, aunque sea pequeño. Hecho cuando lo tengas."),
            _m("Cinco días", 100,
               "Practica {h} cinco días esta semana. Hecho cuando sumes los cinco."),
            _m("Antes y después", 60,
               "Mide tu nivel el lunes y el domingo de la misma forma. Hecho cuando compares las dos medidas."),
        ],
        [
            _m("Prueba real", 120,
               "Pon a prueba tu nivel de {h} en una situación real con consecuencias. Hecho cuando tengas el "
               "resultado."),
            _m("Clase o mentor", 90,
               "Recibe una clase o la opinión de alguien que domine {h}. Hecho cuando apuntes su consejo."),
            _m("Proyecto de la semana", 150,
               "Avanza un proyecto de {h} con principio y fin. Hecho cuando cumplas el objetivo de la semana."),
        ],
        [
            _m("Obra de nivel", 240,
               "Produce un resultado de {h} de nivel alto. Hecho cuando puedas enseñarlo con orgullo."),
            _m("Evaluación externa", 120,
               "Haz que alguien experto evalúe tu nivel en {h}. Hecho cuando tengas su evaluación."),
            _m("Enseña a un grupo", 120,
               "Enseña {h} a un grupo. Hecho cuando hayas dado la sesión."),
        ],
    ],
    [
        _p("Primeros resultados",
           "Haces lo básico de {h} sin ayuda.",
           "Reconoces tus propios errores y sabes cómo corregirlos.",
           "Has conseguido un primer resultado completo."),
        _p("Competente",
           "Tus resultados en {h} son constantes.",
           "Alguien experto te reconoce un nivel intermedio.",
           "Has superado una prueba real."),
        _p("Hábil",
           "Resuelves casos difíciles de {h}.",
           "Has aplicado el feedback de expertos.",
           "Destacas entre los aficionados."),
        _p("Experto",
           "Tienes nivel profesional en {h}.",
           "Otros te consultan.",
           "Tienes reconocimiento externo."),
        _p("Maestro",
           "Eres un referente en {h}.",
           "Aportas algo nuevo.",
           "Formas a expertos."),
    ],
)


PLANTILLAS = {
    "musica": MUSICA,
    "idioma": IDIOMA,
    "programacion": PROGRAMACION,
    "arte": ARTE,
    "deporte": DEPORTE,
    "escritura": ESCRITURA,
    "estudio": ESTUDIO,
    "comunicacion": COMUNICACION,
    "estrategia": ESTRATEGIA,
    "cocina": COCINA,
    "general": GENERAL,
}
