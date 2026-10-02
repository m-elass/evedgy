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
