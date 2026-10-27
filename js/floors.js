// 其他樓層的外觀：頂樓遊樂園（環境＋四個設施）、2F 我的辦公室（房間＋家具樣式）
// 樓層放在同一個世界的不同區域：頂樓在 x+40、2F 在 x-40，搭電梯就是瞬移過去
import * as THREE from 'three';
import { scene, rbox, box, cyl, sphere, mat, canvasTex, labelSprite, FONT, V } from './world.js?v=0.16.3';

const glow = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const gold = { metalness: 0.9, roughness: 0.3 };
function floorPlane(ox, w, d, cx, cz, tex, repX, repZ) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(repX, repZ);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  m.rotation.x = -Math.PI / 2; m.position.set(ox + cx, 0.002, cz); m.receiveShadow = true; scene.add(m); return m;
}
// 電梯門（每層都一樣，在左牆中間）
export function elevatorDoor(ox, z, label) {
  rbox(0.2, 1.8, 1.4, 0xc7ccd3, ox - 7.65, 0.9, z, scene, { metalness: 0.6, roughness: 0.3 });
  box(0.22, 1.7, 0.03, 0x8a929c, ox - 7.62, 0.87, z);
  const s = labelSprite(label, { bg: '#ff7a45', size: 0.28 }); s.position.set(ox - 7.4, 2.05, z); scene.add(s);
}

