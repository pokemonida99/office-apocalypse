// 上班啟示錄 v0.4：新人小葵在辦公室打雜升級
// 咖啡機／印表機：做貨 → 背去櫃台 → 同事排隊付錢；販賣機、員工餐廳（牛／雞／魚）：搬進貨去補貨 → 同事來買
// 電話總機：站著接電話賺錢。設施會升級（咖啡機、印表機 Lv5＝產線），小葵靠經驗升職，還能請人幫忙
// 大目標：年度業績 Q1～Q4 → 尾牙 → 搬到新辦公室；採購部買裝備、裝潢；VIP、午餐尖峰、老闆生日等突發事件；自動存檔
import * as THREE from 'three';
import { scene, camera, renderer, post, render, updateCamera, cam, sun, V, rbox, box, cyl, sphere, mat, canvasTex, roundRect, FONT, labelSprite, quality, setQuality, setQualityPref } from './world.js?v=0.9.0';
import { updateFx, floatText, popIn, squash, confetti, pillar, shockwave, sparkle, puff, camKick, toast, banner, sfx, audioInit, isMuted, setMuted, music } from './fx.js?v=0.9.0';
import { STATIONS, LOOKS, ITEM_H, ICON, makeItem, makeBill, buildBelt, levelBadge, stallLook, vendingLook, sourceLook, deskLook, miOfficeLook, MI_OFFICE } from './stations.js?v=0.9.0';
import { loadKind, makeActor, updateActor, walkTo, turnTo, addJog } from './assets.js?v=0.9.0';
import { kioskLook, DECOR_LOOKS, cartLook, vipGear, stageLook, cakeLook, waterLook, jugPileLook, jugMesh, cloudLook, ingotLook, poopLook } from './decor.js?v=0.9.0';
import { CHANGES } from './changelog.js?v=0.9.0';
import { makeTheater } from './theater.js?v=0.9.0';
import { yearScript, yearEndScript, themeOf } from './stories.js?v=0.9.0';
import { makeIntro } from './intro.js?v=0.9.0';
import { openCallGame } from './callgame.js?v=0.9.0';
import { buildRoof, RIDES, rideLook, buildOffice, buildKiosk, roomPlate, ROOM, FURN, FURN_B_OLD, setRoomTex, roomShell, buildBossOffice, buildKevinOffice, buildJieSeat } from './floors.js?v=0.9.0';

const VERSION = 'v0.9.0';
// 遊玩角色：網址 #jie＝操控阿傑老鳥（素質全滿、店全開、小葵改去設計部畫圖），存檔跟小葵分開
const JIE = location.hash.startsWith('#jie');   // #jie-intro：阿傑模式＋重看片頭
const ME = JIE ? { name: '阿傑', icon: 'jie' } : { name: '小葵', icon: 'kui' };

// ---------- 數值 ----------
const CFG = {
  crewSpeed: 1.05,       // 排隊同事走路速度（身高／秒）
  helperSpeed: 1.9,
  moveEvery: 0.065,      // 拿／放一個的間隔
  serveEvery: 0.24,
  answerEvery: 0.3,      // 小葵接一通電話的間隔
  miAnswerEvery: 0.55,   // 小米接一通的間隔
  queueMax: 6,
  spawnEvery: 1.3,
  beltSpeed: 1.8,
  draftTime: 24,         // 阿傑畫一張稿要幾秒
  draftPay: 500,         // 交稿一次多少錢
};
// 小葵升職表：累積經驗、職稱；每升一級背的數量＋2、走路快一點
const RANKS = [
  { xp: 0, title: '實習生' }, { xp: 12, title: '新人' }, { xp: 35, title: '助理' }, { xp: 75, title: '專員' },
  { xp: 130, title: '資深專員' }, { xp: 210, title: '組長' }, { xp: 320, title: '主任' }, { xp: 470, title: '經理' }, { xp: 680, title: '總監' },
];
const rankCarry = (r) => 6 + r * 2;
const rankSpeed = (r) => 2.35 + r * 0.2;   // 每升一階明顯變快：實習生 2.35 → 總監 3.95
// 採購部的裝備
const GEAR = {
  cart: { icon: '🛒', name: '推車', desc: ['一次多背 4 個', '一次多背 8 個', '黃金推車：多背 14 個'], price: [2000, 7000, 20000], bonus: [0, 4, 8, 14] },
  scooter: { icon: '🛴', name: '滑板車', desc: ['走路快 15%', '電動滑板車：快 30%'], price: [3000, 12000], bonus: [0, 0.15, 0.3] },
  magnet: { icon: '🧲', name: '收錢磁鐵', desc: ['靠近錢堆就自動吸過來', '強力磁鐵：吸的範圍再大一點', '超強磁鐵：全場的錢自動飛過來'], price: [5000, 15000, 40000], reach: [0.75, 1.8, 3.2, 99] },   // 三級：小範圍 → 大一點 → 全場
};
const magnetMax = () => state.gear.magnet >= GEAR.magnet.price.length;   // 第三級磁鐵：錢直接進帳，不畫鈔票（畫面太亂、手機會卡）
const carryMaxNow = () => rankCarry(state.rank) + GEAR.cart.bonus[state.gear.cart];

// ---------- 場景配置（x 往右、z 往鏡頭） ----------
// 北邊：咖啡機、印表機、電話總機；東邊：販賣機；中間：請人格子、設計部；南邊：員工餐廳三攤
const L = {
  bounds: { minX: -7.2, maxX: 7.2, minZ: -6.5, maxZ: 10.6 },
  elevator: [-7.0, -0.6], exit: [7.0, 1.95], start: [-2.2, -3.6],   // 出口往下挪一點，讓出右牆給茶水站
};
// 樓層：同一個世界的不同區域（2F 在 x-40、頂樓在 x+40），搭電梯就是瞬移；1F 照常運轉
const FLOORS = {
  f1: { name: '1F 辦公室', icon: '🏢', ox: 0, bounds: L.bounds, cam: [-4.8, 4.8, -4.4, 9.0] },
  f2: { name: '2F 辦公室', icon: '🛋', ox: -40, bounds: { minX: -47.2, maxX: -32.8, minZ: -6.5, maxZ: 6.6 }, cam: [-44.8, -35.2, -4.4, 4.0] },   // 後排：小葵、Kevin；走廊；前排：老闆、阿傑的座位
  rf: { name: 'RF 頂樓遊樂園', icon: '🎡', ox: 40, bounds: { minX: 32.8, maxX: 47.2, minZ: -6.5, maxZ: 7.0 }, cam: [35.2, 44.8, -4.4, 4.6] },
};
const camFocusOf = (p) => { const c = FLOORS[state.floor].cam; return V(THREE.MathUtils.clamp(p.x, c[0], c[1]), 0, THREE.MathUtils.clamp(p.z, c[2], c[3])); };
const foodShop = (x, upX) => ({
  source: [x, 9.9], srcRot: Math.PI, pickup: [x, 9.05], counter: [x, 6.8], rot: Math.PI, drop: [x, 7.85], cash: [x + 1.6, 7.85],
  queue: [[x, 5.75], [x, 5.05], [x, 4.35], [x + 0.7, 4.35], [x + 1.4, 4.35]], upPad: [upX, 8.9], unlockPad: [x, 7.85],
});
// 第三年：一樓後牆往後推 6.3，多出一條早餐街（三攤；客人從左邊後門進、右邊後門出，不會穿過機器）
const NORTH_Z = -6.3;
const northShop = (x, upX) => ({ north: true,
  source: [x, -12.9], srcRot: 0, pickup: [x, -12.05], counter: [x, -10.0], rot: 0, drop: [x, -10.95], cash: [x + 1.6, -10.95],
  queue: [[x, -9.0], [x, -8.3], [x, -7.6], [x + 0.7, -7.6], [x + 1.4, -7.6]], upPad: [upX, -12.2], unlockPad: [x, -10.95],
  spawn: [-7.0, -9.3], exit: [7.0, -9.3] });
const SHOPS_DEF = {
  tea: { ...northShop(-4.2, -6.2), need: () => state.year >= 3 },
  sand: { ...northShop(0, -1.8), need: () => shops.tea.unlocked },
  cake: { ...northShop(4.2, 2.3), need: () => shops.sand.unlocked },
  coffee: {
    machine: [-5.4, -5.7], counter: [-4.0, -2.4], drop: [-4.0, -3.4], cash: [-2.4, -3.4],
    queue: [[-4.0, -1.5], [-4.0, -0.8], [-4.0, -0.1], [-4.0, 0.6], [-4.0, 1.3], [-4.7, 1.3], [-5.4, 1.3], [-6.1, 1.3], [-6.8, 1.3]],
    belt: [[-6.5, -5.4], [-6.5, -2.4], [-5.2, -2.4]], upPad: [-2.4, -5.5],
  },
  printer: {
    machine: [0.0, -5.7], counter: [1.4, -2.4], drop: [1.4, -3.4], cash: [3.0, -3.4],
    queue: [[1.4, -1.5], [1.4, -0.8], [1.4, -0.1], [1.4, 0.6], [1.4, 1.3], [2.1, 1.3], [2.8, 1.3], [3.5, 1.3], [4.2, 1.3]],
    belt: [[-1.1, -5.4], [-1.1, -2.4], [0.2, -2.4]], upPad: [1.7, -5.5], unlockPad: [0.0, -4.15], need: () => shops.coffee.lv >= 1,
  },
  vending: {
    source: [6.9, -2.7], srcRot: -Math.PI / 2, pickup: [6.0, -2.7], counter: [6.95, 0.0], rot: -Math.PI / 2, drop: [6.0, -1.15], cash: [6.0, 1.2],
    queue: [[5.9, 0.0], [5.2, 0.0], [4.5, 0.0], [3.8, 0.0]], upPad: [4.4, -1.7], unlockPad: [6.0, -1.15], need: () => shops.printer.unlocked,
  },
  beef: { ...foodShop(-4.2, -6.0), need: () => shops.vending.unlocked },
  chicken: { ...foodShop(0, -1.8), need: () => shops.beef.unlocked },
  fish: { ...foodShop(4.2, 2.4), need: () => shops.chicken.unlocked },
};
const PHONE_DEF = { desk: [5.4, -5.6], zone: [5.4, -4.2], upPad: [3.88, -4.4], unlockPad: [5.4, -4.2] };   // 升級格放在之後小米辦公室的玻璃牆裡面
const DESK_AT = [-6.0, 3.3];
const HIRES = [
  { id: 'worker', name: '工讀生（咖啡）', price: 250, at: [-2.4, 3.0], need: () => shops.coffee.lv >= 1, kind: 'npcF', home: 'coffee', cap: 0xffc83d },
  { id: 'worker2', name: '工讀生（影印）', price: 900, at: [-0.6, 3.0], need: () => shops.printer.unlocked, kind: 'npcM', home: 'printer', cap: 0x3fa7ff },
  { id: 'jie', name: JIE ? '小葵（設計部）' : '阿傑（設計部）', price: 1800, at: DESK_AT, need: () => shops.printer.lv >= 1, kind: JIE ? 'kui' : 'jie' },   // 阿傑模式換小葵坐這裡畫圖
  { id: 'mi', name: '小米', price: 2500, at: [1.2, 3.0], need: () => phone.unlocked, kind: 'mi' },
  { id: 'vivi', name: 'Vivi 老闆', price: 9000, at: [3.0, 3.0], need: () => phone.unlocked && shops.vending.unlocked, kind: 'vivi' },
];

