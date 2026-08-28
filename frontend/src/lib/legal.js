/*
 * lib/legal.js — LOS TEXTOS LEGALES
 * ─────────────────────────────────
 * Política de privacidad y términos de uso, escritos para esta app concreta
 * y no copiados de una plantilla genérica.
 *
 * Por qué existen: la app guarda un email (para la cuenta) y datos de
 * entrenamiento, sueño y peso corporal. En la Unión Europea, los datos de
 * salud son «categoría especial» (art. 9 del RGPD) y recogerlos sin informar
 * ni pedir consentimiento es ilegal, con multas que no son simbólicas. Además,
 * el RGPD obliga a permitir consultar, exportar y BORRAR los datos: por eso la
 * app tiene exportación completa y borrado total de cuenta.
 *
 * Aviso honesto: esto es un texto cuidado y ajustado a lo que la app hace de
 * verdad, no un dictamen jurídico. Si algún día la usa mucha gente o cobras
 * por ella, conviene que lo revise un abogado.
 *
 * Al cambiar algo que afecte a los datos, actualiza también ACTUALIZADO.
 */

export const ACTUALIZADO = "agosto de 2026";

export const PRIVACIDAD = {
  title: "Política de privacidad",
  intro:
    "Esta aplicación guarda cosas personales tuyas: lo que entrenas, lo que " +
    "duermes, lo que piensas. Aquí está, sin rodeos, qué se guarda, dónde, " +
    "para qué y qué puedes hacer al respecto.",
  bloques: [
    {
      h: "Quién trata tus datos",
      p: [
        "El responsable es la persona que gestiona esta instalación de la aplicación, " +
        "a quien puedes dirigirte por el correo de contacto que aparece al final.",
      ],
    },
    {
      h: "Qué datos se recogen",
      p: [
        "Datos de la cuenta: tu correo electrónico y una contraseña cifrada. La " +
        "contraseña la gestiona el proveedor de identidad y nunca se guarda en claro.",
        "Datos que tú escribes: entrenamientos (ejercicios, series, repeticiones y " +
        "pesos), horas y calidad de sueño, peso corporal, hábitos, tareas, notas, " +
        "textos, lecturas, objetivos, valores, revisiones y decisiones.",
        "No se recoge nada más: ni tu ubicación, ni tus contactos, ni tu actividad " +
        "en otras webs. No hay analítica, ni publicidad, ni rastreadores de terceros.",
      ],
    },
    {
      h: "Datos de salud: una categoría especial",
      p: [
        "El peso corporal, las horas de sueño y el registro de entrenamiento se " +
        "consideran datos relativos a la salud, que el RGPD protege de forma reforzada.",
        "La base legal para tratarlos es tu consentimiento explícito, que das al crear " +
        "la cuenta y aceptar esta política. Puedes retirarlo cuando quieras borrando " +
        "tus datos desde Ajustes.",
        "Estos datos solo se usan para mostrarte tu propia información dentro de la " +
        "app: calcular tus rangos de fuerza, tus récords y tus resúmenes. No se " +
        "comparten con nadie ni se usan para elaborar perfiles con efectos jurídicos.",
      ],
    },
    {
      h: "Dónde se guardan",
      p: [
        "En una base de datos PostgreSQL alojada en Supabase, en la región europea " +
        "elegida al crear el proyecto. La conexión viaja siempre cifrada (HTTPS/TLS).",
        "El servidor de la aplicación está en Render y la interfaz se sirve desde " +
        "Vercel. Ambos actúan como encargados del tratamiento y no usan tus datos " +
        "para fines propios.",
        "El acceso público directo a la base de datos está bloqueado: solo el " +
        "servidor de la aplicación puede leerla, y cada consulta filtra por tu " +
        "identificador de usuario, de modo que nadie ve los datos de otra persona.",
      ],
    },
    {
      h: "Cookies y almacenamiento",
      p: [
        "La aplicación no usa cookies de análisis ni de publicidad, y no carga " +
        "rastreadores de terceros.",
        "Sí guarda en tu navegador la sesión iniciada, para no pedirte la contraseña " +
        "cada vez. Es almacenamiento estrictamente necesario para un servicio que " +
        "tú has pedido, y por eso no requiere banner de consentimiento.",
      ],
    },
    {
      h: "Cuánto tiempo se conservan",
      p: [
        "Mientras tengas la cuenta activa. Cuando borras tus datos, se eliminan de " +
        "la base de datos de forma inmediata y definitiva; no hay papelera ni copia " +
        "oculta a la que la aplicación pueda volver.",
      ],
    },
    {
      h: "Tus derechos",
      p: [
        "Acceso y portabilidad: en Ajustes puedes exportar absolutamente todo lo " +
        "tuyo en un archivo JSON, legible por cualquier programa.",
        "Rectificación: puedes editar o borrar cualquier registro desde la propia app.",
        "Supresión: en Ajustes puedes eliminar todos tus datos de una vez.",
        "También puedes oponerte al tratamiento o presentar una reclamación ante la " +
        "autoridad de control de tu país (en España, la AEPD).",
      ],
    },
    {
      h: "Seguridad",
      p: [
        "Todo el tráfico va cifrado. Las claves sensibles viven solo en el servidor, " +
        "nunca en la aplicación que se descarga tu navegador.",
        "Hay un límite de peticiones por minuto para frenar intentos de fuerza bruta, " +
        "y cabeceras que impiden que la app se incruste en sitios ajenos.",
        "Ningún sistema es infalible. Si ocurriera una brecha que afecte a tus datos, " +
        "se te comunicará sin demora indebida, como exige el artículo 34 del RGPD.",
      ],
    },
  ],
  contacto:
    "Para cualquier cuestión sobre tus datos, escribe al correo de contacto del " +
    "responsable de esta instalación.",
};