// ================= 頂樓遊樂園 =================
export function buildRoof(ox) {
  // 人工草皮＋步道
  const turf = canvasTex(128, 128, (g) => { g.fillStyle = '#7fd35a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#74c950'; for (let i = 0; i < 128; i += 16) g.fillRect(i, 0, 8, 128); });
  floorPlane(ox, 26, 26, 0, 0.3, turf, 13, 13);
  const path = canvasTex(128, 128, (g) => { g.fillStyle = '#f3dcb6'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#e8cc9d'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); });
  const p1 = floorPlane(ox, 3.2, 13.5, 0, 0.25, path, 2, 8); p1.position.y = 0.004;
  const p2 = floorPlane(ox, 14.4, 2.2, 0, -0.6, path, 8, 1); p2.position.y = 0.005;
  // 圍欄（矮的，不擋鏡頭）
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.7);
    for (let i = 0; i <= n; i++) cyl(0.05, 0.05, 0.7, 0xffffff, ox + x0 + (x1 - x0) * i / n, 0.35, z0 + (z1 - z0) * i / n);
    const r = rbox(len, 0.08, 0.08, 0xff7a45, ox + (x0 + x1) / 2, 0.72, (z0 + z1) / 2); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  };
  rail(-7.5, -6.9, 7.5, -6.9); rail(7.6, -6.9, 7.6, 7.3); rail(-7.6, 0.4, -7.6, 7.3); rail(-7.6, -6.9, -7.6, -1.6);
  // 遠方城市天際線（後面一整片看板）
  const sky = canvasTex(1024, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5fb6ff'); gr.addColorStop(1, '#d6efff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffffdd'; for (const [x, y, r] of [[120, 60, 26], [150, 52, 32], [184, 62, 22], [620, 80, 24], [650, 70, 30], [690, 82, 20], [900, 50, 22]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    const cols = ['#8ea7c2', '#9fb6cf', '#b7c9dc', '#7f98b6'];
    for (let i = 0; i < 34; i++) { const w = 26 + (i * 17) % 22, h = 70 + (i * 53) % 120, x = i * 31 - 8; g.fillStyle = cols[i % 4]; g.fillRect(x, H - h, w, h); g.fillStyle = '#ffffff99'; for (let r = 0; r < h / 16 - 1; r++) for (let c = 0; c < 2; c++) g.fillRect(x + 5 + c * 11, H - h + 8 + r * 16, 5, 8); }
  });
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(22, 5.5), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false })); bb.position.set(ox, 2.0, -8.6); scene.add(bb);
  // 三角旗串
  const bunting = (x0, x1, z, y, n) => { for (let i = 0; i < n; i++) { const x = ox + x0 + (x1 - x0) * (i + .5) / n, sag = Math.sin((i + .5) / n * Math.PI) * .35; const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 3), mat([0xff5d73, 0xffd34d, 0x3fa7ff, 0x36c35d, 0xb46bff][i % 5])); f.rotation.z = Math.PI; f.position.set(x, y - sag, z); scene.add(f); } };
  bunting(-7.4, 7.4, -6.95, 1.9, 22);
  for (const x of [-7.4, 7.4]) cyl(0.06, 0.06, 2.0, 0xffffff, ox + x, 1.0, -6.95);
  // 地上的大字
  const t = canvasTex(1024, 160, (g, W, H) => { g.fillStyle = '#ff5d8f'; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 70); g.fill(); g.fillStyle = '#fff'; g.font = `900 100px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🎡 頂樓遊樂園', W / 2, H / 2 + 6); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.8), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); sign.rotation.x = -Math.PI / 2; sign.position.set(ox, 0.012, 6.5); scene.add(sign);
  elevatorDoor(ox, -0.6, '▼ 電梯');
  // 花圃與路燈
  for (const [x, z] of [[-6.6, 6.5], [6.6, 6.5], [-6.6, -6.2], [0, -6.3]]) { cyl(0.45, 0.4, 0.3, 0xc98a5a, ox + x, 0.15, z); for (let i = 0; i < 6; i++) sphere(0.14, [0xff6b8b, 0xffd34d, 0xb46bff][i % 3], ox + x + Math.cos(i) * 0.25, 0.38, z + Math.sin(i) * 0.25); }
}

// 四個設施：位置（頂樓本地座標）、排隊、收錢、格子、每級數值
export const RIDES = [
  { id: 'cups', name: '旋轉咖啡杯', icon: '☕', at: [-3.6, -3.9], r: 1.6, entry: [-1.5, -3.0], queue: [[-1.0, -2.3], [-1.0, -1.7], [-0.4, -2.3], [-0.4, -1.7], [0.2, -2.3]], cash: [-1.5, -5.4], upPad: [-6.1, -5.7], unlock: 3000,
    levels: [{ title: '咖啡杯', cap: 3, ticket: 40, dur: 6, cost: 0 }, { title: '彩色咖啡杯', cap: 4, ticket: 60, dur: 5.5, cost: 7000 }, { title: '黃金咖啡杯', cap: 5, ticket: 90, dur: 5, cost: 18000 }] },
  { id: 'horse', name: '旋轉木馬', icon: '🎠', at: [-3.6, 3.0], r: 1.6, entry: [-1.5, 2.2], queue: [[-1.0, 1.5], [-0.4, 1.5], [-1.0, 0.9], [-0.4, 0.9], [0.2, 1.5]], cash: [-1.5, 4.6], upPad: [-6.1, 6.1], unlock: 8000,
    levels: [{ title: '旋轉木馬', cap: 4, ticket: 60, dur: 6.5, cost: 0 }, { title: '豪華木馬', cap: 6, ticket: 90, dur: 6, cost: 16000 }, { title: '夢幻木馬', cap: 8, ticket: 130, dur: 5.5, cost: 36000 }] },
  { id: 'wheel', name: '摩天輪', icon: '🎡', at: [3.8, -5.3], r: 2.0, entry: [3.8, -3.5], queue: [[3.8, -2.8], [3.2, -2.8], [4.4, -2.8], [3.2, -2.2], [4.4, -2.2]], cash: [1.6, -4.4], upPad: [6.4, -2.2], unlock: 20000,
    levels: [{ title: '摩天輪', cap: 4, ticket: 120, dur: 7, cost: 0 }, { title: '彩燈摩天輪', cap: 6, ticket: 180, dur: 6.5, cost: 40000 }, { title: '黃金摩天輪', cap: 8, ticket: 260, dur: 6, cost: 90000 }] },
  { id: 'train', name: '小火車', icon: '🚂', at: [4.2, 3.2], r: 2.4, entry: [1.6, 2.0], queue: [[1.4, 1.3], [2.0, 1.3], [2.6, 1.3], [1.4, 0.7], [2.0, 0.7]], cash: [1.6, 5.0], upPad: [6.4, 6.3], unlock: 45000,
    levels: [{ title: '小火車', cap: 3, ticket: 90, dur: 7, cost: 0 }, { title: '蒸汽小火車', cap: 4, ticket: 140, dur: 6.5, cost: 80000 }, { title: '黃金特快車', cap: 6, ticket: 200, dur: 6, cost: 160000 }] },
];

// 設施外觀：回傳 { g, seats（乘客坐的位置）, tick(dt, run) }。run＝運轉中（0~1 緩起緩停）
export function rideLook(id, lv) {
  const g = new THREE.Group(), seats = [], lux = lv >= 2, cols = [0xff5d73, 0xffd34d, 0x3fa7ff, 0x36c35d, 0xb46bff, 0xff9a3d, 0x5fd3c4, 0xff7ab8];
  let tick = () => {};
  if (id === 'cups') {
    cyl(1.55, 1.6, 0.14, lux ? 0xffe9a8 : 0xfff3e0, 0, 0.07, 0, g); cyl(1.62, 1.62, 0.06, lux ? 0xd9a63a : 0xff7a45, 0, 0.15, 0, g, lux ? gold : undefined);
    const spin = new THREE.Group(); spin.position.y = 0.18; g.add(spin);
    cyl(0.18, 0.18, 0.5, 0xffffff, 0, 0.25, 0, spin); const pot = sphere(0.32, lux ? 0xffd34d : 0xff7a45, 0, 0.6, 0, spin, lux ? gold : undefined); pot.scale.y = 0.8;
    const n = [3, 4, 5][lv], cups = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, c = new THREE.Group(); c.position.set(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0); spin.add(c);
      const body = cyl(0.36, 0.26, 0.36, lux ? 0xffd34d : cols[i], 0, 0.2, 0, c, lux ? gold : undefined);
      const rim = cyl(0.37, 0.37, 0.04, 0xffffff, 0, 0.39, 0, c); const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI), mat(0xffffff)); handle.position.set(0.38, 0.22, 0); handle.rotation.z = -Math.PI / 2; c.add(handle);
      const seat = new THREE.Group(); seat.position.y = 0.1; c.add(seat); seats.push(seat); cups.push(c);
    }
    tick = (dt, run) => { spin.rotation.y += dt * 1.2 * run; cups.forEach((c, i) => c.rotation.y += dt * (2.5 + i * .3) * run); };
  } else if (id === 'horse') {
    cyl(1.6, 1.65, 0.16, 0xfff3e0, 0, 0.08, 0, g);
    const spin = new THREE.Group(); spin.position.y = 0.16; g.add(spin);
    cyl(1.5, 1.5, 0.05, lux ? 0xffe08a : 0xff9ad5, 0, 0.02, 0, spin, lux ? gold : undefined);
    cyl(0.12, 0.12, 1.5, lv ? 0xd9a63a : 0xffffff, 0, 0.75, 0, spin, lv ? gold : undefined);
    const crown = cyl(0.42, 0.3, 0.18, lux ? 0xffd34d : 0xff5d73, 0, 1.55, 0, spin, lux ? gold : undefined);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = sphere(0.06, glow([0xffe08a, 0xff9ad5, 0x9be7ff][i % 3]), Math.cos(a) * 0.44, 1.6, Math.sin(a) * 0.44, spin); }
    const n = [4, 6, 8][lv], horses = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, h = new THREE.Group(); h.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05); h.rotation.y = -a; spin.add(h);
      cyl(0.03, 0.03, 1.4, lv ? 0xd9a63a : 0xdddddd, 0, 0.75, 0, h, lv ? gold : undefined);
      const body = new THREE.Group(); h.add(body);
      rbox(0.18, 0.2, 0.46, lux ? 0xffd34d : [0xffffff, 0xffe0f0, 0xe0f0ff][i % 3], 0, 0.45, 0, body, lux ? gold : undefined);
      rbox(0.14, 0.24, 0.14, lux ? 0xffd34d : [0xffffff, 0xffe0f0, 0xe0f0ff][i % 3], 0, 0.62, 0.22, body, lux ? gold : undefined);
      box(0.04, 0.14, 0.18, cols[i % cols.length], 0, 0.66, 0.12, body);
      const seat = new THREE.Group(); seat.position.set(0, 0.48, -0.02); body.add(seat); seats.push(seat); horses.push(body);
    }
    let ph = 0;
    tick = (dt, run, t) => { spin.rotation.y += dt * 0.9 * run; ph += dt * run * 4; horses.forEach((b, i) => b.position.y = Math.sin(ph + i * 1.3) * 0.12 * run); };
  } else if (id === 'wheel') {
    // 正對鏡頭的直立大輪（在最後面，不擋路）
    for (const x of [-0.25, 0.25]) for (const s of [-1, 1]) { const leg = rbox(0.12, 2.5, 0.12, 0xffffff, s * 0.9, 1.15, x, g); leg.rotation.z = s * 0.38; }
    rbox(2.6, 0.2, 1.0, 0xfff3e0, 0, 0.1, 0, g);
    const wheel = new THREE.Group(); wheel.position.y = 2.3; g.add(wheel);
    const R = 1.75, ringM = lux ? mat(0xffd34d, gold) : mat(lv ? 0xff7ab8 : 0xff7a45);
    for (const z of [-0.18, 0.18]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 8, 48), ringM); ring.position.z = z; wheel.add(ring); }
    const n = [4, 6, 8][lv], cars = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, sp = rbox(0.05, R * 2, 0.05, 0xffffff, 0, 0, 0, wheel); sp.rotation.z = a; }
    if (lv >= 1) for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; sphere(0.06, glow(cols[i % cols.length]), Math.cos(a) * R, Math.sin(a) * R, 0.24, wheel); }
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, car = new THREE.Group(); car.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); wheel.add(car);
      const pod = new THREE.Group(); pod.position.y = -0.36; car.add(pod);
      rbox(0.5, 0.3, 0.42, lux ? 0xffd34d : cols[i % cols.length], 0, 0, 0, pod, lux ? gold : undefined);
      cyl(0.02, 0.02, 0.36, 0xffffff, 0, 0.2, 0, pod);
      const seat = new THREE.Group(); seat.position.y = -0.05; pod.add(seat); seats.push(seat); cars.push(car);
    }
    tick = (dt, run) => { wheel.rotation.z += dt * 0.55 * run; cars.forEach(c => c.rotation.z = -wheel.rotation.z); };
  } else if (id === 'train') {
    // 橢圓軌道＋車頭＋車廂繞圈
    const rx = 2.3, rz = 1.35, track = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 64), mat(0x8a6a4c)); track.scale.set(rx, rz, 1); track.rotation.x = Math.PI / 2; track.position.y = 0.04; g.add(track);
    const track2 = track.clone(); track2.scale.set(rx - .3, rz - .3, 1); g.add(track2);
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, s = box(0.08, 0.03, 0.42, 0xb08458, Math.cos(a) * (rx - .15), 0.02, Math.sin(a) * (rz - .15), g); s.rotation.y = -Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx) + Math.PI / 2; }
    cyl(0.5, 0.5, 0.12, 0xfff3e0, -rx - 0.2, 0.06, 0, g);   // 車站月台
    const ncar = [3, 4, 6][lv], train = [];
    const engine = new THREE.Group(); g.add(engine);
    rbox(0.42, 0.32, 0.6, lux ? 0xffd34d : lv ? 0x2f7fc4 : 0xff3b3b, 0, 0.26, 0, engine, lux ? gold : undefined);
    cyl(0.07, 0.09, 0.26, 0x2c3e57, 0, 0.55, 0.18, engine); rbox(0.36, 0.28, 0.22, 0xffffff, 0, 0.5, -0.16, engine);
    train.push(engine);
    for (let i = 0; i < ncar; i++) { const c = new THREE.Group(); g.add(c); rbox(0.4, 0.2, 0.48, lux ? 0xffe08a : cols[(i + 2) % cols.length], 0, 0.2, 0, c, lux ? gold : undefined); const seat = new THREE.Group(); seat.position.y = 0.16; c.add(seat); seats.push(seat); train.push(c); }
    let s = Math.PI;
    const place = () => train.forEach((c, i) => { const a = s - i * 0.5, x = Math.cos(a) * (rx - .15), z = Math.sin(a) * (rz - .15); c.position.set(x, 0, z); c.rotation.y = Math.atan2(-Math.sin(a) * (rx - .15), Math.cos(a) * (rz - .15)); });
    place();
    tick = (dt, run) => { s -= dt * 1.1 * run; place(); };
  }
  return { g, seats, tick };
}

// ================= 2F 我的辦公室 =================
export const ROOM = { kiosk: [0, 0.15], zone: [0, 1.0], petAt: [-5.6, -2.9] };
// 2F（v0.15）：房間大小 老闆 1：特助 0.6：小葵 0.2：阿傑 0.2
// 前排整排＝Vivi 老闆的大辦公室（擺滿老闆的東西）；中間走廊放型錄台
// 後排左＝員工辦公室（小葵＋阿傑共用，0.2＋0.2，v0.16 動森風自由布置，見 deco.js）、右＝特助 Kevin 的辦公室（第 2 年起）
// 2F 不跟著年度重置（家具存在 ROOM_KEY，搬家不清）
const OFF = { z0: -6.5, z1: -2.0, xJ: -1.45, doorS: [-5.05, -3.55], doorB: [3.1, 4.3], f0: 2.6, f1: 6.6, doorF: [-1.9, -0.7] };
export const ROOM_X = { staff: -4.3, kevin: 2.9 };   // 後排兩間的中心
export function buildOffice(ox) {
  const winTex = canvasTex(256, 192, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffb489'); gr.addColorStop(1, '#ffe2b8'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#ffffffcc'; g.beginPath(); g.arc(190, 60, 26, 0, 7); g.fill(); g.fillStyle = '#c99a8a'; for (let i = 0; i < 9; i++) { const h = 40 + (i * 29) % 60; g.fillRect(i * 30, H - h, 24, h); } });
  for (const x of [5.6]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshBasicMaterial({ map: winTex, toneMapped: false })); w.position.set(ox + x, 1.85, -6.82); scene.add(w); rbox(2.15, 0.1, 0.16, 0xffffff, ox + x, 1.12, -6.78); rbox(0.08, 1.45, 0.1, 0xffffff, ox + x, 1.85, -6.78); }
  elevatorDoor(ox, -0.6, '▲▼ 電梯');
  for (let z = -6.3; z <= 6.4; z += 1.3) if (Math.abs(z + 0.6) > 0.9) rbox(0.14, 0.75, 1.24, 0xd9c2a5, ox - 7.6, 0.375, z);
  for (let z = -6.3; z <= 6.4; z += 1.3) rbox(0.14, 0.75, 1.24, 0xd9c2a5, ox + 7.6, 0.375, z);
  for (let x = -7.0; x <= 7.0; x += 1.4) rbox(1.34, 0.6, 0.14, 0xd9c2a5, ox + x, 0.3, OFF.f1 + 0.3);
  // 走廊地毯＋前排地板（整排老闆辦公室大理石）
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 4.6), new THREE.MeshStandardMaterial({ color: 0xe9e2d6, roughness: 0.9 })); hall.rotation.x = -Math.PI / 2; hall.position.set(ox, 0.002, 0.3); hall.receiveShadow = true; scene.add(hall);
  const mt = floorTex.marble(); mt.wrapS = mt.wrapT = THREE.RepeatWrapping; mt.repeat.set(4, 2);
  mt.repeat.set(6, 2);
  const bf = new THREE.Mesh(new THREE.PlaneGeometry(14.4, OFF.f1 - OFF.f0), new THREE.MeshStandardMaterial({ map: mt, roughness: 0.35 })); bf.rotation.x = -Math.PI / 2; bf.position.set(ox, 0.003, (OFF.f0 + OFF.f1) / 2); bf.receiveShadow = true; scene.add(bf);
  // 矮玻璃牆：後排三間的隔間＋前牆（各留門）
  const glass = new THREE.MeshStandardMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false });
  const wall = (ax, az, bx, bz, rail) => {
    const len = Math.hypot(bx - ax, bz - az), w = new THREE.Group(); w.position.set(ox + (ax + bx) / 2, 0, (az + bz) / 2); w.rotation.y = -Math.atan2(bz - az, bx - ax); scene.add(w);
    rbox(len, 0.14, 0.08, 0x8a6a4c, 0, 0.07, 0, w); const gl = new THREE.Mesh(new THREE.BoxGeometry(len, 0.72, 0.03), glass); gl.position.y = 0.5; w.add(gl); rbox(len + 0.04, 0.06, 0.09, rail, 0, 0.88, 0, w);
  };
  // 每段牆：畫出來＋回傳擋路的方塊 [中心 x, 中心 z, 半寬, 半深]
  const walls = [];
  const seg = (ax, az, bx, bz, rail) => { wall(ax, az, bx, bz, rail); walls.push(az === bz ? [(ax + bx) / 2, az, Math.abs(bx - ax) / 2, 0.06] : [ax, (az + bz) / 2, 0.06, Math.abs(bz - az) / 2]); };
  seg(OFF.xJ, OFF.z0, OFF.xJ, OFF.z1, 0x8a6a4c);
  seg(-7.25, OFF.z1, OFF.doorS[0], OFF.z1, 0x9fc39a); seg(OFF.doorS[1], OFF.z1, OFF.xJ, OFF.z1, 0x9fc39a);
  seg(OFF.xJ, OFF.z1, OFF.doorB[0], OFF.z1, 0x2fe3ff); seg(OFF.doorB[1], OFF.z1, 7.25, OFF.z1, 0x2fe3ff);
  // 前排：老闆辦公室整排的玻璃牆（金色扶手、門在中間偏左）
  seg(-7.25, OFF.f0, OFF.doorF[0], OFF.f0, 0xd9a63a); seg(OFF.doorF[1], OFF.f0, 7.25, OFF.f0, 0xd9a63a);
  return { walls, doors: OFF };
}
export function roomPlate(ox, x, text, bg, z = -1.45) {
  const t = canvasTex(512, 96, (g, W, H) => { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 40); g.fill(); g.fillStyle = '#fff'; g.font = `900 52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 3); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(ox + x, 0.012, z); scene.add(m);
}
// Vivi 老闆的大辦公室：擺滿老闆的東西（玩家不能改）。回傳 { g, tick, spots }，spots＝老闆逛的地方
export function buildBossOffice(ox) {
  const g = new THREE.Group(); g.position.set(ox, 0, 0); scene.add(g);
  const z0 = OFF.f0, z1 = OFF.f1;
  // 紅地毯
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.6), new THREE.MeshStandardMaterial({ color: 0xd9a63a, metalness: 0.6, roughness: 0.4 })); edge.rotation.x = -Math.PI / 2; edge.position.set(-2.4, 0.005, 4.6); g.add(edge);   // 金邊在下面
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x8e3a3a, roughness: 0.95 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-2.4, 0.008, 4.6); g.add(rug);
  // 大辦公桌（L 型、金邊）＋皮椅＋名牌
  rbox(2.4, 0.08, 1.0, 0x5a3220, -2.4, 0.78, 5.2, g); rbox(2.4, 0.74, 0.12, 0x4a2818, -2.4, 0.38, 4.75, g); rbox(2.45, 0.04, 1.05, 0xd9a63a, -2.4, 0.83, 5.2, g, gold);
  for (const x of [-3.5, -1.3]) rbox(0.1, 0.74, 0.9, 0x4a2818, x, 0.37, 5.2, g);
  const plate = labelSprite('CEO　Vivi', { bg: '#d9a63a', size: 0.22 }); plate.position.set(-2.4, 1.05, 4.72); g.add(plate);
  rbox(0.5, 0.35, 0.3, 0x111111, -1.9, 1.02, 5.3, g); box(0.44, 0.28, 0.01, new THREE.MeshBasicMaterial({ color: 0xffc0e0, toneMapped: false }), -1.9, 1.02, 5.14, g);   // 螢幕（粉紅桌布）
  const chair = new THREE.Group(); chair.position.set(-2.4, 0, 5.95); g.add(chair);
  rbox(0.8, 0.16, 0.7, 0x2a1a12, 0, 0.5, 0, chair); rbox(0.8, 1.1, 0.18, 0x2a1a12, 0, 1.05, 0.3, chair); rbox(0.84, 0.06, 0.2, 0xd9a63a, 0, 1.62, 0.3, chair, gold); cyl(0.06, 0.06, 0.42, 0xd9a63a, 0, 0.22, 0, chair, gold);
  // 獎盃牆（後面那排櫃子）
  rbox(2.6, 1.6, 0.4, 0x6b3e26, -5.6, 0.8, 6.2, g);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x = -6.5 + k * 0.6, y = 0.3 + r * 0.5; cyl(0.06, 0.09, 0.14, 0xd9a63a, x, y, 6.05, g, gold); sphere(0.08, 0xffd34d, x, y + 0.14, 6.05, g, gold); }
  // 高爾夫推桿墊（旗子、球）
  const green = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x3aa65a, roughness: 0.9 })); green.rotation.x = -Math.PI / 2; green.position.set(-5.4, 0.01, 3.4); g.add(green);
  cyl(0.06, 0.06, 0.01, 0x111111, -4.4, 0.012, 3.4, g); cyl(0.012, 0.012, 0.7, 0xffffff, -4.4, 0.35, 3.4, g); box(0.25, 0.15, 0.01, 0xff3b3b, -4.28, 0.62, 3.4, g);
  const ball = sphere(0.04, 0xffffff, -6.4, 0.04, 3.4, g);
  // 魚缸（魚會游）
  rbox(1.5, 0.6, 0.5, 0x2c3e57, 1.3, 0.3, 6.1, g);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.45), new THREE.MeshStandardMaterial({ color: 0x7fd1ff, transparent: true, opacity: 0.45, depthWrite: false })); tank.position.set(1.3, 1.0, 6.1); g.add(tank);
  const fish = [0xff7a45, 0xffd34d, 0xff4fa3].map((c, i) => { const f = sphere(0.06, c, 1.3, 0.85 + i * 0.15, 6.1, g); f.scale.set(1.6, 1, 0.7); return f; });
  // 金色招財貓
  const cat = new THREE.Group(); cat.position.set(-0.4, 0, 6.15); g.add(cat);
  sphere(0.26, 0xffd34d, 0, 0.3, 0, cat, gold).scale.set(1, 1.1, 0.9); sphere(0.2, 0xffd34d, 0, 0.72, 0, cat, gold); const paw = sphere(0.08, 0xffffff, 0.2, 0.82, 0.08, cat);
  for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xffd34d, metalness: 0.8, roughness: 0.3 })); e.position.set(x, 0.92, 0); cat.add(e); }
  // 牆上的大名畫（抽象畫）＋沙發組
  const art = canvasTex(256, 160, (c, W, H) => { const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#ff7ab8'); gr.addColorStop(.5, '#ffd34d'); gr.addColorStop(1, '#3fa7ff'); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = '#ffffffaa'; c.beginPath(); c.arc(90, 80, 40, 0, 7); c.fill(); c.fillStyle = '#142b45'; c.fillRect(150, 40, 60, 80); });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshBasicMaterial({ map: art, toneMapped: false })); pic.position.set(-6.9, 1.5, 4.6); pic.rotation.y = Math.PI / 2; g.add(pic);
  rbox(0.08, 1.12, 1.72, 0xd9a63a, -6.95, 1.5, 4.6, g, gold);
  rbox(0.7, 0.4, 1.8, 0xfff1dd, -6.6, 0.2, 4.6, g); rbox(0.25, 0.45, 1.8, 0xfff1dd, -6.95, 0.6, 4.6, g);   // 沙發
  rbox(0.8, 0.3, 1.0, 0x5a3220, -5.6, 0.15, 4.6, g);   // 茶几
  cyl(0.06, 0.06, 0.12, 0xffffff, -5.6, 0.36, 4.3, g); cyl(0.06, 0.06, 0.12, 0xffffff, -5.5, 0.36, 4.9, g);
  for (const x of [-7.0, 2.2]) { cyl(0.26, 0.2, 0.45, 0xd9a63a, x, 0.22, 2.95, g, gold); for (let i = 0; i < 5; i++) { const l = sphere(0.24, 0x2f9a4a, x + Math.cos(i * 1.3) * 0.15, 0.7 + (i % 2) * 0.25, 2.95 + Math.sin(i * 1.3) * 0.15, g); l.scale.y = 1.3; } }
  // 右半邊（v0.15 老闆辦公室變整排）：酒櫃、按摩椅、大地球儀、金色保險箱、高爾夫球袋
  rbox(2.2, 1.7, 0.45, 0x3f2614, 4.6, 0.85, 6.2, g); rbox(2.25, 0.06, 0.5, 0xd9a63a, 4.6, 1.72, 6.2, g, gold);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { const b = cyl(0.05, 0.05, 0.32, [0x5a0f1e, 0x2f5a2a, 0xd9a63a][(r + k) % 3], 3.8 + k * 0.32, 0.4 + r * 0.5, 6.0, g); b.rotation.x = Math.PI / 2; }
  const mc = new THREE.Group(); mc.position.set(2.9, 0, 4.4); mc.rotation.y = 0.5; g.add(mc);   // 按摩椅
  rbox(0.8, 0.45, 1.0, 0x2a1a12, 0, 0.3, 0, mc); rbox(0.8, 1.0, 0.25, 0x2a1a12, 0, 0.85, 0.45, mc); rbox(0.84, 0.06, 0.28, 0xd9a63a, 0, 1.36, 0.45, mc, gold); for (const x of [-0.45, 0.45]) rbox(0.12, 0.35, 0.9, 0x3f2614, x, 0.6, 0, mc);
  cyl(0.3, 0.35, 0.08, 0x3f2614, 5.6, 0.04, 3.6, g); cyl(0.04, 0.04, 0.7, 0xd9a63a, 5.6, 0.42, 3.6, g, gold);   // 地球儀
  const globe = sphere(0.36, 0x3fa7ff, 5.6, 1.05, 3.6, g); const land = sphere(0.365, 0x47b35a, 5.6, 1.05, 3.6, g); land.scale.set(1, 0.6, 0.5);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 6, 24), new THREE.MeshStandardMaterial({ color: 0xd9a63a, metalness: 0.9, roughness: 0.3 })); ring.position.set(5.6, 1.05, 3.6); ring.rotation.y = Math.PI / 2; g.add(ring);
  rbox(0.8, 0.9, 0.7, 0xd9a63a, 6.6, 0.45, 4.6, g, gold); cyl(0.12, 0.12, 0.05, 0x8a6a1c, 6.6, 0.55, 4.97, g).rotation.x = Math.PI / 2;   // 保險箱
  cyl(0.18, 0.16, 0.9, 0x142b45, 6.8, 0.45, 5.7, g); for (let i = 0; i < 4; i++) cyl(0.02, 0.02, 0.4, 0xcccccc, 6.75 + (i % 2) * 0.08, 1.05, 5.65 + Math.floor(i / 2) * 0.08, g);   // 高爾夫球袋
  for (const x of [6.9]) { cyl(0.26, 0.2, 0.45, 0xd9a63a, x, 0.22, 2.95, g, gold); for (let i = 0; i < 5; i++) { const l = sphere(0.24, 0x2f9a4a, x + Math.cos(i * 1.3) * 0.15, 0.7 + (i % 2) * 0.25, 2.95 + Math.sin(i * 1.3) * 0.15, g); l.scale.y = 1.3; } }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  const tick = (dt, t) => { globe.rotation.y += dt * 0.4; land.rotation.y += dt * 0.4; fish.forEach((f, i) => { f.position.x = 1.3 + Math.sin(t * (0.7 + i * 0.2) + i) * 0.5; f.position.y = 0.85 + i * 0.15 + Math.sin(t * 1.3 + i) * 0.05; f.rotation.y = Math.cos(t * (0.7 + i * 0.2) + i) > 0 ? 0 : Math.PI; }); paw.position.y = 0.82 + Math.sin(t * 5) * 0.06; ball.position.x = -6.4 + ((t * 0.5) % 2); };
  // 老闆逛的點：辦公桌、魚缸、推桿墊、沙發、名畫前
  return { g, tick, spots: [[-2.4, 4.3], [1.3, 5.4], [-5.8, 3.2], [3.6, 3.6], [5.6, 4.4], [-5.4, 4.0], [4.6, 5.4], [-6.2, 5.2], [0.0, 3.5]], walls: [[-2.4, 5.0, 1.25, 0.35], [-5.6, 6.2, 1.3, 0.25], [1.3, 6.1, 0.75, 0.3], [4.6, 6.2, 1.1, 0.25], [6.6, 4.6, 0.4, 0.35], [5.6, 3.6, 0.35, 0.35]] };
}
// 特助 Kevin 的辦公室（第 2 年起）：科技風固定擺設（拿阿傑舊設計室的家具來擺）＋「AI 就好」霓虹招牌
export function buildKevinOffice(ox, on) {
  const g = new THREE.Group(); scene.add(g);
  if (!on) { const l = labelSprite('（空辦公室）', { bg: '#9aa3ad', size: 0.26 }); l.position.set(ox + ROOM_X.kevin, 1.2, -4.2); g.add(l); return { g, tick: () => {} }; }
  const pick = (slot, i) => { const o = FURN_B.find(f => f.slot === slot).opts[i]; const m = o.make(ox); g.add(m); return m; };
  const objs = [pick('j_desk', 1), pick('j_chair', 1), pick('j_light', 1), pick('j_rack', 1), pick('j_figure', 2), pick('j_plant', 2)];
  const t = canvasTex(512, 160, (c, W, H) => { c.clearRect(0, 0, W, H); c.font = `900 96px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#2fe3ff'; c.shadowBlur = 24; c.fillStyle = '#d6fbff'; c.fillText('AI 就好', W / 2, H / 2 + 4); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })); sign.position.set(ox + 2.0, 2.15, -6.78); g.add(sign);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, tick: (dt, tt) => objs.forEach(o => o.userData.tick && o.userData.tick(dt, tt)) };
}
// 阿傑的座位：一張桌子、一台筆電，什麼都沒有（梗）
export function buildJieSeat(ox) {
  const X = ROOM_X.jie, g = P(ox, X, -5.4); scene.add(g);
  rbox(1.2, 0.06, 0.6, 0xe9e2d6, 0, 0.72, 0, g); for (const x of [-0.55, 0.55]) rbox(0.05, 0.7, 0.55, 0x9aa3ad, x, 0.36, 0, g);
  rbox(0.42, 0.02, 0.3, 0x9aa3ad, 0, 0.76, 0.02, g); const lid = rbox(0.42, 0.28, 0.02, 0x9aa3ad, 0, 0.9, -0.12, g); lid.rotation.x = -0.25;
  box(0.36, 0.22, 0.005, new THREE.MeshBasicMaterial({ color: 0xbfe6ff, toneMapped: false }), 0, 0.9, -0.105, g).rotation.x = -0.25;
  const ch = P(ox, X, -4.8, Math.PI); scene.add(ch); rbox(0.45, 0.08, 0.45, 0x5b6676, 0, 0.45, 0, ch); rbox(0.43, 0.5, 0.05, 0x5b6676, 0, 0.75, 0.2, ch); cyl(0.04, 0.04, 0.4, 0x666666, 0, 0.22, 0, ch);
  return { walls: [[X, -5.4, 0.65, 0.35]] };
}
export function buildKiosk(ox) {
  const k = new THREE.Group(); k.position.set(ox + ROOM.kiosk[0], 0, ROOM.kiosk[1]); scene.add(k);
  rbox(1.2, 0.9, 0.6, 0x9fc39a, 0, 0.45, 0, k); rbox(1.25, 0.06, 0.65, 0xfff3e0, 0, 0.92, 0, k);
  const bk = rbox(0.42, 0.06, 0.32, 0xffffff, -0.2, 1.0, 0.05, k); bk.rotation.x = -0.3; const bk2 = rbox(0.42, 0.06, 0.32, 0x2fe3ff, 0.25, 1.0, 0.05, k); bk2.rotation.x = -0.3;
  const lab = labelSprite('🛠 布置型錄', { bg: '#7aa874', size: 0.28 }); lab.position.set(0, 1.6, 0); k.add(lab);
}
// 牆／地板材質
const floorTex = {
  wood: () => canvasTex(256, 256, (g) => { g.fillStyle = '#d99a5f'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#b97a43'; g.lineWidth = 4; for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); g.beginPath(); g.moveTo((y * 3) % 256, y); g.lineTo((y * 3) % 256, y + 32); g.stroke(); } }),
  pink: () => canvasTex(128, 128, (g) => { g.fillStyle = '#ffd1e3'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffc0d8'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(20 + (i % 3) * 44, 30 + Math.floor(i / 3) * 64, 10, 0, 7); g.fill(); } }),
  marble: () => canvasTex(256, 256, (g) => { g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#d7d2c8'; g.lineWidth = 2; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(Math.random() * 256, 0); g.bezierCurveTo(Math.random() * 256, 90, Math.random() * 256, 170, Math.random() * 256, 256); g.stroke(); } g.strokeStyle = '#e6e1d8'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); }),
  dark: () => canvasTex(128, 128, (g) => { g.fillStyle = '#2b3445'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#323c50'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); }),
  grid: () => canvasTex(128, 128, (g) => { g.fillStyle = '#141a2e'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#2fe3ff'; g.lineWidth = 3; g.shadowColor = '#2fe3ff'; g.shadowBlur = 8; g.strokeRect(2, 2, 124, 124); g.strokeStyle = '#b46bff'; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke(); }),
  coolTile: () => canvasTex(128, 128, (g) => { g.fillStyle = '#d5dce6'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#bcc6d3'; g.lineWidth = 3; g.strokeRect(1, 1, 126, 126); g.strokeRect(1, 1, 63, 63); g.strokeRect(64, 64, 63, 63); }),
  grass: () => canvasTex(128, 128, (g) => { g.fillStyle = '#8ad46a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#7cc75c'; for (let i = 0; i < 128; i += 16) g.fillRect(i, 0, 8, 128); }),
};
const wallTex = {
  cream: () => canvasTex(64, 64, (g) => { g.fillStyle = '#fff1dd'; g.fillRect(0, 0, 64, 64); }),
  mint: () => canvasTex(128, 128, (g) => { g.fillStyle = '#d8f5ea'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#bfecd9'; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 16, 128); }),
  stars: () => canvasTex(128, 128, (g) => { g.fillStyle = '#2f4a7a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#ffe08a'; g.font = '28px sans-serif'; for (let i = 0; i < 5; i++) g.fillText('★', (i * 37) % 110, 26 + (i * 29) % 110); }),
  navy: () => canvasTex(64, 64, (g) => { g.fillStyle = '#26324f'; g.fillRect(0, 0, 64, 64); }),
  circuit: () => canvasTex(256, 128, (g) => { g.fillStyle = '#123a2e'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#3cf2a0'; g.lineWidth = 3; for (let i = 0; i < 14; i++) { const x = (i * 53) % 256, y = (i * 37) % 128; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y); g.lineTo(x + 30, y + 24); g.stroke(); g.fillStyle = '#9dffd6'; g.beginPath(); g.arc(x + 30, y + 24, 4, 0, 7); g.fill(); } }),
  neon: () => canvasTex(256, 128, (g) => { const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#3a1d6e'); gr.addColorStop(1, '#6a1d5e'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#ff5fd2'; g.lineWidth = 4; g.shadowColor = '#ff5fd2'; g.shadowBlur = 10; for (let y = 20; y < 128; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } }),
  bluePanel: () => canvasTex(256, 256, (g) => { g.fillStyle = '#5d6f8f'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#4f607e'; g.fillRect(0, 150, 256, 106); g.fillStyle = '#9fb3d1'; g.fillRect(0, 146, 256, 4); g.strokeStyle = '#53647f'; g.lineWidth = 2; for (let x = 0; x < 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 146); g.stroke(); } }),
  brick: () => canvasTex(128, 128, (g) => { g.fillStyle = '#e9e1d6'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#d4805e'; for (let y = 0; y < 128; y += 32) for (let x = (y / 32 % 2) * 32 - 32; x < 128; x += 64) g.fillRect(x + 3, y + 3, 58, 26); }),
};
// 家具槽：每個有幾種樣式，第 0 種免費（空或基本款）。make(ox) 回傳要加進場景的 Group；room a＝我的辦公室、b＝阿傑的設計室
const P = (ox, x, z, ry = 0) => { const g = new THREE.Group(); g.position.set(ox + x, 0, z); g.rotation.y = ry; return g; };
const FURN_A = [
  { slot: 'floor', room: 'a', name: '地板', opts: [
    { name: '木地板', price: 0, tex: 'wood' }, { name: '粉紅地毯', price: 2500, tex: 'pink' }, { name: '大理石', price: 6000, tex: 'marble' }, { name: '草皮', price: 4000, tex: 'grass' }] },
  { slot: 'wall', room: 'a', name: '牆壁', opts: [
    { name: '奶油色', price: 0, tex: 'cream' }, { name: '薄荷條紋', price: 2000, tex: 'mint' }, { name: '星空', price: 5000, tex: 'stars' }, { name: '紅磚牆', price: 3500, tex: 'brick' }] },
  { slot: 'desk', room: 'a', name: '辦公桌', opts: [
    { name: '小木桌', price: 0, make: (ox) => { const g = P(ox, -5.8, -5.7); rbox(1.4, 0.08, 0.7, 0xc9915b, 0, 0.7, 0, g); for (const x of [-0.62, 0.62]) for (const z of [-0.28, 0.28]) cyl(0.04, 0.04, 0.7, 0x8a6a4c, x, 0.35, z, g); rbox(0.5, 0.32, 0.04, 0x2c3e57, 0, 0.92, -0.2, g); return g; } },
    { name: '電競桌', price: 6000, make: (ox) => { const g = P(ox, -5.8, -5.7); rbox(1.9, 0.08, 0.8, 0x2c3e57, 0, 0.72, 0, g); rbox(1.9, 0.04, 0.05, 0x00e5ff, 0, 0.7, 0.4, g, undefined).material = glow(0x00e5ff); for (const x of [-0.85, 0.85]) rbox(0.08, 0.7, 0.7, 0x1d2638, x, 0.35, 0, g); for (const [x, ry] of [[-0.45, 0.25], [0.45, -0.25]]) { const m = rbox(0.62, 0.38, 0.04, 0x111111, x, 1.0, -0.22, g); m.rotation.y = ry; box(0.56, 0.32, 0.01, glow(0x7b5cff), x, 1.0, -0.195, g).rotation.y = ry; } return g; } },
    { name: '總裁大桌', price: 15000, make: (ox) => { const g = P(ox, -5.8, -5.75); rbox(2.2, 0.75, 0.95, 0x6b3f22, 0, 0.375, 0, g); rbox(2.3, 0.07, 1.05, 0x3f2614, 0, 0.78, 0, g); rbox(2.2, 0.06, 0.04, 0xd9a63a, 0, 0.6, 0.49, g, gold); sphere(0.12, 0xffd34d, -0.8, 0.95, 0.1, g, gold); rbox(0.5, 0.08, 0.35, 0x2c3e57, 0.4, 0.86, 0, g); return g; } }] },
  { slot: 'chair', room: 'a', name: '椅子', opts: [
    { name: '小板凳', price: 0, make: (ox) => { const g = P(ox, -5.8, -4.9); cyl(0.22, 0.22, 0.06, 0xc9915b, 0, 0.45, 0, g); for (let i = 0; i < 3; i++) { const a = i * 2.1; cyl(0.03, 0.03, 0.45, 0x8a6a4c, Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15, g); } return g; } },
    { name: '電競椅', price: 3500, make: (ox) => { const g = P(ox, -5.8, -4.8, Math.PI); rbox(0.5, 0.12, 0.5, 0x1d2638, 0, 0.48, 0, g); rbox(0.5, 0.8, 0.12, 0xff3b5c, 0, 0.9, 0.22, g); rbox(0.3, 0.5, 0.13, 0x1d2638, 0, 0.92, 0.23, g); cyl(0.05, 0.05, 0.4, 0x666666, 0, 0.24, 0, g); return g; } },
    { name: '懶骨頭', price: 2500, make: (ox) => { const g = P(ox, -5.8, -4.7); const b = sphere(0.42, 0xff9a3d, 0, 0.3, 0, g); b.scale.set(1.1, 0.7, 1.1); return g; } }] },
  { slot: 'sofa', room: 'a', name: '沙發', opts: [
    { name: '（空）', price: 0 },
    { name: '雙人沙發', price: 4000, make: (ox) => { const g = P(ox, -6.75, -3.4, Math.PI / 2); rbox(1.8, 0.4, 0.75, 0x7b5cff, 0, 0.25, 0, g); rbox(1.8, 0.55, 0.2, 0x7b5cff, 0, 0.55, -0.3, g); for (const x of [-0.85, 0.85]) rbox(0.18, 0.45, 0.75, 0x6a4ce0, x, 0.35, 0, g); rbox(0.5, 0.35, 0.12, 0xffd34d, -0.4, 0.6, -0.15, g); return g; } },
    { name: 'L 型大沙發', price: 9000, make: (ox) => { const g = P(ox, -6.7, -3.7, Math.PI / 2); rbox(2.6, 0.4, 0.8, 0xff7a6b, 0, 0.25, 0, g); rbox(2.6, 0.55, 0.2, 0xff7a6b, 0, 0.55, -0.3, g); rbox(0.8, 0.4, 1.4, 0xff7a6b, -0.9, 0.25, 0.9, g); rbox(0.2, 0.55, 1.4, 0xff7a6b, -1.3, 0.55, 0.9, g); for (const [x, c] of [[0, 0xfff3e0], [0.6, 0xffd34d]]) rbox(0.45, 0.35, 0.12, c, x, 0.62, -0.12, g); return g; } }] },
  { slot: 'rug', room: 'a', name: '地毯', opts: [
    { name: '（空）', price: 0 },
    { name: '圓地毯', price: 1500, make: (ox) => { const g = P(ox, -5.6, -3.5); const r = cyl(1.2, 1.2, 0.02, 0xffd34d, 0, 0.012, 0, g); cyl(0.8, 0.8, 0.022, 0xff7a45, 0, 0.014, 0, g); return g; } },
    { name: '彩虹地毯', price: 3000, make: (ox) => { const g = P(ox, -5.6, -3.5); [0xff5d73, 0xff9a3d, 0xffd34d, 0x36c35d, 0x3fa7ff, 0xb46bff].forEach((c, i) => rbox(2.4, 0.02, 0.28, c, 0, 0.012, -0.7 + i * 0.28, g)); return g; } }] },
  { slot: 'plant', room: 'a', name: '植物', opts: [
    { name: '（空）', price: 0 },
    { name: '小盆栽', price: 800, make: (ox) => { const g = P(ox, -4.75, -6.1); cyl(0.25, 0.2, 0.36, 0xff8a5c, 0, 0.18, 0, g); for (let i = 0; i < 5; i++) { const l = sphere(0.24, 0x47b35a, Math.cos(i * 1.3) * 0.14, 0.55 + (i % 2) * 0.18, Math.sin(i * 1.3) * 0.14, g); l.scale.y = 1.2; } return g; } },
    { name: '龜背芋', price: 2000, make: (ox) => { const g = P(ox, -4.75, -6.1); cyl(0.3, 0.24, 0.45, 0xffffff, 0, 0.22, 0, g); for (let i = 0; i < 7; i++) { const a = i * 0.9, l = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), mat(0x2f9b50, { side: THREE.DoubleSide })); l.position.set(Math.cos(a) * 0.3, 0.9 + (i % 3) * 0.25, Math.sin(a) * 0.3); l.rotation.set(-0.9, a, 0); g.add(l); cyl(0.015, 0.015, 0.7, 0x2f7a40, Math.cos(a) * 0.15, 0.7, Math.sin(a) * 0.15, g); } return g; } },
    { name: '仙人掌三兄弟', price: 1500, make: (ox) => { const g = P(ox, -4.85, -6.1); [[-0.35, 0.5], [0, 0.8], [0.35, 0.6]].forEach(([x, h]) => { cyl(0.16, 0.14, 0.22, 0xc98a5a, x, 0.11, 0, g); cyl(0.11, 0.11, h, 0x47b35a, x, 0.22 + h / 2, 0, g); sphere(0.11, 0x47b35a, x, 0.22 + h, 0, g); sphere(0.05, 0xff6b8b, x, 0.33 + h, 0, g); }); return g; } }] },
  { slot: 'art', room: 'a', name: '牆上', opts: [
    { name: '（空）', price: 0 },
    { name: '貓咪海報', price: 1200, make: (ox) => { const g = P(ox, -5.8, -6.8); const t = canvasTex(128, 160, (c) => { c.fillStyle = '#ffd1e3'; c.fillRect(0, 0, 128, 160); c.font = '80px sans-serif'; c.textAlign = 'center'; c.fillText('🐱', 64, 100); c.fillStyle = '#ff4fa3'; c.font = '900 20px sans-serif'; c.fillText('MEOW', 64, 145); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ map: t })); m.position.set(0, 1.9, 0.02); g.add(m); return g; } },
    { name: '金唱片', price: 5000, make: (ox) => { const g = P(ox, -5.8, -6.8); rbox(1.1, 1.1, 0.05, 0x2c3e57, 0, 1.9, 0, g); const d = cyl(0.42, 0.42, 0.03, 0xffd34d, 0, 1.9, 0.05, g, gold); d.rotation.x = Math.PI / 2; return g; } },
    { name: '大電視', price: 8000, make: (ox) => { const g = P(ox, -5.8, -6.8); rbox(2.2, 1.24, 0.08, 0x111111, 0, 1.9, 0, g); const t = canvasTex(256, 144, (c) => { const gr = c.createLinearGradient(0, 0, 256, 144); gr.addColorStop(0, '#7b5cff'); gr.addColorStop(1, '#ff7ab8'); c.fillStyle = gr; c.fillRect(0, 0, 256, 144); c.fillStyle = '#fff'; c.font = '900 34px sans-serif'; c.textAlign = 'center'; c.fillText('上班啟示錄', 128, 82); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(2.06, 1.1), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(0, 1.9, 0.05); g.add(m); return g; } }] },
  { slot: 'lamp', room: 'a', name: '燈', opts: [
    { name: '（空）', price: 0 },
    { name: '落地燈', price: 1500, make: (ox) => { const g = P(ox, -6.85, -6.1); cyl(0.2, 0.25, 0.05, 0x2c3e57, 0, 0.03, 0, g); cyl(0.025, 0.025, 1.4, 0x2c3e57, 0, 0.72, 0, g); cyl(0.18, 0.3, 0.32, 0xfff3d0, 0, 1.5, 0, g); sphere(0.08, glow(0xfff0b0), 0, 1.4, 0, g); return g; } },
    { name: '星星吊燈', price: 4000, make: (ox) => { const g = P(ox, -5.8, -3.9); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; cyl(0.008, 0.008, 0.6, 0xffffff, Math.cos(a) * 0.5, 2.7, Math.sin(a) * 0.5, g); const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), glow([0xffe08a, 0xff9ad5, 0x9be7ff][i % 3])); s.position.set(Math.cos(a) * 0.5, 2.38, Math.sin(a) * 0.5); g.add(s); } return g; } }] },
  { slot: 'pet', room: 'a', name: '寵物', opts: [
    { name: '（空）', price: 0 },
    { name: '橘貓', price: 3000, pet: true, make: (ox) => { const g = P(ox, -5.6, -2.9); const b = sphere(0.22, 0xff9a3d, 0, 0.2, 0, g); b.scale.set(1, 0.8, 1.3); sphere(0.17, 0xff9a3d, 0, 0.36, 0.26, g); for (const x of [-0.09, 0.09]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), mat(0xff9a3d)); e.position.set(x, 0.52, 0.26); g.add(e); sphere(0.025, 0x222222, x * 0.8, 0.39, 0.41, g); } const tl = cyl(0.03, 0.03, 0.35, 0xff9a3d, 0, 0.3, -0.3, g); tl.rotation.x = -0.7; return g; } },
    { name: '柴犬', price: 3500, pet: true, make: (ox) => { const g = P(ox, -5.6, -2.9); const b = sphere(0.24, 0xe8a25a, 0, 0.24, 0, g); b.scale.set(1, 0.85, 1.35); const h = sphere(0.18, 0xe8a25a, 0, 0.42, 0.28, g); sphere(0.1, 0xfff3e0, 0, 0.38, 0.42, g); sphere(0.03, 0x222222, 0, 0.42, 0.51, g); for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), mat(0xe8a25a)); e.position.set(x, 0.6, 0.26); g.add(e); } const tl = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 12, Math.PI * 1.5), mat(0xe8a25a)); tl.position.set(0, 0.42, -0.3); tl.rotation.y = Math.PI / 2; g.add(tl); return g; } }] },
];
// 阿傑的設計室（科技風）：右邊那間，x 0.3 ~ 7.2
const glowM = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const FURN_B = [
  { slot: 'j_floor', room: 'b', name: '地板', opts: [{ name: '深灰地墊', price: 0, tex: 'dark' }, { name: '霓虹格線', price: 5000, tex: 'grid' }, { name: '木地板', price: 2500, tex: 'wood' }] },
  { slot: 'j_wall', room: 'b', name: '牆壁', opts: [{ name: '深藍', price: 0, tex: 'navy' }, { name: '電路板', price: 4000, tex: 'circuit' }, { name: '霓虹紫', price: 4500, tex: 'neon' }] },
  { slot: 'j_desk', room: 'b', name: '工作桌', opts: [
    { name: '雙螢幕桌', price: 0, make: (ox) => { const g = P(ox, 3.6, -5.6); rbox(1.8, 0.07, 0.8, 0x3a4256, 0, 0.72, 0, g); for (const x of [-0.8, 0.8]) rbox(0.07, 0.7, 0.7, 0x2c3e57, x, 0.36, 0, g); for (const x of [-0.38, 0.38]) { rbox(0.68, 0.4, 0.04, 0x111111, x, 1.02, -0.25, g); box(0.62, 0.34, 0.01, glowM(0x7fd1ff), x, 1.02, -0.225, g); } rbox(0.5, 0.03, 0.18, 0x222831, 0, 0.77, 0.15, g); return g; } },
    { name: '三螢幕曲面', price: 8000, make: (ox) => { const g = P(ox, 3.6, -5.6); rbox(2.2, 0.07, 0.85, 0x111111, 0, 0.74, 0, g); rbox(2.2, 0.03, 0.04, 0xff2bd6, 0, 0.71, 0.43, g).material = glowM(0xff2bd6); for (const x of [-1.0, 1.0]) rbox(0.08, 0.72, 0.75, 0x1d2638, x, 0.37, 0, g); [[-0.72, 0.45], [0, 0], [0.72, -0.45]].forEach(([x, ry]) => { const m = rbox(0.7, 0.42, 0.04, 0x111111, x, 1.06, -0.24 + Math.abs(x) * 0.12, g); m.rotation.y = ry; const s = box(0.64, 0.36, 0.01, glowM([0x7b5cff, 0x2fe3ff, 0xff7ab8][Math.round(x / 0.72) + 1]), x, 1.06, -0.215 + Math.abs(x) * 0.12, g); s.rotation.y = ry; }); return g; } },
    { name: '全息投影桌', price: 18000, make: (ox) => { const g = P(ox, 3.6, -5.5); rbox(2.0, 0.75, 0.9, 0xeef3fa, 0, 0.375, 0, g); rbox(2.05, 0.04, 0.95, 0x2fe3ff, 0, 0.77, 0, g).material = glowM(0x2fe3ff); const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshBasicMaterial({ color: 0x7fe9ff, wireframe: true, transparent: true, opacity: 0.8, toneMapped: false })); holo.position.set(0, 1.35, 0); g.add(holo); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x2fe3ff, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false })); cone.position.set(0, 1.08, 0); cone.rotation.x = Math.PI; g.add(cone); g.userData.tick = (dt) => { holo.rotation.y += dt * 1.2; holo.rotation.x += dt * 0.5; }; return g; } }] },
  { slot: 'j_chair', room: 'b', name: '椅子', opts: [
    { name: '網椅', price: 0, make: (ox) => { const g = P(ox, 3.6, -4.7, Math.PI); rbox(0.48, 0.1, 0.48, 0x2c3e57, 0, 0.47, 0, g); rbox(0.46, 0.6, 0.06, 0x3a4256, 0, 0.82, 0.22, g); cyl(0.04, 0.04, 0.4, 0x666666, 0, 0.24, 0, g); return g; } },
    { name: '電競椅', price: 3500, make: (ox) => { const g = P(ox, 3.6, -4.65, Math.PI); rbox(0.5, 0.12, 0.5, 0x1d2638, 0, 0.48, 0, g); rbox(0.5, 0.8, 0.12, 0x7b5cff, 0, 0.9, 0.22, g); rbox(0.3, 0.5, 0.13, 0x1d2638, 0, 0.92, 0.23, g); cyl(0.05, 0.05, 0.4, 0x666666, 0, 0.24, 0, g); return g; } },
    { name: '黑金人體工學椅', price: 6000, make: (ox) => { const g = P(ox, 3.6, -4.65, Math.PI); rbox(0.52, 0.12, 0.52, 0x111111, 0, 0.5, 0, g); rbox(0.5, 0.85, 0.1, 0x111111, 0, 0.95, 0.23, g); rbox(0.52, 0.04, 0.04, 0xd9a63a, 0, 1.38, 0.24, g, gold); for (const x of [-0.27, 0.27]) rbox(0.05, 0.25, 0.4, 0xd9a63a, x, 0.65, 0.02, g, gold); cyl(0.05, 0.05, 0.42, 0xd9a63a, 0, 0.24, 0, g, gold); return g; } }] },
  { slot: 'j_light', room: 'b', name: '燈光', opts: [
    { name: '（空）', price: 0 },
    { name: 'RGB 燈條', price: 2500, make: (ox) => { const g = P(ox, 3.7, -6.82); const strip = box(6.6, 0.05, 0.03, glowM(0xff2bd6), 0, 2.6, 0, g); g.userData.tick = (dt, t) => strip.material.color.setHSL((t * 0.15) % 1, 1, 0.6); return g; } },
    { name: '霓虹招牌 DESIGN', price: 5000, make: (ox) => { const g = P(ox, 2.1, -6.8); const t = canvasTex(512, 160, (c, W, H) => { c.fillStyle = '#ffffff00'; c.clearRect(0, 0, W, H); c.font = `900 110px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ff2bd6'; c.shadowBlur = 24; c.fillStyle = '#ffd1f4'; c.fillText('DESIGN', W / 2, H / 2 + 4); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })); m.position.set(0, 2.15, 0.03); g.add(m); return g; } }] },
  { slot: 'j_rack', room: 'b', name: '設備', opts: [
    { name: '（空）', price: 0 },
    { name: '伺服器機櫃', price: 4000, make: (ox) => { const g = P(ox, 6.6, -6.0); rbox(0.7, 1.7, 0.6, 0x1d2638, 0, 0.85, 0, g); const leds = []; for (let r = 0; r < 7; r++) { box(0.6, 0.16, 0.02, 0x2c3e57, 0, 0.35 + r * 0.2, 0.31, g); for (let k = 0; k < 3; k++) leds.push(box(0.04, 0.03, 0.01, glowM([0x36c35d, 0x2fe3ff, 0xffd34d][k]), -0.22 + k * 0.08, 0.35 + r * 0.2, 0.325, g)); } g.userData.tick = (dt, t) => leds.forEach((l, i) => l.visible = Math.sin(t * (3 + i % 5) + i) > -0.3); return g; } },
    { name: '3D 印表機', price: 7000, make: (ox) => { const g = P(ox, 6.5, -6.0); rbox(0.8, 0.7, 0.7, 0x2c3e57, 0, 0.35, 0, g); const frame = new THREE.Group(); frame.position.y = 0.7; g.add(frame); for (const x of [-0.35, 0.35]) for (const z of [-0.3, 0.3]) cyl(0.025, 0.025, 0.8, 0xcccccc, x, 0.4, z, frame); rbox(0.76, 0.05, 0.66, 0x666666, 0, 0.82, 0, frame); const head = rbox(0.14, 0.1, 0.14, 0xff7a45, 0, 0.7, 0, frame); const part = sphere(0.14, 0x7b5cff, 0, 0.12, 0, frame); part.scale.y = 0.6; g.userData.tick = (dt, t) => { head.position.x = Math.sin(t * 3) * 0.25; head.position.z = Math.cos(t * 2.3) * 0.2; }; return g; } }] },
  { slot: 'j_figure', room: 'b', name: '收藏', opts: [
    { name: '（空）', price: 0 },
    { name: '公仔展示櫃', price: 3000, make: (ox) => { const g = P(ox, 6.7, -3.6, -Math.PI / 2); rbox(1.4, 1.5, 0.4, 0xffffff, 0, 0.75, 0, g); const glass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.02), new THREE.MeshStandardMaterial({ color: 0xcdeeff, transparent: true, opacity: 0.3 })); glass.position.set(0, 0.75, 0.21); g.add(glass); for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { const c = [0xff5d73, 0xffd34d, 0x3fa7ff, 0x36c35d, 0xb46bff][(r * 3 + k) % 5]; sphere(0.08, c, -0.4 + k * 0.4, 0.3 + r * 0.45 + 0.1, 0.05, g); rbox(0.1, 0.12, 0.08, c, -0.4 + k * 0.4, 0.3 + r * 0.45, 0.05, g); } return g; } },
    { name: '巨大機器人模型', price: 9000, make: (ox) => { const g = P(ox, 6.5, -3.6, -Math.PI / 2 - 0.4); rbox(0.6, 0.1, 0.6, 0x2c3e57, 0, 0.05, 0, g); for (const x of [-0.12, 0.12]) rbox(0.14, 0.5, 0.16, 0xffffff, x, 0.35, 0, g); rbox(0.5, 0.45, 0.3, 0x3f6fe0, 0, 0.82, 0, g); rbox(0.2, 0.1, 0.05, 0xffd34d, 0, 0.9, 0.16, g); for (const x of [-0.33, 0.33]) rbox(0.14, 0.45, 0.16, 0xffffff, x, 0.8, 0, g); rbox(0.24, 0.22, 0.24, 0xffffff, 0, 1.17, 0, g); box(0.16, 0.05, 0.01, glowM(0x2fe3ff), 0, 1.19, 0.125, g); const ant = cyl(0.015, 0.015, 0.2, 0xffd34d, 0, 1.38, 0, g); return g; } }] },
  { slot: 'j_art', room: 'b', name: '牆上', opts: [
    { name: '（空）', price: 0 },
    { name: '作品牆', price: 2500, make: (ox) => { const g = P(ox, 5.6, -6.8); [[-0.75, 0.15, 0xff7ab8], [0, -0.1, 0x7fd1ff], [0.75, 0.1, 0xffd34d]].forEach(([x, y, c]) => { rbox(0.6, 0.45, 0.03, 0xffffff, x, 2.45 + y, 0, g); box(0.52, 0.37, 0.01, c, x, 2.45 + y, 0.02, g); }); return g; } },
    { name: '繪圖板展示', price: 4500, make: (ox) => { const g = P(ox, 1.0, -6.0); rbox(0.08, 0.9, 0.08, 0x666666, 0, 0.45, 0, g); const pad = rbox(0.9, 0.6, 0.05, 0x111111, 0, 1.15, 0, g); pad.rotation.x = -0.3; const scr = box(0.82, 0.52, 0.01, glowM(0xffb3d9), 0, 1.15, 0.03, g); scr.rotation.x = -0.3; return g; } }] },
  { slot: 'j_plant', room: 'b', name: '植物', opts: [
    { name: '（空）', price: 0 },
    { name: '多肉盆栽', price: 800, make: (ox) => { const g = P(ox, 0.8, -3.0); cyl(0.2, 0.16, 0.25, 0x2c3e57, 0, 0.12, 0, g); for (let i = 0; i < 6; i++) { const l = sphere(0.09, 0x6fcf97, Math.cos(i) * 0.1, 0.3 + (i % 2) * 0.05, Math.sin(i) * 0.1, g); l.scale.y = 1.4; } return g; } },
    { name: '霓虹仙人掌燈', price: 2000, make: (ox) => { const g = P(ox, 0.8, -3.0); cyl(0.18, 0.16, 0.2, 0x111111, 0, 0.1, 0, g); cyl(0.09, 0.09, 0.6, glowM(0x6fff9e), 0, 0.5, 0, g); for (const s of [-1, 1]) { const arm = cyl(0.06, 0.06, 0.25, glowM(0x6fff9e), s * 0.14, 0.55, 0, g); const up = cyl(0.06, 0.06, 0.2, glowM(0x6fff9e), s * 0.2, 0.68, 0, g); arm.rotation.z = Math.PI / 2; } return g; } }] },
];
export const FURN = FURN_A;   // v0.9：家具型錄只剩小葵的辦公室
export const FURN_B_OLD = FURN_B;   // 舊的阿傑設計室家具：退錢用、Kevin 辦公室拿來擺
export function setRoomTex(mesh, kind, key) {
  const t = (kind === 'floor' ? floorTex : wallTex)[key](); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (kind === 'floor') t.repeat.set(3, 2.2); else t.repeat.set(4, 1.5);
  mesh.material.map = t; mesh.material.needsUpdate = true;
}
// Kevin 辦公室的地板、後牆（給 setRoomTex 換材質）
export function roomShell(ox) {
  const mk = (x, w) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 4.5), new THREE.MeshStandardMaterial({ roughness: 0.8 })); f.rotation.x = -Math.PI / 2; f.position.set(ox + x, 0.003, -4.25); f.receiveShadow = true; scene.add(f);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 3.0, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.9 })); b.position.set(ox + x, 1.5, -7.0); scene.add(b);
    return { floor: f, back: b };
  };
  return { b: mk(2.95, 8.8) };   // 員工辦公室的地板和牆在 deco.js
}