// ---------- 環境：溫暖的辦公室 ----------
function planks(base, line, w = 256) {
  return canvasTex(w, w, (g, W, H) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 32) { g.fillStyle = line; g.fillRect(0, y, W, 2); const off = (y / 32) % 2 ? 0 : W / 2; g.fillRect(off, y, 2, 32); g.fillRect((off + W / 4 * 3) % W, y, 2, 32); }
    g.globalAlpha = 0.07; for (let i = 0; i < 60; i++) { g.fillStyle = Math.random() > 0.5 ? '#fff' : '#000'; g.fillRect(Math.random() * W, Math.random() * H, 30 + Math.random() * 40, 2); }
  });
}
const ENV = {};   // 換年度時要換色的東西
const colliders = [];
const aabb = (x, z, hw, hd) => { const c = { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd }; colliders.push(c); return c; };
{
  // 大地板：奶油色地磚
  const tile = canvasTex(256, 256, (g) => { g.fillStyle = '#f6e7cf'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#efdcbd'; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128); g.strokeStyle = '#e4cba6'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(20, 20);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // 工作區：暖木地板
  const wood = planks('#dd9a5a', '#b9733c'); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(4, 1.6);
  const work = new THREE.Mesh(new THREE.PlaneGeometry(15, 4.7), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 }));
  work.rotation.x = -Math.PI / 2; work.position.set(0, 0.004, -4.4); work.receiveShadow = true; scene.add(work); ENV.work = work;
  // 員工餐廳：薄荷綠格子地磚
  const cafe = canvasTex(128, 128, (g) => { g.fillStyle = '#d8f0e3'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#c3e6d3'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); });
  cafe.wrapS = cafe.wrapT = THREE.RepeatWrapping; cafe.repeat.set(15, 6);
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(15, 6.2), new THREE.MeshStandardMaterial({ map: cafe, roughness: 0.8 }));
  cf.rotation.x = -Math.PI / 2; cf.position.set(0, 0.004, 7.9); cf.receiveShadow = true; scene.add(cf); ENV.cafe = cf;
  // 地上漆的「員工餐廳」字樣（不擋畫面）
  const cafeTxt = canvasTex(512, 96, (g, W, H) => { g.fillStyle = '#2fb27a'; roundRect(g, 4, 4, W - 8, H - 8, 40); g.fill(); g.fillStyle = '#fff'; g.font = `900 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🍱 員工餐廳', W / 2, H / 2 + 3); });
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshBasicMaterial({ map: cafeTxt, transparent: true, depthWrite: false }));
  cs.rotation.x = -Math.PI / 2; cs.position.set(0, 0.01, 10.55); scene.add(cs);
  // 後牆＋晴天窗景（城市大樓）。整面收進 ENV.backWall，第三年打通時往後推
  const n0 = scene.children.length;
  rbox(15.4, 3.0, 0.3, 0xfff1dd, 0, 1.5, -7.0);
  const sky = canvasTex(256, 192, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7cc4ff'); gr.addColorStop(1, '#d6efff');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffffee'; for (const [x, y, r] of [[50, 40, 18], [70, 36, 22], [92, 42, 16], [180, 60, 16], [198, 55, 20]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    const cols = ['#9fb6cf', '#b7c9dc', '#8ea7c2', '#c5d4e3'];
    for (let i = 0; i < 9; i++) { const w = 22 + (i * 13) % 16, h = 50 + (i * 37) % 70, x = i * 30 - 6; g.fillStyle = cols[i % 4]; g.fillRect(x, H - h, w, h); g.fillStyle = '#ffffffaa'; for (let r = 0; r < h / 14 - 1; r++) for (let c = 0; c < 2; c++) g.fillRect(x + 4 + c * 10, H - h + 6 + r * 14, 5, 7); }
  });
  for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false }));
    w.position.set(x, 1.7, -6.84); scene.add(w);
    rbox(2.15, 0.12, 0.14, 0xffffff, x, 0.93, -6.8); rbox(0.08, 1.55, 0.1, 0xffffff, x, 1.7, -6.8);
  }
  // 牆上的時鐘和公告欄
  { const c = cyl(0.32, 0.32, 0.06, 0xffffff, 0, 2.62, -6.82); c.rotation.x = Math.PI / 2; box(0.03, 0.2, 0.02, 0x2c3e57, 0, 2.66, -6.78); box(0.15, 0.03, 0.02, 0x2c3e57, 0.06, 2.62, -6.78); }
  rbox(1.0, 0.6, 0.05, 0xc9915b, 4.05, 2.4, -6.82);
  [0xffe08a, 0x9be7ff, 0xff9ad5].forEach((c, i) => box(0.24, 0.24, 0.02, c, 3.75 + i * 0.3, 2.42 + (i % 2) * 0.08, -6.78).rotation.z = (i - 1) * 0.15);
  ENV.backWall = new THREE.Group(); for (const o of scene.children.slice(n0)) ENV.backWall.add(o); scene.add(ENV.backWall);
  // 側牆隔板（青綠色）、電梯
  for (let z = -6.3; z <= 10.3; z += 1.3) {
    if (Math.abs(z - L.elevator[1]) > 0.9) rbox(0.14, 0.75, 1.24, 0x3fb6a8, -7.6, 0.375, z);
    if (Math.abs(z - L.exit[1]) > 0.9) rbox(0.14, 0.75, 1.24, 0x3fb6a8, 7.6, 0.375, z);
  }
  rbox(0.2, 1.8, 1.4, 0xc7ccd3, -7.65, 0.9, L.elevator[1], scene, { metalness: 0.6, roughness: 0.3 });
  box(0.22, 1.7, 0.03, 0x8a929c, -7.62, 0.87, L.elevator[1]);
  const up = labelSprite('▲ 電梯', { bg: '#ff7a45', size: 0.28 }); up.position.set(-7.4, 2.05, L.elevator[1]); scene.add(up);
  // 植物（放在路線外）
  const plant = (x, z, s = 1) => { cyl(0.22 * s, 0.17 * s, 0.34 * s, 0xff8a5c, x, 0.17 * s, z); for (let i = 0; i < 5; i++) { const l = sphere(0.22 * s, 0x47b35a, x + Math.cos(i * 1.3) * 0.13 * s, (0.5 + (i % 2) * 0.18) * s, z + Math.sin(i * 1.3) * 0.13 * s, scene, { roughness: 0.9 }); l.scale.y = 1.25; } };
  [[-7.0, -6.3], [7.0, -6.3], [-3.0, -6.4], [3.4, -6.4], [-7.0, 10.2], [7.0, 10.2], [-2.1, 10.3], [2.1, 10.3], [7.0, 4.4]].forEach(([x, z]) => plant(x, z));
  for (const d of Object.values(SHOPS_DEF)) if (!d.north) queueDecor(d);
}
// 排隊紅地毯＋金色紅龍柱
function queueDecor(d) {
  const runner = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(0.7, len + 0.7), mat(0xd9483b, { roughness: 0.95 }));
      r.rotation.x = -Math.PI / 2; r.rotation.z = -Math.atan2(x2 - x1, z2 - z1); r.position.set((x1 + x2) / 2, 0.006 + i * 0.0005, (z1 + z2) / 2); r.receiveShadow = true; scene.add(r);
    }
  };
  const q = d.queue; runner(q.length > 5 ? [q[0], q[4], q[q.length - 1]] : q.length === 5 ? [q[0], q[2], q[4]] : [q[0], q[q.length - 1]]);
  for (const [x, z] of [q[1], q[q.length > 5 ? 3 : 2]]) for (const s of [-0.45, 0.45]) {
    const horiz = Math.abs(q[1][1] - q[0][1]) < 0.01;   // 往旁邊排的隊伍，柱子放上下
    const px = horiz ? x : x + s, pz = horiz ? z + s : z;
    cyl(0.04, 0.04, 0.6, 0xe0b040, px, 0.3, pz, scene, { metalness: 0.8, roughness: 0.3 }); sphere(0.06, 0xe0b040, px, 0.62, pz, scene, { metalness: 0.8, roughness: 0.3 });
  }
}

// 地上的白框：站這裡拿／放
function zoneMark(x, z, w = 1.2, h = 1.0, color = '#ffffff') {
  const t = canvasTex(256, 220, (g, W, H) => { g.strokeStyle = color; g.globalAlpha = 0.85; g.lineWidth = 12; roundRect(g, 10, 10, W - 20, H - 20, 34); g.stroke(); g.globalAlpha = 0.18; g.fillStyle = color; g.fill(); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); scene.add(m); return m;
}

// ---------- 飛來飛去的貨品與鈔票 ----------
const items = [];
function track(mesh, tgt, onArrive) { const it = { mesh, tgt, onArrive }; items.push(it); return it; }
function retarget(mesh, tgt, onArrive) { const it = items.find(i => i.mesh === mesh) || track(mesh, tgt); it.tgt = tgt; it.onArrive = onArrive; return it; }
function untrack(mesh) { const i = items.findIndex(x => x.mesh === mesh); if (i >= 0) items.splice(i, 1); scene.remove(mesh); }
function updateItems(dt) {
  const k = 1 - Math.exp(-dt * 16);
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i], p = it.mesh.position, t = it.tgt();
    const d = p.distanceTo(t);
    p.lerp(t, k); if (d > 0.4) p.y += Math.min(d, 1.2) * k * 0.6;   // 飛遠一點時有弧線
    if (it.onArrive && d < 0.14) { items.splice(i, 1); scene.remove(it.mesh); it.onArrive(); }
  }
}

// ---------- 遊戲內延遲（用遊戲時間，不用 setTimeout） ----------
const later = [];
function after(sec, fn) { later.push({ at: state.t + sec, fn }); }
function runLater() { for (let i = later.length - 1; i >= 0; i--) if (state.t >= later[i].at) { const f = later[i].fn; later.splice(i, 1); f(); } }

// ---------- 狀態 ----------
const state = {
  money: 0, xp: 0, rank: 0, t: 0, started: false, served: 0,
  earned: 0, q: 0, year: 1, yearBonus: 1, finaleDone: false, rushUntil: 0, floor: 'f1',
  miBests: [0, 0, 0], gear: { cart: 0, scooter: 0, magnet: 0 }, decor: [],
  stats: { coffee: 0, doc: 0, drink: 0, beef: 0, chicken: 0, fish: 0, tea: 0, sand: 0, cake: 0, calls: 0, drafts: 0, vip: 0 },
};
// 收入倍率：裝潢滿意度（每顆星 +5% 小費）× 新辦公室年度加成 × 午餐尖峰
const stars = () => state.decor.length;
const rushOn = () => state.t < state.rushUntil;
let cai = null;   // 黑財神（坐雲撒錢事件）
const incomeMult = () => (1 + 0.05 * stars()) * (1 + 0.02 * comfort()) * (1 - 0.05 * waterEmpty()) * state.yearBonus * (rushOn() ? 2 : 1) * (cai ? 2 : 1);   // 黑財神在場收益 ×2；飲水機沒水：每台小費 -5%   // 舒適度：2F 每買一件家具 +2%
let kinds, player;
const carriers = [];
const shops = {};
const phone = { lv: 0, unlocked: false, lines: [], look: null, answerT: 0, def: PHONE_DEF };
const hires = {};
const maxLv = (s) => s.def.levels.length - 1;
const isLine = (s) => !!s.def.levels[s.lv].line;
const shopOf = (item) => Object.values(shops).find(s => s.item === item);

// ---------- 店：做貨／進貨 → 櫃台（攤位、販賣機）→ 排隊的同事 ----------
function makeShop(type) {
  const d = SHOPS_DEF[type], def = STATIONS[type];
  const src = d.machine || d.source;
  const pickup = d.pickup || [src[0], src[1] + 1.55];
  const pile = d.machine ? V(src[0], 0, src[1] + 0.9) : V(src[0] + (pickup[0] - src[0]) * 0.5, 0, src[1] + (pickup[1] - src[1]) * 0.5);
  const s = { type, d, def, item: def.item, lv: 0, unlocked: !def.unlock, src, pickup, pile, tray: [], stack: [], cash: [], queue: [], crowd: [], timer: 0, serveT: 0, spawnT: 0, spawnN: 0, beltItems: [], belt: null, look: null, stall: null, badge: null };
  shops[type] = s;
  if (s.unlocked) openShop(s, false);
  return s;
}
// 攤位等級：補貨類跟著店的等級；咖啡吧、影印區在 Lv3 掛燈泡、Lv5 鑲金邊
const stallLv = (s) => s.def.restock ? s.lv : Math.min(2, Math.floor(s.lv / 2));
function openShop(s, fancy = true) {
  s.unlocked = true;
  s.zones = [zoneMark(s.pickup[0], s.pickup[1]), zoneMark(s.d.drop[0], s.d.drop[1]), zoneMark(s.d.cash[0], s.d.cash[1], 1.0, 1.0, '#7dff9a')];
  const [cx, cz] = s.d.counter, side = Math.abs(Math.sin(s.d.rot || 0)) > 0.5;
  s.counterBox = aabb(cx, cz, side ? 0.42 : 1.4, side ? 1.5 : 0.42);
  if (s.d.machine) aabb(s.src[0], s.src[1], 0.8, 0.5);
  else { s.look = sourceLook(s.item); s.look.g.position.set(s.src[0], 0, s.src[1]); s.look.g.rotation.y = s.d.srcRot || 0; scene.add(s.look.g); aabb(s.src[0], s.src[1], 0.6, 0.6); if (fancy) popIn(s.look.g); }
  setLook(s, 0, fancy);
}
// 換外觀（升級時舊的縮掉、新的彈出來）
function swapIn(old, neu, fancy) {
  if (old) { let k = 1; const shrink = () => { k -= 0.12; old.scale.setScalar(Math.max(0.01, k)); if (k > 0) after(0.016, shrink); else scene.remove(old); }; shrink(); }
  scene.add(neu); if (fancy) popIn(neu, 1, 2.6);
}
function setLook(s, lv, fancy = true) {
  const fx = { puff, sparkle };
  if (s.d.machine) {   // 咖啡機、印表機：機器本身會變
    const look = LOOKS[s.type](lv, fx);
    look.g.position.set(s.src[0], 0, s.src[1]); swapIn(s.look?.g, look.g, fancy); s.look = look;
  }
  const sl = stallLv(s);
  if (!s.stall || s.stallLvShown !== sl) {   // 攤位／販賣機
    const st = s.type === 'vending' ? vendingLook(sl, fx) : stallLook(s.type, sl, fx);
    st.g.position.set(s.d.counter[0], 0, s.d.counter[1]); st.g.rotation.y = s.d.rot || 0;
    swapIn(s.stall?.g, st.g, fancy || !!s.stall); s.stall = st; s.stallLvShown = sl;
  }
  if (s.badge) scene.remove(s.badge);
  // 名牌：咖啡機、印表機掛在機器上；補貨類掛在進貨箱上（攤位上面已經有招牌）
  s.badge = levelBadge(s.def.levels[lv].title, lv, s.def.levels.length); s.badge.position.set(s.src[0], 0, s.src[1]); s.badge.userData.y = s.d.machine ? 2.2 + (lv >= 3 ? 0.3 : 0) : 2.15; scene.add(s.badge);
  if (s.def.levels[lv].line && !s.belt) {
    s.belt = buildBelt(s.d.belt); popIn(s.belt.g);
    // 產線一開，出貨口堆著的貨直接倒上輸送帶
    while (s.tray.length) { const m = s.tray.pop(); s.beltItems.push({ m, d: Math.random() * 0.3 }); untrack(m); scene.add(m); }
  }
}

// 櫃台上第 i 個貨的世界座標（販賣機的藏在機器裡）
const counterSlot = (s, i) => { s.stall.g.updateMatrixWorld(); return s.stall.g.localToWorld(s.stall.slot(i, ITEM_H[s.item])); };
const cashSlot = (s, i) => V(s.d.cash[0] + ((i % 2) - 0.5) * 0.34, 0.03 + Math.floor(i / 4) * 0.045, s.d.cash[1] + ((i >> 1) % 2 - 0.5) * 0.2);

function produce(s, dt) {
  if (!s.unlocked) return;
  const Lv = s.def.levels[s.lv];
  s.look.tick(dt, state.t, s.look.g.position);
  s.stall.tick(dt, state.t, s.stall.g.position);
  s.timer += dt;
  if (Lv.line) {
    // 產線：直接做到輸送帶上，送到櫃台
    if (s.timer >= Lv.brew && s.stack.length + s.beltItems.length < 40) {
      s.timer = 0;
      const m = makeItem(s.item); m.position.copy(s.look.g.position).add(s.look.out);
      s.beltItems.push({ m, d: 0 }); squash(s.look.g, 0.06);
    }
    s.belt.tick(dt, CFG.beltSpeed);
    for (let i = s.beltItems.length - 1; i >= 0; i--) {
      const b = s.beltItems[i]; b.d += dt * CFG.beltSpeed;
      if (b.d < s.belt.total) b.m.position.lerp(s.belt.at(b.d), 1 - Math.exp(-dt * 20));
      else { s.beltItems.splice(i, 1); s.stack.push(b.m); track(b.m, () => counterSlot(s, s.stack.indexOf(b.m))); }
    }
  } else if (s.timer >= Lv.brew && s.tray.length < Lv.tray) {
    s.timer = 0;
    const m = makeItem(s.item);
    s.look.g.updateMatrixWorld(); m.position.copy(s.look.g.localToWorld(s.look.out.clone()));
    s.tray.push(m); squash(s.look.g, 0.05);
    track(m, () => V(s.pile.x, ITEM_H[s.item] / 2 + 0.01 + s.tray.indexOf(m) * ITEM_H[s.item], s.pile.z));
  }
}

// ---------- 排隊的同事 ----------
function spawnCustomer(s, vip = false) {
  const a = makeActor(vip ? kinds.npcM : (s.spawnN + s.type.length) % 2 ? kinds.npcF : kinds.npcM, vip ? 1.02 : 0.95);
  const sp = s.d.spawn || L.elevator; a.root.position.set(sp[0] + 0.4, 0, sp[1] + (Math.random() - 0.5) * 0.6); a.root.rotation.y = Math.PI / 2;
  scene.add(a.root);
  const many = s.def.restock ? 2 : 3 + Math.min(s.lv, 3);   // 升級後同事一次要更多；便當、飲料一次買少一點
  const want = s.spawnN < 3 ? [2, 3, 1][s.spawnN] : 1 + Math.floor(Math.random() * many);
  s.spawnN++;
  const c = { actor: a, want, got: [], mode: 'queue', bubble: null, bubbleN: -1, shop: s, vip };
  s.crowd.push(c);
  if (vip) { c.want = s.def.restock ? 5 + Math.floor(Math.random() * 3) : 8 + Math.floor(Math.random() * 5); vipGear(a.root); s.queue.splice(Math.min(1, s.queue.length), 0, c); }   // VIP 插到第二個
  else s.queue.push(c);
  return c;
}
function bubbleTex(item, n) {
  return canvasTex(256, 150, (g, W) => {
    g.fillStyle = '#fff'; roundRect(g, 8, 8, W - 16, 104, 34); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 18, 108); g.lineTo(W / 2, 140); g.lineTo(W / 2 + 18, 108); g.fill();
    g.textBaseline = 'middle'; g.font = `66px ${FONT}`; g.fillText(ICON[item], 34, 64);
    g.fillStyle = '#2c3e57'; g.font = `900 62px ${FONT}`; g.fillText('×' + n, 116, 62);
  });
}
const handSlot = (c, i) => { const r = c.actor.root, h = r.rotation.y; return V(r.position.x + Math.sin(h) * 0.24, 0.5 + i * ITEM_H[c.shop.item], r.position.z + Math.cos(h) * 0.24); };
function updateCustomers(s, dt) {
  if (!s.unlocked) return;
  const Q = s.d.queue;
  // 第 i 個排隊位置；隊伍比預設長（午餐尖峰）就順著最後一段延伸，碰到牆就停
  const slotAt = (i) => {
    if (i < Q.length) return Q[i];
    const a = Q[Q.length - 1], p = Q[Q.length - 2], k = i - Q.length + 1;
    return [THREE.MathUtils.clamp(a[0] + (a[0] - p[0]) * k, -7.0, 7.0), THREE.MathUtils.clamp(a[1] + (a[1] - p[1]) * k, L.bounds.minZ, L.bounds.maxZ)];
  };
  s.queue.forEach((c, i) => {
    const slot = slotAt(i);
    const arrived = walkTo(c.actor, slot[0], slot[1], CFG.crewSpeed, dt);
    // 排第一個面向櫃台，其他人面向前一個人
    const look = i === 0 ? s.d.counter : slotAt(i - 1);
    if (arrived) turnTo(c.actor, Math.atan2(look[0] - slot[0], look[1] - slot[1]), dt);
    c.ready = arrived && i === 0;
  });
  for (let i = s.crowd.length - 1; i >= 0; i--) {
    const c = s.crowd[i];
    const ex = s.d.exit || L.exit;
    if (c.mode === 'leave' && walkTo(c.actor, ex[0] - 0.3, ex[1], CFG.crewSpeed * 1.2, dt)) {
      scene.remove(c.actor.root); c.got.forEach(m => untrack(m)); s.crowd.splice(i, 1); continue;
    }
    const need = c.want - c.got.length, show = c.mode === 'queue' && s.queue[0] === c && need > 0;
    if (show && c.bubbleN !== need) {
      if (!c.bubble) { c.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true })); c.bubble.scale.set(0.66, 0.39, 1); c.bubble.renderOrder = 9; scene.add(c.bubble); popIn(c.bubble, 1); }
      c.bubble.material.map?.dispose(); c.bubble.material.map = bubbleTex(s.item, need); c.bubble.material.needsUpdate = true; c.bubbleN = need;
    }
    if (c.bubble) {
      c.bubble.visible = show;
      c.bubble.position.copy(c.actor.root.position).setY(1.32 + Math.sin(state.t * 4) * 0.03);
      if (c.mode === 'leave') { scene.remove(c.bubble); c.bubble = null; }
    }
    updateActor(c.actor, dt, state.t);
  }
  s.serveT += dt;
  const f = s.queue[0];
  if (f && f.ready && s.stack.length && f.got.length < f.want && s.serveT >= CFG.serveEvery) {
    s.serveT = 0;
    const m = s.stack.pop(), n = f.got.length; f.got.push(m);
    retarget(m, () => handSlot(f, n));
    if (f.got.length === f.want) pay(s, f);
  }
  s.spawnT += dt;
  const rush = rushOn() ? 2 : 0;
  if (s.spawnT >= CFG.spawnEvery / (rush ? 2 : 1) && s.queue.length < (s.def.restock ? 4 : CFG.queueMax) + rush) { s.spawnT = 0; spawnCustomer(s); }
}
function pay(s, c) {
  s.queue.shift(); c.mode = 'leave'; state.served++; state.stats[s.item] += c.want;
  const total = Math.round(c.want * s.def.levels[s.lv].price * incomeMult() * (c.vip ? 3 : 1));
  if (c.vip) vipPaid(s, c, total);
  if (magnetMax()) { addMoney(total); sfx.coin(); floatText(V(s.d.cash[0], 1.1, s.d.cash[1]), '+$' + total, '#22a447'); return; }
  const bills = Math.min(12, Math.max(1, Math.round(total / 10)));
  const from = c.actor.root.position.clone().setY(0.8);
  for (let i = 0; i < bills; i++) after(i * 0.06, () => {
    // 錢堆最多 60 張，再多就把錢加在最上面那張（不然每張都要算位置，越堆越卡）
    if (s.cash.length >= 60) { s.cash[s.cash.length - 1].userData.v += total / bills; return; }
    const b = makeBill(); b.position.copy(from); b.userData.v = total / bills;
    s.cash.push(b); track(b, () => cashSlot(s, s.cash.indexOf(b)));
  });
  floatText(V(s.d.cash[0], 1.1, s.d.cash[1]), '+$' + total, '#22a447');
}

// ---------- 電話總機 ----------
// 主遊戲的電話完全不提醒（不響鈴、不冒紅泡泡、話筒不抖、底下不提示），站進紫框就會接；要玩反應的去小米的接電話挑戰
function openPhone() {
  phone.unlocked = true;
  const [x, z] = PHONE_DEF.desk;
  aabb(x, z, 1.1, 0.45);
  phone.zoneMark = zoneMark(PHONE_DEF.zone[0], PHONE_DEF.zone[1], 1.4, 1.0, '#c9b6ff');
  setPhoneLook(0, false);
}
function setPhoneLook(lv, fancy = true) {
  const [x, z] = PHONE_DEF.desk;
  if (phone.look) scene.remove(phone.look.g);
  phone.look = LOOKS.phone(lv, {}); phone.look.g.position.set(x, 0, z); scene.add(phone.look.g);
  if (fancy) popIn(phone.look.g, 1, 2.6);
  const n = STATIONS.phone.levels[lv].lines;
  // 線數變多：保留原本在響的，新的從安靜開始
  const old = phone.lines; phone.lines = [];
  for (let i = 0; i < n; i++) {
    const keep = old[i];
    phone.lines.push({ ringing: keep?.ringing || false, t: keep ? keep.t : 1 + Math.random() * 2 });
  }
  if (lv >= 3) {   // 第 4、5 階：小米有自己的辦公室
    const O = MI_OFFICE;
    if (!phone.office) {   // 玻璃牆擋路（門在前面中間）
      aabb(O.x0, (O.z0 + O.z1) / 2, 0.06, (O.z1 - O.z0) / 2);
      aabb((O.x0 + O.door[0]) / 2, O.z1, (O.door[0] - O.x0) / 2, 0.06);
      aabb((O.door[1] + O.x1) / 2, O.z1, (O.x1 - O.door[1]) / 2, 0.06);
    } else scene.remove(phone.office);
    phone.office = miOfficeLook(lv); scene.add(phone.office); if (fancy) popIn(phone.office, 1, 2);
  }
  if (phone.badge) scene.remove(phone.badge);
  phone.badge = levelBadge(STATIONS.phone.levels[lv].title, lv); phone.badge.position.set(x, 0, z); phone.badge.userData.y = 2.1; scene.add(phone.badge);
}
function updatePhone(dt) {
  if (!phone.unlocked) return;
  const P = STATIONS.phone.levels[phone.lv];
  phone.lines.forEach((ln) => { if (!ln.ringing) { ln.t -= dt; if (ln.t <= 0) ln.ringing = true; } });   // 有人打來，但畫面上不提醒
  // 誰在接電話：小葵站在框裡，或小米坐鎮
  phone.answerT += dt;
  const near = (a) => Math.hypot(a.root.position.x - PHONE_DEF.zone[0], a.root.position.z - PHONE_DEF.zone[1]) < 0.9;
  const kuiOn = player && near(player.actor), miOn = hires.mi && near(hires.mi.actor);
  const every = kuiOn ? CFG.answerEvery : (miOn ? CFG.miAnswerEvery : Infinity);
  if (phone.answerT >= every) {
    const i = phone.lines.findIndex(l => l.ringing), ln = phone.lines[i];
    if (ln) {
      phone.answerT = 0; ln.ringing = false; ln.t = P.ringEvery * (0.6 + Math.random() * 0.8);
      const val = Math.round(P.price * state.yearBonus * (rushOn() ? 2 : 1)); state.stats.calls++;
      addMoney(val);
      floatText(phone.look.phones[i].g.getWorldPosition(V()).setY(1.5), '+$' + val, '#7b5cff', 0.8);
      sfx.answer(); if (kuiOn) gainXp(1);
    }
  }
}

// ---------- 阿傑的設計部：慢慢畫，交稿一次 +$500 ----------
const design = { on: false, t: 0, look: null, bar: null };
function openDesk() {
  design.on = true;
  design.look = deskLook(); design.look.g.position.set(DESK_AT[0], 0, DESK_AT[1]); scene.add(design.look.g); popIn(design.look.g);
  aabb(DESK_AT[0], DESK_AT[1], 0.85, 0.42);
  // 進度條（畫架上方）
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  design.barCtx = c.getContext('2d'); design.barTex = new THREE.CanvasTexture(c); design.barTex.colorSpace = THREE.SRGBColorSpace;
  design.bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: design.barTex, transparent: true, depthTest: false })); design.bar.scale.set(1.0, 0.19, 1); design.bar.renderOrder = 9;
  design.bar.position.set(DESK_AT[0] - 1.15, 2.05, DESK_AT[1] + 0.25); scene.add(design.bar);
}
function drawBar(p) {
  const g = design.barCtx; g.clearRect(0, 0, 256, 48);
  g.fillStyle = '#2c3e57dd'; roundRect(g, 2, 6, 252, 36, 18); g.fill();
  g.fillStyle = '#b46bff'; roundRect(g, 8, 12, 240 * p, 24, 12); g.fill();
  g.fillStyle = '#fff'; g.font = `900 20px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`畫稿中 ${Math.floor(p * 100)}%`, 128, 25);
  design.barTex.needsUpdate = true;
}
function updateDesign(dt) {
  if (!design.on) return;
  const jie = hires.jie, a = jie.actor, spot = [DESK_AT[0], DESK_AT[1] - 0.7];
  const atDesk = walkTo(a, spot[0], spot[1], 1.3, dt);
  if (!atDesk) return;
  turnTo(a, 0, dt);
  a.model.rotation.z = Math.sin(state.t * 6) * 0.04;   // 畫畫時身體左右晃
  design.t += dt;
  const p = Math.min(1, design.t / CFG.draftTime);
  design.look.paint(p);
  if (Math.floor(p * 50) !== design.lastBar) { design.lastBar = Math.floor(p * 50); drawBar(p); }
  if (p >= 1) {   // 交稿！
    design.t = 0;
    const pos = V(DESK_AT[0] - 1.15, 1.2, DESK_AT[1] + 0.25);
    const pay = Math.round(CFG.draftPay * state.yearBonus); state.stats.drafts++;
    addMoney(pay);
    floatText(pos.clone().setY(2.3), '交稿！+$' + pay, '#b46bff', 1.3);
    confetti(pos, 40, 0.7); sfx.build(); squash(design.look.g, 0.08);
    if (Math.random() < 0.5) floatText(a.root.position.clone().setY(1.7), ['客戶說讚！', '一次過稿！', '這版可以！'][Math.floor(Math.random() * 3)], '#2c3e57', 0.7);
  }
}

// ---------- 建造格子（解鎖、升級、請人） ----------
const pads = [];
function padTex(p) {
  const up = p.kind === 'upgrade', hire = p.kind === 'hire';
  const col = up ? '#ffcf3f' : hire ? '#ff7eb6' : '#ffffff';
  return canvasTex(256, 256, (g, W, H) => {
    g.globalAlpha = 0.22; g.fillStyle = col; roundRect(g, 14, 14, W - 28, H - 28, 36); g.fill(); g.globalAlpha = 1;
    g.setLineDash([26, 14]); g.lineWidth = 12; g.strokeStyle = col; roundRect(g, 14, 14, W - 28, H - 28, 36); g.stroke(); g.setLineDash([]);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.strokeStyle = '#0005'; g.lineWidth = 8;
    g.font = `900 30px ${FONT}`; const top = up ? '⬆ 升級' : hire ? '♥ 請人' : '＋ 解鎖'; g.strokeText(top, W / 2, 56); g.fillText(top, W / 2, 56);
    g.font = `900 ${p.price() >= 10000 ? 56 : 66}px ${FONT}`; const pr = '$' + p.price(); g.strokeText(pr, W / 2, H / 2 + 4); g.fillText(pr, W / 2, H / 2 + 4);
    const nm = p.title(); g.font = `900 ${nm.length > 6 ? 24 : 30}px ${FONT}`; g.strokeText(nm, W / 2, H - 58); g.fillText(nm, W / 2, H - 58);
  });
}
function addPad(p) {
  p.paid = 0; p.payT = 0; p.shown = false; p.key = '';
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.55), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  frame.rotation.x = -Math.PI / 2; frame.position.set(p.at[0], 0.02, p.at[1]);
  const fg = new THREE.PlaneGeometry(1.3, 1.3); fg.translate(0, 0.65, 0);
  const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x4cd964, transparent: true, opacity: 0.6, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2; fill.position.set(p.at[0], 0.016, p.at[1] + 0.65); fill.scale.y = 0.001;
  p.frame = frame; p.fill = fill; pads.push(p); return p;
}
function refreshPad(p) {
  const key = p.price() + p.title();
  if (key !== p.key) { p.key = key; p.frame.material.map?.dispose(); p.frame.material.map = padTex(p); p.frame.material.needsUpdate = true; }
}
function updatePads(dt) {
  for (const p of pads) {
    const want = p.cond() && !p.done();
    if (want && !p.shown) { p.shown = true; p.paid = 0; p.fill.scale.y = 0.001; refreshPad(p); scene.add(p.frame, p.fill); popIn(p.frame); }
    if (!want && p.shown) { p.shown = false; scene.remove(p.frame, p.fill); }
    if (!p.shown) continue;
    refreshPad(p);
    const pos = player.actor.root.position, on = Math.abs(pos.x - p.at[0]) < 0.72 && Math.abs(pos.z - p.at[1]) < 0.72;
    p.payT += dt;
    const price = p.price();
    if (on && state.money > 0 && p.payT > 0.04) {
      p.payT = 0;
      const amt = Math.min(state.money, Math.max(1, Math.ceil(price / 28)), price - p.paid);
      state.money -= amt; p.paid += amt; sfx.pay();
      const b = makeBill(); b.position.copy(pos).setY(0.8); track(b, () => V(p.at[0], 0.05, p.at[1]), () => {});
      if (p.paid >= price) { p.paid = 0; p.fill.scale.y = 0.001; p.complete(); p.key = ''; gainXp(6 + Math.round(Math.sqrt(price) / 6)); if (p.done()) { p.shown = false; scene.remove(p.frame, p.fill); } }
    }
    const f = p.paid / price;
    p.fill.scale.y = Math.max(0.001, p.fill.scale.y + (f - p.fill.scale.y) * Math.min(1, dt * 12));
    p.frame.position.y = 0.02 + (on ? 0.01 : 0);
  }
}
// 升級的華麗演出
function celebrate(pos, title, sub, stars, color) {
  pillar(pos); shockwave(pos); confetti(V(pos.x, 1.4, pos.z), 90, 1.1); camKick(1);
  for (let i = 0; i < 10; i++) after(i * 0.06, () => sparkle(V(pos.x + (Math.random() - 0.5) * 2, 0.5 + Math.random() * 1.8, pos.z + (Math.random() - 0.5) * 1.4), 0xffe08a, 0.4));
  banner(title, sub, stars, color); sfx.upgrade();
}
const SHOP_COLOR = { coffee: '#e0663a', printer: '#3f8fe0', vending: '#ff4f5e', beef: '#d9483b', chicken: '#e8902a', fish: '#2f7fc4', tea: '#8a5a32', sand: '#d99a1a', cake: '#e0559a' };
const UNLOCK_SUB = { tea: '早餐街開張！去搬茶葉珍珠', sand: '早餐店開賣！', cake: '甜點店開賣！', printer: '同事開始排隊印文件了', vending: '去搬飲料箱幫販賣機補貨', beef: '去冷藏櫃搬牛肉便當補貨', chicken: '雞肉飯開賣！', fish: '魚排飯開賣！' };
function setupPads() {
  setupRoofPads();
  for (const s of Object.values(shops)) {
    const at = () => V((s.d.machine || s.d.counter)[0], 0, (s.d.machine || s.d.counter)[1]);
    if (s.def.unlock) addPad({
      kind: 'unlock', at: s.d.unlockPad, price: () => s.def.unlock, title: () => s.def.name,
      cond: s.d.need || (() => true), done: () => s.unlocked,
      complete: () => { openShop(s); celebrate(at(), '解鎖！' + s.def.name, UNLOCK_SUB[s.type] || '', 1, SHOP_COLOR[s.type]); gainCard(s.def.name, UNLOCK_SUB[s.type], previewOf(s.type), at()); },
    });
    addPad({
      kind: 'upgrade', at: s.d.upPad, price: () => s.def.levels[Math.min(maxLv(s), s.lv + 1)].cost, title: () => s.def.levels[Math.min(maxLv(s), s.lv + 1)].title,
      cond: () => s.unlocked, done: () => s.lv >= maxLv(s),
      complete: () => {
        const a = s.def.levels[s.lv], b = s.def.levels[s.lv + 1]; s.lv++; setLook(s, s.lv);
        const sub = b.line ? '產線啟動！做好直接送上櫃台' : `${s.def.restock ? '到貨' : '速度'} +${Math.round((a.brew / b.brew - 1) * 100)}%　售價 $${a.price}→$${b.price}`;
        celebrate(at(), b.title, sub, s.lv + 1, SHOP_COLOR[s.type]);
      },
    });
  }
  addPad({
    kind: 'unlock', at: PHONE_DEF.unlockPad, price: () => STATIONS.phone.unlock, title: () => '電話總機',
    cond: () => shops.printer.unlocked, done: () => phone.unlocked,
    complete: () => { openPhone(); celebrate(V(PHONE_DEF.desk[0], 0, PHONE_DEF.desk[1]), '解鎖！電話總機', '站到紫色框裡接電話，一通 $' + STATIONS.phone.levels[0].price, 1, '#7b5cff'); gainCard('電話總機', '站到紫色框裡就會接電話', LOOKS.phone(0, {}).g, V(PHONE_DEF.desk[0], 0, PHONE_DEF.desk[1])); },
  });
  addPad({
    kind: 'upgrade', at: PHONE_DEF.upPad, price: () => STATIONS.phone.levels[Math.min(4, phone.lv + 1)].cost, title: () => STATIONS.phone.levels[Math.min(4, phone.lv + 1)].title,
    cond: () => phone.unlocked, done: () => phone.lv >= 4,
    complete: () => { phone.lv++; setPhoneLook(phone.lv); const b = STATIONS.phone.levels[phone.lv]; celebrate(V(PHONE_DEF.desk[0], 0, PHONE_DEF.desk[1]), b.title, `${b.lines} 線同時響　一通 $${b.price}`, phone.lv + 1, '#7b5cff'); },
  });
  for (const h of HIRES) addPad({
    kind: 'hire', at: h.at, price: () => h.price, title: () => h.name, cond: h.need, done: () => !!hires[h.id],
    complete: () => { hire(h); gainCard(h.name.replace(/（.*）/, ''), (HIRE_SUB[h.id] || '加入團隊！'), makeActor(kinds[h.kind] || kinds.npcF, 1).root, V(h.at[0], 0, h.at[1]), 1.9); },
  });
}

// 「獲得」卡（小劇場）：新設施／新夥伴的模型在框裡轉，「去看看」把鏡頭帶過去
function previewOf(type) {
  const fx = { puff: () => {}, sparkle: () => {} };
  if (type === 'vending') return vendingLook(0, fx).g;
  if (LOOKS[type]) return LOOKS[type](0, fx).g;
  return stallLook(type, 0, fx).g;
}
function gainCard(name, desc, model, at, scale = 1.15) {
  if (!theater) return;
  theater.gain({ name, desc, model, scale, go: at && (() => { if (design.finale) return; camFocus = at.clone(); after(2.2, () => { if (!design.finale) camFocus = null; }); }) });
}
// ---------- 夥伴 ----------
const HIRE_SUB = {
  worker: '幫忙搬咖啡', worker2: '幫忙搬文件',
  jie: `坐在設計部慢慢畫，交一次稿 +$${CFG.draftPay}`, mi: '坐鎮電話總機，一通 $100 起',
  vivi: '老闆來巡視了！（效果：大家被加油了，就這樣）',
};
function hire(h, silent = false) {
  const k = kinds[h.kind] || kinds.npcF;
  const a = makeActor(k, h.id.startsWith('worker') ? 0.88 : 0.98);
  if (h.id === 'jie' && kinds[h.kind + 'Jog']) addJog(a, kinds[h.kind + 'Jog']);
  a.root.position.set(h.at[0], 0, h.at[1] - (h.id === 'jie' ? 0.7 : 0));   // 設計師直接坐到桌子後面
  scene.add(a.root); popIn(a.root, a.root.scale.x);
  if (h.cap) {   // 工讀生戴鴨舌帽（咖啡黃、影印藍）
    const cap = sphere(0.2, h.cap, 0, 0.86, 0, a.root); cap.scale.set(1.05, 0.55, 1.05);
    const brim = cyl(0.12, 0.12, 0.02, h.cap, 0, 0.86, 0.16, a.root); brim.scale.set(1, 1, 0.7);
  }
  const name = labelSprite(h.name.replace(/（.*）/, ''), { bg: h.id === 'vivi' ? '#ff4fa3' : h.id === 'mi' ? '#7b5cff' : h.id === 'jie' ? '#b46bff' : '#2c3e57', size: 0.2 });
  name.position.y = 1.35; a.root.add(name);
  const helper = { id: h.id, actor: a, carry: [], type: null, carryMax: 5, moveT: 0, mode: 'fetch', home: h.home };
  hires[h.id] = helper;
  if (h.home) carriers.push(helper);
  if (h.id === 'jie') openDesk();
  if (silent) return;
  pillar(a.root.position, 0xff9ad5, 0.6, 4); confetti(V(a.root.position.x, 1.2, a.root.position.z), 50); sfx.build();
  banner(h.name.replace(/（.*）/, '') + ' 加入！', HIRE_SUB[h.id], 0, h.id === 'jie' ? '#b46bff' : '#ff4fa3');
}
// Vivi 老闆的台詞：純搞笑
const VIVI_LINES = ['大家加油！', '我很看好你喔～', '今天也要開心上班！', '辛苦了辛苦了', '這個不錯喔', '我先去開會囉', '♥', '加薪？再說再說'];
function updateHires(dt) {
  for (const h of Object.values(hires)) {
    const a = h.actor;
    if (h.id === 'mi') {   // 有辦公室就先走到門口再進去
      const p = a.root.position, door = (MI_OFFICE.door[0] + MI_OFFICE.door[1]) / 2;
      if (phone.office && p.z > MI_OFFICE.z1 - 0.15 && Math.abs(p.x - door) > 0.35) walkTo(a, door, MI_OFFICE.z1 + 0.7, 1.4, dt);
      else walkTo(a, PHONE_DEF.zone[0] + 0.25, PHONE_DEF.zone[1], 1.4, dt) && turnTo(a, Math.PI, dt);
    }
    else if (h.id === 'jie') updateDesign(dt);
    else if (h.id === 'vivi' && kevin && kevin.phase !== 'flee') {   // Kevin 來鬧事：老闆慢慢走過去趕人（走得慢，小葵先揍跑還有獎金）
      const k = kevin.a.root.position;
      if (walkTo(a, k.x + 0.6, k.z + 0.35, 1.25, dt)) viviScold(); else if (Math.random() < dt * 0.4) floatText(a.root.position.clone().setY(1.6), 'Kevin！你給我過來！', '#ff4fa3', 0.7);
    }
    else if (h.id === 'vivi' && vivi2F(h, dt)) {}   // 老闆偶爾搭電梯上 2F 自己的辦公室待一下
    else if (h.id === 'vivi') {   // 老闆巡視：走來走去幫大家加油（沒有實際效果）
      const pts = [[-1.0, -1.2], [-2.0, 3.8], [2.6, 5.0], [3.0, 0.2], [0.4, -3.2], [-5.0, 4.6]];
      h.wp = h.wp ?? 0; h.wait = (h.wait ?? 0) - dt;
      if (h.wait <= 0 && walkTo(a, pts[h.wp][0], pts[h.wp][1], 1.0, dt)) { h.wp = (h.wp + 1) % pts.length; h.wait = 2.5; floatText(a.root.position.clone().setY(1.6), VIVI_LINES[Math.floor(Math.random() * VIVI_LINES.length)], '#ff4fa3', 0.8); }
      else if (h.wait > 0) a.speed = 0;
    } else hauler(h, dt);
    updateActor(a, dt, state.t);
  }
}
// Vivi 上 2F：每 70～110 秒走去電梯 → 出現在 2F 老闆辦公室逛（推桿、看魚、坐皮椅）→ 30 秒後下樓。Kevin 來鬧事就馬上下來
const VIVI_2F_LINES = ['進了！🏌️', '小魚今天也很可愛～', '這張椅子坐起來就是不一樣', '業績報表……先放著', '招財貓，再招一點！', '今天的會議取消好了'];
function vivi2F(h, dt) {
  const a = h.actor, p = a.root.position;
  if (kevin && kevin.phase !== 'flee') { if (h.trip === 'up') { const e = L.elevator; p.set(e[0] + 0.6, 0, e[1]); } h.trip = null; return false; }
  h.tripT = (h.tripT ?? 70 + Math.random() * 40) - dt;
  if (!h.trip) { if (h.tripT > 0 || !room.boss) return false; h.trip = 'go'; floatText(p.clone().setY(1.6), '我上樓一下～', '#ff4fa3', 0.8); }
  if (h.trip === 'go') { if (walkTo(a, L.elevator[0] + 0.4, L.elevator[1], 1.2, dt)) { const e = elevAt('f2'); p.set(e[0] + 0.8, 0, e[1]); h.trip = 'up'; h.upT = 30; h.wp2 = 0; h.wait2 = 0; } return true; }
  if (h.trip === 'up') {
    h.upT -= dt; const sp = room.boss.spots;
    if (h.upT <= 0) { if (walkTo(a, elevAt('f2')[0] + 0.4, elevAt('f2')[1], 1.2, dt)) { const e = L.elevator; p.set(e[0] + 0.6, 0, e[1]); h.trip = null; h.tripT = 70 + Math.random() * 40; } return true; }
    h.wait2 -= dt;
    if (h.wait2 <= 0 && walkTo(a, OXO + sp[h.wp2][0], sp[h.wp2][1], 1.0, dt)) { h.wp2 = (h.wp2 + 1) % sp.length; h.wait2 = 3; if (state.floor === 'f2') floatText(p.clone().setY(1.6), VIVI_2F_LINES[Math.floor(Math.random() * VIVI_2F_LINES.length)], '#ff4fa3', 0.8); }
    else if (h.wait2 > 0) a.speed = 0;
    return true;
  }
  return false;
}
// 搬運工：去出貨口拿滿 → 送櫃台。自己的站變產線（不用人搬）就自己找事做：
// 挑最缺貨（排隊多、櫃台空）、出貨口有貨、另一個工讀生沒在搬的店（販賣機、三個攤位也算）
function pickJob(h) {
  const own = shops[h.home]; if (own.unlocked && !isLine(own)) return own;
  const taken = new Set(Object.values(hires).filter(o => o !== h && o.job).map(o => o.job));
  const need = s => s.queue.length * 3 - s.stack.length + (s.tray.length ? 6 : -20) - (taken.has(s) ? 10 : 0);
  return Object.values(shops).filter(s => s.unlocked && !isLine(s)).sort((x, y) => need(y) - need(x))[0] || null;
}
function hauler(h, dt) {
  const a = h.actor;
  // 選定一家就搬到送完一趟才換；到了出貨口等 2.5 秒還沒貨也換
  if (h.job && !h.carry.length && nearAt(a, h.job.pickup, 0.8) && !h.job.tray.length) h.waitT = (h.waitT || 0) + dt; else h.waitT = 0;
  if (!h.carry.length && h.mode === 'fetch' && (!h.job || isLine(h.job) || h.waitT > 2.5)) {
    const j = pickJob(h); h.waitT = 0;
    if (j && j !== h.job && j !== shops[h.home]) floatText(a.root.position.clone().setY(1.5), `去支援${ICON[j.item]}！`, '#2c3e57', 0.6);
    h.job = j;
  }
  const s = h.type ? shopOf(h.type) : h.job;
  if (!s) { a.speed = 0; return; }
  if (h.mode === 'fetch') {
    const full = h.carry.length >= h.carryMax || (h.carry.length && !s.tray.length);
    if (full) h.mode = 'deliver'; else walkTo(a, s.pickup[0] + 0.3, s.pickup[1], CFG.helperSpeed, dt);
  } else if (walkTo(a, s.d.drop[0] + 0.3, s.d.drop[1], CFG.helperSpeed, dt) && !h.carry.length) { h.mode = 'fetch'; if (h.job !== shops[h.home]) h.job = null; }   // 送完一趟再看哪裡最缺
  carry(h, dt);
}

// ---------- 搬貨（小葵與搬運工共用） ----------
const nearAt = (a, [x, z], r) => Math.hypot(a.root.position.x - x, a.root.position.z - z) < r;
function backSlot(c, i) {
  const r = c.actor.root, h = r.rotation.y, s = r.scale.x, ih = ITEM_H[c.type || 'coffee'];
  if (c === player && state.gear.cart) {   // 有推車：貨兩排疊在推車上
    const side = (i % 2 - 0.5) * 0.2, back = 0.62;
    return V(r.position.x - Math.sin(h) * back + Math.cos(h) * side, 0.36 + ih / 2 + Math.floor(i / 2) * ih, r.position.z - Math.cos(h) * back - Math.sin(h) * side);
  }
  return V(r.position.x - Math.sin(h) * 0.27 * s, (0.4 * s + ih / 2) + i * ih, r.position.z - Math.cos(h) * 0.27 * s);
}
function carry(c, dt) {
  c.moveT += dt;
  if (c.moveT < CFG.moveEvery) return;
  for (const s of Object.values(shops)) {
    if (!s.unlocked) continue;
    if (!isLine(s) && nearAt(c.actor, s.pickup, 0.8) && s.tray.length && c.carry.length < c.carryMax && (!c.type || c.type === s.item) && (!c.job || c.job === s)) {   // 工讀生只拿自己選的店，路過別家不順手拿
      c.moveT = 0; c.type = s.item;
      const m = s.tray.pop(), i = c.carry.length; c.carry.push(m); retarget(m, () => backSlot(c, i));
      if (c === player) sfx.pick();
      return;
    }
    if (nearAt(c.actor, s.d.drop, 0.85) && c.carry.length && c.type === s.item) {
      c.moveT = 0;
      const m = c.carry.pop(); s.stack.push(m); retarget(m, () => counterSlot(s, s.stack.indexOf(m)));
      if (!c.carry.length) c.type = null;
      if (c === player) { sfx.drop(); gainXp(1); }
      return;
    }
    if (c === player && magnetMax() && s.cash.length) {   // 剛升到第三級時，地上還有的錢一次收掉
      let v = 0; while (s.cash.length) { const b = s.cash.pop(); v += b.userData.v; untrack(b); } addMoney(v); sfx.coin(); continue;
    }
    const mag = c === player ? GEAR.magnet.reach[state.gear.magnet] : 0.75;
    if (c === player && nearAt(c.actor, s.d.cash, mag) && s.cash.length) {
      c.moveT = 0;
      for (let k = 0; k < 2 && s.cash.length; k++) {
        const b = s.cash.pop(), v = b.userData.v;
        retarget(b, () => c.actor.root.position.clone().setY(0.7), () => { addMoney(v); });
      }
      sfx.coin(); if (mag < 99) return;
    }
  }
}
// 收錢：數字跑上去
function addMoney(v) { v = Math.round(v); state.money += v; state.earned += v; bumpMoney(); }

// ---------- 開場：小葵的對話框（點一下繼續，打字中點一下直接顯示整句） ----------
const INTRO = [
  '大家好！我是小葵，今天第一天來上班，請多多指教 ✨',
  '聽說新人什麼雜事都要做……老闆說，先從煮咖啡開始！',
  '拖曳畫面就能走路。走到咖啡機前面的白框，咖啡會一杯一杯疊到我手上。',
  '把咖啡送到櫃台，排隊的同事拿到就會付錢，記得走去綠框把錢收起來喔！',
  '錢夠了就站上格子：金色升級設施、白色開新區域、粉紅色請人來幫忙。',
  '做越多事就會升職，升職能背更多、走更快！一起把這間破辦公室變成產線吧 💪',
];
const JIE_INTRO = [
  '喲～我是阿傑，這間公司的老鳥 😎',
  '小葵說想學畫圖，設計部就交給她，今天雜事我來扛！',
  '店全部都開好了。我背得多、走得快，收錢還有超強磁鐵。',
  '玩法一樣：拿貨 → 送到櫃台 → 收錢 → 踩格子升級。來看看老鳥的速度吧！',
];
// 換角色：先存檔，網址換成另一個模式（#jie／沒有）後重新載入，直接開工
const GO_KEY = 'office-apocalypse-go';
function swapMode() {
  save(); try { sessionStorage.setItem(GO_KEY, '1'); sessionStorage.setItem('office-apocalypse-skip-splash', '1'); } catch {}
  history.replaceState(null, '', location.pathname + (JIE ? '' : '#jie')); location.reload();
}
function talk(lines, done) {
  const el = document.getElementById('talk'), txt = document.getElementById('talkTxt'), dots = document.getElementById('talkDots');
  dots.innerHTML = lines.map(() => '<i></i>').join('');
  let i = -1, n = 0, typing = null;
  const finish = () => { clearInterval(typing); typing = null; txt.textContent = lines[i]; };
  const next = () => {
    if (typing) return finish();
    if (++i >= lines.length) return close();
    n = 0; txt.textContent = ''; [...dots.children].forEach((d, k) => d.className = k === i ? 'on' : '');
    sfx.pick(i);
    typing = setInterval(() => { n += 1; txt.textContent = lines[i].slice(0, n); if (n >= lines[i].length) finish(); }, 35);
  };
  const close = () => { clearInterval(typing); el.classList.remove('on'); el.onpointerdown = null; state.talking = false; done && done(); };
  el.querySelector('img').src = `icons/${ME.icon}-180.png`; el.querySelector('.name').textContent = ME.name;
  state.talking = true; el.classList.add('on');
  el.onpointerdown = e => { if (e.target.id !== 'talkSkip') next(); };
  document.getElementById('talkSkip').onclick = close;
  next();
}

// ---------- 小葵升職 ----------
function gainXp(n) {
  state.xp += n;
  const next = RANKS[state.rank + 1];
  if (next && state.xp >= next.xp) {
    state.rank++;
    player.carryMax = carryMaxNow();
    const p = player.actor.root.position;
    pillar(p, 0xffb3d9, 0.6, 5); shockwave(p, 0xffb3d9, 3); confetti(V(p.x, 1.2, p.z), 70); camKick(0.7);
    sfx.promote(); popIn(player.actor.root, 1, 3);
    banner('升職！' + next.title, `一次背 ${player.carryMax} 個　走路速度 +${Math.round((rankSpeed(state.rank) / rankSpeed(0) - 1) * 100)}%`, 0, '#ff4fa3');
  }
  updateMe();
}
const meTitle = document.getElementById('meTitle'), meBar = document.getElementById('meBar');
function updateMe() {
  const r = RANKS[state.rank], n = RANKS[state.rank + 1];
  meTitle.textContent = JIE ? '😎 老鳥 阿傑' : `Lv${state.rank + 1} ${r.title}`;
  meBar.style.width = n ? `${Math.min(100, (state.xp - r.xp) / (n.xp - r.xp) * 100)}%` : '100%';
}

// ---------- 小葵移動 ----------
const keys = {}; let touch = null;
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
const stick = document.getElementById('stick'), knob = document.getElementById('knob');
const canvasEl = document.querySelector('canvas');
canvasEl.addEventListener('pointerdown', e => {
  if (!state.started) return; audioInit();
  touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
  stick.style.display = 'block'; stick.style.left = e.clientX - 60 + 'px'; stick.style.top = e.clientY - 60 + 'px';
});
addEventListener('pointermove', e => {
  if (!touch || e.pointerId !== touch.id) return;
  let dx = e.clientX - touch.x0, dy = e.clientY - touch.y0; const l = Math.hypot(dx, dy);
  if (l > 50) { dx *= 50 / l; dy *= 50 / l; }
  touch.dx = dx; touch.dy = dy; knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const endTouch = e => { if (touch && e.pointerId === touch.id) { touch = null; stick.style.display = 'none'; knob.style.transform = ''; } };
addEventListener('pointerup', endTouch); addEventListener('pointercancel', endTouch);

const vel = new THREE.Vector2();
function updatePlayer(dt) {
  let mx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
  let mz = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
  if (touch && Math.hypot(touch.dx, touch.dy) > 6) { mx = touch.dx / 50; mz = touch.dy / 50; }
  if (state.talking) mx = mz = 0;   // 對話中不能走
  if (G.force) [mx, mz] = G.force;
  const len = Math.hypot(mx, mz), a = player.actor, p = a.root.position;
  const top = rankSpeed(state.rank) * (1 + GEAR.scooter.bonus[state.gear.scooter]) * Math.min(1, len) * (state.t < poopUntil ? 0.45 : 1);   // 被屎砸到走不快
  // 加速度平滑：起步、停下不會瞬間，看起來比較順
  const tx = len > 0.05 ? mx / len * top : 0, tz = len > 0.05 ? mz / len * top : 0;
  const k = 1 - Math.exp(-dt * (len > 0.05 ? 10 : 14));
  vel.x += (tx - vel.x) * k; vel.y += (tz - vel.y) * k;
  const ox = p.x, oz = p.z;
  p.x += vel.x * dt; p.z += vel.y * dt; collide(p);
  a.speed = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-4);
  if (len > 0.05) turnTo(a, Math.atan2(mx, mz), dt);
  carry(player, dt);
  updateActor(a, dt, state.t);
}
function collide(p, r = 0.28) {
  const b = FLOORS[state.floor].bounds;
  p.x = THREE.MathUtils.clamp(p.x, b.minX, b.maxX); p.z = THREE.MathUtils.clamp(p.z, b.minZ, b.maxZ);
  for (const c of colliders) {
    const cx = THREE.MathUtils.clamp(p.x, c.minX, c.maxX), cz = THREE.MathUtils.clamp(p.z, c.minZ, c.maxZ);
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < r) { if (d > 1e-4) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else p.z = c.maxZ + r; }
  }
}

// ---------- 引導箭頭 ----------
const arrow = new THREE.Group(); scene.add(arrow);
{ const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0xff5d3a, emissive: 0x7a1e00, roughness: 0.4 })); cone.rotation.x = Math.PI; arrow.add(cone); }
const hintEl = document.getElementById('hint'); let hintText = '';
const PICK_TEXT = { tea: '去搬手搖飲', sand: '去搬早餐', cake: '去搬甜點', coffee: '去咖啡機拿咖啡', doc: '去印表機拿文件', drink: '去搬飲料箱', beef: '去搬牛肉便當', chicken: '去搬雞肉便當', fish: '去搬魚排便當' };
function updateGuide() {
  const pos = player.actor.root.position, dist = ([x, z]) => Math.hypot(pos.x - x, pos.z - z);
  let at = null, text = '';
  const open = Object.values(shops).filter(s => s.unlocked);
  const cashShop = open.filter(s => s.cash.length).sort((a, b) => dist(a.d.cash) - dist(b.d.cash))[0];
  const padReady = pads.filter(p => p.shown && (p.floor || 'f1') === state.floor && state.money >= p.price() - p.paid).sort((a, b) => a.price() - b.price())[0];
  if (kevin && kevin.phase !== 'flee') { const k = kevin.a.root.position; at = state.floor === 'f1' ? [k.x, k.z] : elevAt(); text = state.floor === 'f1' ? '👊 快去揍 Kevin，叫他滾！' : '👊 Kevin 在 1F 鬧事！快搭電梯下去'; }   // 最優先
  else if (cai && !cai.leaving && state.floor !== 'f1') { at = elevAt(); text = '🧧 黑財神在 1F 撒錢！快搭電梯下去'; }
  else if (state.floor !== 'f1') [at, text] = floorGuide();
  else if (cai && !cai.leaving && cai.drops.some(d => !d.landed && d.kind !== 'poop')) { const d = cai.drops.filter(d => !d.landed && d.kind !== 'poop').sort((a, b) => dist([a.x, a.z]) - dist([b.x, b.z]))[0]; at = [d.x, d.z]; text = '🧧 接住天上掉下來的元寶！（小心 💩）'; }
  else if (yan && yan.phase === 'wait' && player.carry.length && yan.need[player.type] > 0) { const y = yan.a.root.position; at = [y.x, y.z]; text = `📋 把 ${ICON[player.type]} 交給小燕`; }
  else if (yan && yan.phase === 'wait' && !player.carry.length) { const [it, n] = Object.entries(yan.need).find(([, n]) => n > 0) || []; if (it) { at = shopOf(it).pickup; text = `📋 小燕急件：去拿 ${ICON[it]}×${n}`; } }
  else if (waterEmpty() && !player.carry.length) { const u = water.units.find(u => u.level <= 0); [at, text] = player.jug ? [u.at, '💧 把水倒進飲水機'] : [WATER.pickup, '💧 飲水機沒水了，去搬桶裝水']; }
  else if (player.carry.length) { const s = shopOf(player.type); at = s.d.drop; text = `把 ${ICON[s.item]} 送到${s.type === 'vending' ? '販賣機' : s.def.name}`; }
  else if (cashShop && (cashShop.cash.length > 4 || !padReady)) { at = cashShop.d.cash; text = '去收錢！'; }
  else if (padReady) { at = padReady.at; text = `站上格子：${padReady.kind === 'upgrade' ? '升級' : padReady.kind === 'hire' ? '請' : '解鎖'}「${padReady.title()}」`; }
  else {
    // 櫃台快沒貨的優先補
    const s = open.filter(s => !isLine(s) && s.tray.length).sort((a, b) => (a.stack.length - b.stack.length) || (b.tray.length - a.tray.length))[0];
    if (s) { at = [s.pile.x, s.pile.z]; text = PICK_TEXT[s.item]; }
    else if (phone.unlocked) { at = PHONE_DEF.zone; text = '去接電話'; }
  }
  arrow.visible = !!at;
  if (at) { arrow.position.set(at[0], 1.9 + Math.sin(state.t * 5) * 0.14, at[1]); arrow.rotation.y += 0.05; }
  if (text !== hintText) { hintText = text; hintEl.textContent = text; }
}

