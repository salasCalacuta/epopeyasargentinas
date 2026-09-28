/* Service worker — Epopeyas Argentinas PWA */
const CACHE = "epopeyas-v116";
const PRECACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/game.js",
  "/preguntas-banco.js",
  "/preguntas.json",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/privacidad.html",
  "/terminos.html",
  "/condiciones.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // APIs y admin: siempre red
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/tefi") || url.pathname.startsWith("/admin")) {
    return;
  }

  // HTML y assets: red primero, cache de respaldo
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("/index.html")))
  );
});
