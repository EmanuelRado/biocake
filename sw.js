/**
 * BioCake Admin — Service Worker
 * PWA installabilă: shell offline + notificări push la comandă nouă.
 */
const CACHE = 'biocake-admin-v7';
const SHELL = [
    '/admin.html',
    '/css/admin.css',
    '/js/admin.js',
    '/js/supabase.js',
    '/manifest.webmanifest',
    '/images/icon-192.png',
    '/images/icon-512.png',
    '/images/icon-maskable.png',
    '/images/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then((c) => c.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Navigări: network-first. Fallback offline la admin DOAR pentru rute admin
    // (scope SW e / ca WebAPK/push să meargă; nu redirecționăm site-ul public).
    if (req.mode === 'navigate') {
        const isAdminNav = url.pathname === '/admin.html' || url.pathname.startsWith('/admin');
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (isAdminNav && res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => {
                    if (!isAdminNav) return caches.match(req);
                    return caches.match(req).then((r) => r || caches.match('/admin.html'));
                })
        );
        return;
    }

    // Doar same-origin pentru restul; extern (Supabase, fonts) trece direct la rețea
    if (url.origin !== self.location.origin) return;

    // JS critic (auth): network-first, ca sesiunea/login să nu rămână pe cod vechi din cache
    if (url.pathname.endsWith('.js')) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // Asset-uri same-origin: stale-while-revalidate
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});

/* ── Push: comandă nouă ──────────────────────────────── */
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

    const title = data.title || 'Comandă nouă BioCake';
    const options = {
        body: data.body || 'Ai o comandă nouă de confirmat.',
        icon: '/images/icon-192.png',
        badge: '/images/icon-192.png',
        tag: data.tag || 'biocake-order',
        renotify: true,
        vibrate: [120, 60, 120],
        data: { url: data.url || '/admin.html' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || '/admin.html';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if (client.url.includes('/admin.html') && 'focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(target);
        })
    );
});