// ---------- HUD ----------
const moneyEl = document.getElementById('moneyTxt'), moneyBox = document.getElementById('money');
let shownMoney = 0;
function bumpMoney() { moneyBox.classList.remove('bump'); void moneyBox.offsetWidth; moneyBox.classList.add('bump'); }
function updateHud(dt) {
  // 金額用跑的，不是瞬間跳
  if (shownMoney !== state.money) {
    const d = state.money - shownMoney;
    shownMoney += Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) * Math.min(1, dt * 10)));
    if (Math.sign(state.money - shownMoney) !== Math.sign(d)) shownMoney = state.money;
    moneyEl.textContent = shownMoney.toLocaleString();
  }
}
document.getElementById('ver').textContent = VERSION;
document.getElementById('coverVer').innerHTML = `📝 修改歷程・<span class="num">${VERSION}</span>`;
// 修改歷程面板：版本時間軸，最新一版標紅
document.getElementById('coverVer').onclick = () => {
  document.getElementById('changeList').innerHTML = '<div class="years">' + CHANGES.map(([v, d, items], i) =>
    `<div class="yr${i ? '' : ' new'}" data-n="${CHANGES.length - i}"><b>${v}${i ? '' : '　最新'}<em>${d}</em></b><ul>${items.map(t => `<li>${t}</li>`).join('')}</ul></div>`).join('') + '</div>';
  document.getElementById('changelog').classList.add('on');
};
{ const cl = document.getElementById('changelog'); cl.onpointerdown = (e) => { if (e.target === cl) cl.classList.remove('on'); }; cl.querySelector('[data-x]').onclick = () => cl.classList.remove('on'); }

