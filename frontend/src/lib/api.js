/*
 * lib/api.js
 * ──────────
 * El ÚNICO sitio del frontend que habla con nuestro backend FastAPI.
 * Todo lo demás llama a estas funciones, nunca a fetch() directamente.
 *
 * Cada petición lleva el token del usuario (cabecera Authorization), tiene un
 * tiempo máximo y, si falla, lanza un ApiError que dice QUÉ pasó:
 *   · "sin_sesion" → no hay sesión: la petición ni siquiera sale.
 *   · "red"        → sin conexión o el servidor no responde.
 *   · "timeout"    → tardó demasiado (p. ej. el servidor estaba dormido).
 *   · "http"       → el servidor respondió con un error (status 4xx/5xx).
 * Así la app nunca confunde «falló la red» con «no tienes datos».
 */
import { supabase } from "./supabase";

// La URL del backend (se fija al construir la web, variable VITE_API_URL).
export const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(code, { status = 0, detail = "", retryAfter = 0 } = {}) {
    super(detail || code);
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.retryAfter = retryAfter;
  }
  /** Frase para el usuario: qué pasó y qué hacer. */
  get humano() {
    if (this.code === "sin_sesion") return "Tu sesión ha caducado. Vuelve a entrar.";
    if (this.code === "red") return "Sin conexión con el servidor. No se ha guardado.";
    if (this.code === "timeout") return "El servidor tarda en responder (puede estar despertando). Inténtalo de nuevo.";
    if (this.status === 429) return "Demasiadas peticiones seguidas. Espera un momento.";
    if (this.status >= 500) return "El servidor ha fallado. Inténtalo de nuevo en un momento.";
    return this.detail || "No se pudo completar.";
  }
}

async function token() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function request(path, { method = "GET", body, timeout } = {}) {
  const t = await token();
  if (!t) throw new ApiError("sin_sesion", { status: 401 });

  // Lecturas: 20 s (se reintentan solas). Escrituras: 90 s, porque cortar una
  // escritura no la deshace y un servidor dormido tarda en despertar: si se
  // cortara antes, se podría repetir algo que en realidad sí se guardó.
  const limite = timeout ?? (method === "GET" ? 20000 : 90000);
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), limite);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ApiError(e?.name === "AbortError" ? "timeout" : "red");
  } finally {
    clearTimeout(reloj);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = typeof j?.detail === "string" ? j.detail : "";
    } catch { /* cuerpo vacío o no JSON */ }
    throw new ApiError("http", {
      status: res.status, detail,
      retryAfter: parseInt(res.headers.get("Retry-After") || "0", 10) || 0,
    });
  }
  return res.status === 204 ? null : res.json();
}

/** Despierta al servidor nada más abrir la app (Render se duerme tras 15 min sin uso). */
export function despertar() {
  fetch(`${BASE}/`, { mode: "no-cors", cache: "no-store" }).catch(() => {});
}

