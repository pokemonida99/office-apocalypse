// 上班啟示錄 v0.3：新人小葵在辦公室打雜升級
// 咖啡機／印表機：做貨 → 背去櫃台 → 同事排隊付錢；販賣機、員工餐廳（牛／雞／魚）：搬進貨去補貨 → 同事來買
// 電話總機：站著接電話賺錢。設施會升級（咖啡機、印表機 Lv5＝產線），小葵靠經驗升職，還能請人幫忙
import * as THREE from 'three';
import { scene, camera, renderer, post, render, updateCamera, cam, V, rbox, box, cyl, sphere, mat, canvasTex, roundRect, FONT, labelSprite } from './world.js?v=0.3.0';
import { updateFx, floatText, popIn, squash, confetti, pillar, shockwave, sparkle, puff, camKick, toast, banner, sfx, audioInit } from './fx.js?v=0.3.0';
import { STATIONS, LOOKS, ITEM_H, ICON, makeItem, makeBill, buildBelt, levelBadge, stallLook, vendingLook, sourceLook, deskLook } from './stations.js?v=0.3.0';
import { loadKind, makeActor, updateActor, walkTo, turnTo, addJog } from './assets.js?v=0.3.0';

const VERSION = 'v0.3.0';

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
const rankSpeed = (r) => 2.35 + r * 0.09;

