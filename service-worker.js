// Final PWA Service Worker (Offline Cache)

const CACHE_NAME = 'digital-price-v1.0.0';
// App එකට Offline එකේදී පෙන්විය යුතු සියලුම Files මෙතනට ඇතුළත් කළ යුතුය
const urlsToCache = [
  '/', 
  '/index.html',
  '/details.html',
  '/styles.css',
  '/script.js',
  '/details_script.js',
  '/manifest.json'
  // Favicon files දෙකත් මෙතනට දාන්න ඕනේ: '/favicon.png'
];

// 1. INSTALLATION: Service Worker එක Install කරනවා
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. FETCHING: Network request එකක් ආවම Cache එකෙන් Data දෙන්න බලනවා
self.addEventListener('fetch', event => {
  // Cloudflare API Calls Cache කරන්නේ නැහැ, ඒවා Network එකට යවයි
  if (event.request.url.includes('workers.dev')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache එකේ තියෙනවා නම්, Cache එකෙන් Return කරයි
        if (response) {
          return response;
        }
        // නැත්නම් Network එකට ගිහින් අලුතින් Fetch කරලා Cache කරයි
        return fetch(event.request).then(
            response => {
                if(!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(
                    cache => {
                        cache.put(event.request, responseToCache);
                    }
                );
                return response;
            }
        );
      })
  );
});

// 3. ACTIVATION: පරණ Cache එක Delete කරයි
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
