const CACHE = 'osteria-v13';
const PRECACHE = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Supabase i zewnętrzne API — zawsze sieć
  if (e.request.url.includes('supabase.co') || e.request.url.includes('fonts.g')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Obsługa wiadomości z aplikacji (np. powiadomienie o zmianie)
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data?.type === 'SHIFT_NOTIFICATION') {
    const { duration } = e.data;
    const h = Math.floor(duration / 60), m = duration % 60;
    const timeStr = h > 0 ? `${h}h ${m}min` : `${m} min`;
    self.registration.showNotification('⏱ Osteria – zmiana trwa ' + timeStr, {
      body: 'Pamiętaj o przerwie! Kliknij aby otworzyć aplikację.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'shift-timer',
      requireInteraction: false,
      silent: false
    });
  }
});

// Kliknięcie w powiadomienie otwiera aplikację
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});
