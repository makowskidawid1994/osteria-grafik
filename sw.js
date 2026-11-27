// Network-first: zawsze pobiera z sieci, cache tylko gdy offline
const CACHE = 'osteria-v146';

self.addEventListener('install', e => {
  // Natychmiast przejmij kontrolę — nie czekaj na zamknięcie kart
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Usuń wszystkie stare cache'e
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // API, Supabase, fonty — zawsze sieć, bez cache
  if (
    e.request.url.includes('supabase.co') ||
    e.request.url.includes('fonts.g') ||
    e.request.url.includes('fonts.googleapis') ||
    e.request.url.includes('fonts.gstatic')
  ) {
    return; // przeglądarka obsługuje samodzielnie
  }

  // Network-first dla wszystkiego innego
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(res => {
        // Zapisz świeżą kopię do cache (jako fallback offline)
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Offline fallback — zwróć z cache jeśli jest
        return caches.match(e.request);
      })
  );
});

// Obsługa wiadomości z aplikacji
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
