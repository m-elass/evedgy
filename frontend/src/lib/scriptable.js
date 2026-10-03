/*
 * lib/scriptable.js — EL SCRIPT DEL WIDGET PARA IPHONE
 * ────────────────────────────────────────────────────
 * Sin Mac no se puede publicar un widget nativo de iPhone. La app gratuita
 * Scriptable sí permite crear widgets (pantalla de inicio y de bloqueo) con un
 * script. Este archivo genera ese script ya configurado con la dirección de
 * tu servidor. La llave NO va dentro del script (el script puede acabar en
 * iCloud): el propio script la pide la primera vez y la guarda en el llavero
 * del iPhone (Keychain).
 */
export function scriptWidget(apiUrl) {
  return `// ✦ Tu cuaderno — widget para Scriptable
// Pantalla de inicio: pequeño, mediano o grande. Pantalla de bloqueo: rectangular o en línea.
// La primera vez, ejecútalo dentro de Scriptable: te pedirá la llave del widget
// (Ajustes → Widgets en Tu cuaderno). Para cambiarla, vuelve a ejecutarlo dentro de Scriptable.

const API = "${apiUrl}";
const FRASE_EN_BLOQUEO = true;      // false = en la pantalla de bloqueo solo cifras
const AVISO_CARTA = { hora: 22, minuto: 0 };   // recordatorio si aún no has escrito
const LLAVE = "tu-cuaderno-widget";

const ORO = new Color("#E8B84B"), TINTA = new Color("#F0F6FF"), SUAVE = new Color("#A9C2E6");

async function pedirLlave() {
  const a = new Alert();
  a.title = "Llave de Tu cuaderno";
  a.message = "Pega la llave que creaste en Ajustes → Widgets.";
  a.addSecureTextField("tcw_…");
  a.addAction("Guardar");
  a.addCancelAction("Cancelar");
  if ((await a.present()) === 0) {
    const t = a.textFieldValue(0).trim();
    if (t.startsWith("tcw_")) Keychain.set(LLAVE, t);
  }
}

if (config.runsInApp) {
  if (!Keychain.contains(LLAVE)) await pedirLlave();
  else {
    const a = new Alert();
    a.title = "Tu cuaderno";
    a.addAction("Ver el widget");
    a.addAction("Cambiar la llave");
    if ((await a.present()) === 1) await pedirLlave();
  }
}

const fm = FileManager.local();
const CACHE = fm.joinPath(fm.documentsDirectory(), "tu-cuaderno-widget.json");

async function datos() {
  if (!Keychain.contains(LLAVE)) return null;
  try {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
    const r = new Request(API + "/widget?tz=" + encodeURIComponent(zona));
    r.headers = { Authorization: "Bearer " + Keychain.get(LLAVE) };
    r.timeoutInterval = 25;
    const d = await r.loadJSON();
    if (r.response && r.response.statusCode === 200) {
      fm.writeString(CACHE, JSON.stringify(d));
      return d;
    }
  } catch (e) { /* servidor dormido o sin red: se usa lo guardado */ }
  return fm.fileExists(CACHE) ? JSON.parse(fm.readString(CACHE)) : null;
}

const d = await datos();
const familia = config.widgetFamily || "medium";
const w = new ListWidget();
w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);

if (familia.startsWith("accessory")) {
  w.addAccessoryWidgetBackground = familia === "accessoryCircular";
  if (!d) { w.addText("Tu cuaderno"); }
  else if (familia === "accessoryInline") {
    w.addText(\`✦ \${d.habits.done}/\${d.habits.total} · ✉ \${d.letter.written ? "✓" : "—"} \${d.letter.streak}\`);
  } else if (familia === "accessoryCircular") {
    const t = w.addText(\`\${d.habits.done}/\${d.habits.total}\`); t.font = Font.boldSystemFont(16); t.centerAlignText();
    const s = w.addText("hábitos"); s.font = Font.systemFont(9); s.centerAlignText();
  } else {
    if (FRASE_EN_BLOQUEO && d.quote) {
      const q = w.addText(d.quote.text); q.font = Font.italicSystemFont(12); q.minimumScaleFactor = 0.7; q.lineLimit = 3;
    } else {
      const t = w.addText(\`Hábitos \${d.habits.done}/\${d.habits.total}\`); t.font = Font.boldSystemFont(13);
      const c = w.addText(\`Carta: \${d.letter.written ? "sellada" : "pendiente"} · racha \${d.letter.streak}\`); c.font = Font.systemFont(11);
      if (d.missions.total) { const m = w.addText(\`Misiones \${d.missions.done}/\${d.missions.total}\`); m.font = Font.systemFont(11); }
    }
  }
} else {
  const g = new LinearGradient();
  g.colors = [new Color("#0B1B33"), new Color("#1E3B6B")];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.setPadding(14, 14, 12, 14);
  if (!d) {
    const t = w.addText("Abre Scriptable y ejecuta este script para poner tu llave.");
    t.textColor = TINTA; t.font = Font.systemFont(12);
  } else {
    if (d.quote && familia !== "small") {
      const q = w.addText("«" + d.quote.text + "»");
      q.font = new Font("Georgia-Italic", familia === "large" ? 17 : 14);
      q.textColor = TINTA; q.minimumScaleFactor = 0.6; q.lineLimit = familia === "large" ? 6 : 3;
      if (d.quote.author) { const a = w.addText("— " + d.quote.author); a.font = Font.systemFont(10); a.textColor = SUAVE; }
      w.addSpacer(8);
    }
    const fila = w.addStack(); fila.centerAlignContent();
    const h = fila.addText(\`✦ \${d.habits.done}/\${d.habits.total}\`); h.font = Font.boldSystemFont(familia === "small" ? 26 : 15); h.textColor = ORO;
    if (familia !== "small") {
      fila.addSpacer(10);
      const c = fila.addText(\`✉ \${d.letter.written ? "sellada" : "pendiente"} · \${d.letter.streak}\`);
      c.font = Font.systemFont(12); c.textColor = d.letter.written ? SUAVE : ORO;
    }
    if (familia === "small") {
      const s = w.addText("hábitos hoy"); s.font = Font.systemFont(10); s.textColor = SUAVE;
      w.addSpacer(6);
      const c = w.addText(\`✉ \${d.letter.written ? "sellada" : "pendiente"}\`); c.font = Font.systemFont(12); c.textColor = d.letter.written ? SUAVE : ORO;
      const r = w.addText(\`racha \${d.letter.streak}\`); r.font = Font.systemFont(10); r.textColor = SUAVE;
    }
    if (familia === "large") {
      w.addSpacer(8);
      for (const p of d.habits.pending) { const t = w.addText("○ " + p); t.font = Font.systemFont(12); t.textColor = TINTA; }
      if (d.tasks.length) {
        w.addSpacer(6);
        const tt = w.addText("TAREAS"); tt.font = Font.boldSystemFont(9); tt.textColor = SUAVE;
        for (const t of d.tasks) { const x = w.addText("· " + t); x.font = Font.systemFont(12); x.textColor = TINTA; }
      }
    }
    if (d.missions.total && familia !== "small") {
      w.addSpacer(4);
      const m = w.addText(\`⚔ Misiones \${d.missions.done}/\${d.missions.total}\`); m.font = Font.systemFont(11); m.textColor = new Color("#7FDBFF");
    }
  }
}

// Recordatorio de la carta: si aún no está escrita, aviso a la hora elegida; si ya lo está, se retira
try {
  if (d) {
    await Notification.removePending(["tc-carta"]);
    const cuando = new Date(); cuando.setHours(AVISO_CARTA.hora, AVISO_CARTA.minuto, 0, 0);
    if (!d.letter.written && cuando > new Date()) {
      const n = new Notification();
      n.identifier = "tc-carta";
      n.title = "Tu carta de hoy te espera";
      n.body = "Antes de dormir, cuéntale tu día.";
      n.setTriggerDate(cuando);
      await n.schedule();
    }
  }
} catch (e) { /* los avisos son un extra */ }

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
`;
}

