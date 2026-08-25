const CACHE_NAME = "mogo-stream-v1";

const FILES_TO_CACHE = [
    "/mogostream/",
    "/mogostream/index.html",
    "/mogostream/manifest.webmanifest",
    "/mogostream/channels.html",
    "/mogostream/VOD.html",
    "/mogostream/radio.html",
    "/mogostream/games.html",
    "/mogostream/studies.html",
    "/mogostream/player.html"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request);
        })
    );
});