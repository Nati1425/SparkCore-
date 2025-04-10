// Define a cache name
const CACHE_NAME = 'sparkcore-electrics-cache-v1';

// List of files to cache on install
const urlsToCache = [
  '/', // Cache the root (index.html)
  '/index.html', // Explicitly cache index.html
  // Add paths to your primary CSS file(s) if separate
  // '/css/style.css',
  // Add paths to primary JS file(s) if separate
  // '/js/main.js',
  // Add paths to essential images (like logo)
  '/Logo.png', // Make sure the filename/path matches exactly
  // Add paths to web fonts if self-hosted
  // '/fonts/roboto-v20-latin-regular.woff2',
  // Add CDN URLs for fonts/icons if needed (be mindful of CORS)
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Roboto:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/basiclightbox@5.0.4/dist/basicLightbox.min.css',
  'https://cdn.jsdelivr.net/npm/basiclightbox@5.0.4/dist/basicLightbox.min.js'
];

// Install event: Cache essential assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        // Use addAll for atomic caching (if one fails, all fail)
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Service Worker: Failed to cache one or more resources:', error);
          // Optionally, try caching individually if addAll fails
          urlsToCache.forEach(url => {
            cache.add(url).catch(err => console.warn(`Failed to cache ${url}: ${err}`));
          });
        });
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        // Immediately activate the new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME]; // Keep only the current cache
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete, claiming clients.');
      // Take control of currently open pages
      return self.clients.claim();
    })
  );
});

// Fetch event: Serve cached content when offline (Cache-first strategy)
self.addEventListener('fetch', event => {
  // console.log('Service Worker: Fetching ', event.request.url);
  event.respondWith(
    caches.match(event.request) // Check if the request is in the cache
      .then(response => {
        // If found in cache, return the cached response
        if (response) {
          // console.log('Service Worker: Found in cache - ', event.request.url);
          return response;
        }

        // If not in cache, fetch from the network
        // console.log('Service Worker: Not in cache, fetching - ', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
               // Don't cache non-basic responses (like from CDNs without CORS or errors)
               return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // console.log('Service Worker: Caching new resource - ', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.log('Service Worker: Fetch failed; returning offline page instead.', error);
            // Optionally, return a specific offline fallback page:
            // return caches.match('/offline.html');
        });
      })
  );
});