/*
 * EL WIDGET DE FRASES — solo tus frases, en grande.
 * Usa la misma llave que el widget de resumen (está guardada en el llavero del
 * iPhone), así que si ya tienes el otro, este funciona a la primera.
 *   cadaHoras: 0 = la frase del día (la misma que en Hoy); 1, 3, 6… = va cambiando
 *   aviso: { hora, minuto } = una notificación cada mañana con la frase del día; null = sin aviso
 */
export function scriptFrases(apiUrl, { cadaHoras = 0, aviso = { hora: 8, minuto: 30 } } = {}) {
  const avisoTxt = aviso ? `{ hora: ${Number(aviso.hora) || 0}, minuto: ${Number(aviso.minuto) || 0} }` : "null";
  return `// ✦ Tu cuaderno · Frases — widget para Scriptable
// Solo tus frases (las que tienen el ojo abierto en la estrella Frases).
// Pantalla de inicio: pequeño, mediano o grande. Pantalla de bloqueo: rectangular (la mejor) o en línea.
// Usa la misma llave que el widget «Tu cuaderno»: si ya lo tienes, no te la pedirá.

const API = "${apiUrl}";
const CAMBIAR_CADA_HORAS = ${Number(cadaHoras) || 0};   // 0 = la frase del día (la de Hoy) · 3 = una distinta cada 3 horas
const AVISO_FRASE = ${avisoTxt};   // notificación cada mañana con la frase del día · null = sin aviso
const LLAVE = "tu-cuaderno-widget";

const ORO = new Color("#E2C27E"), CHAMPAN = new Color("#F3E3BC"), TINTA = new Color("#F4FAFF"), HIELO = new Color("#BFE3FF");

async function pedirLlave() {
  const a = new Alert();
  a.title = "Llave de Tu cuaderno";
  a.message = "Pega la llave que creaste en Ajustes → Widgets.";
  a.addSecureTextField("tcw_…");
  a.addAction("Guardar");
  a.addCancelAction("Cancelar");
  if ((await a.present()) === 0) {
    const t = a.textFieldValue(0).trim();
    if (t.startsWith("tcw_")) Keychain.set(LLAVE, t);
  }
}

if (config.runsInApp) {
  if (!Keychain.contains(LLAVE)) await pedirLlave();
  else {
    const a = new Alert();
    a.title = "Tu cuaderno · Frases";
    a.addAction("Ver el widget");
    a.addAction("Cambiar la llave");
    if ((await a.present()) === 1) await pedirLlave();
  }
}

const fm = FileManager.local();
const CACHE = fm.joinPath(fm.documentsDirectory(), "tu-cuaderno-frases.json");

async function datos() {
  if (!Keychain.contains(LLAVE)) return null;
  try {
    const zona = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid";
    const r = new Request(API + "/widget?tz=" + encodeURIComponent(zona));
    r.headers = { Authorization: "Bearer " + Keychain.get(LLAVE) };
    r.timeoutInterval = 25;
    const d = await r.loadJSON();
    if (r.response && r.response.statusCode === 200) {
      fm.writeString(CACHE, JSON.stringify(d));
      return d;
    }
  } catch (e) { /* servidor dormido o sin red: se usa lo guardado */ }
  return fm.fileExists(CACHE) ? JSON.parse(fm.readString(CACHE)) : null;
}

const ymd = (a) => a.getFullYear() + "-" + String(a.getMonth() + 1).padStart(2, "0") + "-" + String(a.getDate()).padStart(2, "0");
function hoyLocal() {
  const a = new Date();
  if (a.getHours() < 4) a.setDate(a.getDate() - 1);     // de madrugada aún cuenta ayer, como en la app
  return ymd(a);
}
function diaSiguiente(texto) {
  const [y, m, dd] = texto.split("-").map(Number);
  return ymd(new Date(y, m - 1, dd + 1));
}

// El día de las frases empieza a las 6:00: la primera de la mañana es siempre la frase del día.
function minutosDesdeLas6() {
  const a = new Date();
  return (a.getHours() * 60 + a.getMinutes() - 360 + 1440) % 1440;
}

// La frase que toca ahora. Si hace falta que quepa (pantalla de bloqueo), busca la siguiente que quepa.
function laFrase(d, cabe) {
  let lista = (d.quotes && d.quotes.length) ? d.quotes.slice() : (d.quote ? [d.quote] : []);
  // datos de ayer (sin red): la de hoy es la que ayer era «la de mañana»
  if (d.date < hoyLocal() && d.quote_tomorrow) lista = [d.quote_tomorrow].concat(lista.filter((q) => q.text !== d.quote_tomorrow.text));
  if (!lista.length) return null;
  let i = 0;
  if (CAMBIAR_CADA_HORAS > 0) i = Math.floor(minutosDesdeLas6() / (CAMBIAR_CADA_HORAS * 60));   // a primera hora, la del día
  for (let k = 0; k < lista.length; k++) {
    const q = lista[(i + k) % lista.length];
    if (!cabe || q.text.length <= cabe) return q;
  }
  return lista[i % lista.length];
}

const d = await datos();
const familia = config.widgetFamily || "medium";
const w = new ListWidget();
// Volver a mirar en el siguiente cambio de frase (o en una hora, para notar el cambio de día)
const proxima = new Date();
if (CAMBIAR_CADA_HORAS > 0) {
  const min = minutosDesdeLas6(), paso = CAMBIAR_CADA_HORAS * 60;
  proxima.setTime(Date.now() + ((Math.floor(min / paso) + 1) * paso - min) * 60 * 1000 + 5000);
} else proxima.setTime(Date.now() + 60 * 60 * 1000);
w.refreshAfterDate = proxima;

if (familia.startsWith("accessory")) {
  if (!d) { w.addText("Tu cuaderno"); }
  else if (familia === "accessoryInline") {
    const q = laFrase(d, 48);
    w.addText(q ? "❝ " + q.text : "Sin frases para el widget");
  } else if (familia === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const t = w.addText("❝"); t.font = Font.boldSystemFont(22); t.centerAlignText();
    const s = w.addText("frase"); s.font = Font.systemFont(9); s.centerAlignText();
  } else {
    const q = laFrase(d, 115);
    if (!q) { w.addText("Marca frases con el ojo en Tu cuaderno."); }
    else {
      const t = w.addText(q.text); t.font = Font.italicSystemFont(13); t.minimumScaleFactor = 0.7; t.lineLimit = 3;
      if (q.author && q.text.length < 80) { const a = w.addText("— " + q.author); a.font = Font.systemFont(10); a.lineLimit = 1; }
    }
  }
} else {
  const g = new LinearGradient();
  g.colors = [new Color("#0B1A3A"), new Color("#1A2B66"), new Color("#2A2468")];
  g.locations = [0, 0.6, 1];
  g.startPoint = new Point(0, 0); g.endPoint = new Point(1, 1);
  w.backgroundGradient = g;
  const pequeno = familia === "small", grande = familia === "large" || familia === "extraLarge";
  w.setPadding(pequeno ? 12 : 16, pequeno ? 12 : 18, pequeno ? 12 : 14, pequeno ? 12 : 18);
  if (!d) {
    const t = w.addText("Abre Scriptable y ejecuta este script para poner tu llave.");
    t.textColor = TINTA; t.font = Font.systemFont(12);
  } else {
    const q = laFrase(d, pequeno ? 110 : grande ? 0 : 190);
    const k = w.addText(CAMBIAR_CADA_HORAS > 0 ? "✦  UNA FRASE" : "✦  LA FRASE DE HOY");
    k.font = Font.semiboldSystemFont(pequeno ? 8 : 9); k.textColor = ORO;
    w.addSpacer();
    if (!q) {
      const t = w.addText("Aún no hay frases para el widget: en la estrella Frases, deja el ojo abierto en las que quieras ver aquí.");
      t.font = Font.systemFont(12); t.textColor = TINTA;
    } else {
      const t = w.addText("«" + q.text + "»");
      t.font = new Font("Georgia-Italic", pequeno ? 14 : grande ? 23 : 17);
      t.textColor = TINTA; t.minimumScaleFactor = 0.5; t.lineLimit = pequeno ? 7 : grande ? 12 : 5;
      if (grande) t.centerAlignText();
      if (q.author) {
        w.addSpacer(pequeno ? 4 : 8);
        const fila = w.addStack();
        if (grande) fila.addSpacer();
        const a = fila.addText("— " + q.author);
        a.font = Font.systemFont(pequeno ? 9 : 11); a.textColor = CHAMPAN; a.lineLimit = 1;
        if (grande) fila.addSpacer();
      }
    }
    w.addSpacer();
    if (!pequeno) {
      const pie = w.addStack();
      pie.addSpacer();
      const p = pie.addText("Tu cuaderno"); p.font = Font.systemFont(8); p.textColor = HIELO; p.textOpacity = 0.55;
    }
  }
}

// Aviso de cada mañana con la frase del día (el iPhone lo muestra aunque no abras nada)
try {
  await Notification.removePending(["tc-frase"]);
  if (d && AVISO_FRASE) {
    const cuando = new Date(); cuando.setHours(AVISO_FRASE.hora, AVISO_FRASE.minuto, 0, 0);
    if (cuando <= new Date()) cuando.setDate(cuando.getDate() + 1);
    // la frase del día en que sonará el aviso: la de hoy o la de mañana (las dos vienen del servidor)
    const dia = ymd(cuando);
    const q = dia === d.date ? d.quote : dia === diaSiguiente(d.date) ? d.quote_tomorrow : null;
    if (q) {
      const n = new Notification();
      n.identifier = "tc-frase";
      n.threadIdentifier = "tc-frases";
      n.title = "✦ Tu frase de hoy";
      n.body = "«" + q.text + "»" + (q.author ? " — " + q.author : "");
      n.setTriggerDate(cuando);
      await n.schedule();
    }
  }
} catch (e) { /* los avisos son un extra */ }

if (config.runsInWidget) Script.setWidget(w);
else await w.presentMedium();
Script.complete();
`;
}
