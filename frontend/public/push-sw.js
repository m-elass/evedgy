/*
 * push-sw.js — avisos push dentro del service worker.
 * El generador de la PWA (Workbox) lo incluye con importScripts.
 * Muestra el aviso aunque la app esté cerrada y, al tocarlo, abre la
 * estrella que corresponda (por ejemplo, la carta diaria).
 */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch { d = { title: "Tu cuaderno", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "Tu cuaderno", {
    body: d.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: d.tag || "tu-cuaderno",
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) {
      if ("focus" in v) {
        await v.focus();
        if ("navigate" in v) await v.navigate(destino);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(destino);
  })());
});
