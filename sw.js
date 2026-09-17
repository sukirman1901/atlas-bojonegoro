/* Atlas Bojonegoro — lightweight shell cache. Map tiles & API stay network. */
const CACHE = "atlas-shell-v5";
const PRECACHE = [
  "/",
  "/index.html",
  "/atlas.css",
  "/app.js",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/og-image.png",
  "/data/isu.js",
  "/data/geo/bojonegoro-kecamatan.geojson",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isMapOrCdn(url) {
  return (
    url.hostname.includes("tile") ||
    url.hostname.includes("openstreetmap") ||
    url.hostname.includes("arcgisonline.com") ||
    url.hostname.includes("unpkg.com") ||
    url.hostname.includes("jsdelivr.net") ||
    url.pathname.includes("/api/")
  );
}

async function matchCache(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const url = new URL(req.url, self.location.origin);
  if (typeof req === "string") {
    return caches.match(req);
  }
  if (url.search) return caches.match(url.pathname);
  return undefined;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    if (isMapOrCdn(url)) return;
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    matchCache(req).then((cached) => {
      const fetching = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => {
              c.put(req, copy);
              if (url.search) c.put(url.pathname, res.clone());
            });
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetching;
    })
  );
});