// ======================================================================
// A. 年度業績：Q1～Q4 里程碑（看累積收入）→ 尾牙
// ======================================================================
const QUARTERS = [
  { target: 3000, reward: 400, unlock: '採購部開張了！買裝備、買裝潢' },
  { target: 15000, reward: 2000, unlock: '開始有突發事件：VIP 客戶、午餐尖峰' },
  { target: 50000, reward: 6000, unlock: '採購部進了高級裝潢' },
  { target: 180000, reward: 20000, unlock: '全年達標！準備尾牙' },
];
const yearEl = document.getElementById('year'), yearTitle = document.getElementById('yearTitle'), yearNum = document.getElementById('yearNum'), yearBar = document.getElementById('yearBar');
const yearQs = [...yearEl.querySelectorAll('.qs b')];
yearQs.forEach((b, i) => { b.textContent = 'Q' + (i + 1); });   // 打卡卡的四格
// 新辦公室：每一年目標放大一點
const qTarget = (i) => Math.round(QUARTERS[i].target * (1 + (state.year - 1) * 0.6));
function updateYear() {
  yearEl.style.display = 'block';
  yearQs.forEach((b, i) => { b.classList.toggle('on', i < state.q); b.classList.toggle('cur', i === state.q); });
  const done = state.q >= 4 && state.finaleDone && !design.finale;   // 尾牙辦完、選了繼續上班：隨時可以搬家
  if (done !== yearEl.classList.contains('done')) { yearEl.classList.toggle('done', done); chipsEl.classList.toggle('low', done); moveBtn.textContent = `🚚 搬到新辦公室（第 ${state.year + 1} 年）`; }
  if (state.q >= 4) { yearTitle.textContent = `第 ${state.year} 年　全年達標 ✓`; yearNum.textContent = '$' + state.earned.toLocaleString(); yearBar.style.width = '100%'; return; }
  const prev = state.q ? qTarget(state.q - 1) : 0, tgt = qTarget(state.q);
  yearTitle.textContent = `第 ${state.year} 年${REPLAY ? '（回顧）' : ''}　Q${state.q + 1} 業績`;
  yearNum.textContent = `${Math.min(state.earned, tgt).toLocaleString()} / ${tgt.toLocaleString()}`;
  const pct = Math.min(100, (state.earned - prev) / (tgt - prev) * 100);
  yearBar.style.width = `${pct}%`; yearQs[state.q]?.style.setProperty('--p', pct.toFixed(1) + '%');
  if (state.earned >= tgt) quarterDone(state.q);
}
function quarterDone(i) {
  state.q = i + 1;
  const Q = QUARTERS[i], reward = Math.round(Q.reward * (1 + (state.year - 1) * 0.6));
  state.money += reward; bumpMoney();
  const p = player.actor.root.position;
  pillar(p, 0x7dff9a, 0.7, 5); confetti(V(p.x, 1.4, p.z), 100, 1.2); camKick(0.8); sfx.upgrade();
  banner(`Q${i + 1} 業績達標！`, `獎金 +$${reward.toLocaleString()}　${Q.unlock}`, i + 1, '#22a447');
  if (i === 0) openKiosk(true);
  if (i === 3 && !state.finaleDone) after(3, startFinale);
  save();
}

// ======================================================================
// B. 採購部：裝備（推車、滑板車、磁鐵）＋裝潢（滿意度星星 → 小費）
// ======================================================================
const KIOSK = { at: [-6.4, 5.5], zone: [-5.4, 5.5] };
const DECOR = [
  { id: 'sofa', icon: '🛋', name: '沙發組', price: 3000, at: [6.7, 4.7], rot: -Math.PI / 2, q: 1 },
  { id: 'plants', icon: '🪴', name: '植栽牆', price: 4500, at: [-7.15, 7.4], rot: Math.PI / 2, q: 1 },
  { id: 'aquarium', icon: '🐠', name: '大魚缸', price: 7000, at: [-6.95, 9.7], rot: Math.PI / 2, q: 1 },
  { id: 'massage', icon: '💆', name: '按摩椅', price: 9000, at: [6.7, 6.2], rot: -Math.PI / 2, q: 1 },
  { id: 'catLucky', icon: '🐱', name: '招財貓', price: 12000, at: [-6.9, 1.7], rot: Math.PI / 2, q: 3 },
  { id: 'claw', icon: '🧸', name: '夾娃娃機', price: 16000, at: [6.75, 8.9], rot: -Math.PI / 2, q: 3 },
  { id: 'trophy', icon: '🏆', name: '獎盃櫃', price: 22000, at: [-3.75, -6.5], rot: 0, q: 3 },
  { id: 'piano', icon: '🎹', name: '演奏鋼琴', price: 30000, at: [2.35, -6.5], rot: 0, q: 3 },
];
const decorObjs = [];
let kiosk = null;
function openKiosk(fancy) {
  if (kiosk) return;
  kiosk = kioskLook(); kiosk.position.set(KIOSK.at[0], 0, KIOSK.at[1]); kiosk.rotation.y = Math.PI / 2; scene.add(kiosk);
  aabb(KIOSK.at[0], KIOSK.at[1], 0.35, 0.7);
  zoneMark(KIOSK.zone[0], KIOSK.zone[1], 1.1, 1.1, '#7dff9a');
  if (fancy) { popIn(kiosk); pillar(V(KIOSK.at[0], 0, KIOSK.at[1]), 0x7dff9a, 0.7, 4); }
}
function placeDecor(d, fancy) {
  const look = DECOR_LOOKS[d.id]();
  look.g.position.set(d.at[0], 0, d.at[1]); look.g.rotation.y = d.rot; scene.add(look.g);
  decorObjs.push(look);
  if (fancy) { popIn(look.g); celebrate(V(d.at[0], 0, d.at[1]), `${d.icon} ${d.name}`, `員工滿意度 ★${stars()}　小費 +${stars() * 5}%`, 0, '#ff8a3d'); }
}
// 清單：目前可以買的東西
function shopItems() {
  const out = [];
  for (const [id, g] of Object.entries(GEAR)) {
    const lv = state.gear[id], max = g.price.length;
    out.push({ kind: 'gear', id, icon: g.icon, name: g.name + (lv ? ` Lv${lv}` : ''), desc: lv >= max ? '已經是最高級' : g.desc[lv], price: lv >= max ? null : g.price[lv] });
  }
  for (const d of DECOR) if (state.q >= d.q) out.push({ kind: 'decor', id: d.id, icon: d.icon, name: d.name, desc: '滿意度 +1 ★（小費 +5%）', price: state.decor.includes(d.id) ? null : d.price });
  return out;
}
function buy(kind, id) {
  const it = shopItems().find(x => x.kind === kind && x.id === id);
  if (!it || it.price == null || state.money < it.price) return false;
  state.money -= it.price; bumpMoney(); gainXp(5);
  if (kind === 'gear') {
    state.gear[id]++;
    if (id === 'cart') { player.carryMax = carryMaxNow(); setCart(); }
    const p = player.actor.root.position; pillar(p, 0x7dff9a, 0.6, 4); confetti(V(p.x, 1.2, p.z), 50); sfx.build();
    banner(`${GEAR[id].icon} ${GEAR[id].name} Lv${state.gear[id]}`, GEAR[id].desc[state.gear[id] - 1], 0, '#36c35d');
  } else { state.decor.push(id); placeDecor(DECOR.find(d => d.id === id), true); }
  renderShop(); save(); return true;
}
let cartObj = null;
function setCart() {
  if (cartObj) player.actor.root.remove(cartObj);
  if (!state.gear.cart) return;
  cartObj = cartLook(state.gear.cart); cartObj.position.set(0, 0, -0.62); player.actor.root.add(cartObj); popIn(cartObj);
}
const shopEl = document.getElementById('shop'), shopList = document.getElementById('shopList');
let shopOpen = false, shopKey = '';
document.getElementById('shopX').onclick = () => { shopEl.classList.remove('on'); shopOpen = false; shopClosedHere = true; };
let shopClosedHere = false;
function renderShop() {
  const items = shopItems(), key = items.map(i => i.id + i.price).join() + '|' + Math.floor(state.money / 100);
  if (key === shopKey) return; shopKey = key;
  let html = `<div class="sec">${ME.name}的裝備</div>`;
  items.forEach((it, i) => {
    if (it.kind === 'decor' && (i === 0 || items[i - 1].kind !== 'decor')) html += `<div class="sec">辦公室裝潢（現在滿意度 ★${stars()}）</div>`;
    const btn = it.price == null ? `<button class="buy done" disabled>✓</button>` : `<button class="buy" data-k="${it.kind}" data-id="${it.id}" ${state.money < it.price ? 'disabled' : ''}>$${it.price.toLocaleString()}</button>`;
    html += `<div class="it"><div class="ic">${it.icon}</div><div class="tx"><b>${it.name}</b><small>${it.desc}</small></div>${btn}</div>`;
  });
  shopList.innerHTML = html;
  shopList.querySelectorAll('.buy[data-id]').forEach(b => b.onclick = (e) => { e.stopPropagation(); audioInit(); buy(b.dataset.k, b.dataset.id); });
}
function updateKiosk() {
  if (!kiosk) return;
  const near = nearAt(player.actor, KIOSK.zone, 0.85);
  if (near && !shopOpen && !shopClosedHere) { shopOpen = true; shopKey = ''; shopEl.classList.add('on'); }
  if (!near) { shopClosedHere = false; if (shopOpen) { shopOpen = false; shopEl.classList.remove('on'); } }
  if (shopOpen) renderShop();
  decorObjs.forEach(d => d.tick && d.tick(0, state.t));
}

