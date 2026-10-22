// 設施：咖啡機、印表機、電話總機。每一級外觀不同、數值不同，Lv5 是產線
import * as THREE from 'three';
import { scene, rbox, box, cyl, sphere, mat, canvasTex, labelSprite, FONT, V } from './world.js?v=0.2.0';

// ---------- 數值表（調平衡只改這裡） ----------
// brew：幾秒做一個；tray：出貨口最多堆幾個；price：一個賣幾元；cost：升到這一級要多少錢
export const STATIONS = {
  coffee: {
    name: '咖啡機', item: 'coffee', levels: [
      { title: '爛爛的咖啡機', brew: 1.6, tray: 6, price: 10, cost: 0 },
      { title: '家用咖啡機', brew: 1.1, tray: 10, price: 15, cost: 120 },
      { title: '義式咖啡機', brew: 0.8, tray: 14, price: 25, cost: 450 },
      { title: '高級咖啡機', brew: 0.55, tray: 18, price: 40, cost: 1400 },
      { title: '咖啡產線', brew: 0.32, tray: 0, price: 60, cost: 4000, line: true },
    ],
  },
  printer: {
    name: '印表機', item: 'doc', unlock: 350, levels: [
      { title: '舊噴墨印表機', brew: 2.0, tray: 6, price: 20, cost: 0 },
      { title: '雷射印表機', brew: 1.4, tray: 10, price: 30, cost: 700 },
      { title: '大型影印機', brew: 1.0, tray: 14, price: 45, cost: 1800 },
      { title: '彩色影印中心', brew: 0.7, tray: 18, price: 70, cost: 4500 },
      { title: '印刷產線', brew: 0.42, tray: 0, price: 100, cost: 10000, line: true },
    ],
  },
  phone: {
    name: '電話總機', unlock: 900, levels: [
      { title: '一線電話', lines: 1, ringEvery: 3.2, price: 20, cost: 0 },
      { title: '雙線總機', lines: 2, ringEvery: 2.9, price: 30, cost: 1200 },
      { title: '四線總機', lines: 4, ringEvery: 2.6, price: 45, cost: 3000 },
      { title: '六線總機', lines: 6, ringEvery: 2.3, price: 65, cost: 7000 },
      { title: '八線客服中心', lines: 8, ringEvery: 2.0, price: 90, cost: 14000 },
    ],
  },
};

// ---------- 貨品：咖啡杯、文件 ----------
const G = {
  cup: new THREE.CylinderGeometry(0.085, 0.068, 0.15, 14), sleeve: new THREE.CylinderGeometry(0.084, 0.076, 0.06, 14), lid: new THREE.CylinderGeometry(0.092, 0.092, 0.028, 14),
  ream: new THREE.BoxGeometry(0.26, 0.075, 0.19), band: new THREE.BoxGeometry(0.265, 0.077, 0.06),
  bill: new THREE.BoxGeometry(0.3, 0.04, 0.17), billBand: new THREE.BoxGeometry(0.08, 0.042, 0.172),
};
export const ITEM_H = { coffee: 0.13, doc: 0.08 };
export function makeItem(type) {
  const g = new THREE.Group();
  if (type === 'coffee') {
    const c = new THREE.Mesh(G.cup, mat(0xfffaf0)), s = new THREE.Mesh(G.sleeve, mat(0xd9773b)), l = new THREE.Mesh(G.lid, mat(0x5a3a2a));
    s.position.y = -0.005; l.position.y = 0.085; g.add(c, s, l);
  } else {
    const r = new THREE.Mesh(G.ream, mat(0xffffff)), b = new THREE.Mesh(G.band, mat(0x3fa7ff));
    g.add(r, b);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g); return g;
}
export function makeBill() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(G.bill, mat(0x36c35d)), d = new THREE.Mesh(G.billBand, mat(0xe3f6c8));
  b.castShadow = true; g.add(b, d); scene.add(g); return g;
}

// ---------- 外觀：每一級一個樣子 ----------
// 回傳 { g（群組）, out（出貨口的相對位置）, tick(dt, t)（冒煙、閃光等小動畫） }
const chrome = { metalness: 0.85, roughness: 0.25 }, gold = { metalness: 0.9, roughness: 0.3 };
const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

