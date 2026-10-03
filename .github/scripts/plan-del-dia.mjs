// ══════════════════════════════════════════════════════════════
// plan-del-dia.mjs — lo ejecuta el flujo «Plan del día con Claude».
//
//   1. Pide a la API los encargos pendientes (GET /planner/context).
//   2. Si no hay ninguno, termina (sin instalar ni gastar nada).
//   3. Cada encargo trae su texto, sus instrucciones y el formato (esquema
//      JSON) de la respuesta. Se lo pasa a Claude Code en modo no interactivo,
//      SIN herramientas (solo puede responder) y desde una carpeta vacía.
//   4. Manda la respuesta a la ruta que indica el encargo. El servidor la
//      valida; si la rechaza, Claude lo intenta una vez más con el motivo.
//
// Privacidad: nunca escribe en el registro tus datos ni lo que responde
// Claude, solo si cada encargo salió bien o no.
// Sin dependencias: solo Node 20+ (fetch de serie).
// ══════════════════════════════════════════════════════════════
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const API = (process.env.API_URL || "").trim().replace(/\/+$/, "");
const LLAVE = (process.env.PLANNER_KEY || "").trim();
const TOKEN = (process.env.CLAUDE_CODE_OAUTH_TOKEN || "").trim();
const MODELO = (process.env.PLANNER_MODEL || "").trim() || "sonnet";
const ZONA = (process.env.PLANNER_TZ || "").trim() || "Europe/Madrid";
const REHACER = process.env.REHACER === "true";
const CLAUDE = process.env.CLAUDE_BIN || "claude";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const aviso = (m) => console.log(`::warning::${m}`);
const fallo = (m) => console.log(`::error::${m}`);

if (!API || !LLAVE) {
  console.log("Aún no está configurado: faltan la variable API_URL o el secreto PLANNER_KEY " +
    "(los pasos están en la app: Ajustes → «Claude planifica tu día»). No se hace nada.");
  process.exit(0);
}
if (!LLAVE.startsWith("tcp_")) {
  fallo("PLANNER_KEY no parece una llave del planificador (empieza por tcp_). Créala en Ajustes.");
  process.exit(1);
}

