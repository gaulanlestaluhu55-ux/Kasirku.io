const CACHE_NAME = "kasirku-cache-v2";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/globals.js"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH STRATEGY (POS HYBRID)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // FIX: Abaikan request aneh dari Ekstensi Chrome (Biar console bersih dari error)
  if (!req.url.startsWith('http')) return;

  // API selalu NETWORK FIRST (biar data akurat)
  if (req.url.includes("script.google.com")) {
    event.respondWith(fetch(req));
    return;
  }

  // UI pakai CACHE FIRST (biar POS ngebut)
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((res) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, res.clone());
            return res;
          });
        })
      );
    })
  );
});
