/*
 * lib/native.js — EL PUENTE CON LO NATIVO
 * ───────────────────────────────────────
 * La misma base de código corre en dos sitios: como web y como app instalada
 * desde la App Store o Google Play. Aquí se detecta dónde estamos y se usa lo
 * mejor de cada mundo, sin duplicar la app.
 *
 * La diferencia que de verdad importa es el temporizador de descanso:
 *   · En web, si bloqueas el móvil el navegador congela el JavaScript y el
 *     aviso no puede sonar. No hay forma de evitarlo.
 *   · En la app nativa se programa una NOTIFICACIÓN LOCAL en el sistema
 *     operativo. La programa el móvil, no la app: suena a su hora aunque
 *     tengas la pantalla apagada o la app cerrada. Esto es exactamente lo que
 *     una app web no puede hacer.
 */

let cap = null;          // módulos nativos cargados solo si estamos en la app
let listo = false;

/** ¿Estamos dentro de la app nativa (no en el navegador)? */
export function esNativo() {
  try {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch { return false; }
}

/** Carga perezosa de los plugins: en web no se descarga nada de esto. */
async function cargar() {
  if (listo) return cap;
  listo = true;
  if (!esNativo()) return (cap = null);
  try {
    const [ln, hp] = await Promise.all([
      import("@capacitor/local-notifications"),
      import("@capacitor/haptics"),
    ]);
    cap = { LocalNotifications: ln.LocalNotifications, Haptics: hp.Haptics, ImpactStyle: hp.ImpactStyle };
    await cap.LocalNotifications.requestPermissions();
    return cap;
  } catch { return (cap = null); }
}

const ID_DESCANSO = 4711;   // un identificador fijo: así podemos cancelarla

/**
 * Programa el aviso de fin de descanso en el sistema operativo.
 * Devuelve true si se pudo programar de verdad (solo en la app nativa).
 */
export async function programarAvisoDescanso(segundos) {
  const c = await cargar();
  if (!c) return false;
  try {
    await c.LocalNotifications.cancel({ notifications: [{ id: ID_DESCANSO }] });
    await c.LocalNotifications.schedule({
      notifications: [{
        id: ID_DESCANSO,
        title: "Descanso terminado",
        body: "A por la siguiente serie.",
        schedule: { at: new Date(Date.now() + segundos * 1000), allowWhileIdle: true },
        sound: "default",
        smallIcon: "ic_stat_icon",
      }],
    });
    return true;
  } catch { return false; }
}

/** Cancela el aviso si el usuario detiene el descanso antes de tiempo. */
export async function cancelarAvisoDescanso() {
  const c = await cargar();
  if (!c) return;
  try { await c.LocalNotifications.cancel({ notifications: [{ id: ID_DESCANSO }] }); } catch {}
}

/** Vibración nativa (en iOS la web no puede vibrar; la app sí). */
export async function vibrar(fuerte = false) {
  const c = await cargar();
  if (c) {
    try { await c.Haptics.impact({ style: fuerte ? c.ImpactStyle.Heavy : c.ImpactStyle.Medium }); return; } catch {}
  }
  if (navigator.vibrate) navigator.vibrate(fuerte ? [120, 80, 120] : 40);
}