// ---------- 場景配置（x 往右、z 往鏡頭） ----------
// 北邊：咖啡機、印表機、電話總機；東邊：販賣機；中間：請人格子、設計部；南邊：員工餐廳三攤
const L = {
  bounds: { minX: -7.2, maxX: 7.2, minZ: -6.5, maxZ: 10.6 },
  elevator: [-7.0, -0.6], exit: [7.0, 2.6], start: [-2.2, -3.6],
};
const foodShop = (x, upX) => ({
  source: [x, 9.9], srcRot: Math.PI, pickup: [x, 9.05], counter: [x, 6.8], rot: Math.PI, drop: [x, 7.85], cash: [x + 1.6, 7.85],
  queue: [[x, 5.75], [x, 5.05], [x, 4.35], [x + 0.7, 4.35], [x + 1.4, 4.35]], upPad: [upX, 8.9], unlockPad: [x, 7.85],
});
const SHOPS_DEF = {
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
const PHONE_DEF = { desk: [5.4, -5.6], zone: [5.4, -4.2], upPad: [3.7, -5.5], unlockPad: [5.4, -4.2] };
const DESK_AT = [-6.0, 3.3];
const HIRES = [
  { id: 'worker', name: '工讀生（咖啡）', price: 250, at: [-2.4, 3.0], need: () => shops.coffee.lv >= 1, kind: 'npcF', home: 'coffee', cap: 0xffc83d },
  { id: 'worker2', name: '工讀生（影印）', price: 900, at: [-0.6, 3.0], need: () => shops.printer.unlocked, kind: 'npcM', home: 'printer', cap: 0x3fa7ff },
  { id: 'jie', name: '阿傑（設計部）', price: 1800, at: DESK_AT, need: () => shops.printer.lv >= 1, kind: 'jie' },
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
  work.rotation.x = -Math.PI / 2; work.position.set(0, 0.004, -4.4); work.receiveShadow = true; scene.add(work);
  // 員工餐廳：薄荷綠格子地磚
  const cafe = canvasTex(128, 128, (g) => { g.fillStyle = '#d8f0e3'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#c3e6d3'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); });
  cafe.wrapS = cafe.wrapT = THREE.RepeatWrapping; cafe.repeat.set(15, 6);
  const cf = new THREE.Mesh(new THREE.PlaneGeometry(15, 6.2), new THREE.MeshStandardMaterial({ map: cafe, roughness: 0.8 }));
  cf.rotation.x = -Math.PI / 2; cf.position.set(0, 0.004, 7.9); cf.receiveShadow = true; scene.add(cf);
  // 地上漆的「員工餐廳」字樣（不擋畫面）
  const cafeTxt = canvasTex(512, 96, (g, W, H) => { g.fillStyle = '#2fb27a'; roundRect(g, 4, 4, W - 8, H - 8, 40); g.fill(); g.fillStyle = '#fff'; g.font = `900 58px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🍱 員工餐廳', W / 2, H / 2 + 3); });
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshBasicMaterial({ map: cafeTxt, transparent: true, depthWrite: false }));
  cs.rotation.x = -Math.PI / 2; cs.position.set(0, 0.01, 10.55); scene.add(cs);
  // 後牆＋晴天窗景（城市大樓）
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
  // 排隊紅地毯＋金色紅龍柱
  const runner = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], len = Math.hypot(x2 - x1, z2 - z1);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(0.7, len + 0.7), mat(0xd9483b, { roughness: 0.95 }));
      r.rotation.x = -Math.PI / 2; r.rotation.z = -Math.atan2(x2 - x1, z2 - z1); r.position.set((x1 + x2) / 2, 0.006 + i * 0.0005, (z1 + z2) / 2); r.receiveShadow = true; scene.add(r);
    }
  };
  for (const d of Object.values(SHOPS_DEF)) {
    const q = d.queue; runner(q.length > 5 ? [q[0], q[4], q[q.length - 1]] : q.length === 5 ? [q[0], q[2], q[4]] : [q[0], q[q.length - 1]]);
    for (const [x, z] of [q[1], q[q.length > 5 ? 3 : 2]]) for (const s of [-0.45, 0.45]) {
      const horiz = Math.abs(q[1][1] - q[0][1]) < 0.01;   // 往旁邊排的隊伍，柱子放上下
      const px = horiz ? x : x + s, pz = horiz ? z + s : z;
      cyl(0.04, 0.04, 0.6, 0xe0b040, px, 0.3, pz, scene, { metalness: 0.8, roughness: 0.3 }); sphere(0.06, 0xe0b040, px, 0.62, pz, scene, { metalness: 0.8, roughness: 0.3 });
    }
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
const state = { money: 0, xp: 0, rank: 0, t: 0, started: false, served: 0 };
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
function spawnCustomer(s) {
  const a = makeActor((s.spawnN + s.type.length) % 2 ? kinds.npcF : kinds.npcM, 0.95);
  a.root.position.set(L.elevator[0] + 0.4, 0, L.elevator[1] + (Math.random() - 0.5) * 0.6); a.root.rotation.y = Math.PI / 2;
  scene.add(a.root);
  const many = s.def.restock ? 2 : 3 + Math.min(s.lv, 3);   // 升級後同事一次要更多；便當、飲料一次買少一點
  const want = s.spawnN < 3 ? [2, 3, 1][s.spawnN] : 1 + Math.floor(Math.random() * many);
  s.spawnN++;
  const c = { actor: a, want, got: [], mode: 'queue', bubble: null, bubbleN: -1, shop: s };
  s.crowd.push(c); s.queue.push(c);
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
  s.queue.forEach((c, i) => {
    const slot = Q[Math.min(i, Q.length - 1)];
    const arrived = walkTo(c.actor, slot[0], slot[1], CFG.crewSpeed, dt);
    // 排第一個面向櫃台，其他人面向前一個人
    const look = i === 0 ? s.d.counter : Q[Math.max(0, i - 1)];
    if (arrived) turnTo(c.actor, Math.atan2(look[0] - slot[0], look[1] - slot[1]), dt);
    c.ready = arrived && i === 0;
  });
  for (let i = s.crowd.length - 1; i >= 0; i--) {
    const c = s.crowd[i];
    if (c.mode === 'leave' && walkTo(c.actor, L.exit[0] - 0.3, L.exit[1], CFG.crewSpeed * 1.2, dt)) {
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
  if (s.spawnT >= CFG.spawnEvery && s.queue.length < (s.def.restock ? 4 : CFG.queueMax)) { s.spawnT = 0; spawnCustomer(s); }
}
function pay(s, c) {
  s.queue.shift(); c.mode = 'leave'; state.served++;
  const total = Math.round(c.want * s.def.levels[s.lv].price);
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
const ringTex = canvasTex(128, 128, (g, W) => {
  g.fillStyle = '#ff3b5c'; g.beginPath(); g.arc(W / 2, W / 2, 56, 0, 7); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#fff'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('☎', W / 2, W / 2 + 4);
});
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
    const bub = keep?.bub || (() => { const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthTest: false })); b.scale.set(0.42, 0.42, 1); b.renderOrder = 9; scene.add(b); return b; })();
    phone.lines.push({ ringing: keep?.ringing || false, t: keep ? keep.t : 1 + Math.random() * 2, bub });
  }
  if (phone.badge) scene.remove(phone.badge);
  phone.badge = levelBadge(STATIONS.phone.levels[lv].title, lv); phone.badge.position.set(x, 0, z); phone.badge.userData.y = 2.1; scene.add(phone.badge);
}
function updatePhone(dt) {
  if (!phone.unlocked) return;
  const P = STATIONS.phone.levels[phone.lv];
  phone.lines.forEach((ln, i) => {
    const ph = phone.look.phones[i];
    if (!ln.ringing) { ln.t -= dt; if (ln.t <= 0) { ln.ringing = true; if (i === 0 || Math.random() < 0.4) sfx.ring(); } }
    const wp = ph.g.getWorldPosition(V());
    ln.bub.visible = ln.ringing;
    if (ln.ringing) {
      ph.hand.position.y = 0.09 + Math.abs(Math.sin(state.t * 22 + i)) * 0.05; ph.hand.rotation.z = Math.sin(state.t * 30 + i) * 0.25;
      ln.bub.position.set(wp.x, 1.25 + Math.sin(state.t * 6 + i) * 0.05, wp.z); ln.bub.material.rotation = Math.sin(state.t * 14 + i) * 0.15;
    } else { ph.hand.position.y = 0.09; ph.hand.rotation.z = 0; }
  });
  // 誰在接電話：小葵站在框裡，或小米坐鎮
  phone.answerT += dt;
  const near = (a) => Math.hypot(a.root.position.x - PHONE_DEF.zone[0], a.root.position.z - PHONE_DEF.zone[1]) < 0.9;
  const kuiOn = player && near(player.actor), miOn = hires.mi && near(hires.mi.actor);
  const every = kuiOn ? CFG.answerEvery : (miOn ? CFG.miAnswerEvery : Infinity);
  if (phone.answerT >= every) {
    const ln = phone.lines.find(l => l.ringing);
    if (ln) {
      phone.answerT = 0; ln.ringing = false; ln.t = P.ringEvery * (0.6 + Math.random() * 0.8);
      addMoney(P.price);
      floatText(ln.bub.position.clone().setY(1.5), '+$' + P.price, '#7b5cff', 0.8);
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
    addMoney(CFG.draftPay);
    floatText(pos.clone().setY(2.3), '交稿！+$' + CFG.draftPay, '#b46bff', 1.3);
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
const SHOP_COLOR = { coffee: '#e0663a', printer: '#3f8fe0', vending: '#ff4f5e', beef: '#d9483b', chicken: '#e8902a', fish: '#2f7fc4' };
const UNLOCK_SUB = { printer: '同事開始排隊印文件了', vending: '去搬飲料箱幫販賣機補貨', beef: '去冷藏櫃搬牛肉便當補貨', chicken: '雞肉飯開賣！', fish: '魚排飯開賣！' };
function setupPads() {
  for (const s of Object.values(shops)) {
    const at = () => V((s.d.machine || s.d.counter)[0], 0, (s.d.machine || s.d.counter)[1]);
    if (s.def.unlock) addPad({
      kind: 'unlock', at: s.d.unlockPad, price: () => s.def.unlock, title: () => s.def.name,
      cond: s.d.need || (() => true), done: () => s.unlocked,
      complete: () => { openShop(s); celebrate(at(), '解鎖！' + s.def.name, UNLOCK_SUB[s.type] || '', 1, SHOP_COLOR[s.type]); },
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
    complete: () => { openPhone(); celebrate(V(PHONE_DEF.desk[0], 0, PHONE_DEF.desk[1]), '解鎖！電話總機', '站到紫色框裡接電話，一通 $' + STATIONS.phone.levels[0].price, 1, '#7b5cff'); },
  });
  addPad({
    kind: 'upgrade', at: PHONE_DEF.upPad, price: () => STATIONS.phone.levels[Math.min(4, phone.lv + 1)].cost, title: () => STATIONS.phone.levels[Math.min(4, phone.lv + 1)].title,
    cond: () => phone.unlocked, done: () => phone.lv >= 4,
    complete: () => { phone.lv++; setPhoneLook(phone.lv); const b = STATIONS.phone.levels[phone.lv]; celebrate(V(PHONE_DEF.desk[0], 0, PHONE_DEF.desk[1]), b.title, `${b.lines} 線同時響　一通 $${b.price}`, phone.lv + 1, '#7b5cff'); },
  });
  for (const h of HIRES) addPad({
    kind: 'hire', at: h.at, price: () => h.price, title: () => h.name, cond: h.need, done: () => !!hires[h.id],
    complete: () => { hire(h); },
  });
}

// ---------- 夥伴 ----------
const HIRE_SUB = {
  worker: '幫忙搬咖啡', worker2: '幫忙搬文件',
  jie: `坐在設計部慢慢畫，交一次稿 +$${CFG.draftPay}`, mi: '坐鎮電話總機，一通 $100 起',
  vivi: '老闆來巡視了！（效果：大家被加油了，就這樣）',
};
function hire(h) {
  const k = kinds[h.kind] || kinds.npcF;
  const a = makeActor(k, h.id.startsWith('worker') ? 0.88 : 0.98);
  if (h.id === 'jie' && kinds.jieJog) addJog(a, kinds.jieJog);
  a.root.position.set(h.at[0], 0, h.at[1] - (h.id === 'jie' ? 0.7 : 0));   // 阿傑直接坐到桌子後面
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
  pillar(a.root.position, 0xff9ad5, 0.6, 4); confetti(V(a.root.position.x, 1.2, a.root.position.z), 50); sfx.build();
  banner(h.name.replace(/（.*）/, '') + ' 加入！', HIRE_SUB[h.id], 0, h.id === 'jie' ? '#b46bff' : '#ff4fa3');
}
// Vivi 老闆的台詞：純搞笑
const VIVI_LINES = ['大家加油！', '我很看好你喔～', '今天也要開心上班！', '辛苦了辛苦了', '這個不錯喔', '我先去開會囉', '♥', '加薪？再說再說'];
function updateHires(dt) {
  for (const h of Object.values(hires)) {
    const a = h.actor;
    if (h.id === 'mi') { walkTo(a, PHONE_DEF.zone[0] + 0.25, PHONE_DEF.zone[1], 1.4, dt) && turnTo(a, Math.PI, dt); }
    else if (h.id === 'jie') updateDesign(dt);
    else if (h.id === 'vivi') {   // 老闆巡視：走來走去幫大家加油（沒有實際效果）
      const pts = [[-1.0, -1.2], [-2.0, 3.8], [2.6, 5.0], [3.0, 0.2], [0.4, -3.2], [-5.0, 4.6]];
      h.wp = h.wp ?? 0; h.wait = (h.wait ?? 0) - dt;
      if (h.wait <= 0 && walkTo(a, pts[h.wp][0], pts[h.wp][1], 1.0, dt)) { h.wp = (h.wp + 1) % pts.length; h.wait = 2.5; floatText(a.root.position.clone().setY(1.6), VIVI_LINES[Math.floor(Math.random() * VIVI_LINES.length)], '#ff4fa3', 0.8); }
      else if (h.wait > 0) a.speed = 0;
    } else hauler(h, dt);
    updateActor(a, dt, state.t);
  }
}
// 搬運工：去出貨口拿滿 → 送櫃台；自己的站變產線就去幫別站
function hauler(h, dt) {
  const a = h.actor;
  const pick = () => { const own = shops[h.home]; if (own.unlocked && !isLine(own)) return own; return Object.values(shops).find(s => s.unlocked && !isLine(s) && s.d.machine); };
  const s = h.type ? shopOf(h.type) : pick();
  if (!s) { a.speed = 0; return; }
  if (h.mode === 'fetch') {
    const full = h.carry.length >= h.carryMax || (h.carry.length && !s.tray.length);
    if (full) h.mode = 'deliver'; else walkTo(a, s.pickup[0] + 0.3, s.pickup[1], CFG.helperSpeed, dt);
  } else if (walkTo(a, s.d.drop[0] + 0.3, s.d.drop[1], CFG.helperSpeed, dt) && !h.carry.length) h.mode = 'fetch';
  carry(h, dt);
}

// ---------- 搬貨（小葵與搬運工共用） ----------
const nearAt = (a, [x, z], r) => Math.hypot(a.root.position.x - x, a.root.position.z - z) < r;
function backSlot(c, i) {
  const r = c.actor.root, h = r.rotation.y, s = r.scale.x, ih = ITEM_H[c.type || 'coffee'];
  return V(r.position.x - Math.sin(h) * 0.27 * s, (0.4 * s + ih / 2) + i * ih, r.position.z - Math.cos(h) * 0.27 * s);
}
function carry(c, dt) {
  c.moveT += dt;
  if (c.moveT < CFG.moveEvery) return;
  for (const s of Object.values(shops)) {
    if (!s.unlocked) continue;
    if (!isLine(s) && nearAt(c.actor, s.pickup, 0.8) && s.tray.length && c.carry.length < c.carryMax && (!c.type || c.type === s.item)) {
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
    if (c === player && nearAt(c.actor, s.d.cash, 0.75) && s.cash.length) {
      c.moveT = 0;
      for (let k = 0; k < 2 && s.cash.length; k++) {
        const b = s.cash.pop(), v = b.userData.v;
        retarget(b, () => c.actor.root.position.clone().setY(0.7), () => { addMoney(v); });
      }
      sfx.coin(); return;
    }
  }
}
// 收錢：數字跑上去
function addMoney(v) { state.money += Math.round(v); bumpMoney(); }

// ---------- 小葵升職 ----------
function gainXp(n) {
  state.xp += n;
  const next = RANKS[state.rank + 1];
  if (next && state.xp >= next.xp) {
    state.rank++;
    player.carryMax = rankCarry(state.rank);
    const p = player.actor.root.position;
    pillar(p, 0xffb3d9, 0.6, 5); shockwave(p, 0xffb3d9, 3); confetti(V(p.x, 1.2, p.z), 70); camKick(0.7);
    sfx.promote(); popIn(player.actor.root, 1, 3);
    banner('升職！' + next.title, `一次背 ${player.carryMax} 個　走路更快`, 0, '#ff4fa3');
  }
  updateMe();
}
const meTitle = document.getElementById('meTitle'), meBar = document.getElementById('meBar');
function updateMe() {
  const r = RANKS[state.rank], n = RANKS[state.rank + 1];
  meTitle.textContent = `Lv${state.rank + 1} ${r.title}`;
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
  if (G.force) [mx, mz] = G.force;
  const len = Math.hypot(mx, mz), a = player.actor, p = a.root.position;
  const top = rankSpeed(state.rank) * Math.min(1, len);
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
  const b = L.bounds;
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
const PICK_TEXT = { coffee: '去咖啡機拿咖啡', doc: '去印表機拿文件', drink: '去搬飲料箱', beef: '去搬牛肉便當', chicken: '去搬雞肉便當', fish: '去搬魚排便當' };
function updateGuide() {
  const pos = player.actor.root.position, dist = ([x, z]) => Math.hypot(pos.x - x, pos.z - z);
  let at = null, text = '';
  const open = Object.values(shops).filter(s => s.unlocked);
  const cashShop = open.filter(s => s.cash.length).sort((a, b) => dist(a.d.cash) - dist(b.d.cash))[0];
  const padReady = pads.filter(p => p.shown && state.money >= p.price() - p.paid).sort((a, b) => a.price() - b.price())[0];
  const ringing = phone.unlocked && !hires.mi && phone.lines.some(l => l.ringing);
  if (player.carry.length) { const s = shopOf(player.type); at = s.d.drop; text = `把 ${ICON[s.item]} 送到${s.type === 'vending' ? '販賣機' : s.def.name}`; }
  else if (cashShop && (cashShop.cash.length > 4 || !padReady)) { at = cashShop.d.cash; text = '去收錢！'; }
  else if (padReady) { at = padReady.at; text = `站上格子：${padReady.kind === 'upgrade' ? '升級' : padReady.kind === 'hire' ? '請' : '解鎖'}「${padReady.title()}」`; }
  else if (ringing && phone.lines.filter(l => l.ringing).length >= 2) { at = PHONE_DEF.zone; text = '電話響了！去接電話'; }
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
document.getElementById('coverVer').textContent = VERSION;

// ---------- 主迴圈 ----------
function update(dt) {
  state.t += dt; runLater();
  for (const s of Object.values(shops)) { produce(s, dt); updateCustomers(s, dt); }
  updatePhone(dt); updatePlayer(dt); updateHires(dt); updatePads(dt);
  updateItems(dt); updateFx(dt); updateGuide(); updateHud(dt);
  for (const b of [...Object.values(shops).map(s => s.badge), phone.badge]) if (b) b.position.y = b.userData.y + Math.sin(state.t * 2) * 0.04;
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);   // 先排下一幀，這幀出錯也不會停住
  const dt = Math.min((now - last) / 1000, 0.05) * (G.speedUp || 1); last = now;
  try {
    if (state.started) update(dt);
    const p = player ? player.actor.root.position : V(L.start[0], 0, L.start[1]);
    updateCamera(V(THREE.MathUtils.clamp(p.x, -4.8, 4.8), 0, THREE.MathUtils.clamp(p.z, -4.4, 9.0)), dt);
    render();
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
};   // 除錯用
(async () => {
  const btn = document.getElementById('start');
  try {
    const urls = { kui: 'models/kui_walk2.glb', kuiJog: 'models/kui_jog.glb', npcM: 'models/npc_m_walk.glb', npcF: 'models/npc_f_walk.glb', jie: 'models/jie_walk.glb', jieJog: 'models/jie_jog.glb', mi: 'models/mi_walk.glb', vivi: 'models/vivi_walk.glb' };
    const ks = await Promise.all(Object.entries(urls).map(async ([k, u]) => [k, await loadKind(u)]));
    kinds = Object.fromEntries(ks);
  } catch (e) { btn.textContent = '載入失敗，請重新整理'; console.error(e); return; }
  for (const t of ['coffee', 'printer', 'vending', 'beef', 'chicken', 'fish']) makeShop(t);
  const a = addJog(makeActor(kinds.kui, 1), kinds.kuiJog);
  a.root.position.set(L.start[0], 0, L.start[1]); a.root.rotation.y = Math.PI; scene.add(a.root);
  player = { actor: a, carry: [], type: null, carryMax: rankCarry(0), moveT: 0 };
  carriers.push(player);
  cam.target.set(L.start[0], 0, L.start[1]);
  setupPads(); updateMe();
  for (let i = 0; i < 3; i++) spawnCustomer(shops.coffee);
  btn.disabled = false; btn.textContent = '開始上班';
  btn.onclick = () => { audioInit(); document.getElementById('cover').style.display = 'none'; state.started = true; };
  if (location.hash === '#play') btn.onclick();
})();
requestAnimationFrame(frame);
