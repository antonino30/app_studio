const CACHE_NAME = "appstudio-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./math.json",
  "./geo.json",
  "./music.json",
  // aggiungi qui eventuali immagini fisse:
  "./img/circuito_semplice.png"
  // (le immagini di arte e gli audio possono essere tanti:
  // vedi nota sotto per gestirli bene)
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((resp) => {
          // cachea anche quello che scarica, così funziona offline dopo il primo giro
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return resp;
        })
        .catch(() => cached); // se offline e non in cache, torna quello che c’è
    })
  );
});