// ======================================================================
// C. 突發事件（Q2 起）：VIP 客戶、午餐尖峰、老闆生日。只有好處、沒有懲罰
// ======================================================================
const chipsEl = document.getElementById('chips');
// ---------- 第二年起：特助 Kevin 來鬧事 ----------
// 他會走到一家店說「這個用 AI 就好了」，倒數結束前沒把他打跑，那家店就被打回 Lv1（產線也拆掉）
const KEVIN = { first: 45, every: [100, 160], wait: 15, hp: 5, punchEvery: 0.22, reward: 600 };
const KEVIN_TALK = ['這個用 AI 就好了 🤖', 'AI 一秒就做完了啦', '這些人力都可以省下來', '我已經跟老闆報告了喔'];
const KEVIN_OUCH = ['砰！', '滾！', '別來鬧事！', '👊', '啪！'];
let kevin = null, nextKevin = 0;
function spawnKevin() {
  nextKevin = state.t + KEVIN.every[0] + Math.random() * (KEVIN.every[1] - KEVIN.every[0]);
  const targets = Object.values(shops).filter(s => s.unlocked && s.lv >= 1);
  if (!targets.length) return;
  const s = targets[Math.floor(Math.random() * targets.length)];
  const a = makeActor(kinds.kevin || kinds.npcM, 0.98);
  a.root.position.set(L.elevator[0] + 0.6, 0, L.elevator[1]); scene.add(a.root); popIn(a.root, a.root.scale.x);
  const tab = rbox(0.3, 0.2, 0.025, 0x3a3f48, 0, 0.5, 0.2, a.root, { metalness: 0.6, roughness: 0.3 }); tab.rotation.x = -0.6;   // 手上的平板
  box(0.26, 0.16, 0.005, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, toneMapped: false }), 0, 0, 0.014, tab);
  const tag = labelSprite('特助 Kevin', { bg: '#2c3e57', size: 0.26 }); tag.position.y = 1.38; a.root.add(tag);
  const spot = [s.pickup[0] + (s.type === 'vending' ? -0.9 : 0.9), s.pickup[1]];
  kevin = { a, s, spot, phase: 'walk', t: KEVIN.wait, hp: KEVIN.hp, punchT: 0, bubble: null, sec: -1 };
  sfx.alarm(); camKick(0.4);
  banner('⚠️ 特助 Kevin 來了！', `他說${s.def.name}「用 AI 就好了」，快去叫他滾！`, 0, '#2c3e57');
}
// 對話泡泡（比招牌寬，長句子不會被切掉）；sec 有給就在前面加紅色倒數。Kevin、小燕、黑輪共用
function kevinSay(text, sec) { npcSay(kevin, text, sec); }
function npcSay(k, text, sec) {
  const host = k.sayAt || k.a.root;   // 黑財神的泡泡掛在雲上（他整個人往後仰，掛身上會歪）
  if (k.bubble) { host.remove(k.bubble); k.bubble.material.map.dispose(); }
  const t = canvasTex(1024, 150, (g, W, H) => {
    g.font = `900 60px ${FONT}`; const head = sec != null ? `⏰${sec}　` : '';
    const w = Math.min(W - 8, g.measureText(head + text).width + 70), x0 = (W - w) / 2;
    g.fillStyle = '#ffffff'; roundRect(g, x0, 8, w, H - 34, 36); g.fill();
    g.beginPath(); g.moveTo(W / 2 - 18, H - 27); g.lineTo(W / 2, H - 4); g.lineTo(W / 2 + 18, H - 27); g.fill();
    g.textBaseline = 'middle'; g.fillStyle = '#ff3b3b'; g.fillText(head, x0 + 35, (H - 26) / 2 + 4);
    g.fillStyle = '#2c3e57'; g.fillText(text, x0 + 35 + g.measureText(head).width, (H - 26) / 2 + 4);
  });
  k.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  k.bubble.scale.set(3.8, 0.56, 1); k.bubble.renderOrder = 9; k.bubble.position.y = k.sayY || 1.9; host.add(k.bubble);
}
function updateKevin(dt) {
  if (state.year < 2 || design.finale) return;
  if (!kevin) { if (!nextKevin) nextKevin = state.t + KEVIN.first; if (state.t >= nextKevin) spawnKevin(); return; }
  const k = kevin, a = k.a, p = a.root.position;
  if (k.phase === 'flee') {   // 跑回電梯消失
    if (walkTo(a, L.elevator[0] + 0.3, L.elevator[1], 3.2, dt)) { scene.remove(a.root); kevin = null; return; }
  } else {
    if (k.phase === 'walk' && walkTo(a, k.spot[0], k.spot[1], 1.7, dt)) { k.phase = 'talk'; floatText(p.clone().setY(1.9), KEVIN_TALK[0], '#2c3e57', 0.9); }
    if (k.phase === 'talk') {
      a.speed = 0; turnTo(a, Math.atan2(k.s.src[0] - p.x, k.s.src[1] - p.z), dt);
      k.t -= dt;
      const sec = Math.ceil(k.t);
      if (sec !== k.sec) { k.sec = sec; kevinSay(KEVIN_TALK[Math.floor((KEVIN.wait - sec) / 4) % KEVIN_TALK.length], Math.max(0, sec)); }
      if (k.t <= 0) {   // 來不及：被 AI 取代，打回 Lv1
        const s = k.s;
        if (s.belt) { scene.remove(s.belt.g); s.belt = null; s.beltItems.forEach(b => scene.remove(b.m)); s.beltItems = []; }
        s.lv = 0; setLook(s, 0, true); save();
        puff(V(s.src[0], 0.8, s.src[1])); camKick(0.8);
        banner('😱 被 AI 取代了……', `${s.def.name}被打回 Lv1`, 0, '#7a7f87');
        kevinSay('搞定，AI 接手 😎'); k.phase = 'flee'; return updateActor(a, dt, state.t);
      }
    }
    // 小葵（或阿傑）碰到他就開扁
    const pp = player.actor.root.position, d = Math.hypot(pp.x - p.x, pp.z - p.z);
    k.punchT += dt;
    if (d < 1.05 && k.punchT >= KEVIN.punchEvery) {
      k.punchT = 0; k.hp--;
      const dir = V(p.x - pp.x, 0, p.z - pp.z).normalize();
      p.addScaledVector(dir, 0.22); squash(player.actor.root, 0.25); squash(a.root, 0.3);
      shockwave(V(p.x, 0.05, p.z), 0xff5d3a, 1.6); camKick(0.35); sfx.punch();
      floatText(p.clone().setY(1.5 + Math.random() * 0.3), KEVIN_OUCH[Math.floor(Math.random() * KEVIN_OUCH.length)], '#ff3b3b', 1);
      if (k.hp <= 0) {
        const val = Math.round(KEVIN.reward * state.yearBonus);
        addMoney(val); gainXp(3); confetti(V(p.x, 1.2, p.z), 50); sfx.upgrade();
        banner(`${ME.name}：別來鬧事！`, `Kevin 夾著平板逃走了　+$${val.toLocaleString()}`, 0, '#ff5d3a');
        kevinSay('好啦好啦我滾 😭'); k.phase = 'flee';
      }
    }
  }
  updateActor(a, dt, state.t);
}
// 老闆出手：叫 Kevin 去寫檢討報告（店保住了，但沒有揍跑的獎金）
function viviScold() {
  if (!kevin || kevin.phase === 'flee') return;
  const v = hires.vivi.actor.root.position;
  floatText(v.clone().setY(1.8), '你去寫檢討報告！', '#ff4fa3', 1.2);
  kevinSay('……是，老闆 😭'); kevin.phase = 'flee'; camKick(0.4); sfx.build();
  banner('👩‍💼 老闆出手了！', 'Kevin 被叫去寫檢討報告', 0, '#ff4fa3');
}
let nextEvent = 0, cake = null;
function updateEvents() {
  if (state.q >= 2 && !design.finale && !nextEvent) nextEvent = state.t + 25;
  if (state.q >= 2 && !design.finale && state.t >= nextEvent) {
    nextEvent = state.t + 70 + Math.random() * 50;
    const pool = ['vip', 'vip', 'rush'];
    if (hires.vivi && !cake) pool.push('birthday');
    if (state.year >= 3 && !yan && kinds.yan) pool.push('yan', 'yan');
    if (state.year >= 3 && !heilun && kinds.heilun) pool.push('heilun', 'heilun');
    if (!cai && kinds.caishen && state.floor === 'f1') pool.push('caishen');
    ({ vip: eventVip, rush: eventRush, birthday: eventBirthday, yan: eventYan, heilun: eventHeilun, caishen: eventCaishen })[pool[Math.floor(Math.random() * pool.length)]]();
  }
  let chips = '';
  if (waterEmpty()) chips += `<span class="rush">💧 飲水機沒水 小費 -${waterEmpty() * 5}%</span>`;
  if (kevin && kevin.phase !== 'flee') chips += `<span class="rush">⚠️ Kevin 鬧事中${kevin.phase === 'talk' ? '　' + Math.max(0, Math.ceil(kevin.t)) + ' 秒' : ''}</span>`;
  if (REPLAY) chips += `<span>📼 回顧第 ${REPLAY} 年</span>`;
  if (cai) chips += `<span class="rush">🧧 黑財神降臨 收益 ×2　${Math.max(0, Math.ceil(cai.until - state.t))} 秒</span>`;
  if (state.t < poopUntil) chips += `<span class="rush">💩 被屎砸到，走路變慢</span>`;
  if (yan && yan.phase === 'wait') chips += `<span class="rush">📋 小燕急件 ${needText(yan.need)}　${Math.max(0, Math.ceil(yan.t))} 秒</span>`;
  if (heilun && heilun.phase === 'wait') chips += `<span class="rush">🤝 黑輪的大客戶 ${heilun.vips.filter(c => c.mode !== 'leave').length} 位</span>`;
  if (rushOn()) chips += `<span class="rush">🍱 午餐尖峰 ×2　${Math.ceil(state.rushUntil - state.t)} 秒</span>`;
  if (stars()) chips += `<span>★${stars()} 小費 +${stars() * 5}%</span>`;
  if (comfort()) chips += `<span>🛋 舒適度 +${comfort() * 2}%</span>`;
  if (state.yearBonus > 1) chips += `<span>🏢 第 ${state.year} 年 ×${state.yearBonus.toFixed(2)}</span>`;
  if (chips !== chipsEl._h) { chipsEl.innerHTML = chips; chipsEl._h = chips; }
}
function eventVip() {
  const open = Object.values(shops).filter(s => s.unlocked);
  const s = open[Math.floor(Math.random() * open.length)];
  const c = spawnCustomer(s, true);
  banner('👑 VIP 客戶來了！', `在${s.type === 'vending' ? '販賣機' : s.def.name}點了一大單，送到給 3 倍`, 0, '#d9a63a');
  toast(`VIP 想要 ${ICON[s.item]}×${c.want}`);
}
function vipPaid(s, c, total) {
  state.stats.vip++;
  if (c.heilun && heilun) heilun.earned += total;
  const p = c.actor.root.position;
  pillar(p, 0xffd34d, 0.7, 5); confetti(V(p.x, 1.4, p.z), 80, 1.1); sfx.upgrade();
  floatText(V(p.x, 2.0, p.z), 'VIP 大單 +$' + total.toLocaleString(), '#d9a63a', 1.2);
}
function eventRush() {
  state.rushUntil = state.t + 60;
  banner('🍱 午餐尖峰！', '60 秒內同事一直湧進來，售價 ×2', 0, '#ff5d3a');
}
function eventBirthday() {   // 純搞笑：老闆生日，大家吃蛋糕，沒有任何效果
  const v = hires.vivi; if (!v) return;
  const at = v.actor.root.position.clone();
  cake = cakeLook(); cake.g.position.set(at.x + 0.6, 0, at.z); scene.add(cake.g); popIn(cake.g);
  banner('🎂 今天是老闆生日！', '大家一起唱生日快樂歌（效果：無）', 0, '#ff4fa3');
  confetti(V(at.x, 1.4, at.z), 90, 1.1); sfx.promote();
  const singers = [player, ...Object.values(hires)].map(h => h.actor);
  for (let i = 0; i < 6; i++) after(0.8 + i * 1.1, () => { const a = singers[i % singers.length]; floatText(a.root.position.clone().setY(1.7), ['生日快樂～', '🎵 祝你生日快樂', '老闆萬歲！', '🎂'][i % 4], '#ff4fa3', 0.8); });
  after(9, () => { scene.remove(cake.g); cake = null; });
}

// ---------- 第三年：PM 小燕（急件）、業務黑輪（帶大客戶來，順便抽成） ----------
const YAN = { at: [-1.3, -0.4], time: 45, mult: 4 };
const HEILUN = { at: [-1.3, 4.6], vips: 4, wait: 90, cut: 0.1 };
const HEILUN_TALK = ['這幾位都是大客戶，好好招待喔～', '我跟他們說我們公司最專業了', '業績達標，今年我要換車 😎', '單子我都簽好了，剩下交給你們', '客戶喜歡就是我喜歡'];
let yan = null, heilun = null;
const needText = (need) => Object.entries(need).filter(([, n]) => n > 0).map(([it, n]) => `${ICON[it]}×${n}`).join(' ');
function npcEnter(kind, name, bg) {
  const a = makeActor(kinds[kind] || kinds.npcF, 0.98);
  a.root.position.set(L.elevator[0] + 0.6, 0, L.elevator[1]); scene.add(a.root); popIn(a.root, a.root.scale.x);
  const tag = labelSprite(name, { bg, size: 0.26 }); tag.position.y = 1.38; a.root.add(tag);
  return a;
}
// 小燕：客戶臨時要開會，限時把指定的東西拿給她（自己搬得到的店才會點），完成拿 4 倍
function eventYan() {
  if (yan || !kinds.yan) return;
  const open = Object.values(shops).filter(s => s.unlocked && !isLine(s)).sort(() => Math.random() - 0.5).slice(0, 2);
  if (!open.length) return;
  const need = Object.fromEntries(open.map(s => [s.item, Math.min(player.carryMax, 3 + Math.floor(Math.random() * 3))]));
  const a = npcEnter('yan', 'PM 小燕', '#3f5fd9');
  const pad = rbox(0.26, 0.34, 0.03, 0xf4f6fb, 0.12, 0.55, 0.2, a.root); pad.rotation.x = -0.5;   // 手上的待辦清單
  yan = { a, need, got: [], phase: 'walk', t: YAN.time, bubble: null, sec: -1, giveT: 0, value: 0 };
  sfx.alarm(); camKick(0.3);
  banner('📋 PM 小燕：急件！', `客戶臨時要開會，${YAN.time} 秒內幫我拿 ${needText(need)}`, 0, '#3f5fd9');
}
function updateYan(dt) {
  const y = yan, a = y.a, p = a.root.position;
  if (y.phase === 'leave') {
    if (walkTo(a, L.elevator[0] + 0.3, L.elevator[1], 2.6, dt)) { scene.remove(a.root); yan = null; return; }
    return updateActor(a, dt, state.t);
  }
  if (y.phase === 'walk' && walkTo(a, YAN.at[0], YAN.at[1], 2.2, dt)) y.phase = 'wait';
  if (y.phase === 'wait') {
    const pp = player.actor.root.position;
    a.speed = 0; turnTo(a, Math.atan2(pp.x - p.x, pp.z - p.z), dt);
    y.t -= dt;
    const sec = Math.ceil(y.t);
    if (sec !== y.sec) { y.sec = sec; npcSay(y, '我要 ' + needText(y.need), Math.max(0, sec)); }
    // 背著她要的東西走過去，一個一個交給她
    y.giveT += dt;
    if (player.carry.length && y.need[player.type] > 0 && Math.hypot(pp.x - p.x, pp.z - p.z) < 1.3 && y.giveT >= 0.12) {
      y.giveT = 0;
      const it = player.type, s = shopOf(it), m = player.carry.pop(), n = y.got.length;
      y.need[it]--; y.value += s.def.levels[s.lv].price; y.got.push(m); y.sec = -1;
      if (!player.carry.length) player.type = null;
      retarget(m, () => V(p.x + ((n % 4) - 1.5) * 0.24, ITEM_H[it] / 2 + Math.floor(n / 4) * 0.22, p.z + 0.5)); sfx.drop();
    }
    const done = Object.values(y.need).every(n => n <= 0);
    if (done || y.t <= 0) {
      y.got.forEach(m => untrack(m)); puff(V(p.x, 0.4, p.z + 0.5));
      if (done) {
        const val = Math.round(y.value * YAN.mult * incomeMult());
        addMoney(val); gainXp(4); confetti(V(p.x, 1.4, p.z), 70, 1.1); pillar(p, 0x3f5fd9, 0.7, 5); sfx.upgrade();
        npcSay(y, '救了我一命！下次請你喝飲料 🥹');
        banner('📋 急件完成！', `客戶很滿意，小燕的獎金分你　+$${val.toLocaleString()}`, 0, '#3f5fd9');
      } else {
        const val = Math.round(y.value * incomeMult());   // 交到的部分照原價算
        if (val) addMoney(val);
        npcSay(y, '算了……我去跟客戶喬延期 😮‍💨');
        banner('📋 急件來不及', val ? `交到的部分照原價算　+$${val.toLocaleString()}` : '小燕去跟客戶喬延期了', 0, '#7a7f87');
      }
      y.phase = 'leave';
    }
  }
  updateActor(a, dt, state.t);
}
// 黑輪：帶一群 VIP 大客戶來，每家店一位；大單做完他說業績算他的，抽 10%（還是大賺）
function eventHeilun() {
  if (heilun || !kinds.heilun) return;
  const open = Object.values(shops).filter(s => s.unlocked).sort(() => Math.random() - 0.5).slice(0, HEILUN.vips);
  if (!open.length) return;
  const a = npcEnter('heilun', '業務 黑輪', '#e0663a');
  const bag = rbox(0.34, 0.24, 0.08, 0x3a2a20, 0.3, 0.45, 0.05, a.root); bag.rotation.z = 0.1;   // 公事包
  const vips = open.map(s => { const c = spawnCustomer(s, true); c.heilun = true; return c; });
  heilun = { a, vips, earned: 0, phase: 'walk', t: HEILUN.wait, bubble: null, talkT: 0, line: 0 };
  sfx.promote(); camKick(0.3);
  banner('🤝 業務黑輪帶客戶來了！', `${vips.length} 位 VIP 一起下大單，各店送到給 3 倍`, 0, '#e0663a');
}
function updateHeilun(dt) {
  const h = heilun, a = h.a, p = a.root.position;
  if (h.phase === 'leave') {
    if (walkTo(a, L.elevator[0] + 0.3, L.elevator[1], 2.4, dt)) { scene.remove(a.root); heilun = null; return; }
    return updateActor(a, dt, state.t);
  }
  if (h.phase === 'walk' && walkTo(a, HEILUN.at[0], HEILUN.at[1], 2.0, dt)) { h.phase = 'wait'; h.talkT = 99; }
  if (h.phase === 'wait') {
    const pp = player.actor.root.position;
    a.speed = 0; turnTo(a, Math.atan2(pp.x - p.x, pp.z - p.z), dt);
    h.t -= dt; h.talkT += dt;
    if (h.talkT > 5) { h.talkT = 0; npcSay(h, HEILUN_TALK[h.line++ % HEILUN_TALK.length]); }
    if (h.vips.every(c => c.mode === 'leave') || h.t <= 0) {
      h.vips.forEach(c => c.heilun = false);
      const cut = Math.min(state.money, Math.round(h.earned * HEILUN.cut));
      if (cut > 0) {
        state.money -= cut; bumpMoney(); sfx.coin();
        floatText(p.clone().setY(1.6), `抽成 -$${cut.toLocaleString()}`, '#e0663a', 1.1);
        npcSay(h, '業績算我的，抽個 10% 不過分吧 😏');
        banner('🤝 黑輪：合作愉快！', `大單收了 $${h.earned.toLocaleString()}，黑輪抽走 $${cut.toLocaleString()}`, 0, '#e0663a');
      } else npcSay(h, '客戶等不及，我先帶他們去吃飯了……');
      h.phase = 'leave';
    }
  }
  updateActor(a, dt, state.t);
}
// ---------- 黑財神：坐著雲飄在 1F 上空撒金銀元寶，小葵去接；偶爾會掉屎 ----------
// 在場這段時間所有收入 ×2（incomeMult）。元寶落地沒接到就消失；接到屎走路變慢一下，不扣錢
// 元寶價值跟著進度走：目前開著的店裡最貴一份商品的售價 ×1（金）／×0.45（銀）；全接到約年度目標一成多
const CAI = { time: 30, every: 0.32, gold: 1.0, silver: 0.45, poop: 0.13, h: 2.9, catchR: 0.75 };
const CAI_TALK = ['恭喜發財！', '金銀財寶接好喔～', '今年大賺！', '財源滾滾！', '哈哈哈，再來一個！', '紅包拿來……啊不是，是給你！'];
let poopUntil = 0;
function eventCaishen() {
  if (cai || !kinds.caishen) return;
  const g = new THREE.Group(), cloud = cloudLook(); g.add(cloud);
  const a = makeActor(kinds.caishen, 1.5); a.action?.setEffectiveWeight(1); a.root.position.set(0, 0.42, 0.1); a.root.rotation.x = -0.6; g.add(a.root);   // 坐姿動作一直播；屁股放在雲頂、往後仰、臉朝上對著鏡頭（俯視鏡頭才看得到臉，不然只看到帽頂）
  const tag = labelSprite('🧧 黑財神', { bg: '#d9483b', size: 0.3 }); tag.position.y = 2.0; g.add(tag);
  const pp = player.actor.root.position;
  g.position.set(THREE.MathUtils.clamp(pp.x, -5.5, 5.5), CAI.h + 3, pp.z + 0.6); scene.add(g);
  cai = { g, a, sayAt: g, sayY: 2.45, until: state.t + CAI.time, dropT: 0, talkT: 0, line: 0, drops: [], vx: (Math.random() < 0.5 ? -1 : 1) * 0.8, leaving: false, caught: 0, got: 0 };
  sfx.promote(); pillar(V(g.position.x, 0, g.position.z), 0xffd34d, 1.2, 6); confetti(V(g.position.x, 2.2, g.position.z), 90, 1.2);
  banner('🧧 黑財神降臨！', `${CAI.time} 秒內收益 ×2，天上掉下來的金銀元寶快去接（小心屎 💩）`, 0, '#d9483b');
}
function updateCaishen(dt) {
  const c = cai, g = c.g, pp = player.actor.root.position;
  c.a.mixer.update(dt);
  if (!c.leaving && state.t >= c.until) {
    c.leaving = true; npcSay(c, c.got ? `接到 $${c.got.toLocaleString()}，明年再來！` : '下次要接快一點喔～');
  }
  // 飄：從天上降下來，在小葵上空左右晃（跟著她，掉的東西才接得到；鏡頭是斜的，雲放在她前面一點畫面上才剛好在她頭上）
  const ty = c.leaving ? CAI.h + 4 : CAI.h + Math.sin(state.t * 1.6) * 0.12;
  g.position.y += (ty - g.position.y) * Math.min(1, dt * (c.leaving ? 1.2 : 2));
  if (!c.leaving) {
    g.position.x += c.vx * dt;
    if (g.position.x > Math.min(6, pp.x + 2.6)) c.vx = -Math.abs(c.vx); if (g.position.x < Math.max(-6, pp.x - 2.6)) c.vx = Math.abs(c.vx);
    g.position.z += (THREE.MathUtils.clamp(pp.z + 0.6, L.bounds.minZ + 1, L.bounds.maxZ - 0.5) - g.position.z) * Math.min(1, dt * 0.8);
    g.rotation.z = Math.sin(state.t * 1.3) * 0.05;
    c.talkT += dt; if (c.talkT > 4) { c.talkT = 0; npcSay(c, CAI_TALK[c.line++ % CAI_TALK.length]); }
    c.dropT += dt;
    if (c.dropT >= CAI.every && g.position.y < CAI.h + 0.6) { c.dropT = 0; caiDrop(c); }
  } else if (g.position.y > CAI.h + 3.5 && !c.drops.length) { scene.remove(g); cai = null; return; }
  // 掉落物：地上有影子提示落點，頭頂高度以下碰到小葵就算接到
  for (let i = c.drops.length - 1; i >= 0; i--) {
    const d = c.drops[i], m = d.m;
    if (d.landed) { d.t += dt; m.scale.setScalar(Math.max(0.01, 1 - d.t * 1.6)); if (d.t > 0.6) { scene.remove(m); scene.remove(d.mark); c.drops.splice(i, 1); } continue; }
    d.vy -= 9 * dt; m.position.y += d.vy * dt; m.rotation.y += dt * 4;
    m.position.x += (d.x - m.position.x) * Math.min(1, dt * 3); m.position.z += (d.z - m.position.z) * Math.min(1, dt * 3);
    const k = THREE.MathUtils.clamp(1 - m.position.y / CAI.h, 0.2, 1); d.mark.scale.setScalar(k); d.mark.material.opacity = 0.15 + 0.35 * k;
    if (m.position.y < 1.25 && Math.hypot(m.position.x - pp.x, m.position.z - pp.z) < CAI.catchR) { caiCatch(c, d); scene.remove(m); scene.remove(d.mark); c.drops.splice(i, 1); continue; }
    if (m.position.y <= 0.08) { m.position.y = 0.08; d.landed = true; d.t = 0; if (d.kind === 'poop') puff(V(m.position.x, 0.2, m.position.z)); }
  }
}
function caiDrop(c) {
  const r = Math.random(), kind = r < CAI.poop ? 'poop' : r < 0.55 ? 'gold' : 'silver';
  const m = kind === 'poop' ? poopLook() : ingotLook(kind === 'silver');
  const g = c.g.position; m.position.set(g.x + (Math.random() - 0.5) * 1.2, g.y - 0.2, g.z); scene.add(m);
  // 落點：雲底下附近、往小葵那邊偏一點
  const pp = player.actor.root.position, ang = Math.random() * Math.PI * 2, rr = 0.4 + Math.random() * 2.2;
  const x = THREE.MathUtils.clamp(g.x * 0.5 + pp.x * 0.5 + Math.cos(ang) * rr, L.bounds.minX + 0.3, L.bounds.maxX - 0.3);
  const z = THREE.MathUtils.clamp(g.z * 0.3 + pp.z * 0.7 + Math.sin(ang) * rr, L.bounds.minZ + 0.3, L.bounds.maxZ - 0.3);
  const mark = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: kind === 'poop' ? 0x6b3f1a : 0xffb000, transparent: true, opacity: 0.2, depthWrite: false }));
  mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.015, z); scene.add(mark);
  c.drops.push({ m, mark, kind, x, z, vy: 1.2, landed: false, t: 0 });
}
function caiCatch(c, d) {
  const p = player.actor.root.position;
  if (d.kind === 'poop') {
    poopUntil = state.t + 2.5; squash(player.actor.root, 0.4); camKick(0.3); sfx.punch();
    puff(V(p.x, 1.1, p.z)); floatText(V(p.x, 1.8, p.z), '噁！💩', '#8a5527', 1.1);
    if (Math.random() < 0.5) after(0.4, () => cai && npcSay(cai, '哎呀，那個不是我丟的 😅'));
    return;
  }
  const unit = Math.max(20, ...Object.values(shops).filter(s => s.unlocked).map(s => s.def.levels[s.lv].price));
  const val = Math.round((d.kind === 'gold' ? CAI.gold : CAI.silver) * unit * incomeMult());
  addMoney(val); c.got += val; c.caught++; sfx.coin(); sparkle(V(p.x, 1.3, p.z));
  floatText(V(p.x, 1.6, p.z), `${d.kind === 'gold' ? '金' : '銀'}元寶 +$${val.toLocaleString()}`, d.kind === 'gold' ? '#d9a63a' : '#7a8794', 0.9);
}
// 尾牙開始：還在場的小燕、黑輪直接下班
function clearVisitors() {
  if (cai) { cai.drops.forEach(d => { scene.remove(d.m); scene.remove(d.mark); }); scene.remove(cai.g); cai = null; }
  for (const o of [yan, heilun]) if (o) { o.got?.forEach(m => untrack(m)); scene.remove(o.a.root); }
  if (heilun) heilun.vips.forEach(c => c.heilun = false);
  yan = heilun = null;
}

