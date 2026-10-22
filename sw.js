// 離線玩：第一次連網打開時把遊戲檔案和 Three.js 存進手機，之後沒網路也能玩
// 每次發新版要改 VERSION（跟 main.js 的 VERSION、各檔 ?v= 一致），舊快取會在新版啟用時清掉
const VERSION = '0.4.2';
const CACHE = 'office-apocalypse-' + VERSION;
const THREE_URL = 'https://unpkg.com/three@0.170.0/';
const FILES = [
  './',
  ...['main', 'world', 'fx', 'stations', 'assets', 'decor'].map(n => `js/${n}.js?v=${VERSION}`),
  ...['kui_walk2', 'kui_jog', 'npc_m_walk', 'npc_f_walk', 'jie_walk', 'jie_jog', 'mi_walk', 'vivi_walk'].map(n => `models/${n}.glb`),
  ...['kui', 'mi', 'jie', 'vivi'].flatMap(k => [`icons/${k}-180.png`, `icons/${k}-192.png`, `icons/${k}-512.png`, `icons/manifest-${k}.json`]),
  THREE_URL + 'build/three.module.js',
  ...['loaders/GLTFLoader.js', 'utils/SkeletonUtils.js', 'libs/meshopt_decoder.module.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js',
    'postprocessing/UnrealBloomPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/OutputPass.js', 'geometries/RoundedBoxGeometry.js',
    'environments/RoomEnvironment.js'].map(p => THREE_URL + 'examples/jsm/' + p),
];
const ok = url => url.startsWith(self.location.origin) || url.startsWith(THREE_URL);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('office-apocalypse-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// 頁面載完會把用到的所有檔案清單傳過來（Three.js 附加模組互相 import 的那些），沒存到的補存
self.addEventListener('message', e => {
  const urls = (e.data && e.data.cache || []).filter(ok);
  e.waitUntil(caches.open(CACHE).then(async c => {
    for (const u of urls) if (!(await c.match(u))) { try { await c.add(u); } catch {} }
  }));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !ok(req.url)) return;
  // 網頁本身：有網路就拿最新的（才收得到新版），沒網路用存的
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  // 其他檔案：先用存的，沒有才上網抓並存起來
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});
