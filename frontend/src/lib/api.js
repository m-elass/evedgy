/*
 * lib/api.js
 * ──────────
 * El ÚNICO sitio del frontend que habla con nuestro backend FastAPI.
 * Todo lo demás llama a estas funciones, nunca a fetch() directamente.
 * Así, si algo cambia (la URL, cómo se manda el token...), se toca aquí y ya.
 *
 * Lo importante: antes de cada petición pedimos a Supabase el token del
 * usuario logueado y lo adjuntamos en la cabecera Authorization. Eso es lo
 * que el backend verifica para saber quién eres.
 */
import { supabase } from "./supabase";

// La URL del backend. En local apunta a localhost; al desplegar, cambiará
// por la URL pública (la pondremos en el .env, no aquí).
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function authHeaders() {
  // Pedimos la sesión actual a Supabase y sacamos el token de acceso
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // Si el backend devuelve error, lo lanzamos para que la pantalla lo maneje
    const detail = await res.text();
    throw new Error(`${res.status}: ${detail}`);
  }
  // Algunos DELETE devuelven {ok:true}; otros endpoints, datos. Parseamos JSON.
  return res.status === 204 ? null : res.json();
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
  deleteSession: (id) => request(`/sessions/${id}`, { method: "DELETE" }),
  exerciseProgress: (id) => request(`/sessions/progress/${id}`),

  // Hábitos diarios
  listDailyTasks: () => request("/daily-tasks"),
  createDailyTask: (data) => request("/daily-tasks", { method: "POST", body: data }),
  deleteDailyTask: (id) => request(`/daily-tasks/${id}`, { method: "DELETE" }),
  completeDailyTask: (id, data) => request(`/daily-tasks/${id}/complete`, { method: "PUT", body: data }),
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
};