// ======================================================================
// 尾牙：大家上台、老闆致詞、小葵領年度 MVP → 繼續上班或搬到新辦公室
// ======================================================================
const STAGE_AT = [-0.4, 2.1];
let stage = null;
// 尾牙：先演一段年度結尾小劇場，再上台
let finaleScene = false;
function startFinale() {
  if (state.finaleDone || design.finale || finaleScene) return;
  if (!theater || G.autoTheater) return beginFinale();
  finaleScene = true; theater.play(yearEndScript(state.year)).then(() => { finaleScene = false; beginFinale(); });
}
function beginFinale() {
  if (state.finaleDone || design.finale) return;
  design.finale = true; clearVisitors();
  stage = stageLook(state.year); stage.g.position.set(STAGE_AT[0], 0, STAGE_AT[1]); scene.add(stage.g); popIn(stage.g, 1, 1.6);
  camFocus = V(STAGE_AT[0], 0, STAGE_AT[1] + 0.6);
  banner(`🎉 第 ${state.year} 年度 尾牙 🎉`, '全年業績達標，大家辛苦了！', 4, '#d9483b');
  // 小葵站中間、夥伴站兩邊（直接傳送上台）
  const crew = Object.values(hires).filter(h => h.id !== 'vivi');
  player.actor.root.position.set(STAGE_AT[0], 0.26, STAGE_AT[1] + 0.2); player.actor.root.rotation.y = 0;
  crew.forEach((h, i) => { h.actor.root.position.set(STAGE_AT[0] + (i % 2 ? 1 : -1) * (0.75 + Math.floor(i / 2) * 0.6), 0.26, STAGE_AT[1] + 0.1); h.actor.root.rotation.y = 0; });
  if (hires.vivi) { hires.vivi.actor.root.position.set(STAGE_AT[0] + 1.95, 0.26, STAGE_AT[1] + 0.05); hires.vivi.actor.root.rotation.y = -0.3; }   // 台上右前方，麥克風架前面，不會被擋
  if (state.year >= 2 && kinds.kevin) {   // Kevin 只能在台下看
    const k = makeActor(kinds.kevin, 0.98); k.root.position.set(STAGE_AT[0] + 2.5, 0, STAGE_AT[1] + 1.5); k.root.rotation.y = Math.PI + 0.5; scene.add(k.root); design.kevinDown = k;
    const tag = labelSprite('特助 Kevin（台下）', { bg: '#2c3e57', size: 0.24 }); tag.position.y = 1.38; k.root.add(tag);
    after(3.5, () => floatText(k.root.position.clone().setY(1.6), '（我也想上台……）', '#2c3e57', 0.8));
    after(9.5, () => floatText(k.root.position.clone().setY(1.6), '明年用 AI 頒獎就好了', '#2c3e57', 0.8));
  }
  const speaker = hires.vivi ? hires.vivi.actor : player.actor;
  const lines = hires.vivi ? ['今年大家辛苦了！', '業績破表！', '年度 MVP 是……', `${ME.name}！！！`] : ['今年大家辛苦了！', '業績破表！', '年度 MVP 是……', '我自己！（沒請老闆）'];
  lines.forEach((l, i) => after(1.5 + i * 1.6, () => floatText(speaker.root.position.clone().setY(1.8), l, '#d9483b', 1.1)));
  for (let i = 0; i < 8; i++) after(1 + i * 0.9, () => confetti(V(STAGE_AT[0] + (Math.random() - 0.5) * 4, 2.5, STAGE_AT[1]), 60, 1.2));
  after(8.2, () => {   // 頒獎
    const p = player.actor.root.position;
    const cup = new THREE.Group(); cyl(0.12, 0.06, 0.2, 0xd9a63a, 0, 0, 0, cup, { metalness: 0.9, roughness: 0.3 }); cyl(0.05, 0.08, 0.08, 0xd9a63a, 0, -0.14, 0, cup, { metalness: 0.9, roughness: 0.3 });
    cup.position.set(0, 1.35, 0); player.actor.root.add(cup); popIn(cup); design.cup = cup;
    pillar(p, 0xffd34d, 0.8, 6); shockwave(p, 0xffd34d, 5); camKick(1.2); sfx.promote();
  });
  after(11, showFinaleCard);
}
function showFinaleCard() {
  const S = state.stats, el = document.getElementById('finale');
  document.getElementById('finMvp').textContent = JIE ? '年度 MVP：老鳥 阿傑' : `年度 MVP：${RANKS[state.rank].title} 小葵`;
  const rows = [['年度業績', '$' + state.earned.toLocaleString()], ['☕ 咖啡', S.coffee], ['📄 文件', S.doc], ['🥤 飲料', S.drink], ['🍱 便當', S.beef + S.chicken + S.fish], ...(state.year >= 3 ? [['🧋 早餐街', (S.tea || 0) + (S.sand || 0) + (S.cake || 0)]] : []), ['☎ 電話', S.calls], [JIE ? '🎨 小葵交稿' : '🎨 阿傑交稿', S.drafts], ['👑 VIP 大單', S.vip], ['🎡 遊樂設施', S.rides || 0]];
  document.getElementById('finStats').innerHTML = rows.map(([k, v]) => `<div>${k}<b>${typeof v === 'number' ? v.toLocaleString() : v}</b></div>`).join('');
  const nb = 1 + state.year * 0.25;
  document.getElementById('finMove').textContent = REPLAY ? '⏹ 結束回顧，回主線' : `搬到新辦公室（第 ${state.year + 1} 年）`;
  document.getElementById('finNote').textContent = `搬家：設施和錢重新開始，但所有收入永久 ×${nb.toFixed(2)}；留下來：繼續在這裡上班`;
  el.classList.add('on');
}
function endFinale() {
  document.getElementById('finale').classList.remove('on');
  design.finale = false; state.finaleDone = true; camFocus = null;
  if (stage) { scene.remove(stage.g); stage = null; }
  if (design.kevinDown) { scene.remove(design.kevinDown.root); design.kevinDown = null; }
  if (design.cup) { player.actor.root.remove(design.cup); design.cup = null; }
  player.actor.root.position.y = 0; Object.values(hires).forEach(h => { h.actor.root.position.y = 0; h.trip = null; h.tripT = undefined; });   // 尾牙後老闆從 1F 重新開始
  player.actor.root.position.set(STAGE_AT[0], 0, STAGE_AT[1] + 1.4);
  save();
}
document.getElementById('finStay').onclick = endFinale;
document.getElementById('finMove').onclick = () => moveToNextYear();
// 搬家：存下年度與加成，其他歸零，重新載入（尾牙的按鈕、之後進度條下面的按鈕都走這裡）
const nextBonus = () => 1 + state.year * 0.25;
function moveToNextYear() {
  if (REPLAY) return endReplay();   // 回顧模式：尾牙後回主線
  noSave = true;
  // 新年度：存下年度與加成，其他歸零，重新載入
  try {
    localStorage.setItem(YEAR_KEY, JSON.stringify({ year: state.year + 1, bonus: nextBonus() }));
    localStorage.removeItem(SAVE_KEY);
  } catch {}
  location.reload();
}
const moveBtn = document.getElementById('moveBtn'), moveAsk = document.getElementById('moveAsk');
moveBtn.onclick = (e) => {
  e.stopPropagation(); audioInit(); sfx.pick?.();
  document.getElementById('moveTxt').innerHTML = `第 ${state.year + 1} 年的新辦公室：店、錢、職等、員工都從頭開始，年度目標也會變大。<br>2F 買的家具會跟著搬過去。`;
  document.getElementById('moveBonus').textContent = `所有收入永久 ×${nextBonus().toFixed(2)}（現在 ×${state.yearBonus.toFixed(2)}）`;
  moveAsk.classList.add('on');
};
document.getElementById('moveGo').onclick = () => moveToNextYear();
document.getElementById('moveNo').onclick = () => moveAsk.classList.remove('on');

// ======================================================================
// 樓層：電梯、頂樓遊樂園、2F 我的辦公室（第 2 年開放；阿傑老鳥一開始就能去）
// ======================================================================
const floorOpen = () => state.year >= 2 || JIE;
const elevAt = (f = state.floor) => [FLOORS[f].ox - 6.4, -0.6];
const elevEl = document.getElementById('elev'), elevList = document.getElementById('elevList'), fadeEl = document.getElementById('fade');
let elevOpen = false, elevClosedHere = false;
document.getElementById('elevX').onclick = () => { elevEl.classList.remove('on'); elevOpen = false; elevClosedHere = true; };
function renderElevator() {
  elevList.innerHTML = Object.entries(FLOORS).map(([id, f]) => {
    const here = id === state.floor, locked = id !== 'f1' && !floorOpen();
    return `<button data-f="${id}" ${here || locked ? 'disabled' : ''}><b>${f.icon} ${f.name}</b><small>${here ? '你在這層' : locked ? '🔒 第 2 年開放' : '前往 →'}</small></button>`;
  }).join('');
  elevList.querySelectorAll('button[data-f]').forEach(b => b.onclick = (e) => { e.stopPropagation(); audioInit(); goFloor(b.dataset.f); });
}
function updateElevator() {
  const near = nearAt(player.actor, elevAt(), 0.75);
  if (near && !elevOpen && !elevClosedHere) { elevOpen = true; renderElevator(); elevEl.classList.add('on'); }
  if (!near) { elevClosedHere = false; if (elevOpen) { elevOpen = false; elevEl.classList.remove('on'); } }
}
function goFloor(id) {
  if (id === state.floor || (id !== 'f1' && !floorOpen())) return;
  elevEl.classList.remove('on'); elevOpen = false; elevClosedHere = true;
  fadeEl.classList.add('on'); sfx.answer();
  setTimeout(() => {   // 畫面淡出的那一下瞬移（只是畫面效果，用真實時間沒關係）
    state.floor = id;
    const [x, z] = elevAt(id); player.actor.root.position.set(x + 0.5, 0, z); vel.set(0, 0);
    player.actor.root.rotation.y = Math.PI / 2;
    cam.target.copy(camFocusOf(player.actor.root.position));
    fadeEl.classList.remove('on');
    toast(`${FLOORS[id].icon} ${FLOORS[id].name}`);
  }, 230);
}
function floorGuide() {
  if (state.floor === 'f2') return [[FLOORS.f2.ox + ROOM.zone[0], ROOM.zone[1]], '🛋 站到家具型錄，佈置你的辦公室'];
  const rs = Object.values(roof.rides), cashR = rs.filter(r => r.cash.length).sort((a, b) => b.cash.length - a.cash.length)[0];
  const pad = pads.filter(p => p.shown && p.floor === 'rf' && state.money >= p.price() - p.paid).sort((a, b) => a.price() - b.price())[0];
  if (cashR && (cashR.cash.length > 5 || !pad)) return [rw(cashR.def.cash), '去收門票錢！'];
  if (pad) return [pad.at, `站上格子：${pad.kind === 'upgrade' ? '升級' : '蓋'}「${pad.title()}」`];
  if (!rs.some(r => r.unlocked)) return [null, '存到錢就來蓋第一個遊樂設施'];
  return [null, '同事上來玩，玩完會付門票錢'];
}

