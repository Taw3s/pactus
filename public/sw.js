// Pacto service worker.
// Deliberately no offline caching: check-ins must always hit the server
// (fresh day in São Paulo, fresh auth). It exists so the app is installable
// and so push notifications can be added later (see src/lib/push/README.md).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Network passthrough (keeps install criteria satisfied on all browsers).
self.addEventListener("fetch", () => {});

// --- Push (disabled in the MVP) ---------------------------------------------
// self.addEventListener("push", (event) => {
//   const data = event.data ? event.data.json() : {};
//   event.waitUntil(
//     self.registration.showNotification(data.title ?? "Pacto", {
//       body: data.body,
//       icon: "/icons/icon-192.png",
//       badge: "/icons/icon-192.png",
//       data: { url: data.url ?? "/hoje" },
//     }),
//   );
// });
//
// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();
//   event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/hoje"));
// });