// ── La API (el servidor gratuito puede estar dormido: se reintenta) ──
async function api(ruta, opciones = {}, intentos = 4) {
  let ultimo = "";
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetch(API + ruta, {
        ...opciones,
        headers: { Authorization: `Bearer ${LLAVE}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
      });
      if (r.status < 500 && r.status !== 429) return r;
      ultimo = `HTTP ${r.status}`;
    } catch (e) {
      ultimo = e.name === "TimeoutError" ? "tardó demasiado (quizá estaba despertando)" : e.message;
    }
    console.log(`  intento ${i}: ${ultimo}`);
    if (i < intentos) await dormir(15_000);
  }
  throw new Error(`el servidor no respondió (${ultimo})`);
}

// ── Claude Code ──
function instalarClaude() {
  const v = spawnSync(CLAUDE, ["--version"], { encoding: "utf8" });
  if (v.status === 0) return;
  console.log("Instalando Claude Code…");
  const r = spawnSync("npm", ["install", "-g", "--no-fund", "--no-audit", "@anthropic-ai/claude-code"],
    { encoding: "utf8", stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0) throw new Error("no se pudo instalar Claude Code");
}

class ErrorDeCuenta extends Error {}
// Solo esto es un problema del token (no «max_tokens», ni el límite de uso, que es pasajero)
const ES_DE_CUENTA = /authentication|invalid (bearer|api key|oauth|x-api-key)|oauth token|not logged in|please run \/login|\b401\b/i;

function preguntar(encargo, carpeta, correccion = "") {
  const args = ["-p", "--output-format", "json", "--model", MODELO, "--tools", "", "--strict-mcp-config",
    "--no-session-persistence", "--system-prompt", encargo.system,
    "--json-schema", JSON.stringify(encargo.schema)];
  // A Claude no le llega la llave del planificador (y, sin herramientas, tampoco podría usar nada del entorno)
  const entorno = { ...process.env };
  delete entorno.PLANNER_KEY;
  if (TOKEN) entorno.CLAUDE_CODE_OAUTH_TOKEN = TOKEN;
  const r = spawnSync(CLAUDE, args, {
    input: encargo.prompt + correccion, encoding: "utf8", cwd: carpeta, env: entorno,
    timeout: 10 * 60_000, maxBuffer: 32 * 1024 * 1024,
  });
  if (r.error) throw new Error(r.error.code === "ETIMEDOUT" ? "Claude tardó más de 10 minutos" : r.error.message);
  let salida;
  try {
    salida = JSON.parse(r.stdout);
  } catch {
    const pista = (r.stderr || "").split("\n").find((l) => ES_DE_CUENTA.test(l));
    if (pista) throw new ErrorDeCuenta(pista.slice(0, 200));
    throw new Error(`Claude no devolvió nada legible (código ${r.status})`);
  }
  if (salida.is_error) {
    const motivo = String(salida.result || salida.subtype || "error").slice(0, 200);
    if ([401, 403].includes(salida.api_error_status) || ES_DE_CUENTA.test(motivo)) throw new ErrorDeCuenta(motivo);
    throw new Error(`Claude no pudo responder: ${motivo}`);
  }
  if (salida.structured_output && typeof salida.structured_output === "object") return salida.structured_output;
  const t = String(salida.result || "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch { /* sigue abajo */ }
  }
  throw new Error("la respuesta de Claude no traía el JSON pedido");
}

// ── Principal ──
async function main() {
  const r = await api(`/planner/context?tz=${encodeURIComponent(ZONA)}${REHACER ? "&force=1" : ""}`);
  if (r.status === 401) {
    fallo("La API no acepta la llave del planificador (¿caducada o revocada?). Crea otra en Ajustes y " +
      "cámbiala en el secreto PLANNER_KEY.");
    return 1;
  }
  if (!r.ok) { fallo(`La API respondió ${r.status} al pedir los encargos.`); return 1; }
  const { jobs = [] } = await r.json();
  if (!jobs.length) { console.log("Nada que planificar ahora. ✓"); return 0; }
  if (!TOKEN) {
    fallo("Falta el secreto CLAUDE_CODE_OAUTH_TOKEN (sale de `claude setup-token`).");
    return 1;
  }
  console.log(`Encargos: ${jobs.map((j) => j.title).join(" · ")} (modelo: ${MODELO})`);
  instalarClaude();
  const carpeta = mkdtempSync(join(tmpdir(), "plan-"));   // vacía: sin CLAUDE.md ni ajustes del repo

  let fallidos = 0;
  for (const encargo of jobs) {
    if (typeof encargo.post !== "string" || !encargo.post.startsWith("/planner/")) continue;
    let hecho = false, motivo = "";
    for (let intento = 1; intento <= 2 && !hecho; intento++) {
      try {
        const correccion = motivo ? `\n\nTu respuesta anterior no era válida (${motivo}). Corrígela.` : "";
        const resultado = preguntar(encargo, carpeta, correccion);
        const g = await api(encargo.post, { method: "POST", body: JSON.stringify({ result: resultado, model: MODELO }) }, 3);
        if (g.ok) { hecho = true; break; }
        const d = await g.json().catch(() => ({}));
        motivo = typeof d.detail === "string" ? d.detail.slice(0, 300) : `HTTP ${g.status}`;
        console.log(`  ${encargo.title}: el servidor no lo aceptó (HTTP ${g.status})`);
        if ([401, 404, 409].includes(g.status)) break;
      } catch (e) {
        if (e instanceof ErrorDeCuenta) {
          fallo(`Claude no acepta el token (${e.message}). Genera otro con \`claude setup-token\` y ` +
            "cámbialo en el secreto CLAUDE_CODE_OAUTH_TOKEN.");
          return 1;
        }
        motivo = e.message;
        console.log(`  ${encargo.title}: ${e.message}`);
      }
    }
    if (hecho) {
      console.log(`✓ ${encargo.title}`);
    } else {
      fallidos++;
      aviso(`${encargo.title}: no se pudo hacer esta vez.`);
      if (encargo.kind === "plan_mision") {   // que la app lo diga, en vez de quedarse «en cola» para siempre
        await api(encargo.post, { method: "POST", body: JSON.stringify({ error: motivo || "sin respuesta válida", model: MODELO }) }, 2)
          .catch(() => {});
      }
    }
  }
  // Un encargo fallido no es un error del flujo: la app sigue con su plan automático.
  console.log(fallidos ? `Terminado con ${fallidos} encargo(s) sin hacer.` : "Terminado. ✓");
  return 0;
}

main().then((codigo) => process.exit(codigo)).catch((e) => { fallo(e.message); process.exit(1); });
