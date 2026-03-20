// Simple no-op service worker to avoid 404/HTML responses.
// This prevents 'Unexpected token <' errors when the browser tries to load /sw.js.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Default: just pass through all requests
});

