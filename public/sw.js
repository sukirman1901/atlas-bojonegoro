/* Atlas Bojonegoro — lightweight shell cache. Map tiles & API stay network. */
const CACHE = "atlas-shell-v8";
const PRECACHE = [
  "/",
  "/index.html",
  "/css/atlas.css",
  "/js/app.js",
  "/js/petisi.js",
  "/js/petisi-config.js",
  "/manifest.webmanifest",
  "/assets/icons/favicon.svg",
  "/assets/icons/favicon-32.png",
  "/assets/icons/apple-touch-icon.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/icon-512-maskable.png",
  "/assets/og/og-image.png",
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

  if (url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => matchCache("/index.html"))
    );
    return;
  }

  event.respondWith(
    matchCache(req).then((cached) => {
      const fetching = fetch(req)
        .then((res) => {
          if (res.ok && url.pathname.startsWith("/") && !url.pathname.startsWith("/api/")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => {
              c.put(url.pathname, copy);
            });
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetching;
    })
  );
});
