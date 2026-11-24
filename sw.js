/* SimEnergy service worker. BUILD_ID is replaced at build time. */
const CACHE = "se-20261124-hitfix";
const PRECACHE = ["./", "./oyna/", "./basin/", "./gizlilik/", "./destek/", "./en/", "./en/play/", "./en/press/", "./en/privacy/", "./en/support/", "./ar/", "./ar/play/", "./ar/press/", "./ar/privacy/", "./ar/support/", "./oyna/?src=pwa", "./oyna/?lang=tr", "./oyna/?lang=en", "./oyna/?lang=ar", "./assets/site.css?v=d3ffdc3316", "./assets/site.js?v=d3ffdc3316", "./img/icon-192.png?v=d3ffdc3316", "./img/simenergy-white.png?v=imza2", "./img/simenergy-navy.png?v=imza2", "./img/simenergy-tab-dark.png", "./img/simenergy-tab-light.png", "./img/saha-kenya-720.webp", "./404.html", "./oyun/index.html?lang=tr", "./oyun/index.html?lang=en", "./oyun/index.html?lang=ar", "./oyun/index.html"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("se-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isImg = /\.(webp|png|jpg|jpeg|svg|ico)$/i.test(url.pathname);
  if (isImg) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return res; })));
    return;
  }
  // Pages, game and scripts: network first so new builds arrive, cache as offline fallback.
  e.respondWith(
    fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(new URL("./404.html", self.registration.scope).href)))
  );
});