export const TERMINOS = {
  title: "Términos de uso",
  intro:
    "Las reglas del juego: qué puedes esperar de la aplicación y qué se espera " +
    "de ti al usarla.",
  bloques: [
    {
      h: "Qué es esta aplicación",
      p: [
        "Un cuaderno personal para registrar entrenamiento y vida deliberada. Se " +
        "ofrece tal cual, sin coste, y su objetivo es que lleves tu propio registro.",
      ],
    },
    {
      h: "No es consejo médico",
      p: [
        "Los rangos de fuerza, los récords estimados, las sugerencias de peso y los " +
        "avisos de descarga son cálculos automáticos a partir de tus propios datos, " +
        "no recomendaciones médicas ni de un entrenador.",
        "El 1RM estimado usa la fórmula de Epley: es una aproximación matemática, no " +
        "una medición. No intentes levantar un peso solo porque una fórmula lo diga.",
        "Si tienes una lesión, una condición médica o dudas sobre tu salud, consulta " +
        "a un profesional. Entrenas bajo tu propia responsabilidad.",
      ],
    },
    {
      h: "Tu cuenta",
      p: [
        "Eres responsable de mantener tu contraseña a salvo y de la actividad que " +
        "ocurra con tu cuenta.",
        "Debes tener al menos 16 años para crear una cuenta, o la edad mínima que " +
        "marque la ley de tu país para consentir el tratamiento de tus datos.",
      ],
    },
    {
      h: "Uso aceptable",
      p: [
        "No está permitido intentar acceder a datos de otras personas, saltarse los " +
        "límites técnicos, automatizar peticiones masivas, ni usar la aplicación para " +
        "actividades ilegales o para dañar el servicio.",
        "Se pueden suspender o cerrar las cuentas que incumplan estas reglas, sin " +
        "aviso previo si el incumplimiento es grave.",
      ],
    },
    {
      h: "Tus contenidos son tuyos",
      p: [
        "Todo lo que escribes te pertenece. La aplicación no reclama ningún derecho " +
        "sobre ello, no lo usa para entrenar modelos ni lo comparte con terceros.",
        "Puedes llevártelo entero cuando quieras con la exportación de datos.",
      ],
    },
    {
      h: "Disponibilidad y límites de responsabilidad",
      p: [
        "El servicio se presta sin garantías de disponibilidad continua: puede haber " +
        "cortes, mantenimientos o fallos, y funciona sobre servicios gratuitos de " +
        "terceros que pueden interrumpirse.",
        "Se recomienda exportar tus datos periódicamente si son importantes para ti.",
        "En la medida que permita la ley, no se asume responsabilidad por pérdidas " +
        "derivadas del uso o de la imposibilidad de usar la aplicación.",
      ],
    },
    {
      h: "Cambios",
      p: [
        "Estos términos pueden actualizarse. Si el cambio es relevante, se avisará " +
        "dentro de la aplicación. Seguir usándola después implica aceptarlos.",
      ],
    },
  ],
  contacto: "Última actualización: " + ACTUALIZADO + ".",
};
