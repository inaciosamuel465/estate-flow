// ─────────────────────────────────────────────────────────────
// EstateFlow Suite — Service Worker de Notificações (Web Push Nativo)
// ─────────────────────────────────────────────────────────────

const SW_VERSION = '1.0.0';

// Ao receber Push Real do Backend
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'EstateFlow Suite', body: event.data.text() };
    }
  }

  const title = data.title || 'EstateFlow Suite';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'estateflow-notification',
    renotify: true,
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', () => {
  console.log(`[SW-Notifications] v${SW_VERSION} instalado.`);
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log(`[SW-Notifications] v${SW_VERSION} ativo.`);
  self.clients.claim();
});