/** Fecha LOCAL del móvil (AAAA-MM-DD). toISOString() daba la de Londres. */
export function ymd(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
/** Lunes de la semana de una fecha. */
export function lunes(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
/** «Día lógico» de la carta: hasta las 4 de la madrugada sigue siendo ayer. */
export function diaDeCarta(d = new Date()) {
  const x = new Date(d);
  if (x.getHours() < 4) x.setDate(x.getDate() - 1);
  return ymd(x);
}

// ── Funciones por módulo ──────────────────────────────────
// Cada una mapea 1:1 con un endpoint del backend. Nombres claros.

export const api = {
  // Derecho de supresión (RGPD): borra todos los datos del usuario.
  // La confirmación viaja en la URL porque el backend la exige explícitamente.
  deleteAccount: () => request("/profile/account?confirm=BORRAR", { method: "DELETE" }),
  // Ejercicios
  listExercises: () => request("/exercises"),
  createExercise: (data) => request("/exercises", { method: "POST", body: data }),
  updateExercise: (id, data) => request(`/exercises/${id}`, { method: "PATCH", body: data }),
  muscleCatalog: () => request("/exercises/muscles/catalog"),
  deleteExercise: (id) => request(`/exercises/${id}`, { method: "DELETE" }),

  // Sesiones de entrenamiento
  listSessions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/sessions${q ? `?${q}` : ""}`);
  },
  createSession: (data) => request("/sessions", { method: "POST", body: data }),
  updateSession: (id, data) => request(`/sessions/${id}`, { method: "PATCH", body: data }),
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  bestSet: (exerciseId) => request(`/sessions/best/${exerciseId}`),
  exerciseProgress: (id) => request(`/sessions/progress/${id}`),

  // Hábitos diarios
  listDailyTasks: () => request("/daily-tasks"),
  createDailyTask: (data) => request("/daily-tasks", { method: "POST", body: data }),
  updateDailyTask: (id, data) => request(`/daily-tasks/${id}`, { method: "PATCH", body: data }),
  deleteDailyTask: (id) => request(`/daily-tasks/${id}`, { method: "DELETE" }),
  completeDailyTask: (id, data) => request(`/daily-tasks/${id}/complete`, { method: "PUT", body: data }),
  // métricas (value / add) y principios (1 · 0.5 · 0); clear=true lo borra
  setHabitValue: (id, data) => request(`/daily-tasks/${id}/value`, { method: "PUT", body: data }),
  importHabits: (data) => request("/daily-tasks/import", { method: "POST", body: data }),
  listCompletions: (id, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/daily-tasks/${id}/completions${q ? `?${q}` : ""}`);
  },

  // Tareas sueltas
  listRandomTasks: () => request("/random-tasks"),
  createRandomTask: (data) => request("/random-tasks", { method: "POST", body: data }),
  updateRandomTask: (id, data) => request(`/random-tasks/${id}`, { method: "PATCH", body: data }),
  deleteRandomTask: (id) => request(`/random-tasks/${id}`, { method: "DELETE" }),

  // Secciones para clasificar las tareas (las crea el usuario)
  listTaskSections: () => request("/task-sections"),
  createTaskSection: (data) => request("/task-sections", { method: "POST", body: data }),
  updateTaskSection: (id, data) => request(`/task-sections/${id}`, { method: "PATCH", body: data }),
  deleteTaskSection: (id) => request(`/task-sections/${id}`, { method: "DELETE" }),

  // Notas
  listNotes: () => request("/notes"),
  createNote: (data) => request("/notes", { method: "POST", body: data }),
  deleteNote: (id) => request(`/notes/${id}`, { method: "DELETE" }),

  // Documentos
  listDocuments: () => request("/documents"),
  getDocument: (id) => request(`/documents/${id}`),
  createDocument: (data) => request("/documents", { method: "POST", body: data }),
  updateDocument: (id, data) => request(`/documents/${id}`, { method: "PATCH", body: data }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),

  // Sueño
  listSleep: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/sleep${q ? `?${q}` : ""}`);
  },
  setSleep: (data) => request("/sleep", { method: "PUT", body: data }),
  deleteSleep: (id) => request(`/sleep/${id}`, { method: "DELETE" }),

  // Objetivos
  listGoals: () => request("/goals"),
  createGoal: (data) => request("/goals", { method: "POST", body: data }),
  updateGoal: (id, data) => request(`/goals/${id}`, { method: "PATCH", body: data }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: "DELETE" }),

  // Generación de tema con IA (a partir de palabras del usuario)
  generateTheme: (data) => request("/theme/generate", { method: "POST", body: data }),

  // ── Inteligencia de entrenamiento ──
  nextSet: (exerciseId) => request(`/insights/next-set/${exerciseId}`),
  records: () => request("/insights/records"),
  deload: (exerciseId) => request(`/insights/deload/${exerciseId}`),
  weekSummary: () => request("/summary/week"),
  muscleWeek: () => request("/insights/muscle-week"),

  // Rutina semanal: plantilla por defecto + excepciones de semanas concretas
  routineWeek: (start) => request(`/routine/week/${start}`),
  setTemplateDay: (weekday, exercise_ids) =>
    request(`/routine/template/${weekday}`, { method: "PUT", body: { exercise_ids } }),
  setWeekDay: (start, weekday, exercise_ids) =>
    request(`/routine/week/${start}/${weekday}`, { method: "PUT", body: { exercise_ids } }),
  clearWeekDay: (start, weekday) =>
    request(`/routine/week/${start}/${weekday}`, { method: "DELETE" }),
  promoteWeek: (start) => request(`/routine/week/${start}/promote`, { method: "POST" }),
  reanalyzeExercise: (id) => request(`/exercises/${id}/reanalyze`, { method: "POST" }),
  reanalyzeAll: () => request("/exercises/reanalyze-all", { method: "POST" }),
  knownCatalog: () => request("/exercises/catalog/known"),
  analyzeName: (name) => request(`/exercises/analyze?name=${encodeURIComponent(name)}`),

  // ── Perfil y rangos ──
  getProfile: () => request("/profile"),
  updateProfile: (data) => request("/profile", { method: "PATCH", body: data }),
  exportData: () => request("/export"),
  rankForExercise: (id) => request(`/ranks/${id}`),
  allRanks: () => request("/ranks"),

  // ── Meta física (cuenta atrás + racha) ──
  getPhysiqueGoal: () => request("/physique/goal"),
  setPhysiqueGoal: (data) => request("/physique/goal", { method: "POST", body: data }),
  deletePhysiqueGoal: () => request("/physique/goal", { method: "DELETE" }),

  // ── Social (amigos y rangos compartidos) ──
  listFriends: () => request("/social/friends"),
  sendFriendRequest: (data) => request("/social/friends/request", { method: "POST", body: data }),
  acceptFriend: (id) => request(`/social/friends/${id}/accept`, { method: "POST" }),
  removeFriend: (id) => request(`/social/friends/${id}`, { method: "DELETE" }),
  friendRanks: (id) => request(`/social/friends/${id}/ranks`),

  // ── Valores ──
  listValues: () => request("/values"),
  createValue: (data) => request("/values", { method: "POST", body: data }),
  deleteValue: (id) => request(`/values/${id}`, { method: "DELETE" }),
  valueCheckin: (id, data) => request(`/values/${id}/checkin`, { method: "POST", body: data }),
  listValueCheckins: (id) => request(`/values/${id}/checkins`),

  // ── Revisiones ──
  listReviews: () => request("/reviews"),
  createReview: (data) => request("/reviews", { method: "POST", body: data }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: "DELETE" }),

  // ── Decisiones ──
  listDecisions: () => request("/decisions"),
  createDecision: (data) => request("/decisions", { method: "POST", body: data }),
  reviewDecision: (id, data) => request(`/decisions/${id}/review`, { method: "PUT", body: data }),
  deleteDecision: (id) => request(`/decisions/${id}`, { method: "DELETE" }),

  // ── Cartas al futuro ──
  listLetters: () => request("/letters"),
  openLetter: (id) => request(`/letters/${id}`),
  createLetter: (data) => request("/letters", { method: "POST", body: data }),

  // ── Lecturas y cosechas ──
  listReadings: () => request("/readings"),
  createReading: (data) => request("/readings", { method: "POST", body: data }),
  updateReading: (id, data) => request(`/readings/${id}`, { method: "PATCH", body: data }),
  deleteReading: (id) => request(`/readings/${id}`, { method: "DELETE" }),
  addHarvest: (id, data) => request(`/readings/${id}/harvest`, { method: "POST", body: data }),
  deleteHarvest: (id) => request(`/harvests/${id}`, { method: "DELETE" }),

  // ── Skills ──
  listSkills: () => request("/skills"),
  createSkill: (data) => request("/skills", { method: "POST", body: data }),
  updateSkill: (id, data) => request(`/skills/${id}`, { method: "PATCH", body: data }),
  deleteSkill: (id) => request(`/skills/${id}`, { method: "DELETE" }),
  logSkill: (id, data) => request(`/skills/${id}/log`, { method: "POST", body: data }),
  listSkillLogs: (id) => request(`/skills/${id}/logs`),

  // ── Agregados: una pantalla, una petición ──
  today: (date) => request(`/today?date=${date}`),
  dailyToday: (date) => request(`/daily-tasks/today?date=${date}`),
  habitsAll: (date) => request(`/daily-tasks/today?date=${date}&all=1`),
  trainingWeek: (start) => request(`/training/week/${start}`),
  summaryWeek: (start) => request(`/summary/weeks/${start}`),

  // ── Carta diaria ──
  dailyLetters: (date) => request(`/daily-letters?date=${date}`),
  dailyLetter: (date) => request(`/daily-letters/${date}`),
  dailyLetterBook: () => request("/daily-letters/book"),
  saveDailyLetter: (date, data) => request(`/daily-letters/${date}`, { method: "PUT", body: data }),
  deleteDailyLetter: (date) => request(`/daily-letters/${date}`, { method: "DELETE" }),

  // ── Conocimiento ──
  listKnowledge: () => request("/knowledge"),
  createKnowledge: (data) => request("/knowledge", { method: "POST", body: data }),
  updateKnowledge: (id, data) => request(`/knowledge/${id}`, { method: "PATCH", body: data }),
  deleteKnowledge: (id) => request(`/knowledge/${id}`, { method: "DELETE" }),
  startReading: (id) => request(`/knowledge/${id}/start-reading`, { method: "POST" }),
  taskToKnowledge: (taskId, kind) => request(`/knowledge/from-task/${taskId}`, { method: "POST", body: { kind } }),

  // ── Frases ──
  listQuotes: () => request("/quotes"),
  createQuote: (data) => request("/quotes", { method: "POST", body: data }),
  updateQuote: (id, data) => request(`/quotes/${id}`, { method: "PATCH", body: data }),
  deleteQuote: (id) => request(`/quotes/${id}`, { method: "DELETE" }),

  // ── Habilidades (el Sistema) ──
  skillBoard: (date) => request(`/skill-board?date=${date}`),
  createSkillB: (data) => request("/skill-board/skills", { method: "POST", body: data }),
  updateSkillB: (id, data) => request(`/skill-board/skills/${id}`, { method: "PATCH", body: data }),
  logPractice: (id, data) => request(`/skill-board/skills/${id}/log`, { method: "POST", body: data }),
  deletePractice: (logId) => request(`/skill-board/logs/${logId}`, { method: "DELETE" }),
  requestDaily: (id, date) => request(`/skill-board/skills/${id}/daily`, { method: "POST", body: { date } }),
  makePlan: (id) => request(`/skill-board/skills/${id}/plan`, { method: "POST" }),
  dropPlan: (id) => request(`/skill-board/skills/${id}/plan`, { method: "DELETE" }),
  completeMission: (id, data) => request(`/skill-board/missions/${id}/complete`, { method: "POST", body: data }),
  undoMission: (id, date) => request(`/skill-board/missions/${id}/undo`, { method: "POST", body: { date } }),
  rerollMission: (id, date) => request(`/skill-board/missions/${id}/reroll`, { method: "POST", body: { date } }),
  createQuest: (id, data) => request(`/skill-board/skills/${id}/quests`, { method: "POST", body: data }),
  updateQuest: (qid, data) => request(`/skill-board/quests/${qid}`, { method: "PATCH", body: data }),
  deleteQuest: (qid) => request(`/skill-board/quests/${qid}`, { method: "DELETE" }),
  taskToSkill: (taskId) => request(`/skill-board/from-task/${taskId}`, { method: "POST" }),

  // ── Claude planifica tu día (con tu suscripción) ──
  plannerSettings: () => request("/planner/settings"),
  savePlannerSettings: (data) => request("/planner/settings", { method: "PUT", body: data }),
  createPlannerKey: () => request("/planner/keys", { method: "POST" }),
  revokePlannerKey: (id) => request(`/planner/keys/${id}`, { method: "DELETE" }),
  discardDayPlan: (date) => request(`/planner/plan?date=${date}`, { method: "DELETE" }),

  // ── Widgets del móvil (llaves de solo lectura) ──
  widgetTokens: () => request("/widget/tokens"),
  createWidgetToken: (name) => request("/widget/tokens", { method: "POST", body: { name } }),
  revokeWidgetToken: (id) => request(`/widget/tokens/${id}`, { method: "DELETE" }),

  // ── Avisos push (carta diaria) ──
  pushConfig: () => request("/push/config"),
  pushSubscriptions: () => request("/push/subscriptions"),
  pushSubscribe: (data) => request("/push/subscribe", { method: "POST", body: data }),
  pushUnsubscribe: (endpoint) => request("/push/subscribe", { method: "DELETE", body: { endpoint } }),
  pushTest: () => request("/push/test", { method: "POST" }),
};
