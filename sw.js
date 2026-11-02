/* sw.js —— PWA 静态资源缓存（不缓存数据 / 同步接口） */
var CACHE = 'myapp-shell-v2';
var ASSETS = [
  './', './index.html', './style.css', './logic.js', './crypto.js', './sync.js', './app.js',
  './icon.svg', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './modules/today.js', './modules/ledger.js', './modules/work.js', './modules/study.js',
  './modules/fitness.js', './modules/decision.js', './modules/settings.js', './modules/home.js'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if(url.pathname.endsWith('/api/data')) return;      // 数据接口：不缓存
  if(url.origin !== self.location.origin) return;      // 跨域（GitHub API 等）：不拦截
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
      return res;
    }).catch(function(){ return caches.match(e.request); })
  );
});