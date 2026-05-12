var CACHE = 'georgie-guest-v1';
var PRECACHE = [
  './css/guest.css'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  if (url.indexOf('mapbox.com') !== -1 ||
      url.indexOf('googletagmanager') !== -1 ||
      url.indexOf('google-analytics') !== -1 ||
      url.indexOf('api.mapbox.com/directions') !== -1) {
    return;
  }
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res.ok && (e.request.destination === 'document' || e.request.destination === 'style' || e.request.destination === 'font')) {
        var clone = res.clone();
        caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
