const CACHE_VERSION = 'basic-port-v1';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './boatData.js',
    './boatDetailCard.js',
    './generalData.js'
];

const CACHEABLE_EXTENSIONS = [
    '.glb',
    '.hdr',
    '.jpg',
    '.jpeg',
    '.png',
    '.svg',
    '.webp',
    '.js',
    '.css'
];

const HEAVY_ASSET_EXTENSIONS = [
    '.glb',
    '.hdr',
    '.jpg',
    '.jpeg',
    '.png',
    '.svg',
    '.webp'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CORE_CACHE).then(function (cache) {
            return cache.addAll(CORE_ASSETS);
        })
    );

    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys
                    .filter(function (key) {
                        return key.startsWith('basic-port-') &&
                            !key.startsWith(CACHE_VERSION);
                    })
                    .map(function (key) {
                        return caches.delete(key);
                    })
            );
        })
    );

    self.clients.claim();
});

function shouldCacheRequest(request) {
    if (request.method !== 'GET') return false;

    const url = new URL(request.url);
    const extension = url.pathname
        .slice(url.pathname.lastIndexOf('.'))
        .toLowerCase();

    return (
        url.origin === self.location.origin ||
        url.hostname === 'cdn.jsdelivr.net'
    ) &&
        CACHEABLE_EXTENSIONS.includes(extension);
}

function isHeavyAsset(request) {
    const url = new URL(request.url);
    const extension = url.pathname
        .slice(url.pathname.lastIndexOf('.'))
        .toLowerCase();

    return HEAVY_ASSET_EXTENSIONS.includes(extension) ||
        url.hostname === 'cdn.jsdelivr.net';
}

function cacheFirst(request) {
    return caches.match(request).then(function (cachedResponse) {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then(function (networkResponse) {
            if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
            }

            const responseClone = networkResponse.clone();

            caches.open(ASSET_CACHE).then(function (cache) {
                cache.put(request, responseClone);
            });

            return networkResponse;
        });
    });
}

function networkFirst(request) {
    return fetch(request)
        .then(function (networkResponse) {
            if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
            }

            const responseClone = networkResponse.clone();

            caches.open(CORE_CACHE).then(function (cache) {
                cache.put(request, responseClone);
            });

            return networkResponse;
        })
        .catch(function () {
            return caches.match(request);
        });
}

self.addEventListener('fetch', function (event) {
    if (!shouldCacheRequest(event.request)) return;

    event.respondWith(
        isHeavyAsset(event.request) ?
            cacheFirst(event.request) :
            networkFirst(event.request)
    );
});
