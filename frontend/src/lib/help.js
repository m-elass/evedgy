/*
 * lib/help.js — EL SABER DE LA CASA
 * ─────────────────────────────────
 * Cada rincón de la app y cada herramienta tienen aquí su explicación: para
 * qué sirve, cómo funciona por dentro y por qué merece la pena. El icono de
 * ayuda (?) que aparece junto a cada título o herramienta abre estos textos.
 *
 * Se guardan todos juntos, en un solo sitio, por dos razones: se leen de un
 * tirón como si fueran el manual de la app, y así ninguna parte se queda sin
 * explicar cuando se añade algo nuevo.
 *
 * Formato de cada entrada:
 *   title  — el nombre de lo que se explica
 *   lead   — para qué sirve, en dos o tres frases
 *   points — cómo funciona, en detalles concretos y verificables
 *   note   — el porqué: la idea de fondo (opcional)
 */

export const HELP = {
  // ════════════════════════════════════════════════════════════
  // LAS SECCIONES
  // ════════════════════════════════════════════════════════════
  today: {
    title: "Hoy",
    lead: "La portada de tu día: lo único que necesitas ver al abrir la app. Reúne lo que tienes pendiente hoy y un recuerdo de tu propio pasado, para que empieces con contexto y no desde cero.",
    points: [
      "Los hábitos de hoy se marcan aquí mismo, sin entrar en su sección.",
      "El resumen de tu semana se genera con tus datos reales: entrenos, hábitos cumplidos y horas de sueño.",
      "«Un destello del pasado» rescata una nota tuya de otro día al azar. No es decoración: leerte a ti mismo con distancia es la forma más rápida de ver si has cambiado.",
    ],
    note: "Si un día solo puedes abrir una pantalla, que sea esta.",
  },
  training: {
    title: "Entrenamiento",
    lead: "Aquí se entrena. La semana aparece desplegada en sus siete días, y cada día contiene los ejercicios que tu plantilla marca para esa sesión, listos para registrar series, repeticiones y peso.",
    points: [
      "Cada día es un desplegable con su estado: cuántos ejercicios tiene y cuántos llevas hechos.",
      "El día de hoy se abre solo; los días sin ejercicios aparecen como descanso.",
      "Puedes navegar a semanas pasadas para consultar lo que hiciste, y a semanas futuras para ver el plan. Solo se registra en la semana actual.",
      "Qué ejercicios toca cada día se decide en la estrella Ejercicios, no aquí: esta sección es para entrenar, no para planificar.",
    ],
    note: "Registrar el peso exacto es lo que permite todo lo demás: rangos, récords, progresión y avisos de descarga.",
  },
  exercises: {
    title: "Ejercicios",
    lead: "El taller de tu rutina. Arriba defines qué ejercicios tocan cada día de la semana (la plantilla que verás en Entreno); abajo está tu biblioteca, donde cada ejercicio guarda sus notas técnicas y los músculos que trabaja.",
    points: [
      "La plantilla es tu rutina por defecto: se repite todas las semanas sin que tengas que copiarla.",
      "Las semanas también pasan aquí. Puedes cambiar los ejercicios de una semana concreta sin tocar tu rutina habitual.",
      "Al crear un ejercicio, la app reconoce su nombre (en español o inglés) y le asigna los músculos automáticamente, con anatomía específica.",
      "Las notas de ejecución son tuyas: los matices técnicos que descubres entrenando y que se te olvidan a la semana siguiente.",
    ],
  },
  sleep: {
    title: "Sueño",
    lead: "El registro de tus noches: cuánto duermes y cómo te sientes al despertar. Es la variable que más explica un entreno malo sin causa aparente.",
    points: [
      "Anotas la hora de acostarte, la de levantarte y una valoración de la calidad.",
      "La app calcula las horas y la media de tu semana, y la cruza con tus entrenos en el resumen semanal.",
      "Registrar la sensación al despertar, y no solo las horas, permite distinguir dormir mucho de dormir bien.",
    ],
  },
  records: {
    title: "Récords",
    lead: "Tu mejor marca en cada ejercicio y su historia. No es una lista de vanidad: es la referencia contra la que se mide todo tu progreso.",
    points: [
      "Se guarda el mejor peso levantado y también el 1RM estimado (el máximo teórico a una repetición).",
      "El 1RM se calcula con la fórmula de Epley: peso × (1 + repeticiones ÷ 30). Permite comparar una serie de 8×70kg con otra de 3×85kg.",
      "Cuando bates un récord al guardar una sesión, la app te lo celebra en el momento.",
    ],
    note: "El 1RM estimado es una estimación matemática, no una medición: fiable en rangos de 1 a 10 repeticiones, cada vez más optimista por encima.",
  },
  ranks: {
    title: "Rangos",
    lead: "Traduce tus levantamientos a un nivel de fuerza comparable, para que sepas dónde estás de verdad y no solo cuánta chapa mueves.",
    points: [
      "El rango sale de la relación entre el peso que levantas y tu propio peso corporal, no del peso absoluto.",
      "Cada metal (Hierro, Bronce, Plata, Oro…) se divide en tres grados: III, II y I. Así ves progreso aunque tardes meses en cambiar de metal.",
      "La barra muestra exactamente cuántos kilos te faltan para el siguiente grado.",
      "Los rangos son por ejercicio: puedes ser Oro en press de banca y Bronce en sentadilla, y eso ya te dice qué entrenar.",
    ],
    note: "Necesita tu peso corporal actualizado en Ajustes; si cambia, los rangos cambian.",
  },
  physique: {
    title: "Meta física",
    lead: "Tu peso corporal y su evolución en el tiempo, junto a la meta que te hayas propuesto. Es el contexto que da sentido a los números de fuerza.",
    points: [
      "El peso se registra con fecha y se dibuja en una curva, no como un dato aislado.",
      "Una sola pesada no significa casi nada: el agua, la sal y la digestión mueven un par de kilos en un día. La tendencia de semanas sí significa algo.",
      "Este peso es el que usan los rangos de fuerza para calcular tu nivel.",
    ],
  },
  anatomy: {
    title: "Anatomía",
    lead: "Tu semana pintada sobre tu cuerpo. Muestra qué músculos has trabajado en los últimos siete días y con cuánta carga, para que veas de un vistazo lo que estás descuidando.",
    points: [
      "La carga suma las series de cada sesión: las del músculo principal cuentan el doble que las de un músculo asistente.",
      "En oro pleno, los grupos que más has trabajado; en oro tenue, los que has tocado de pasada; en reposo, lo que no has entrenado.",
      "El desglose de abajo usa anatomía específica: no dice «pierna», dice semitendinoso, vasto o sóleo.",
      "Puedes tocar un músculo del dibujo para ver su nombre.",
    ],
    note: "El dibujo pinta por regiones del cuerpo; las listas y las cargas sí distinguen cada músculo concreto.",
  },
  daily: {
    title: "Hábitos",
    lead: "Las cosas pequeñas que quieres hacer todos los días. La app no te juzga si fallas: solo cuenta, y contar es lo que hace visible la constancia.",
    points: [
      "Cada hábito lleva su racha: los días seguidos que lo has cumplido.",
      "Los hábitos se marcan también desde la pantalla Hoy, para no tener que entrar aquí a diario.",
      "El historial alimenta el tapiz: cada día cumplido hace brillar un hilo de tu año.",
    ],
    note: "Una racha rota no borra el progreso anterior. El objetivo es la frecuencia a lo largo de meses, no una cadena perfecta.",
  },
  todo: {
    title: "Tareas",
    lead: "Las cosas puntuales que hay que hacer y que no son un hábito: un trámite, una llamada, un recado. Salen de tu cabeza y quedan aquí, con fecha si la necesitan.",
    points: [
      "Sirve para vaciar la mente: lo anotado deja de ocupar atención.",
      "Al completarlas quedan registradas, no se borran sin más.",
    ],
  },
  task_sections: {
    title: "Secciones de tareas",
    lead: "Grupos que tú inventas para clasificar tus tareas: «Casa», «Papeleo», «Trabajo»… Cada uno con su color, para reconocerlos de un vistazo sin leer.",
    points: [
      "Los nombres y los colores los eliges tú: la app no impone ninguna categoría.",
      "Clasificar es opcional. Una tarea sin sección vive en «Sin clasificar» y funciona igual.",
      "Puedes clasificar tareas ya creadas: cada una lleva un selector para moverla de sección cuando quieras.",
      "Si borras una sección, sus tareas NO se borran: vuelven a «Sin clasificar».",
    ],
    note: "Apuntar rápido no debería costarte decisiones. Primero sacas la tarea de la cabeza; ordenarla puede esperar.",
  },
  notes: {
    title: "Destellos",
    lead: "Ideas, frases y observaciones sueltas que no merecen un texto largo pero sí quedar guardadas. Es la libreta de bolsillo de la app.",
    points: [
      "Escribes rápido y sigues con tu vida; sin títulos ni carpetas.",
      "Un destello antiguo aparece de vuelta en la pantalla Hoy, elegido al azar, para que te reencuentres con lo que pensabas.",
    ],
    note: "Casi todo lo que se te ocurre se olvida en horas. Esta sección existe para interceptar esa pérdida.",
  },
  write: {
    title: "Escritura",
    lead: "Para textos largos: pensar por escrito, desahogarte o desarrollar una idea con calma. Lo que no cabe en un destello, cabe aquí.",
    points: [
      "Cada texto se guarda con su fecha y puedes releerlo cuando quieras.",
      "Escribir a mano alzada, sin público, obliga a ordenar el pensamiento: escribir es la forma más honesta de comprobar si de verdad entiendes lo que crees.",
    ],
  },
  readings: {
    title: "Lecturas",
    lead: "Los libros que estás leyendo, los que terminaste y lo que te has llevado de cada uno. Un registro de lectura sirve para poco si no guarda también las ideas.",
    points: [
      "Anotas el estado de cada libro y las notas que te deja.",
      "Ver la lista completa de un año responde una pregunta incómoda y útil: ¿qué has leído de verdad?",
    ],
  },
  goals: {
    title: "Objetivos",
    lead: "Lo que quieres conseguir, escrito con claridad y con un plazo. Un objetivo sin fecha ni criterio de cumplimiento es un deseo.",
    points: [
      "Cada objetivo puede tener su plazo y su estado, para que puedas cerrarlo o revisarlo.",
      "Están conectados con las revisiones: cada revisión los pone delante de ti otra vez.",
    ],
  },
  values: {
    title: "Valores",
    lead: "Cómo quieres vivir y decidir: los principios que quieres sostener cuando la situación se pone difícil. Es la sección más lenta de la app y la que da sentido a las demás.",
    points: [
      "Escribes tus valores con tus palabras, no con etiquetas prestadas.",
      "Sirven de vara de medir en las decisiones: sin criterio escrito, cada decisión se improvisa desde el estado de ánimo del momento.",
    ],
  },
  reviews: {
    title: "Revisión",
    lead: "El alto en el camino: qué ha ido bien, qué no y qué vas a cambiar. Sin una revisión periódica, el registro de datos no se convierte en aprendizaje.",
    points: [
      "Cada revisión queda guardada con su fecha, así que puedes leer la de hace tres meses y comprobar si cumpliste lo que dijiste.",
      "Es el momento de mirar objetivos y valores juntos, no por separado.",
    ],
  },
  skills: {
    title: "Aprendizajes",
    lead: "Las habilidades que estás desarrollando y en qué punto están. Hace visible un progreso que normalmente no se ve, porque aprender no da una cifra como el peso levantado.",
    points: [
      "Cada aprendizaje guarda su nivel y tus notas sobre cómo avanzas.",
      "Ver el avance escrito protege de la sensación falsa de estancamiento.",
    ],
  },
  decisions: {
    title: "Decisiones",
    lead: "Un registro de las decisiones importantes: qué decidiste, por qué y qué esperabas que pasara. Es la herramienta más honesta de la app.",
    points: [
      "Al anotar lo que esperabas, puedes volver meses después y comparar con lo que ocurrió de verdad.",
      "Esto corrige el sesgo retrospectivo: la memoria reescribe tus razones para que parezcas más listo de lo que fuiste.",
    ],
    note: "No sirve para acertar más a corto plazo, sino para aprender a decidir mejor con los años.",
  },
  letters: {
    title: "Cartas selladas",
    lead: "Cartas que te escribes a ti mismo y que quedan cerradas hasta una fecha que tú eliges. Ni tú puedes leerlas antes: el candado es real.",
    points: [
      "Escribes la carta y fijas la fecha de apertura. Hasta entonces, la app no muestra su contenido.",
      "El servidor no envía el texto de una carta sellada, así que no se puede espiar ni mirando los datos.",
      "Al llegar la fecha, la carta se abre y puedes leer lo que pensabas entonces.",
    ],
    note: "El valor está en la espera: una carta que puedes abrir cuando quieras no dice nada de tu pasado.",
  },

  friends: {
    title: "Amigos",
    lead: "La parte social, con un límite deliberado: se comparte la insignia y el rango, nunca tus números ni tus textos.",
    points: [
      "Tus datos concretos (pesos, notas, sueño) no se comparten con nadie, en ningún caso.",
      "Compartir el rango da compañía sin convertir tu progreso en una competición de cifras.",
    ],
  },
  settings: {
    title: "Ajustes",
    lead: "Tu perfil y el control de tus datos: nombre, peso corporal, sexo y las herramientas para llevarte todo lo que has escrito.",
    points: [
      "El peso corporal y el sexo son los que usan los rangos de fuerza para calcular tu nivel: manténlos actualizados.",
      "«Exportar» te descarga un archivo con absolutamente todo lo tuyo. Tus datos son tuyos y salen de aquí cuando quieras.",
    ],
  },
  theme: {
    title: "Apariencia",
    lead: "El aspecto de la app: la paleta de colores con la que quieres vivir dentro de ella.",
    points: [
      "Hay temas ya preparados, inspirados en el azul abisal, el oro y el violeta de nebulosa.",
      "El cambio se aplica al instante y a toda la app, porque todos los colores salen de un único sitio.",
    ],
  },

  // ════════════════════════════════════════════════════════════
  // LAS HERRAMIENTAS
  // ════════════════════════════════════════════════════════════
  sea: {
    title: "El mar de estrellas",
    lead: "La forma de moverte por la app. Cada sección es una estrella y todas flotan en el mismo cielo, agrupadas en constelaciones por su tema y unidas por hilos de luz.",
    points: [
      "Arrastra el mar con el dedo para desplazarte; toca una estrella y te sumerges en su sección.",
      "La estrella dorada del centro es Hoy, la bienvenida: es donde arranca la app.",
      "Para volver al mar, pulsa la estrella dorada flotante de abajo.",
      "Las constelaciones son cuatro: Cuerpo, Hacer, Mente y Vida. Los hilos dorados salen del centro.",
    ],
    note: "No hay pestañas a propósito: ver todas las estrellas a la vez te recuerda que la app trata de tu vida entera, no solo del gimnasio.",
  },
  rest_timer: {
    title: "Temporizador de descanso",
    lead: "Mide el descanso entre series, que es una variable de entrenamiento tan real como el peso o las repeticiones.",
    points: [
      "Elige la duración y cuenta hacia atrás; al terminar, el móvil vibra.",
      "Para fuerza conviene descansar más (2-3 minutos o más); para trabajo con más repeticiones, menos.",
      "Descansar siempre lo mismo hace comparables tus sesiones: si un día descansas el doble, no estás midiendo lo mismo.",
    ],
  },
  plate_calc: {
    title: "Calculadora de discos",
    lead: "Te dice qué discos poner a cada lado de la barra para el peso que has escrito, sin hacer la cuenta de cabeza entre series.",
    points: [
      "Parte de una barra olímpica de 20 kg y reparte el resto entre los dos lados.",
      "Los discos grandes (15 kg o más) se marcan en oro para que la lectura sea instantánea.",
      "Si el peso no se puede formar exactamente con discos estándar, te lo avisa con el símbolo ≈.",
    ],
  },
  next_set: {
    title: "Sugerencia de hoy",
    lead: "Una propuesta de peso y repeticiones basada en tu propio historial de ese ejercicio, no en una tabla genérica.",
    points: [
      "Compara tus últimas sesiones y propone el siguiente paso razonable.",
      "Te dice también qué hiciste la última vez, para que decidas con contexto.",
      "Es una sugerencia, no una orden: si has dormido cuatro horas, ignórala.",
    ],
    note: "La progresión sostenida a base de subidas pequeñas gana casi siempre a los saltos heroicos.",
  },
  deload: {
    title: "Aviso de descarga",
    lead: "Aparece cuando llevas varias sesiones sin mejorar en un ejercicio. Sugiere bajar el peso a propósito durante una semana.",
    points: [
      "Se activa detectando estancamiento en tus propios datos, no por calendario.",
      "Bajar carga temporalmente permite recuperarse y suele desbloquear el progreso; insistir con el mismo peso agotado rara vez funciona.",
      "Es un aviso, no una obligación.",
    ],
  },
  record_celebration: {
    title: "Celebración de récord",
    lead: "Cuando una serie supera tu mejor marca, la app lo detecta al guardar y te lo celebra en el momento.",
    points: [
      "La comparación se hace con el 1RM estimado (fórmula de Epley), así que también cuenta batir tu marca con menos repeticiones y más peso.",
      "El récord queda guardado en la sección Récords con su fecha.",
    ],
    note: "El progreso real es lento; que la app se detenga a marcarlo es una forma de que no pase desapercibido.",
  },
  progress_chart: {
    title: "Gráfica de progreso",
    lead: "La historia de un ejercicio dibujada en el tiempo, con tres formas de mirarla.",
    points: [
      "«Máximo» es el peso más alto de cada sesión: mide fuerza.",
      "«Medio» promedia todas las series: menos sensible a una serie suelta afortunada.",
      "«Volumen» multiplica peso por repeticiones y lo suma: mide cuánto trabajo total has hecho, que es el motor de la hipertrofia.",
    ],
    note: "Un mismo entreno puede parecer estancado en máximo y estar subiendo en volumen. Por eso están las tres.",
  },
  muscle_body: {
    title: "Músculos que trabaja",
    lead: "El cuerpo anatómico de un ejercicio: en oro los músculos principales, en ámbar los que asisten.",
    points: [
      "Los músculos se deducen del nombre del ejercicio con una base de conocimiento que distingue anatomía real: porciones del pectoral, cabezas del tríceps, los cuatro isquiosurales, sóleo frente a gemelos.",
      "Reconoce nombres en español e inglés, incluidos los de nombre propio (katana, Bayesian, Meadows…).",
      "Los matices del nombre cuentan: «unilateral» añade los estabilizadores del tronco, «en multipower» los quita porque los sujeta la máquina.",
      "Si algo no te cuadra, puedes recalcularlo o corregirlo a mano.",
    ],
    note: "Saber qué mueve un ejercicio evita el error clásico de entrenar tres veces lo mismo creyendo que variaste.",
  },
  exercise_notes: {
    title: "Notas de ejecución",
    lead: "El sitio para los matices técnicos de un ejercicio: la señal que te hace hacerlo bien y que se te olvida entre semana.",
    points: [
      "Se guardan con el ejercicio y aparecen también al registrar la sesión, cuando de verdad las necesitas.",
      "Sirven para lo concreto: dónde apoyar el pie, hasta dónde bajar, qué duele si te pasas.",
    ],
  },
  week_template: {
    title: "Tu semana de entrenamiento",
    lead: "La plantilla: qué ejercicios tocan cada día. Es lo que la sección Entreno mostrará por defecto, todas las semanas, sin que la copies a mano.",
    points: [
      "Añade ejercicios a un día con el desplegable, y quítalos con la ✕.",
      "Los días que dejes vacíos aparecen como descanso.",
      "El orden en que los pongas es el orden en que los verás al entrenar.",
    ],
  },
  permanent_switch: {
    title: "Interruptor de cambios permanentes",
    lead: "Decide si lo que estás editando cambia solo esta semana o tu rutina de siempre. Es la pieza que permite improvisar sin romper el plan.",
    points: [
      "Apagado: los cambios valen únicamente para la semana que estás viendo, y ese día queda marcado como modificado.",
      "Encendido: editas la plantilla y el cambio se aplica a todas las semanas.",
      "Con el interruptor apagado siempre puedes restaurar el día a su plantilla original.",
    ],
    note: "Existe porque las rutinas reales se rompen: un día no hay banco libre, otro te duele el hombro. Eso no debería obligarte a rehacer tu plan.",
  },
  promote_week: {
    title: "Hacer de esta semana la nueva plantilla",
    lead: "Convierte los cambios de la semana que estás viendo en tu rutina por defecto de aquí en adelante.",
    points: [
      "Aparece solo cuando esa semana tiene cambios respecto a la plantilla.",
      "Al pulsarlo, esos días pasan a ser lo normal y dejan de estar marcados como excepción.",
    ],
    note: "Sirve para el caso más común de todos: probar una variación, ver que funciona, y quererla para siempre.",
  },
  reanalyze: {
    title: "Recalcular músculos",
    lead: "Vuelve a analizar los nombres de tus ejercicios con la base de conocimiento actual y actualiza los músculos que trabajan.",
    points: [
      "Útil cuando la base de ejercicios de la app mejora, o si renombraste un ejercicio.",
      "El botón junto a cada ejercicio recalcula solo ese; el de arriba recalcula toda tu biblioteca.",
      "Si habías corregido los músculos a mano, el recálculo automático de la app respeta tu corrección; el botón, en cambio, sí la sobrescribe.",
    ],
  },
  muscle_week: {
    title: "Carga de la semana",
    lead: "El desglose numérico de lo que ha trabajado cada músculo en los últimos siete días.",
    points: [
      "Cada serie cuenta 1 punto si el ejercicio trabaja ese músculo como principal, y medio punto si lo trabaja como asistente.",
      "La barra es relativa a tu músculo más trabajado de la semana, no a un ideal externo.",
      "Sirve para detectar huecos: casi siempre aparecen en la cadena posterior y en el hombro posterior.",
    ],
  },
  rank_badge: {
    title: "Insignia de rango",
    lead: "El escudo y el nombre del nivel que has alcanzado en un ejercicio concreto.",
    points: [
      "El metal indica el nivel y el número romano el grado dentro de ese metal: III es la entrada, I el último escalón antes del siguiente metal.",
      "Se calcula con la relación entre el peso que mueves y tu peso corporal, así que dos personas distintas con el mismo peso en la barra pueden tener rangos distintos.",
    ],
  },
  streak: {
    title: "Racha",
    lead: "Los días seguidos que llevas cumpliendo un hábito.",
    points: [
      "Se calcula sobre tu historial real de días marcados.",
      "Al romperse vuelve a empezar, pero el historial completo no se pierde: sigue contando en el tapiz.",
    ],
    note: "La racha es un incentivo, no una nota. Dos meses con un fallo valen infinitamente más que dos semanas perfectas.",
  },
  export_data: {
    title: "Exportar tus datos",
    lead: "Descarga un archivo con todo lo que has guardado en la app: entrenos, hábitos, notas, textos, objetivos y lo demás.",
    points: [
      "El formato es JSON, legible por cualquier programa, para que no dependas de esta app para conservar tu historia.",
      "Las cartas selladas que aún no han llegado a su fecha se exportan sin su contenido: el candado se respeta incluso aquí.",
    ],
  },
  install_pwa: {
    title: "Instalar en el móvil",
    lead: "La app se instala desde el navegador y queda con su icono en la pantalla de inicio, a pantalla completa, como cualquier otra aplicación.",
    points: [
      "En iPhone: ábrela en Safari, pulsa Compartir y elige «Añadir a pantalla de inicio».",
      "En Android: menú de Chrome y «Instalar aplicación».",
      "No pasa por ninguna tienda de aplicaciones: es tu app, en tu servidor.",
    ],
  },
  weekly_summary: {
    title: "Tu semana",
    lead: "Un resumen en lenguaje natural de lo que han sido tus últimos siete días, construido con tus datos.",
    points: [
      "Cuenta entrenos, hábitos cumplidos, sueño y récords, y lo dice en una frase en lugar de en una tabla.",
      "Sirve para lo que los números sueltos no consiguen: darte una impresión de conjunto en cinco segundos.",
    ],
  },
  flashback: {
    title: "Un destello del pasado",
    lead: "Una nota tuya de otro día, elegida al azar y traída de vuelta a la pantalla de hoy.",
    points: [
      "Sale de tus propios destellos guardados; cambia cada día.",
      "No hay que buscarla: aparece sola, que es justo lo que hace que funcione.",
    ],
    note: "Releerte con meses de distancia es la forma más rápida de comprobar en qué has cambiado sin darte cuenta.",
  },
};

/** Devuelve la entrada de ayuda de un tema, o null si no existe. */
export function getHelp(topic) {
  return HELP[topic] || null;
}