// ---------- 第三年：後牆往後推，蓋早餐街 ----------
function buildNorth() {
  ENV.backWall.position.z = NORTH_Z; L.bounds.minZ = -13.1; FLOORS.f1.cam[2] = -11.6;
  const tile = canvasTex(128, 128, (g) => { g.fillStyle = '#f7d9c4'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#efc8ad'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); g.strokeStyle = '#e2b796'; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); });
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(15, 6.6);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(15, 6.6), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.85 })); f.rotation.x = -Math.PI / 2; f.position.set(0, 0.004, -10.0); f.receiveShadow = true; scene.add(f);
  const tt = canvasTex(512, 96, (g, W, H) => { g.fillStyle = '#e0663a'; roundRect(g, 4, 4, W - 8, H - 8, 40); g.fill(); g.fillStyle = '#fff'; g.font = `900 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🥐 早餐街', W / 2, H / 2 + 3); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.56), new THREE.MeshBasicMaterial({ map: tt, transparent: true, depthWrite: false })); sign.rotation.x = -Math.PI / 2; sign.position.set(-2.1, 0.012, -8.4); scene.add(sign);
  for (let z = -12.9; z <= -6.9; z += 1.3) if (Math.abs(z + 9.3) > 0.9) { rbox(0.14, 0.75, 1.24, 0x3fb6a8, -7.6, 0.375, z); rbox(0.14, 0.75, 1.24, 0x3fb6a8, 7.6, 0.375, z); }
  for (const [x, t] of [[-7.4, '🚪 後門'], [7.4, '🚪 出口']]) { const l = labelSprite(t, { bg: '#2c3e57', size: 0.24 }); l.position.set(x, 1.4, -9.3); scene.add(l); }
  // 小米辦公室原本靠後牆，後牆推走了要補一面玻璃
  const O = MI_OFFICE, gl = new THREE.Mesh(new THREE.BoxGeometry(O.x1 - O.x0, 0.72, 0.03), new THREE.MeshStandardMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.32, depthWrite: false }));
  gl.position.set((O.x0 + O.x1) / 2, 0.5, O.z0); scene.add(gl); rbox(O.x1 - O.x0, 0.14, 0.08, 0x7b5cff, (O.x0 + O.x1) / 2, 0.07, O.z0);
  aabb((O.x0 + O.x1) / 2, O.z0, (O.x1 - O.x0) / 2, 0.06);
  for (const t of ['tea', 'sand', 'cake']) queueDecor(SHOPS_DEF[t]);
}

// ---------- 茶水站：兩台飲水機會慢慢被喝完，去搬桶裝水倒上去（Q1 達標後開） ----------
const WATER = { units: [[6.95, 2.95], [6.95, 3.55]], pile: [5.4, 3.25], pickup: [4.75, 3.25], drain: 75, reward: 80 };
const water = { on: false, units: [], pile: null };
const waterEmpty = () => water.units.filter(u => u.level <= 0).length;
function openWater(fancy) {
  if (water.on) return; water.on = true;
  WATER.units.forEach(([x, z], i) => {
    const look = waterLook(); look.g.position.set(x, 0, z); look.g.rotation.y = -Math.PI / 2; scene.add(look.g); if (fancy) popIn(look.g);
    const u = { look, level: i ? 0.6 : 1, at: [x - 0.62, z] }; look.setLevel(u.level); water.units.push(u);
  });
  aabb(6.95, 3.25, 0.25, 0.6);
  water.pile = jugPileLook(); water.pile.position.set(...[WATER.pile[0], 0, WATER.pile[1]]); scene.add(water.pile); aabb(WATER.pile[0], WATER.pile[1], 0.45, 0.32);
  zoneMark(WATER.pickup[0], WATER.pickup[1], 1.0, 0.9, '#9fd8ff');
  if (fancy) { toast('💧 茶水站開了！飲水機沒水要去換'); }
}
function updateWater(dt) {
  if (!water.on && (state.q >= 1 || JIE)) openWater(true);
  if (!water.on || design.finale) return;
  for (const u of water.units) { const was = u.level; u.level = Math.max(0, u.level - dt / WATER.drain); u.look.setLevel(u.level); if (was > 0 && u.level <= 0) toast('💧 飲水機沒水了！小費變少'); }
  const p = player, need = water.units.some(u => u.level < 0.9);
  if (!p.jug && need && nearAt(p.actor, WATER.pickup, 0.8)) {   // 頂一桶在頭上
    p.jug = jugMesh(); p.jug.position.y = 1.2; p.actor.root.add(p.jug); popIn(p.jug, 1); sfx.pick();
  }
  if (p.jug) for (const u of water.units) if (u.level < 0.9 && nearAt(p.actor, u.at, 0.75)) {   // 倒上去
    p.actor.root.remove(p.jug); p.jug = null; u.level = 1; u.look.setLevel(1); squash(u.look.g, 0.2);
    const val = Math.round(WATER.reward * state.yearBonus); addMoney(val); gainXp(2); sfx.answer();
    floatText(u.look.g.position.clone().setY(1.6), `咕嚕咕嚕 💧 +$${val}`, '#2f7fc4', 0.9);
    break;
  }
}

// ---------- 小米的接電話挑戰（站在總機旁邊就會出現按鈕） ----------
const miBtn = document.getElementById('miBtn');
function updateMiBtn() {
  const show = state.floor === 'f1' && phone.unlocked && !design.finale && nearAt(player.actor, PHONE_DEF.zone, 1.7);
  if (show !== (miBtn.style.display === 'block')) miBtn.style.display = show ? 'block' : 'none';
}
miBtn.onclick = () => startCallGame();
function startCallGame(fromCover = false) {
  audioInit(); state.mini = true; miBtn.style.display = 'none'; music.duck(0.3);
  openCallGame({ sfx, bests: state.miBests, onEnd: (r) => {
    if (!r) return { close: () => { state.mini = false; music.duck(1); } };   // 選關畫面直接按回去
    // 獎金：每一分＝現在總機一通價的 15%（老闆來電算 3 分），再乘年度加成；後面的關卡每分多一點（×1.3、×1.6）
    const reward = Math.round(r.score * STATIONS.phone.levels[phone.lv].price * 0.15 * [1, 1.3, 1.6][r.level] * state.yearBonus);
    addMoney(reward); state.miBests = r.bests; state.stats.calls += r.answered; save(fromCover);
    return { reward, close: () => { state.mini = false; music.duck(1); if ((r.newBest || r.unlocked >= 0) && !fromCover) banner(r.unlocked >= 0 ? `🔓 接電話第 ${r.unlocked + 1} 關開放！` : '🏆 接電話新紀錄！', `第 ${r.level + 1} 關 ${r.score} 分　獎金 +$${reward.toLocaleString()}`, 0, '#7b5cff'); } };
  } });
}
// 封面也能玩（不用先開工）
document.getElementById('coverCall').onclick = () => startCallGame(true);

// ---------- 頂樓遊樂園 ----------
const OXR = FLOORS.rf.ox, rw = ([x, z]) => [OXR + x, z];
const roof = { rides: {}, visitors: [], spawnT: 0, n: 0 };
function setupRoof() {
  buildRoof(OXR);
  for (const R of RIDES) roof.rides[R.id] = { def: R, unlocked: false, lv: 0, look: null, state: 'idle', t: 0, run: 0, wait: 0, riders: [], queue: [], cash: [], badge: null, collectT: 0 };
}
function setupRoofPads() {
  for (const r of Object.values(roof.rides)) {
    const R = r.def;
    addPad({ kind: 'unlock', floor: 'rf', at: rw(R.at), price: () => R.unlock, title: () => `${R.icon} ${R.name}`, cond: () => floorOpen(), done: () => r.unlocked,
      complete: () => { openRide(r, true); celebrate(V(OXR + R.at[0], 0, R.at[1]), `開幕！${R.icon} ${R.name}`, `一次坐 ${R.levels[0].cap} 人　門票 $${R.levels[0].ticket}`, 1, '#ff5d8f'); } });
    addPad({ kind: 'upgrade', floor: 'rf', at: rw(R.upPad), price: () => R.levels[Math.min(2, r.lv + 1)].cost, title: () => R.levels[Math.min(2, r.lv + 1)].title, cond: () => r.unlocked, done: () => r.lv >= 2,
      complete: () => { finishRide(r); r.lv++; setRideLook(r, true); const Lv = R.levels[r.lv]; celebrate(V(OXR + R.at[0], 0, R.at[1]), Lv.title, `一次坐 ${Lv.cap} 人　門票 $${Lv.ticket}`, r.lv + 1, '#ff5d8f'); } });
  }
}
function openRide(r, fancy) {
  r.unlocked = true; const R = r.def, [x, z] = rw(R.at);
  if (R.id === 'wheel') aabb(x, z, 1.4, 0.6); else if (R.id === 'train') aabb(x, z, 2.3, 1.3); else aabb(x, z, 1.3, 1.3);
  zoneMark(...rw(R.cash), 1.2, 1.0, '#7dff9a');
  setRideLook(r, fancy);
}
function setRideLook(r, fancy) {
  const R = r.def, [x, z] = rw(R.at);
  const look = rideLook(R.id, r.lv); look.g.position.set(x, 0, z); swapIn(r.look?.g, look.g, fancy); r.look = look;
  if (r.badge) scene.remove(r.badge);
  r.badge = levelBadge(R.levels[r.lv].title, r.lv, 3); r.badge.position.set(x, 0, z + (R.id === 'wheel' ? 1.0 : 0)); r.badge.userData.y = R.id === 'wheel' ? 4.7 : R.id === 'horse' ? 2.4 : 1.8; scene.add(r.badge);
}
const rideCashSlot = (r, i) => { const [x, z] = rw(r.def.cash); return V(x + ((i % 2) - 0.5) * 0.34, 0.03 + Math.floor(i / 4) * 0.045, z + ((i >> 1) % 2 - 0.5) * 0.2); };
const queueSlot = (r, i) => { const q = r.def.queue; if (i < q.length) return rw(q[i]); const l = q[q.length - 1]; return rw([l[0] + (i - q.length + 1) * 0.6, l[1] + 0.3]); };
function spawnVisitor() {
  const open = Object.values(roof.rides).filter(r => r.unlocked); if (!open.length) return;
  const r = open.sort((a, b) => a.queue.length / a.def.levels[a.lv].cap - b.queue.length / b.def.levels[b.lv].cap)[0];
  const a = makeActor(roof.n++ % 2 ? kinds.npcF : kinds.npcM, 0.95);
  const [ex, ez] = elevAt('rf'); a.root.position.set(ex + 0.3, 0, ez + (Math.random() - 0.5) * 0.6); scene.add(a.root);
  const v = { actor: a, ride: r, mode: 'queue' }; r.queue.push(v); roof.visitors.push(v);
}
// 一趟結束：乘客下來、付門票、回電梯
function finishRide(r) {
  if (!r.riders.length) { r.state = 'idle'; r.t = 0; r.run = 0; return; }
  const Lv = r.def.levels[r.lv], [ex, ez] = rw(r.def.entry);
  const total = Math.round(Lv.ticket * r.riders.length * incomeMult());
  r.riders.forEach((v, i) => {
    const root = v.actor.root; scene.attach(root); root.scale.setScalar(0.95); root.rotation.set(0, Math.PI / 2, 0);
    root.position.set(ex + (i % 3) * 0.35, 0, ez + Math.floor(i / 3) * 0.35); v.mode = 'leave';
  });
  state.stats.rides = (state.stats.rides || 0) + r.riders.length;
  if (magnetMax()) { addMoney(total); floatText(V(rw(r.def.cash)[0], 1.1, rw(r.def.cash)[1]), '+$' + total, '#22a447'); r.riders = []; r.state = 'idle'; r.t = 0; r.run = 0; r.wait = 0; return; }
  const bills = Math.min(10, Math.max(1, Math.round(total / 20))), from = V(ex, 0.8, ez);
  for (let i = 0; i < bills; i++) after(i * 0.05, () => {
    if (r.cash.length >= 60) { r.cash[r.cash.length - 1].userData.v += total / bills; return; }
    const b = makeBill(); b.position.copy(from); b.userData.v = total / bills; r.cash.push(b); track(b, () => rideCashSlot(r, r.cash.indexOf(b)));
  });
  floatText(V(...[rw(r.def.cash)[0], 1.1, rw(r.def.cash)[1]]), '+$' + total, '#22a447');
  r.riders = []; r.state = 'idle'; r.t = 0; r.run = 0; r.wait = 0;
}
function updateRoof(dt) {
  const open = Object.values(roof.rides).filter(r => r.unlocked);
  if (open.length && !design.finale) {
    const cap = open.reduce((n, r) => n + r.def.levels[r.lv].cap, 0);
    roof.spawnT += dt;
    if (roof.spawnT > Math.max(0.9, 4.2 / Math.sqrt(cap)) && roof.visitors.length < 6 + cap * 1.5) { roof.spawnT = 0; spawnVisitor(); }
  }
  for (const r of open) {
    const Lv = r.def.levels[r.lv];
    // 排隊往前走
    r.queue.forEach((v, i) => { const [x, z] = queueSlot(r, i); v.at = walkTo(v.actor, x, z, CFG.crewSpeed * 1.3, dt); if (v.at) turnTo(v.actor, Math.atan2(r.def.entry[0] + OXR - x, r.def.entry[1] - z), dt); });
    if (r.state === 'idle') {
      const ready = r.queue.filter(v => v.at).length;
      if (ready) r.wait += dt;
      if (ready && (ready >= Lv.cap || r.wait > 2.4)) {   // 上車：坐滿或等 2.4 秒就開
        const n = Math.min(Lv.cap, ready, r.look.seats.length);
        for (let i = 0; i < n; i++) {
          const v = r.queue.shift(), seat = r.look.seats[i], root = v.actor.root;
          seat.add(root); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.setScalar(r.def.id === 'cups' ? 0.6 : 0.55);
          v.actor.speed = 0; v.mode = 'ride'; r.riders.push(v);
        }
        r.state = 'run'; r.t = 0; sfx.build();
      }
    } else {
      r.t += dt; r.run = clamp01(Math.min(r.t / 0.8, (Lv.dur - r.t) / 0.8));
      if (r.t >= Lv.dur) finishRide(r);
    }
    r.look.tick(dt, r.run, state.t);
    // 收門票錢（磁鐵照樣有用）
    r.collectT += dt;
    if (magnetMax() && r.cash.length) { let v = 0; while (r.cash.length) { const b = r.cash.pop(); v += b.userData.v; untrack(b); } addMoney(v); }
    const mag = GEAR.magnet.reach[state.gear.magnet];
    if (state.floor === 'rf' && r.cash.length && r.collectT > CFG.moveEvery && nearAt(player.actor, rw(r.def.cash), Math.min(mag, 6))) {
      r.collectT = 0;
      for (let k = 0; k < 2 && r.cash.length; k++) { const b = r.cash.pop(), v = b.userData.v; retarget(b, () => player.actor.root.position.clone().setY(0.7), () => addMoney(v)); }
      sfx.coin();
    }
  }
  // 玩完的同事回電梯
  for (let i = roof.visitors.length - 1; i >= 0; i--) {
    const v = roof.visitors[i];
    if (v.mode === 'leave') { const [x, z] = elevAt('rf'); if (walkTo(v.actor, x - 0.3, z, CFG.crewSpeed * 1.4, dt)) { scene.remove(v.actor.root); roof.visitors.splice(i, 1); continue; } }
    if (v.mode !== 'ride') updateActor(v.actor, dt, state.t); else { v.actor.speed = 0; updateActor(v.actor, dt, state.t); }
  }
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---------- 2F 我的辦公室 ----------
const OXO = FLOORS.f2.ox;
const room = { owned: {}, sel: {}, objs: {}, shell: null, pet: null, boss: null, kevin: null, refund: 0 };
const comfort = () => Object.entries(room.owned).reduce((n, [slot, arr]) => n + arr.filter(i => FURN.find(f => f.slot === slot).opts[i].price > 0).length, 0);
function setupRoom() {
  const office = buildOffice(OXO); room.shell = roomShell(OXO); buildKiosk(OXO);
  for (const [x, z, hw, hd] of office.walls) aabb(OXO + x, z, hw, hd);   // 玻璃牆擋路，從門進去
  try { const d = JSON.parse(localStorage.getItem(ROOM_KEY)); if (d) { room.owned = d.owned || {}; room.sel = d.sel || {}; } } catch {}
  // v0.9：阿傑的設計室拿掉了，以前買的家具照原價退錢（開機讀完存檔後才加進錢裡）
  for (const slot of Object.keys(room.owned)) if (slot.startsWith('j_')) {
    const f = FURN_B_OLD.find(x => x.slot === slot); if (f) for (const i of room.owned[slot]) room.refund += f.opts[i]?.price || 0;
    delete room.owned[slot]; delete room.sel[slot];
  }
  roomPlate(OXO, -3.7, `🛋 ${ME.name}的辦公室`, '#ff7a45');
  const kevinOn = state.year >= 2;
  roomPlate(OXO, 3.7, kevinOn ? '🤖 特助 Kevin 辦公室' : '空辦公室', kevinOn ? '#142b45' : '#9aa3ad');
  room.kevin = buildKevinOffice(OXO, kevinOn);
  if (kevinOn) { setRoomTex(room.shell.b.floor, 'floor', 'grid'); setRoomTex(room.shell.b.back, 'wall', 'circuit'); } else { setRoomTex(room.shell.b.floor, 'floor', 'dark'); setRoomTex(room.shell.b.back, 'wall', 'navy'); }
  room.boss = buildBossOffice(OXO);
  for (const [x, z, hw, hd] of room.boss.walls) aabb(OXO + x, z, hw, hd);
  roomPlate(OXO, -1.3, '👑 Vivi 老闆辦公室', '#d9a63a', 2.2);
  const seat = buildJieSeat(OXO); for (const [x, z, hw, hd] of seat.walls) aabb(OXO + x, z, hw, hd);
  roomPlate(OXO, 5.0, JIE ? '💻 小葵的座位' : '💻 阿傑的座位', '#5b6676', 3.3);
  zoneMark(OXO + ROOM.zone[0], ROOM.zone[1], 1.2, 0.9, '#ffb47a');
  aabb(OXO + ROOM.kiosk[0], ROOM.kiosk[1], 0.65, 0.35);
  for (const f of FURN) { room.owned[f.slot] = [...new Set([0, ...(room.owned[f.slot] || [])])]; applySlot(f.slot, false); }
}
function applySlot(slot, fancy) {
  const f = FURN.find(x => x.slot === slot), i = room.sel[slot] || 0, o = f.opts[i], sh = room.shell[f.room];
  if (room.objs[slot]) { scene.remove(room.objs[slot]); room.objs[slot] = null; }
  if (slot === 'pet') room.pet = null;
  if (o.tex) setRoomTex(/floor$/.test(slot) ? sh.floor : sh.back, /floor$/.test(slot) ? 'floor' : 'wall', o.tex);
  else if (o.make) { const g = o.make(OXO); g.traverse(m => { if (m.isMesh) m.castShadow = true; }); scene.add(g); room.objs[slot] = g; if (fancy) popIn(g); if (o.pet) room.pet = g; }
}
function buyFurn(slot, i) {
  const f = FURN.find(x => x.slot === slot), o = f.opts[i], owned = room.owned[slot].includes(i);
  if (!owned) { if (state.money < o.price) return; state.money -= o.price; bumpMoney(); room.owned[slot].push(i); sfx.upgrade(); }
  else sfx.pick();
  room.sel[slot] = i; applySlot(slot, true);
  const obj = room.objs[slot], at = obj ? obj.position : V(OXO, 0, -2);
  if (!owned) { confetti(V(at.x, 1.2, at.z), 40); floatText(V(at.x, 1.6, at.z), `舒適度 +2%`, '#ff7a45', 0.8); }
  roomKey = ''; save();
}
const roomEl = document.getElementById('room'), roomList = document.getElementById('roomList');
let roomOpen = false, roomClosedHere = false, roomKey = '';
document.getElementById('roomX').onclick = () => { roomEl.classList.remove('on'); roomOpen = false; roomClosedHere = true; };
function renderRoom() {
  const key = JSON.stringify(room.sel) + JSON.stringify(room.owned) + '|' + Math.floor(state.money / 100);
  if (key === roomKey) return; roomKey = key;
  document.getElementById('roomComfort').textContent = `舒適度 +${comfort() * 2}%`;
  const roomName = { a: `🛋 ${ME.name}的辦公室（只有這間可以自己布置）` };
  roomList.innerHTML = FURN.map((f, k) => (k === 0 || FURN[k - 1].room !== f.room ? `<div class="hdr">${roomName[f.room]}</div>` : '') + `<div class="sec">${f.name}</div><div class="opts">` + f.opts.map((o, i) => {
    const own = room.owned[f.slot].includes(i), on = (room.sel[f.slot] || 0) === i;
    return `<button data-s="${f.slot}" data-i="${i}" class="${on ? 'on' : own ? 'own' : ''}" ${!own && state.money < o.price ? 'disabled' : ''}>${o.name}<small>${on ? '使用中' : own ? '換這個' : '$' + o.price.toLocaleString()}</small></button>`;
  }).join('') + '</div>').join('');
  roomList.querySelectorAll('button[data-s]').forEach(b => b.onclick = (e) => { e.stopPropagation(); audioInit(); buyFurn(b.dataset.s, +b.dataset.i); renderRoom(); });
}
function updateRoom() {
  if (state.floor !== 'f2') { if (roomOpen) { roomOpen = false; roomEl.classList.remove('on'); } return; }
  const near = nearAt(player.actor, [OXO + ROOM.zone[0], ROOM.zone[1]], 0.85);
  if (near && !roomOpen && !roomClosedHere) { roomOpen = true; roomKey = ''; roomEl.classList.add('on'); }
  if (!near) { roomClosedHere = false; if (roomOpen) { roomOpen = false; roomEl.classList.remove('on'); } }
  if (roomOpen) renderRoom();
}
// 寵物在地毯附近晃來晃去；設計室的設備會動（全息投影轉、機櫃燈閃）
function updatePet(dt) {
  if (state.floor === 'f2') { for (const o of Object.values(room.objs)) if (o && o.userData.tick) o.userData.tick(dt, state.t); room.boss?.tick(dt, state.t); room.kevin?.tick(dt, state.t); }
  const p = room.pet; if (!p) return;
  p.userData.t = (p.userData.t || 0) + dt;
  const t = p.userData.t, x = OXO + ROOM.petAt[0] + Math.sin(t * 0.4) * 1.4, z = ROOM.petAt[1] + Math.sin(t * 0.27) * 0.7;
  const dx = x - p.position.x, dz = z - p.position.z; if (Math.hypot(dx, dz) > 1e-4) p.rotation.y = Math.atan2(dx, dz);
  p.position.set(x, Math.abs(Math.sin(t * 6)) * 0.05, z);
}

// ======================================================================
// 存檔（瀏覽器本機）：每 5 秒、離開頁面時存
// ======================================================================
// 三格存檔：第 1 格沿用原本的鍵（舊存檔不用搬），第 2、3 格加 -s2／-s3；阿傑模式各格另存一份（-jie）
// 往年回顧：另一組鍵（-replay），玩到的東西不寫回主線
const SLOT_KEY = 'office-apocalypse-slot', REPLAY_KEY = 'office-apocalypse-replay';
const SLOT = (() => { try { const n = +localStorage.getItem(SLOT_KEY); return n >= 1 && n <= 3 ? n : 1; } catch { return 1; } })();
const REPLAY = (() => { try { return +sessionStorage.getItem(REPLAY_KEY) || 0; } catch { return 0; } })();   // 回顧第幾年（0＝主線）
const slotSuf = (n, jie = JIE) => (jie ? '-jie' : '') + (n > 1 ? '-s' + n : '');
const SUF = REPLAY ? (JIE ? '-jie' : '') + '-replay' : slotSuf(SLOT);
const KEYS = (suf) => ['office-apocalypse-save-v1' + suf, 'office-apocalypse-year' + suf, 'office-apocalypse-room' + suf];
const [SAVE_KEY, YEAR_KEY, ROOM_KEY] = KEYS(SUF);   // ROOM：2F 家具，搬新辦公室也跟著走，不跟年度一起清
let saveT = 0, noSave = false;   // 搬家／重來時關掉存檔，免得離開頁面時又把舊進度寫回去
function save(force = false) {
  if (!player || design.finale || (!state.started && !force) || noSave) return;   // force：封面玩小米挑戰拿到的獎金也要存   // 還在封面沒開工就不存（不然第一次玩的開場對話會被跳過）
  const data = {
    v: 1, at: Date.now(), money: state.money, xp: state.xp, rank: state.rank, earned: state.earned, q: state.q, finaleDone: state.finaleDone,
    gear: state.gear, decor: state.decor, stats: state.stats, miBests: state.miBests,
    shops: Object.fromEntries(Object.values(shops).map(s => [s.type, { unlocked: s.unlocked, lv: s.lv }])),
    phone: { unlocked: phone.unlocked, lv: phone.lv }, hires: Object.keys(hires),
    roof: Object.fromEntries(Object.values(roof.rides).map(r => [r.def.id, { u: r.unlocked, lv: r.lv }])),
  };
  try { localStorage.setItem(ROOM_KEY, JSON.stringify({ owned: room.owned, sel: room.sel })); } catch {}
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}
function loadYear() {
  if (REPLAY) { state.year = REPLAY; state.yearBonus = 1 + (REPLAY - 1) * 0.25; return; }   // 回顧：那一年的加成
  try { const y = JSON.parse(localStorage.getItem(YEAR_KEY)); if (y && y.year > 1) { state.year = y.year; state.yearBonus = y.bonus; } } catch {}
}
// ---------- 存檔面板：三格存檔＋往年回顧 ----------
let theater = null;   // 小劇場（開機載完角色後建立）
const YEAR_INFO = {
  1: ['破茶水間', '咖啡、影印、販賣機、員工餐廳、電話總機'],
  2: ['電梯與頂樓', '2F 辦公室、頂樓遊樂園，特助 Kevin 出現'],
  3: ['早餐街', '後牆打通三攤、PM 小燕急件、業務黑輪'],
  4: ['綠茶三人組', '茶茶、阿強、學姊入職（製作中）'],
  5: ['遞辭呈之年', '尾牙可以選擇離職（製作中）'],
};
const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
function slotInfo(n, jie = false) {
  const [sk, yk] = KEYS(slotSuf(n, jie)), d = readJSON(sk), y = readJSON(yk);
  if (!d && !y) return null;
  return { year: y?.year || 1, q: d?.q || 0, rank: d?.rank || 0, money: d?.money || 0, at: d?.at || 0 };
}
const savesEl = document.getElementById('saves');
const SKIP_SPLASH = 'office-apocalypse-skip-splash';   // 遊戲裡重新載入（換存檔、回標題、換角色）不再看 START
function goReload(hash = '') { save(); noSave = true; try { sessionStorage.setItem(SKIP_SPLASH, '1'); } catch {} history.replaceState(null, '', location.pathname + hash); location.reload(); }
function switchSlot(n) { try { localStorage.setItem(SLOT_KEY, n); sessionStorage.removeItem(REPLAY_KEY); } catch {} goReload(); }
function startReplay(y) {
  try {
    for (const k of KEYS((JIE ? '-jie' : '') + '-replay')) localStorage.removeItem(k);
    const room = localStorage.getItem(ROOM_KEY); if (room && !REPLAY) localStorage.setItem('office-apocalypse-room' + (JIE ? '-jie' : '') + '-replay', room);   // 家具借主線的來看
    sessionStorage.setItem(REPLAY_KEY, y);
  } catch {}
  goReload(JIE ? '#jie' : '');
}
function endReplay() { try { sessionStorage.removeItem(REPLAY_KEY); } catch {} goReload(JIE ? '#jie' : ''); }
function openSaves(tab = 'slots') {
  savesEl.classList.add('on'); renderSaves(tab);
}
function renderSaves(tab) {
  const body = document.getElementById('savesBody');
  document.getElementById('tabSlots').className = 'a4btn' + (tab === 'slots' ? ' main' : '');
  document.getElementById('tabYears').className = 'a4btn' + (tab === 'years' ? ' main' : '');
  document.getElementById('savesTitle').textContent = tab === 'slots' ? '🗂 存檔' : '📼 往年回顧';
  const fmt = (t) => { if (!t) return ''; const d = new Date(t); return `上次 ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  if (tab === 'slots') {
    let h = REPLAY ? `<p class="a4note">📼 正在回顧第 ${REPLAY} 年（不會覆蓋主線）</p><button class="a4btn red" data-act="endReplay">⏹ 結束回顧，回主線</button>` : '';
    for (let n = 1; n <= 3; n++) {
      const k = slotInfo(n), j = slotInfo(n, true), cur = n === SLOT && !REPLAY;
      if (!k && !j) { h += `<button class="slot empty" data-tag="檔案 0${n}" data-act="new" data-n="${n}">＋ 開新檔</button>`; continue; }
      const m = k || j, who = k ? ['小葵', 'kui'] : ['阿傑', 'jie'];
      h += `<div class="slot${cur ? ' cur' : ''}" data-tag="檔案 0${n}"><div class="pic" style="background-image:url(icons/${who[1]}-180.png)"></div><div class="tx"><b>${who[0]}</b>
        <span>第 ${m.year} 年　${m.q >= 4 ? '全年達標' : 'Q' + (m.q + 1)}　Lv${m.rank + 1} ${RANKS[m.rank].title}</span><span class="money">$${m.money.toLocaleString()}</span>
        ${k && j ? `<small>阿傑：第 ${j.year} 年</small> ` : ''}<small>${fmt(Math.max(k?.at || 0, j?.at || 0))}</small></div>${cur ? '<div class="stamp">使用中</div>' : ''}</div>
        <div class="slot-acts">${cur ? '' : `<button class="a4btn main" data-act="load" data-n="${n}">▶ 切換到這格</button>`}<button class="a4btn ghost" data-act="del" data-n="${n}">🗑 刪除</button></div>`;
    }
    body.innerHTML = h + '<p class="a4note">每一格是一輪獨立的公司人生：年份、錢、裝潢、小葵和阿傑各自的進度都分開存。</p>';
  } else {
    const main = REPLAY ? (readJSON(KEYS(slotSuf(SLOT))[1])?.year || 1) : state.year;
    let h = REPLAY ? `<p class="a4note">📼 正在回顧第 ${REPLAY} 年</p><button class="a4btn red" data-act="endReplay">⏹ 結束回顧，回主線</button>` : '';
    h += '<div class="years">';
    for (let n = 1; n <= Math.max(main + 1, 5); n++) {
      const [name, desc] = YEAR_INFO[n] || ['年度主題', '每年一個新規則（製作中）'], lock = n > main;
      h += `<div class="yr${lock ? ' lock' : ''}" data-n="${n}"><b>第 ${n} 年　${name}${n === 5 ? ' <span class="star">★</span>' : ''}</b><small>${lock ? '🔒 還沒玩到' : desc}</small>
        ${lock ? '' : `<div class="a4row"><button class="a4btn" data-act="clip" data-n="${n}" ${n === 1 || yearScript(n) ? '' : 'disabled'}>▶ ${n === 1 || yearScript(n) ? '看短片' : '短片製作中'}</button><button class="a4btn main" data-act="replay" data-n="${n}">📖 回顧遊玩</button></div>`}</div>`;
    }
    body.innerHTML = h + '</div><p class="a4note">回顧遊玩：從那一年的開頭重玩（加成照那年算），不會覆蓋主線存檔，賺到的錢也不會帶回主線。</p>';
  }
  body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const n = +b.dataset.n, act = b.dataset.act;
    if (act === 'new' || act === 'load') switchSlot(n);
    else if (act === 'del') {
      if (!confirm(`確定要刪除檔案 0${n}？小葵和阿傑在這格的進度都會清掉。`) || !confirm('真的要刪嗎？刪掉就救不回來了。')) return;
      try { for (const j of [false, true]) for (const k of KEYS(slotSuf(n, j))) localStorage.removeItem(k); } catch {}
      if (n === SLOT && !REPLAY) { noSave = true; location.reload(); } else renderSaves('slots');
    }
    else if (act === 'replay') startReplay(n);
    else if (act === 'endReplay') endReplay();
    else if (act === 'clip') {
      savesEl.classList.remove('on');
      if (n === 1) playIntro(state.started ? null : showCover);
      else { const cover = document.getElementById('cover'), onCover = !state.started; if (onCover) cover.style.display = 'none'; theater.play(yearScript(n, { bonus: 1 + (n - 1) * 0.25 })).then(() => { if (onCover) showCover(); }); }
    }
  });
}
document.getElementById('tabSlots').onclick = () => renderSaves('slots');
document.getElementById('tabYears').onclick = () => renderSaves('years');
function loadSave() {
  let d = null; try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
  if (!d || d.v !== 1) return false;
  Object.assign(state, { money: d.money, xp: d.xp, rank: d.rank, earned: d.earned, q: d.q, finaleDone: d.finaleDone });
  Object.assign(state.gear, d.gear); state.decor = d.decor || []; Object.assign(state.stats, d.stats); state.miBests = d.miBests || [d.miBest || 0, 0, 0];   // 舊存檔只有第 1 關的紀錄
  for (const s of Object.values(shops)) {
    const o = d.shops?.[s.type]; if (!o) continue;
    if (o.unlocked && !s.unlocked) openShop(s, false);
    if (o.lv) { s.lv = o.lv; setLook(s, s.lv, false); }
  }
  if (d.phone?.unlocked) { openPhone(); if (d.phone.lv) { phone.lv = d.phone.lv; setPhoneLook(phone.lv, false); } }
  for (const id of d.hires || []) { const h = HIRES.find(x => x.id === id); if (h) hire(h, true); }
  for (const r of Object.values(roof.rides)) { const o = d.roof?.[r.def.id]; if (o?.u) { r.lv = o.lv || 0; openRide(r, false); } }
  if (state.q >= 1) { openKiosk(false); openWater(false); }
  state.decor.forEach(id => placeDecor(DECOR.find(x => x.id === id), false));
  return true;
}
function updateSave(dt) { saveT += dt; if (saveT > 5) { saveT = 0; save(); } }
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------- 主迴圈 ----------
let camFocus = null, metaT = 0;
function update(dt) {
  state.t += dt; runLater();
  for (const s of Object.values(shops)) { produce(s, dt); updateCustomers(s, dt); }
  updatePhone(dt);
  if (design.finale) { updateActor(player.actor, dt, state.t); Object.values(hires).forEach(h => { h.actor.speed = 0; updateActor(h.actor, dt, state.t); }); if (design.kevinDown) updateActor(design.kevinDown, dt, state.t); if (stage) stage.tick(dt, state.t); }   // 尾牙：大家站在台上
  else { updatePlayer(dt); updateHires(dt); updatePads(dt); updateKiosk(); updateElevator(); updateRoom(); updateMiBtn(); }
  updateRoof(dt); updatePet(dt); updateWater(dt);
  updateItems(dt); updateFx(dt); updateGuide(); updateHud(dt); updateKevin(dt); if (yan && !design.finale) updateYan(dt); if (heilun && !design.finale) updateHeilun(dt); if (cai && !design.finale) updateCaishen(dt); updateEvents(); updateSave(dt);
  metaT += dt; if (metaT > 0.25) { metaT = 0; updateYear(); }
  for (const b of [...Object.values(shops).map(s => s.badge), phone.badge, ...Object.values(roof.rides).map(r => r.badge)]) if (b) b.position.y = b.userData.y + Math.sin(state.t * 2) * 0.04;
}
// ---------- 畫質：自動模式下，開玩後每 3 秒算一次幀率，連兩次低於 40 就切成「流暢」 ----------
const fpsMon = { wait: 2, t: 0, n: 0, bad: 0 };
function watchFps(dt) {
  if (quality.pref !== 'auto' || quality.level === 'low' || !state.started || state.mini || document.hidden || dt > 0.25) return;
  if ((fpsMon.wait -= dt) > 0) return;
  fpsMon.t += dt; fpsMon.n++;
  if (fpsMon.t < 3) return;
  const fps = fpsMon.n / fpsMon.t; fpsMon.t = fpsMon.n = 0;
  fpsMon.bad = fps < 40 ? fpsMon.bad + 1 : 0;
  if (fpsMon.bad >= 2) { setQuality('low'); updateQBtn(); toast('畫面有點卡，已切換成「流暢」畫質'); }
}
const qBtn = document.getElementById('qBtn'), Q_NAME = { auto: '自動', high: '漂亮', low: '流暢' };
function updateQBtn() { qBtn.textContent = `🎨 畫質：${Q_NAME[quality.pref]}` + (quality.pref === 'auto' ? `（現在${Q_NAME[quality.level]}）` : ''); }
qBtn.onclick = () => { setQualityPref({ auto: 'high', high: 'low', low: 'auto' }[quality.pref]); fpsMon.bad = 0; updateQBtn(); };