function coffeeLook(lv, fx) {
  const g = new THREE.Group(); let tick = () => {};
  if (lv === 0) {   // 爛爛的：小小一台、歪一邊、貼膠帶、會冒煙
    const body = rbox(0.75, 0.85, 0.6, 0x8a6a4c, 0, 0.43, 0, g); body.rotation.z = 0.07;
    rbox(0.8, 0.12, 0.65, 0x5b4636, -0.03, 0.9, 0, g).rotation.z = 0.07;
    box(0.5, 0.08, 0.02, 0xc8c3b4, 0.05, 0.6, 0.31, g).rotation.z = -0.5;   // 膠帶
    box(0.5, 0.08, 0.02, 0xc8c3b4, 0.05, 0.6, 0.31, g).rotation.z = 0.5;
    cyl(0.05, 0.05, 0.12, 0x444444, 0.12, 0.52, 0.28, g);
    let pt = 0; tick = (dt, t, pos) => { pt += dt; if (pt > 0.9) { pt = 0; fx.puff(V(pos.x - 0.1, 1.05, pos.z)); } };
    return { g, out: V(0.12, 0.46, 0.38), tick };
  }
  if (lv === 1) {   // 家用：白色圓潤
    rbox(0.85, 1.0, 0.65, 0xfaf6ee, 0, 0.5, 0, g);
    rbox(0.88, 0.14, 0.68, 0x2f3542, 0, 1.03, 0, g);
    cyl(0.07, 0.07, 0.14, 0xcfd5dc, 0.15, 0.62, 0.3, g, chrome);
    rbox(0.28, 0.16, 0.04, 0x2f3542, -0.18, 0.78, 0.33, g);
    sphere(0.035, glowMat(0x5fe07a), -0.18, 0.78, 0.36, g);
    return { g, out: V(0.15, 0.52, 0.4), tick };
  }
  if (lv === 2) {   // 義式：不鏽鋼、兩個沖煮頭、壓力錶、蒸氣管
    rbox(1.25, 1.05, 0.8, 0xdfe5ec, 0, 0.53, 0, g, chrome);
    rbox(1.3, 0.12, 0.84, 0x31353d, 0, 1.1, 0, g);
    for (const x of [-0.28, 0.28]) { cyl(0.09, 0.07, 0.12, 0x9aa3ad, x, 0.68, 0.38, g, chrome); box(0.05, 0.05, 0.3, 0x5a3a2a, x, 0.66, 0.6, g); }
    const gauge = cyl(0.12, 0.12, 0.04, 0xffffff, 0, 0.92, 0.41, g); gauge.rotation.x = Math.PI / 2;
    box(0.01, 0.09, 0.01, 0xe0413b, 0, 0.94, 0.44, g);
    for (const x of [-0.4, -0.15, 0.15, 0.4]) cyl(0.06, 0.05, 0.08, 0xffffff, x, 1.2, 0, g);   // 上面放杯子
    let pt = 0; tick = (dt, t, pos) => { pt += dt; if (pt > 1.4) { pt = 0; fx.puff(V(pos.x + 0.55, 0.9, pos.z + 0.4), 0xffffff); } };
    return { g, out: V(0.28, 0.55, 0.45), tick };
  }
  // lv 3、4：高級（黑金、發光面板、三個沖煮頭、星星）；產線版再大一點加霓虹招牌
  const big = lv === 4 ? 1.15 : 1;
  const inner = new THREE.Group(); inner.scale.setScalar(big); g.add(inner);
  rbox(1.5, 1.15, 0.9, 0x22232a, 0, 0.58, 0, inner, { roughness: 0.35 });
  rbox(1.56, 0.1, 0.94, 0xd9a63a, 0, 1.2, 0, inner, gold);
  rbox(1.56, 0.08, 0.94, 0xd9a63a, 0, 0.04, 0, inner, gold);
  for (const x of [-0.45, 0, 0.45]) { cyl(0.09, 0.07, 0.12, 0xd9a63a, x, 0.72, 0.45, inner, gold); box(0.05, 0.05, 0.3, 0x3a2a20, x, 0.7, 0.67, inner); }
  const panel = rbox(0.9, 0.18, 0.04, glowMat(0xffb347), 0, 0.98, 0.46, inner);
  if (lv === 4) {
    const sign = labelSprite('☕ COFFEE', { bg: '#ff4fa3', size: 0.42, glow: true }); sign.position.set(0, 1.85, 0); g.add(sign);
  }
  let st = 0;
  tick = (dt, t, pos) => {
    panel.material.color.setHSL(0.09 + Math.sin(t * 2) * 0.02, 1, 0.6);
    st += dt; if (st > 0.35) { st = 0; fx.sparkle(V(pos.x + (Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 1.2, pos.z + 0.3 + Math.random() * 0.3)); }
  };
  return { g, out: V(0.45 * big, 0.6 * big, 0.5 * big), tick };
}

function printerLook(lv, fx) {
  const g = new THREE.Group(); let tick = () => {};
  if (lv === 0) {   // 舊噴墨：小、米黃色、卡紙紅燈一直閃
    rbox(0.8, 0.38, 0.55, 0xe9e0c8, 0, 0.45, 0, g);
    box(0.5, 0.02, 0.3, 0xffffff, 0, 0.66, -0.15, g).rotation.x = -0.6;   // 進紙
    box(0.5, 0.02, 0.25, 0xd9cfb5, 0, 0.3, 0.35, g);
    cyl(0.3, 0.35, 0.26, 0x9a8f7a, 0, 0.13, 0, g);   // 小桌子
    const led = sphere(0.035, glowMat(0xff3b30), 0.3, 0.58, 0.28, g);
    tick = (dt, t) => { led.visible = Math.sin(t * 9) > 0; };
    return { g, out: V(0, 0.36, 0.45), tick };
  }
  if (lv === 1) {   // 雷射：灰色、方正
    rbox(0.95, 0.6, 0.7, 0xd5d9df, 0, 0.3, 0, g);
    rbox(0.98, 0.1, 0.72, 0x3a3f48, 0, 0.64, 0, g);
    box(0.6, 0.03, 0.3, 0x3a3f48, 0, 0.45, 0.38, g);
    sphere(0.03, glowMat(0x5fe07a), 0.35, 0.55, 0.36, g);
    return { g, out: V(0, 0.5, 0.48), tick };
  }
  if (lv === 2) {   // 大型影印機：高、有掃描蓋、藍色操作面板、抽屜
    rbox(1.1, 1.0, 0.8, 0xf2f3f5, 0, 0.5, 0, g);
    rbox(1.12, 0.1, 0.82, 0x3a3f48, 0, 1.05, 0, g);
    for (const y of [0.18, 0.4]) box(0.9, 0.02, 0.02, 0xb8bec7, 0, y, 0.41, g);
    rbox(0.35, 0.14, 0.2, glowMat(0x3fa7ff), 0.3, 1.0, 0.36, g);
    box(0.7, 0.03, 0.35, 0xb8bec7, -0.1, 0.72, 0.5, g);
    return { g, out: V(-0.1, 0.76, 0.58), tick };
  }
  // 3：彩色影印中心（CMYK 條紋＋大螢幕）；4：印刷產線（加滾筒＋霓虹）
  const big = lv === 4 ? 1.15 : 1;
  const inner = new THREE.Group(); inner.scale.setScalar(big); g.add(inner);
  rbox(1.45, 1.15, 0.9, 0xffffff, 0, 0.58, 0, inner);
  [0x00b7eb, 0xff2d95, 0xffe600, 0x222222].forEach((c, i) => box(1.46, 0.07, 0.91, c, 0, 0.2 + i * 0.09, 0, inner));
  const screen = rbox(0.6, 0.3, 0.04, glowMat(0x7fd1ff), 0.3, 0.95, 0.46, inner);
  box(0.8, 0.03, 0.4, 0xb8bec7, -0.2, 0.75, 0.55, inner);
  const rollers = [];
  if (lv === 4) {
    for (const x of [-0.5, 0, 0.5]) { const r = cyl(0.11, 0.11, 0.95, 0xd9a63a, x, 1.35, 0, inner, gold); r.rotation.x = Math.PI / 2; rollers.push(r); }
    const sign = labelSprite('🖨 PRINT', { bg: '#3fa7ff', size: 0.42, glow: true }); sign.position.set(0, 2.0, 0); g.add(sign);
  }
  let st = 0;
  tick = (dt, t, pos) => {
    screen.material.color.setHSL((t * 0.15) % 1, 0.8, 0.65);
    rollers.forEach(r => { r.rotation.y += dt * 6; });
    st += dt; if (st > 0.45) { st = 0; fx.sparkle(V(pos.x + (Math.random() - 0.5) * 1.5, 0.4 + Math.random() * 1.2, pos.z + 0.4), [0x00b7eb, 0xff2d95, 0xffe600][Math.floor(Math.random() * 3)]); }
  };
  return { g, out: V(-0.2 * big, 0.8 * big, 0.6 * big), tick };
}

// 電話總機：一張桌子，線數＝電話數。回傳每支電話的位置（響鈴時要跳）
function phoneLook(lv, fx) {
  const g = new THREE.Group(); const L = STATIONS.phone.levels[lv];
  const w = 1.2 + L.lines * 0.22;
  rbox(w, 0.62, 0.8, lv >= 3 ? 0x6b4a8a : 0xc9915b, 0, 0.31, 0, g);
  rbox(w + 0.06, 0.06, 0.86, lv >= 3 ? 0xf2e6ff : 0xf0e2c8, 0, 0.65, 0, g);
  const phones = [];
  for (let i = 0; i < L.lines; i++) {
    const x = (i - (L.lines - 1) / 2) * Math.min(0.32, (w - 0.3) / L.lines);
    const p = new THREE.Group(); p.position.set(x, 0.7, 0.12); g.add(p);
    rbox(0.18, 0.06, 0.2, lv >= 2 ? 0x2f3542 : 0xb04a3a, 0, 0.03, 0, p);
    const hand = rbox(0.2, 0.05, 0.06, lv >= 2 ? 0x3a3f48 : 0x8a3a2e, 0, 0.09, -0.05, p);
    phones.push({ g: p, hand });
  }
  if (lv >= 2) for (let i = 0; i < Math.min(3, Math.ceil(L.lines / 2)); i++) {   // 螢幕
    const x = (i - (Math.min(3, Math.ceil(L.lines / 2)) - 1) / 2) * 0.55;
    rbox(0.45, 0.3, 0.04, 0x222831, x, 0.92, -0.28, g); box(0.4, 0.24, 0.01, glowMat(0x4ecbff), x, 0.92, -0.255, g);
  }
  if (lv === 4) { const sign = labelSprite('☎ 客服中心', { bg: '#7b5cff', size: 0.42, glow: true }); sign.position.set(0, 1.75, 0); g.add(sign); }
  return { g, phones, tick: () => {} };
}

export const LOOKS = { coffee: coffeeLook, printer: printerLook, phone: phoneLook };

// ---------- 產線輸送帶 ----------
// path：[x,z] 的折線（地面座標），貨品會從頭跑到尾
const beltTex = canvasTex(64, 64, (g, W, H) => { g.fillStyle = '#2b2f36'; g.fillRect(0, 0, W, H); g.fillStyle = '#3d434c'; g.fillRect(0, 0, W, H / 4); g.fillStyle = '#ffcf3f'; g.fillRect(0, H / 2 - 2, W, 4); });
beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
export function buildBelt(path, height = 0.5) {
  const g = new THREE.Group(); scene.add(g);
  const mats = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, z1] = path[i], [x2, z2] = path[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
    const seg = new THREE.Group(); seg.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); seg.rotation.y = ang; g.add(seg);
    rbox(0.5, height - 0.06, len + 0.4, 0xff8a3d, 0, (height - 0.06) / 2, 0, seg);           // 橘色機身
    const t = beltTex.clone(); t.needsUpdate = true; t.repeat.set(1, len * 3);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.4, len + 0.4), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    top.rotation.x = -Math.PI / 2; top.position.y = height + 0.001; seg.add(top); mats.push(t);
    for (const s of [-0.24, 0.24]) box(0.04, 0.08, len + 0.4, 0xffe08a, s, height + 0.03, 0, seg, { metalness: 0.6, roughness: 0.3 });   // 金色護欄
  }
  const lens = []; let total = 0;
  for (let i = 0; i < path.length - 1; i++) { const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]); lens.push(l); total += l; }
  // 沿路取點：d＝從起點走了多遠
  function at(d) {
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i]) { const k = d / lens[i]; return V(path[i][0] + (path[i + 1][0] - path[i][0]) * k, height + 0.08, path[i][1] + (path[i + 1][1] - path[i][1]) * k); }
      d -= lens[i];
    }
    const e = path[path.length - 1]; return V(e[0], height + 0.08, e[1]);
  }
  return { g, at, total, tick(dt, speed) { mats.forEach(t => { t.offset.y -= dt * speed * 3; }); } };
}

// 設施頭上的名牌：名稱＋星星
export function levelBadge(name, lv) {
  const t = canvasTex(512, 160, (g, W, H) => {
    g.fillStyle = '#2c3e57e6'; g.beginPath(); g.roundRect(40, 20, W - 80, 120, 50); g.fill();
    g.fillStyle = '#fff'; g.font = `900 52px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, W / 2, 62);
    g.fillStyle = '#ffd34d'; g.font = `900 40px ${FONT}`;
    g.fillText('★'.repeat(lv + 1) + '☆'.repeat(4 - lv), W / 2, 112);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.6, 0.5, 1); s.renderOrder = 8; return s;
}
