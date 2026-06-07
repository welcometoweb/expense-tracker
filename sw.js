const CACHE_NAME = 'pocket-ledger-v1';

const SHELL_FILES = [
  '/expense-tracker/',
  '/expense-tracker/index.html',
  '/expense-tracker/manifest.json',
  '/expense-tracker/icon-192.png',
  '/expense-tracker/icon-512.png'
];

// ── Install: cache the shell ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  // Activate immediately, don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: network-first for API calls, cache-first for shell ─────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for Google Sheets API and Apps Script calls
  const isApiCall =
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('script.google.com');

  if (isApiCall) {
    // Network only — never cache live data fetches
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for the app shell
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache any new shell resources we encounter
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
