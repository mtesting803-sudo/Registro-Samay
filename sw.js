// Service Worker para Frutos Secos Pro
// Requerido por Chrome/Brave para que la PWA sea instalable.

const CACHE_NAME = 'frutos-secos-pro-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com/',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// INSTALL: pre-cachear recursos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(err => {
        // Si algún recurso externo falla, no rompemos la instalación
        console.log('Precache parcial:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: limpiar cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH: estrategia cache-first con fallback de red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests that aren't GET (algunas APIs lo requieren)
  const url = new URL(event.request.url);

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200) return response;

        // No cachear respuestas de tipo opaque (cross-origin sin CORS)
        if (response.type === 'opaque') return response;

        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone).catch(() => {});
        });
        return response;
      }).catch(() => {
        // Si falla la red y no hay caché, devolver el index.html para navegación
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Permitir skipWaiting desde el cliente
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
