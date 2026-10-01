/**
 * Service Worker para Avaliação 2026
 * Cache de recursos estáticos e estratégia network-first para JSONs
 */

const STATIC_CACHE = 'static-v1';
const DATA_CACHE = 'data-v1';

// Estratégia: NetworkFirst para dados, CacheFirst para estáticos

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-cache assets');
      return cache.addAll([
        '/',
        '/index.html',
        // Vite gera main-*.js e main-*.css - podemos usar wildcard? não, listamos
        // Mas vamos deixar para cachear dinamicamente
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE && !cacheName.startsWith('assets-')) {
            console.log('[SW] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NetworkFirst para o índice de períodos: ele muda sempre que um novo mês
  // é publicado, e devolver o cache primeiro só faria o mês novo sumir até
  // um segundo F5. O fallback offline continua vindo do cache.
  if (url.pathname === '/periods.json') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Estratégia Stale-While-Revalidate para os dados de cada período
  if (url.pathname.startsWith('/data-')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            // Atualiza cache em background
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          // Retorna cached imediatamente se disponível, senão fetch
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Para arquivos estáticos (CSS, JS, imagens): cache first, fallback para network
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }

  // Para outras requisições (HTML, etc): network first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((cached) => {
        if (cached) return cached;
        return caches.match('/');
      });
    })
  );
});
