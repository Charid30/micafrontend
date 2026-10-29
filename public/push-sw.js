/* ==================================================================
 *  Auteur : BATIONO Ulrich Rachid Kévin
 *           Expert en Sécurité Informatique
 *           Développeur FullStack
 *           Tel: +226 51 57 82 89 // 66 72 02 32
 *           Whatsapp: +226 51 57 82 89
 *           Mail: bkevin@sonabhy.bf // bationor10@gmail.com
 *  Projet : MICA – SONABHY
 *  Merci
 * ================================================================== */
// Service worker des notifications push MICA : affiche la notification recue et ouvre
// l'ecran concerne au clic. Il ne met rien en cache (l'application reste toujours a jour).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { corps: event.data && event.data.text() }; }
  const base = self.registration.scope;
  // Toujours un ecran de l'application (jamais un autre site)
  let url = new URL(String(d.url || '/').replace(/^\/+/, ''), base).href;
  if (!url.startsWith(base)) url = base;
  event.waitUntil(self.registration.showNotification(d.titre || 'MICA – SONABHY', {
    body: d.corps || '',
    icon: base + 'SONABY.jpg',
    badge: base + 'favicon.ico',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Un onglet MICA deja ouvert : on l'amene au premier plan sur l'ecran concerne
    const onglet = fenetres.find(c => c.url.startsWith(self.registration.scope));
    if (onglet) {
      await onglet.focus();
      if ('navigate' in onglet) return onglet.navigate(url);
      return;
    }
    return self.clients.openWindow(url);
  })());
});