// ---------- 片頭 ----------
const INTRO_KEY = 'office-apocalypse-intro-seen';
let intro = null;
// after：播完要做什麼（開工／回封面／回到遊戲）。按「打卡上班」才播，順便拿到播音效的許可
function playIntro(after) {
  const cover = document.getElementById('cover'), hud = document.getElementById('hud'); cover.style.display = 'none'; hud.style.visibility = 'hidden';
  player.actor.root.visible = false; audioInit(); music.duck(0, 0.4);
  intro = makeIntro({ THREE, scene, camera, render, sun, kinds, makeActor, addJog, updateActor, jugMesh, cartLook, rbox, sfx, onDone: () => {
    intro = null; player.actor.root.visible = true; hud.style.visibility = '';
    try { localStorage.setItem(INTRO_KEY, '1'); } catch {}
    if (location.hash.includes('intro')) history.replaceState(null, '', location.pathname + (JIE ? '#jie' : ''));
    updateCamera(camFocusOf(player.actor.root.position), 1);
    music.duck(1, 1.2);
    after && after();
  } });
}
function showCover() { const c = document.getElementById('cover'); c.style.display = ''; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); music.play('title'); }

// ---------- 選單：遊戲裡隨時可以暫停、調音效畫質、玩接電話挑戰、換角色、搬家、存檔回標題 ----------
const menuEl = document.getElementById('menu');
function openMenu() {
  if (!state.started || design.finale || state.mini || state.talking || menuEl.classList.contains('on')) return;
  audioInit(); sfx.pick?.(); state.paused = true; save(); renderMenu(); menuEl.classList.add('on'); music.duck(0.35);
}
function closeMenu() { state.paused = false; menuEl.classList.remove('on'); music.duck(1); }
const volTxt = () => music.vol <= 0 ? '關' : Math.round(music.vol * 100) + '%';
function renderMenu() {
  document.getElementById('menuInfo').textContent = `第 ${state.year} 年　${state.q >= 4 ? '全年達標' : 'Q' + (state.q + 1)}　・已自動存檔`;
  const items = [
    ['resume', '▶ 繼續上班', 'main'],
    ['sound', isMuted() ? '🔇 音效：關（點一下打開）' : '🔊 音效：開（點一下關掉）'],
    ['quality', qBtn.textContent],
    ['music', `🎵 音樂音量：${volTxt()}`],
    ['call', '📞 小米的接電話挑戰'],
    ['intro', '🎬 重看片頭'],
    ['saves', '🗂 存檔／往年回顧'],
    ...(REPLAY ? [['endReplay', `⏹ 結束回顧第 ${REPLAY} 年`, 'move']] : [['swap', JIE ? '🙋 存檔，換回小葵' : '😎 存檔，換阿傑老鳥']]),
    ...(yearEl.classList.contains('done') ? [['move', moveBtn.textContent, 'move']] : []),
    ['title', '🏠 存檔，回到標題畫面', 'out'],
  ];
  const list = document.getElementById('menuList');
  list.innerHTML = items.map(([k, t, c]) => `<button data-k="${k}" class="${c || ''}">${t}</button>`).join('');
  list.querySelectorAll('button').forEach(b => b.onclick = () => menuAction(b.dataset.k));
}
function menuAction(k) {
  if (k === 'resume') closeMenu();
  else if (k === 'sound') { setMuted(!isMuted()); renderMenu(); sfx.pick?.(); }
  else if (k === 'quality') { qBtn.onclick(); renderMenu(); }
  else if (k === 'music') { const L = [0, 0.3, 0.6, 1]; music.setVol(L[(L.findIndex(v => v >= music.vol - 0.01) + 1) % L.length]); renderMenu(); }
  else if (k === 'call') { closeMenu(); startCallGame(); }
  else if (k === 'intro') { closeMenu(); save(); playIntro(); }
  else if (k === 'saves') { closeMenu(); save(); openSaves('slots'); }
  else if (k === 'endReplay') endReplay();
  else if (k === 'swap') swapMode();
  else if (k === 'move') { closeMenu(); moveBtn.click(); }
  else if (k === 'title') goReload(JIE ? '#jie' : '');   // 存好檔重新載入回到封面（封面的「打卡上班」接著玩）
}
document.getElementById('menuBtn').onclick = (e) => { e.stopPropagation(); openMenu(); };
menuEl.onpointerdown = (e) => { if (e.target === menuEl) closeMenu(); };   // 點外面＝繼續
addEventListener('keydown', (e) => { if (e.key === 'Escape') menuEl.classList.contains('on') ? closeMenu() : openMenu(); });
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);   // 先排下一幀，這幀出錯也不會停住
  if (G.hold) { last = now; return; }   // 錄影用：由 G.tick 一格一格推
  watchFps((now - last) / 1000);
  const dt = Math.min((now - last) / 1000, 0.05) * (G.speedUp || 1); last = now;
  if (intro) { try { intro.step(dt); render(); } catch (err) { console.error(err); intro?.skip(); } return; }   // 片頭播放中：只跑片頭
  try {
    if (state.started && !state.mini && !state.paused) update(dt);   // 玩小米的挑戰、開選單時主遊戲暫停
    const p = player ? player.actor.root.position : V(L.start[0], 0, L.start[1]);
    updateCamera(camFocus || camFocusOf(p), dt);
    render();
    if (theater?.active) theater.update(dt, now / 1000);   // 小劇場：畫在紙框挖空那一塊
  } catch (err) { console.error(err); }
}

// ---------- 擋掉誤觸放大與選取 ----------
(function noZoomNoSelect() {
  const stop = e => e.preventDefault();
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'selectstart', 'dragstart', 'contextmenu']) document.addEventListener(ev, stop, { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  let lastT = 0;
  document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastT < 320) e.preventDefault(); lastT = n; }, { passive: false });
  addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
  addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault(); });
})();

// ---------- 開始 ----------
const G = window.G = {
  renderer, post, state, shops, phone, pads, hires, carriers, colliders, design, CFG, L, force: null, speedUp: 1,
  get player() { return player; }, give(n) { state.money += n; }, cam,
  look(x, z) { cam.target.set(x, 0, z); if (player) player.actor.root.position.set(x, 0, z + 1.2); },
  step(dt, n = 1) { for (let i = 0; i < n; i++) update(dt); },
  KIOSK, buy, shopItems, startFinale, endFinale, save, get kiosk() { return kiosk; },
  // 錄影用：G.hold = true 後，G.tick(dt) 推一格（更新＋鏡頭＋畫）；G.camAt = [x, z] 可指定鏡頭看哪裡
  tick(dt) {
    if (state.started && !state.mini) update(dt);   // 玩小米的挑戰時主遊戲暫停
    const p = player.actor.root.position;
    updateCamera(G.camAt ? V(G.camAt[0], 0, G.camAt[1]) : camFocus || camFocusOf(p), dt);
    render();
    if (theater?.active) theater.update(dt, state.t);
  },
  playCall: () => miBtn.onclick(),
  introTick(dt) { if (intro) { intro.step(dt); render(); } return !!intro; },   // 錄片頭用
  get water() { return water; }, WATER, music, get theater() { return theater; }, yearScript, autoTheater: false,
  goFloor: (f) => goFloor(f), get floor() { return state.floor; }, roof: () => roof, room: () => room, buyFurn: (s, i) => buyFurn(s, i),
  event(n) { ({ vip: eventVip, rush: eventRush, birthday: eventBirthday, kevin: spawnKevin, yan: eventYan, heilun: eventHeilun, caishen: eventCaishen })[n](); }, get kevin() { return kevin; }, get cai() { return cai; }, get yan() { return yan; }, get heilun() { return heilun; },
};   // 除錯用
(async () => {
  const btn = document.getElementById('start');
  try {
    const urls = { kui: 'models/kui_walk2.glb', kuiJog: 'models/kui_jog.glb', npcM: 'models/npc_m_walk.glb', npcF: 'models/npc_f_walk.glb', jie: 'models/jie_walk.glb', jieJog: 'models/jie_jog.glb', mi: 'models/mi_walk.glb', vivi: 'models/vivi_walk.glb', kevin: 'models/kevin_walk.glb' };
    const ks = await Promise.all(Object.entries(urls).map(async ([k, u]) => [k, await loadKind(u)]));
    kinds = Object.fromEntries(ks);
  } catch (e) { btn.textContent = '載入失敗，請重新整理'; console.error(e); window.bootFail?.('角色模型下載失敗', '網路可能不穩，重新整理再試一次。（' + (e.message || e) + '）'); return; }
  if (/[?&]fresh/.test(location.search)) { try { for (const j of ['', '-jie']) for (const t of ['', '-s2', '-s3', '-replay']) for (const k of KEYS(j + t)) localStorage.removeItem(k); localStorage.removeItem(SLOT_KEY); sessionStorage.removeItem(REPLAY_KEY); } catch {} }   // 測試用：網址加 ?fresh 三格存檔、兩個角色都清掉
  loadYear();
  theater = makeTheater({ THREE, renderer, kinds, makeActor, updateActor, addJog, rbox, canvasTex, sfx,
    onOpen: () => { state.paused = true; music.duck(0.5); document.getElementById('hud').style.visibility = 'hidden'; },   // 框框挖空的地方會透出底下的 HUD，演出時先藏起來
    onClose: () => { if (!menuEl.classList.contains('on')) state.paused = false; music.duck(1); document.getElementById('hud').style.visibility = ''; } });
  music.load('title', 'audio/bgm_title.m4a?v=0.9.0'); music.load('office', 'audio/bgm_office.m4a?v=0.9.0'); music.play('title');   // 瀏覽器要先點一下才能出聲：封面點任何地方就開始
  loadKind('models/caishen_sit.glb').then(v => { kinds.caishen = v; }).catch(() => {});
  if (state.year >= 3) for (const k of ['yan', 'heilun']) loadKind(`models/${k}_walk.glb`).then(v => { kinds[k] = v; }).catch(() => {});
  // 新辦公室：每一年換一點顏色（木地板色調、餐廳地磚、隔板）
  const TH = [null, { wood: 0xffc9b8, cafe: 0xe4dcff, part: 0xff8a5c }, { wood: 0xcfe8ff, cafe: 0xfff0c2, part: 0x7b5cff }, { wood: 0xd8ffd0, cafe: 0xffd9ec, part: 0x2f7fc4 }][(state.year - 1) % 4];
  if (TH) { ENV.work.material.color.setHex(TH.wood); ENV.cafe.material.color.setHex(TH.cafe); mat(0x3fb6a8).color.setHex(TH.part); }
  for (const t of ['coffee', 'printer', 'vending', 'beef', 'chicken', 'fish']) makeShop(t);
  if (state.year >= 3) { buildNorth(); for (const t of ['tea', 'sand', 'cake']) makeShop(t); }
  setupRoof(); setupRoom();
  const a = addJog(makeActor(kinds[ME.icon], 1), kinds[ME.icon + 'Jog']);
  a.root.position.set(L.start[0], 0, L.start[1]); a.root.rotation.y = Math.PI; scene.add(a.root);
  player = { actor: a, carry: [], type: null, carryMax: rankCarry(0), moveT: 0 };
  carriers.push(player);
  cam.target.set(L.start[0], 0, L.start[1]);
  const loaded = loadSave();
  if (room.refund) { state.money += room.refund; after(1.5, () => toast(`阿傑的設計室家具已退錢 +$${room.refund.toLocaleString()}`)); save(true); }
  if (JIE) {   // 老鳥模式：職等、裝備全滿，店全開，小葵已經坐在設計部
    state.rank = RANKS.length - 1;
    for (const k in GEAR) state.gear[k] = GEAR[k].price.length;
    for (const s of Object.values(shops)) if (!s.unlocked) openShop(s, false);
    if (!phone.unlocked) openPhone();
    if (!hires.jie) hire(HIRES.find(h => h.id === 'jie'), true);
    openKiosk(false);
  }
  if (!loaded && state.year >= 3) for (const id of ['worker', 'worker2']) if (!hires[id]) hire(HIRES.find(h => h.id === id), true);   // 第三年起：工讀生直接來報到，咖啡和影印交給他們
  document.querySelector('#me .face').style.backgroundImage = `url(icons/${ME.icon}-180.png)`;
  player.carryMax = carryMaxNow(); setCart();
  setupPads(); updateMe(); shownMoney = state.money; moneyEl.textContent = state.money.toLocaleString();
  for (let i = 0; i < 3; i++) spawnCustomer(shops.coffee);
  window.bootOk?.(); updateQBtn(); document.getElementById('coverCall').disabled = false;
  // 封面員工證：誰、職稱、第幾年、哪一格存檔
  document.getElementById('idPic').style.backgroundImage = `url(icons/${ME.icon}-180.png)`;
  document.getElementById('idName').textContent = ME.name;
  document.getElementById('idRank').textContent = (JIE ? '設計部老鳥・' : '') + RANKS[state.rank].title;
  document.getElementById('idYear').textContent = `第 ${state.year} 年` + (REPLAY ? '（回顧）' : '');
  document.getElementById('idNo').textContent = `NO. A4-${String(SLOT).padStart(2, '0')}${JIE ? 'J' : 'K'}${String(state.year).padStart(2, '0')}`;
  btn.disabled = false; document.getElementById('startTxt').textContent = '打卡上班 ▶';
  document.getElementById('startSub').textContent = REPLAY ? `往年回顧・第 ${REPLAY} 年` : loaded ? `繼續第 ${state.year} 年・${state.q >= 4 ? '全年達標' : 'Q' + (state.q + 1)}` : state.year > 1 ? `第 ${state.year} 年，新辦公室開工` : '新人報到第一天';
  const startGame = () => {
    document.getElementById('cover').style.display = 'none'; state.started = true; music.play('office');
    if (REPLAY && !loaded) banner(`📼 往年回顧：第 ${state.year} 年`, '不會覆蓋主線存檔', 0, '#142b45');
    else if (state.year > 1 && !loaded) {   // 新年度：先演開場小劇場（今年哪裡不一樣），再出加成橫幅
      const sc = yearScript(state.year, { bonus: state.yearBonus });
      const bn = () => banner(`🏢 第 ${state.year} 年：新辦公室！`, `所有收入永久 ×${state.yearBonus.toFixed(2)}` + (state.year >= 3 ? '　兩個工讀生直接報到' : ''), 0, '#2fb27a');
      if (sc && theater) theater.play(sc).then(bn); else bn();
    }
    else if (!loaded && location.hash !== '#play') talk(JIE ? JIE_INTRO : INTRO);   // 第一次玩：打招呼、說明玩法
  };
  btn.onclick = () => {   // 打卡：蓋章 → 第一次播片頭（這一下也解鎖音效）→ 開工
    audioInit(); const st = document.getElementById('idStamp'); st.innerHTML = '09:00<br>已打卡'; st.classList.add('ok'); sfx.drop?.();
    let seen = false; try { seen = localStorage.getItem(INTRO_KEY) === '1'; } catch {}
    if (seen || location.hash === '#play') startGame(); else { music.stop(0.5); playIntro(startGame); }
  };
  // 封面的設定、存檔
  const setEl = document.getElementById('settings'), muteBtn = document.getElementById('muteBtn');
  const muteTxt = () => { muteBtn.textContent = isMuted() ? '🔇 音效：關' : '🔊 音效：開'; };
  document.getElementById('setBtn').onclick = () => { muteTxt(); updateQBtn(); setEl.classList.add('on'); };
  muteBtn.onclick = () => { setMuted(!isMuted()); muteTxt(); audioInit(); sfx.pick?.(); };
  const volIn = document.getElementById('musicVol'), volOut = document.getElementById('musicVolTxt');
  volIn.value = Math.round(music.vol * 100); volOut.textContent = volTxt();
  volIn.oninput = () => { audioInit(); music.setVol(volIn.value / 100); volOut.textContent = volTxt(); };
  document.getElementById('cover').addEventListener('pointerdown', () => audioInit());   // 封面第一次點擊：解鎖聲音，標題曲開始
  document.getElementById('introBtn').onclick = () => { setEl.classList.remove('on'); playIntro(showCover); };
  document.getElementById('saveBtn').onclick = () => openSaves('slots');
  for (const el of [setEl, savesEl]) { el.onpointerdown = (e) => { if (e.target === el) el.classList.remove('on'); }; el.querySelector('[data-x]').onclick = () => el.classList.remove('on'); }
  if (REPLAY) document.getElementById('swapHud').style.display = 'none';
  // 換角色按鈕：封面一顆、遊戲裡一顆
  const swap = document.getElementById('swap'), swapHud = document.getElementById('swapHud');
  swap.textContent = JIE ? '🌻 換小葵' : '😎 換阿傑老鳥'; swap.onclick = swapMode; swap.disabled = !!REPLAY;
  swapHud.textContent = JIE ? '💾 存檔離開・換小葵' : '😎 換阿傑'; swapHud.onclick = swapMode;
  let go = false; try { go = sessionStorage.getItem(GO_KEY) === '1'; sessionStorage.removeItem(GO_KEY); } catch {}
  // 開場 START：第一次開才有；點了才進標題（識別證掉下來），這一下也解鎖音效、開始放標題曲
  const splash = document.getElementById('splash'), splashBtn = document.getElementById('splashBtn');
  let skipSplash = false; try { skipSplash = sessionStorage.getItem(SKIP_SPLASH) === '1'; sessionStorage.removeItem(SKIP_SPLASH); } catch {}
  const enterTitle = (anim = true) => {
    splash.classList.add('out'); setTimeout(() => { splash.style.display = 'none'; }, 460);
    const c = document.getElementById('cover'); c.classList.remove('enter'); void c.offsetWidth; if (anim) { c.classList.add('enter'); setTimeout(() => sfx.drop?.(), 700); }
  };
  if (location.hash === '#play' || go) { splash.style.display = 'none'; startGame(); }
  else if (location.hash.includes('intro')) { splash.style.display = 'none'; playIntro(showCover); }   // 錄片頭用：網址 #intro 直接播
  else if (skipSplash) enterTitle(false);
  else {
    splashBtn.disabled = false; splashBtn.textContent = '▶ START'; document.getElementById('splashTip').textContent = '點一下開始上班';
    splash.onclick = () => { audioInit(); sfx.pick?.(); enterTitle(); };
  }
})();
requestAnimationFrame(frame);
