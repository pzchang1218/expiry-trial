// v2:index.html 改為「網路優先」,每次部署的新版都能立即到手;離線時才用快取
const CACHE = 'trial-app-v1';
const PRECACHE = [
  './index.html', './manifest.json', './icon-192.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k)) // 清掉v1舊快取(不影響盤點資料)
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const isPage = e.request.mode === 'navigate' || e.request.url.includes('index.html');
  if (isPage) {
    // 網頁本體:先抓網路(拿最新版),失敗才用快取(離線也能開)
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
  } else {
    // 程式庫等資源:快取優先(省流量、速度快)
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return res;
      }))
    );
  }
});
