// v5:index.html 網路優先;雲端 API 完全不快取(避免同步結果被舊回應蓋掉)
const CACHE = 'trial-app-v2';
const PRECACHE = [
  './index.html', './manifest.json', './icon-192.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'
];
// 這些網域一律直連網路,永不快取
const NO_CACHE = ['googleapis.com', 'firestore', 'identitytoolkit', 'firebaseio'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = e.request.url;
  // 雲端同步相關請求:直接放行,不攔截也不快取
  if (NO_CACHE.some(k => url.includes(k)) || e.request.method !== 'GET') return;
  const isPage = e.request.mode === 'navigate' || url.includes('index.html');
  if (isPage) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{}); }
        return res;
      }))
    );
  }
});
