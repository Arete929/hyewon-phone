/* 혜원이지 서비스워커 | @version 1.12.0
   ★ v1.2.5 — «새로고침해도 옛 판(1.2.2)» 이 나오던 것을 고쳤다. 원인 둘:
     ① 설치할 때 addAll 이 브라우저(HTTP) 캐시를 거쳐서, GitHub Pages 의 10분 캐시 때문에 «새 서비스워커가 옛 index.html 을 담는» 일이 있었다 → cache:'reload' 로 늘 서버에서 받는다.
     ② 화면(index.html)까지 «캐시 먼저» 라 새 판이 있어도 옛 판이 먼저 떴다 → 화면은 «서버 먼저, 안 되면 캐시».
   ★ 새 판이 나오면 «스스로» 바뀌어야 한다.
     기본 PWA 는 새 판을 받아 놓고도 «대기» 만 하다가, 앱을 완전히 닫아야 바뀐다.
     백그라운드에 둔 폰은 옛 판을 계속 쓴다 — 그게 아침걷기에서 겪은 일이다.
     그래서 넷을 다 쓴다.
       ① skipWaiting        — 대기하지 말고 바로 넘겨받는다        (여기)
       ② clients.claim      — 이미 열려 있는 화면도 내가 맡는다    (여기)
       ③ controllerchange   — 바뀌면 화면이 스스로 새로고침한다    (index.html)
       ④ visibilitychange   — 앞으로 나올 때마다 새 판을 «찾아본다» (index.html)
     ④ 가 없으면 ①②③ 이 다 있어도 소용없다. 찾아보질 않으니 발견을 못 한다. */
var CACHE = 'phone-v1.12.0';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-512.png', './icon-192.png', './logo-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return Promise.all(ASSETS.map(function (u) {
          return fetch(new Request(u, { cache: 'reload' })).then(function (res) { if (res.ok) return c.put(u, res); });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  /* ★ 다리(GAS)는 절대 담아 두지 않는다 — 늘 새 자료여야 한다.
     담아 두는 일은 다리 쪽에서 이미 하고 있다(CacheService). */
  if (url.hostname.indexOf('script.google') >= 0
    || url.hostname.indexOf('googleusercontent') >= 0) return;
  if (e.request.method !== 'GET') return;

  /* 화면 자체(주소·index.html)는 서버 먼저 — 인터넷이 안 될 때만 담아 둔 것을 쓴다 */
  if (e.request.mode === 'navigate' || url.pathname.slice(-1) === '/' || /\/index\.html$/.test(url.pathname)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok && url.origin === location.origin) {
          var cl = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./index.html', cl); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (res) {
        if (res && res.ok && url.origin === location.origin) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
        }
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
