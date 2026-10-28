// 2F 員工辦公室（小葵＋阿傑共用）：動森風自由布置（v0.16）
// 0.5 公尺一格，點家具拿起、拖曳吸附格子，底下四顆大按鈕：旋轉、放好、收起來、復原
// 型錄分三個系列（清新木作、復古文具、夜班科技）＋寵物、牆面、地板；靠升職和任務永久解鎖，沒有等待或登入
// 評分取代以前的「每件 +2%」：機能、綠意、豐富、系列、展示，最高 100 分 ＝ 1F 收入 +10%，拿過的最高分永久保留
import * as THREE from 'three';
import { scene, camera, renderer, rbox, box, cyl, sphere, mat, canvasTex, FONT } from './world.js?v=0.19.0';

// 房間格子（2F 本地座標，x 再加上 2F 的 ox）：寬 11 格 × 深 9 格，前牆中間是門
export const DECO_ROOM = { x0: -7.05, z0: -6.5, cols: 11, rows: 9, cell: 0.5, wallZ: -6.84, door: [4, 5, 6] };   // door：最前排這幾欄要留給門口
const C = DECO_ROOM.cell;

// ---------- 配色（每個系列一個主色＋一個點綴色） ----------
const P = {
  wood: { body: 0xd7a873, dark: 0xb5824f, main: 0x9fc39a, accent: 0xfff3e0 },     // 淺橡木＋鼠尾草綠
  retro: { body: 0xf4e3c3, dark: 0xc98b5a, main: 0xf0806a, accent: 0xe9b949 },    // 奶油＋珊瑚＋芥末黃
  tech: { body: 0x3a4766, dark: 0x252f47, main: 0x8ea3c2, accent: 0x63d6ea },     // 深藍灰＋冰藍
  basic: { body: 0xe6d3b3, dark: 0xb59a76, main: 0xcfc6b8, accent: 0xffffff },
};
const glow = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const legs = (g, w, d, h, c, r = 0.035) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(r * 1.2, r, h, c, sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08), g); };
const G = () => new THREE.Group();

// ---------- 家具造型（都朝 +z、中心在原點；圓角、粗短腳、少量細節） ----------
const B = {
  desk: (p, w = 1.4, d = 0.8, tech = false) => { const g = G(); rbox(w, 0.09, d, p.body, 0, 0.72, 0, g); if (tech) { for (const x of [-1, 1]) rbox(0.09, 0.68, d - 0.12, p.dark, x * (w / 2 - 0.1), 0.34, 0, g); box(w - 0.1, 0.02, 0.02, glow(p.accent), 0, 0.68, d / 2 - 0.02, g); } else { legs(g, w, d, 0.68, p.dark); rbox(0.42, 0.24, d - 0.12, p.dark, w / 2 - 0.3, 0.55, 0, g); sphere(0.03, p.accent, w / 2 - 0.3, 0.55, d / 2 - 0.04, g); } return g; },
  laptop: (g, x = 0, z = 0, y = 0.77, c = 0x9aa3ad) => { rbox(0.42, 0.025, 0.3, c, x, y, z + 0.02, g); const lid = rbox(0.42, 0.28, 0.02, c, x, y + 0.14, z - 0.13, g); lid.rotation.x = -0.25; const s = box(0.36, 0.22, 0.005, glow(0xbfe6ff), x, y + 0.14, z - 0.115, g); s.rotation.x = -0.25; },
  chair: (p, tech = false) => { const g = G(); rbox(0.5, 0.1, 0.48, p.main, 0, 0.46, 0, g); const back = rbox(0.48, tech ? 0.7 : 0.48, 0.1, tech ? p.dark : p.main, 0, tech ? 0.86 : 0.74, -0.22, g); back.rotation.x = -0.08; if (tech) rbox(0.28, 0.4, 0.11, p.main, 0, 0.92, -0.215, g); cyl(0.04, 0.04, 0.34, 0x6b6f78, 0, 0.24, 0, g); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, s = rbox(0.28, 0.04, 0.06, 0x555a63, Math.cos(a) * 0.13, 0.05, Math.sin(a) * 0.13, g); s.rotation.y = -a; sphere(0.035, 0x333333, Math.cos(a) * 0.26, 0.035, Math.sin(a) * 0.26, g); } return g; },
  armchair: (p) => { const g = G(); rbox(0.86, 0.3, 0.78, p.main, 0, 0.3, 0.02, g); rbox(0.86, 0.5, 0.2, p.main, 0, 0.6, -0.3, g); for (const x of [-1, 1]) rbox(0.18, 0.38, 0.74, p.main, x * 0.37, 0.48, 0, g); rbox(0.36, 0.3, 0.1, p.accent, 0.1, 0.62, -0.16, g).rotation.z = 0.2; legs(g, 0.8, 0.7, 0.16, p.dark); return g; },
  sofa: (p) => { const g = G(); rbox(1.8, 0.3, 0.8, p.main, 0, 0.3, 0.02, g); rbox(1.8, 0.5, 0.22, p.main, 0, 0.6, -0.3, g); for (const x of [-1, 1]) rbox(0.2, 0.42, 0.78, p.main, x * 0.8, 0.48, 0, g); for (const [x, c] of [[-0.45, p.accent], [0.4, 0xfff3e0]]) rbox(0.4, 0.32, 0.11, c, x, 0.62, -0.15, g).rotation.z = x > 0 ? -0.15 : 0.15; legs(g, 1.7, 0.7, 0.16, p.dark); return g; },
  shelf: (p, books = true) => { const g = G(); rbox(0.9, 1.5, 0.38, p.body, 0, 0.75, 0, g); for (let r = 0; r < 3; r++) { box(0.78, 0.36, 0.3, p.dark, 0, 0.33 + r * 0.45, 0.05, g); if (books) for (let k = 0; k < 5; k++) box(0.08, 0.24 + (k % 3) * 0.03, 0.22, [p.main, p.accent, 0xfff3e0, 0x8ab4d8][(k + r) % 4], -0.28 + k * 0.12, 0.28 + r * 0.45, 0.1, g); } return g; },
  cabinet: (p, n = 2) => { const g = G(); rbox(0.9, 0.7, 0.42, p.body, 0, 0.38, 0, g); for (let i = 0; i < n; i++) { rbox(0.38, 0.5, 0.02, p.main, -0.21 + i * 0.42, 0.4, 0.21, g); sphere(0.03, p.accent, -0.06 + i * 0.12, 0.42, 0.23, g); } legs(g, 0.86, 0.38, 0.06, p.dark); rbox(0.24, 0.2, 0.18, p.accent, 0.2, 0.83, 0, g); return g; },
  drawers: (p) => { const g = G(); rbox(0.5, 0.95, 0.44, p.main, 0, 0.5, 0, g); for (let i = 0; i < 4; i++) { box(0.42, 0.18, 0.01, p.body, 0, 0.18 + i * 0.22, 0.225, g); box(0.12, 0.03, 0.02, p.dark, 0, 0.22 + i * 0.22, 0.235, g); } return g; },
  roundTable: (p) => { const g = G(); cyl(0.45, 0.45, 0.07, p.body, 0, 0.45, 0, g, undefined, 28); cyl(0.07, 0.09, 0.42, p.dark, 0, 0.21, 0, g); cyl(0.25, 0.25, 0.03, p.dark, 0, 0.015, 0, g); cyl(0.07, 0.06, 0.1, 0xffffff, 0.12, 0.54, 0.05, g); sphere(0.09, 0x6fb46a, -0.12, 0.56, -0.05, g); return g; },
  stool: (p) => { const g = G(); cyl(0.2, 0.2, 0.12, p.accent, 0, 0.42, 0, g, undefined, 20); legs(g, 0.32, 0.32, 0.38, p.dark, 0.025); return g; },
  lamp: (p) => { const g = G(); cyl(0.17, 0.2, 0.05, p.dark, 0, 0.03, 0, g); cyl(0.025, 0.025, 1.3, p.dark, 0, 0.68, 0, g); cyl(0.15, 0.26, 0.3, p.accent === 0xe9b949 ? 0xfff0c9 : p.accent, 0, 1.42, 0, g); sphere(0.07, glow(0xfff0b0), 0, 1.33, 0, g); return g; },
  plant: (big) => { const g = G(); cyl(big ? 0.24 : 0.16, big ? 0.19 : 0.13, big ? 0.38 : 0.26, 0xf3efe6, 0, big ? 0.19 : 0.13, 0, g); if (big) { for (let i = 0; i < 7; i++) { const a = i * 0.9, l = new THREE.Mesh(new THREE.CircleGeometry(0.3, 12), mat(0x3f9a5a, { side: THREE.DoubleSide })); l.position.set(Math.cos(a) * 0.24, 0.8 + (i % 3) * 0.22, Math.sin(a) * 0.24); l.rotation.set(-0.9, a, 0); g.add(l); cyl(0.012, 0.012, 0.6, 0x2f7a40, Math.cos(a) * 0.12, 0.62, Math.sin(a) * 0.12, g); } } else for (let i = 0; i < 5; i++) { const l = sphere(0.14, 0x5aa86a, Math.cos(i * 1.3) * 0.08, 0.36 + (i % 2) * 0.1, Math.sin(i * 1.3) * 0.08, g); l.scale.y = 1.25; } return g; },
  cactus: () => { const g = G(); [[-0.12, 0.4], [0.12, 0.55]].forEach(([x, h]) => { cyl(0.13, 0.11, 0.18, 0xd98d63, x, 0.09, 0, g); cyl(0.08, 0.08, h, 0x5aa86a, x, 0.18 + h / 2, 0, g); sphere(0.08, 0x5aa86a, x, 0.18 + h, 0, g); sphere(0.04, 0xff8fa8, x, 0.27 + h, 0, g); }); return g; },
  rug: (p, round = true) => { const g = G(); if (round) { cyl(0.95, 0.95, 0.015, p.accent, 0, 0.009, 0, g, undefined, 40); cyl(0.68, 0.68, 0.017, p.main, 0, 0.01, 0, g, undefined, 40); } else { rbox(1.9, 0.015, 1.3, p.main, 0, 0.009, 0, g); rbox(1.6, 0.017, 1.0, p.accent, 0, 0.011, 0, g); } g.traverse(m => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } }); return g; },
  beanbag: (p) => { const g = G(); const b = sphere(0.36, p.main, 0, 0.26, 0, g); b.scale.set(1.15, 0.75, 1.1); const t = sphere(0.24, p.main, 0, 0.42, -0.18, g); t.scale.set(1.2, 0.8, 0.8); return g; },
  rack: (p) => { const g = G(); rbox(0.6, 1.3, 0.5, p.dark, 0, 0.65, 0, g); for (let r = 0; r < 5; r++) { box(0.5, 0.14, 0.01, p.body, 0, 0.28 + r * 0.22, 0.255, g); for (let k = 0; k < 3; k++) box(0.04, 0.03, 0.01, glow([0x6fff9e, p.accent, 0xffd34d][k]), -0.18 + k * 0.07, 0.28 + r * 0.22, 0.262, g); } return g; },
  whiteboard: (p) => { const g = G(); for (const x of [-0.55, 0.55]) { cyl(0.025, 0.025, 1.2, p.dark, x, 0.6, 0, g); rbox(0.08, 0.04, 0.4, p.dark, x, 0.03, 0, g); } rbox(1.25, 0.8, 0.04, 0xffffff, 0, 1.15, 0, g); box(0.5, 0.03, 0.005, 0xf0806a, -0.2, 1.3, 0.025, g); box(0.7, 0.03, 0.005, 0x5a8fd8, 0.05, 1.18, 0.025, g); box(0.4, 0.03, 0.005, 0x5aa86a, -0.1, 1.06, 0.025, g); return g; },
  cooler: () => { const g = G(); rbox(0.42, 0.9, 0.42, 0xf3efe6, 0, 0.45, 0, g); const jug = cyl(0.17, 0.17, 0.38, 0x8fd3f2, 0, 1.1, 0, g, { transparent: true, opacity: 0.75 }); jug.castShadow = false; box(0.08, 0.06, 0.03, 0x5a8fd8, -0.08, 0.7, 0.22, g); box(0.08, 0.06, 0.03, 0xf0806a, 0.08, 0.7, 0.22, g); return g; },
  cat: () => { const g = G(); const b = sphere(0.2, 0xffa24a, 0, 0.18, 0, g); b.scale.set(1, 0.8, 1.3); sphere(0.16, 0xffa24a, 0, 0.34, 0.24, g); for (const x of [-0.08, 0.08]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 4), mat(0xffa24a)); e.position.set(x, 0.49, 0.24); g.add(e); sphere(0.022, 0x222222, x * 0.8, 0.37, 0.38, g); } const tl = cyl(0.03, 0.03, 0.32, 0xffa24a, 0, 0.28, -0.28, g); tl.rotation.x = -0.7; return g; },
  dog: () => { const g = G(); const b = sphere(0.22, 0xe8a25a, 0, 0.22, 0, g); b.scale.set(1, 0.85, 1.35); sphere(0.17, 0xe8a25a, 0, 0.4, 0.26, g); sphere(0.09, 0xfff3e0, 0, 0.36, 0.39, g); sphere(0.028, 0x222222, 0, 0.4, 0.48, g); for (const x of [-0.09, 0.09]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 4), mat(0xe8a25a)); e.position.set(x, 0.57, 0.24); g.add(e); } const tl = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 12, Math.PI * 1.5), mat(0xe8a25a)); tl.position.set(0, 0.4, -0.28); tl.rotation.y = Math.PI / 2; g.add(tl); return g; },
  // 牆上：背面貼牆（z＝0），中心高度在物件裡算好
  frame: (p, kind) => { const g = G(); rbox(0.7, 0.86, 0.05, p.dark, 0, 1.75, 0.03, g); const t = canvasTex(128, 160, (c) => { c.fillStyle = kind === 'bear' ? '#cfe3c6' : '#ffe1d6'; c.fillRect(0, 0, 128, 160); c.font = '72px sans-serif'; c.textAlign = 'center'; c.fillText(kind === 'bear' ? '🐻' : '🌷', 64, 104); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.74), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); m.position.set(0, 1.75, 0.06); g.add(m); return g; },
  wallShelf: (p) => { const g = G(); rbox(0.95, 0.06, 0.24, p.body, 0, 1.6, 0.13, g); for (let k = 0; k < 4; k++) box(0.07, 0.2, 0.15, [p.main, p.accent, 0xfff3e0, p.dark][k], -0.32 + k * 0.09, 1.73, 0.13, g); sphere(0.08, 0x5aa86a, 0.28, 1.7, 0.13, g); return g; },
  cork: (p) => { const g = G(); rbox(1.0, 0.7, 0.04, p.dark, 0, 1.65, 0.03, g); box(0.9, 0.6, 0.01, 0xc9a06a, 0, 1.65, 0.055, g); [[-0.3, 0.12, 0xfff27a], [0.05, -0.08, 0xff9ad5], [0.3, 0.1, 0x9be7ff], [-0.12, -0.15, 0xffffff]].forEach(([x, y, c]) => box(0.18, 0.16, 0.005, c, x, 1.65 + y, 0.065, g)); return g; },
  clock: (p) => { const g = G(); const f = cyl(0.26, 0.26, 0.05, p.main, 0, 1.85, 0.04, g, undefined, 28); f.rotation.x = Math.PI / 2; const d = cyl(0.21, 0.21, 0.02, 0xfff8ec, 0, 1.85, 0.07, g, undefined, 28); d.rotation.x = Math.PI / 2; box(0.02, 0.15, 0.01, 0x333333, 0, 1.91, 0.085, g); box(0.11, 0.02, 0.01, 0x333333, 0.05, 1.85, 0.085, g); return g; },
  neon: (p, text) => { const g = G(); const t = canvasTex(512, 160, (c, W, H) => { c.clearRect(0, 0, W, H); c.font = `900 92px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#63d6ea'; c.shadowBlur = 24; c.fillStyle = '#dffaff'; c.fillText(text, W / 2, H / 2 + 4); }); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.44), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })); m.position.set(0, 1.95, 0.04); g.add(m); return g; },
};

// ---------- 型錄 ----------
// cat：分類；s：系列；w×d：佔幾格（朝前時）；layer：floor／rug／wall；f：機能（desk、chair、lamp、storage、plant、pet）
const SERIES = { wood: '清新木作', retro: '復古文具', tech: '夜班科技', basic: '基本款', pet: '寵物' };
export const CATS = [['set', '套組'], ['desk', '桌椅'], ['store', '收納'], ['rest', '休憩'], ['light', '燈飾'], ['plant', '植物'], ['small', '小物'], ['wall', '牆飾'], ['room', '裝修']];
export const ITEMS = [
  // 基本款（一開始就有）
  { id: 'kuiDesk', name: '小葵的小木桌', cat: 'desk', s: 'basic', price: 0, w: 3, d: 2, f: 'desk', make: () => { const g = B.desk(P.basic, 1.3, 0.75); rbox(0.5, 0.32, 0.04, 0x2c3e57, 0, 0.94, -0.2, g); cyl(0.05, 0.04, 0.1, 0xffffff, 0.4, 0.81, 0.1, g); return g; } },
  { id: 'jieDesk', name: '阿傑的筆電桌', cat: 'desk', s: 'basic', price: 0, w: 3, d: 2, f: 'desk', make: () => { const g = B.desk({ ...P.basic, body: 0xe9e2d6, dark: 0x9aa3ad }, 1.2, 0.6); B.laptop(g); return g; } },
  { id: 'basicChair', name: '辦公椅', cat: 'desk', s: 'basic', price: 0, w: 1, d: 1, f: 'chair', make: () => B.chair({ ...P.basic, main: 0x8a96a8 }) },
  // 清新木作
  { id: 'woodDesk', name: '木作書桌', cat: 'desk', s: 'wood', price: 3200, w: 3, d: 2, f: 'desk', make: () => { const g = B.desk(P.wood, 1.4, 0.8); B.laptop(g, -0.15, 0, 0.77, 0xd9dde2); sphere(0.08, 0x5aa86a, 0.5, 0.86, -0.2, g); return g; } },
  { id: 'woodChair', name: '鼠尾草辦公椅', cat: 'desk', s: 'wood', price: 1500, w: 1, d: 1, f: 'chair', make: () => B.chair(P.wood) },
  { id: 'woodShelf', name: '木書櫃', cat: 'store', s: 'wood', price: 2600, w: 2, d: 1, f: 'storage', make: () => B.shelf(P.wood) },
  { id: 'woodCab', name: '木邊櫃', cat: 'store', s: 'wood', price: 2200, w: 2, d: 1, f: 'storage', make: () => B.cabinet(P.wood) },
  { id: 'woodTable', name: '圓邊茶几', cat: 'rest', s: 'wood', price: 1800, w: 2, d: 2, make: () => B.roundTable(P.wood) },
  { id: 'woodArm', name: '綠色單人沙發', cat: 'rest', s: 'wood', price: 3500, w: 2, d: 2, f: 'seat', make: () => B.armchair(P.wood) },
  { id: 'monstera', name: '龜背芋', cat: 'plant', s: 'wood', price: 1600, w: 1, d: 1, f: 'plant', make: () => B.plant(true) },
  { id: 'bearFrame', name: '熊熊掛畫', cat: 'wall', s: 'wood', price: 1200, w: 2, layer: 'wall', make: () => B.frame(P.wood, 'bear') },
  // 復古文具
  { id: 'retroSofa', name: '珊瑚雙人沙發', cat: 'rest', s: 'retro', price: 5200, w: 4, d: 2, f: 'seat', make: () => B.sofa(P.retro) },
  { id: 'retroLamp', name: '復古落地燈', cat: 'light', s: 'retro', price: 1800, w: 1, d: 1, f: 'lamp', make: () => B.lamp(P.retro) },
  { id: 'retroDrawers', name: '文具抽屜櫃', cat: 'store', s: 'retro', price: 2400, w: 1, d: 1, f: 'storage', make: () => B.drawers(P.retro) },
  { id: 'retroStool', name: '芥末黃圓凳', cat: 'rest', s: 'retro', price: 900, w: 1, d: 1, make: () => B.stool(P.retro) },
  { id: 'retroRug', name: '珊瑚圓地毯', cat: 'small', s: 'retro', price: 2000, w: 4, d: 4, layer: 'rug', make: () => B.rug(P.retro) },
  { id: 'smallPlant', name: '小盆栽', cat: 'plant', s: 'retro', price: 700, w: 1, d: 1, f: 'plant', make: () => B.plant(false) },
  { id: 'cork', name: '軟木公告板', cat: 'wall', s: 'retro', price: 1400, w: 2, layer: 'wall', make: () => B.cork(P.retro) },
  { id: 'clock', name: '復古掛鐘', cat: 'wall', s: 'retro', price: 1100, w: 1, layer: 'wall', make: () => B.clock(P.retro) },
  // 夜班科技
  { id: 'techDesk', name: '升降電腦桌', cat: 'desk', s: 'tech', price: 6000, w: 3, d: 2, f: 'desk', make: () => { const g = B.desk(P.tech, 1.5, 0.8, true); for (const [x, r] of [[-0.36, 0.2], [0.36, -0.2]]) { const m = rbox(0.6, 0.36, 0.04, 0x111111, x, 1.02, -0.24, g); m.rotation.y = r; const s = box(0.54, 0.3, 0.01, glow(0x9fd8ff), x, 1.02, -0.215, g); s.rotation.y = r; } return g; } },
  { id: 'techChair', name: '電競椅', cat: 'desk', s: 'tech', price: 3500, w: 1, d: 1, f: 'chair', make: () => B.chair(P.tech, true) },
  { id: 'techRack', name: '小機櫃', cat: 'store', s: 'tech', price: 4200, w: 1, d: 1, f: 'storage', make: () => B.rack(P.tech) },
  { id: 'beanbag', name: '懶骨頭', cat: 'rest', s: 'tech', price: 2200, w: 2, d: 2, f: 'seat', make: () => B.beanbag(P.tech) },
  { id: 'whiteboard', name: '白板', cat: 'small', s: 'tech', price: 2600, w: 3, d: 1, make: () => B.whiteboard(P.tech) },
  { id: 'neon', name: '「下班」霓虹燈', cat: 'wall', s: 'tech', price: 3000, w: 3, layer: 'wall', make: () => B.neon(P.tech, '準時下班') },
  // 其他
  { id: 'cactus', name: '仙人掌兄弟', cat: 'plant', s: 'basic', price: 800, w: 1, d: 1, f: 'plant', make: () => B.cactus() },
  { id: 'cooler', name: '小飲水機', cat: 'small', s: 'basic', price: 1500, w: 1, d: 1, make: () => B.cooler() },
  { id: 'cat', name: '橘貓', cat: 'small', s: 'pet', price: 4000, w: 1, d: 1, f: 'pet', make: () => B.cat() },
  { id: 'dog', name: '柴犬', cat: 'small', s: 'pet', price: 4500, w: 1, d: 1, f: 'pet', make: () => B.dog() },
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
// 裝修：牆和地板（canvas 材質，換掉整間）
const plankTex = (a, b) => canvasTex(256, 256, (g) => { g.fillStyle = a; g.fillRect(0, 0, 256, 256); g.strokeStyle = b; g.lineWidth = 3; for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); const o = (y * 5) % 256; g.beginPath(); g.moveTo(o, y); g.lineTo(o, y + 32); g.stroke(); } });
export const WALLS = [
  { id: 'cream', name: '奶油牆板', s: 'basic', price: 0, tex: () => canvasTex(256, 256, (g) => { g.fillStyle = '#fbf1e1'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#f2e2c8'; g.fillRect(0, 150, 256, 106); g.fillStyle = '#e6d1b0'; g.fillRect(0, 146, 256, 6); for (let x = 0; x < 256; x += 64) g.fillRect(x, 156, 3, 100); }) },
  { id: 'sage', name: '鼠尾草條紋', s: 'wood', price: 1800, tex: () => canvasTex(256, 256, (g) => { g.fillStyle = '#e4efe0'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#d2e4cc'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 14, 150); g.fillStyle = '#b9d2b1'; g.fillRect(0, 150, 256, 106); g.fillStyle = '#9fbf98'; g.fillRect(0, 146, 256, 6); }) },
  { id: 'coral', name: '珊瑚磚牆', s: 'retro', price: 2200, tex: () => canvasTex(256, 256, (g) => { g.fillStyle = '#f7e6d6'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#efa48f'; for (let y = 0; y < 256; y += 32) for (let x = (y / 32 % 2) * 32 - 32; x < 256; x += 64) g.fillRect(x + 3, y + 3, 58, 26); }) },
  { id: 'night', name: '夜班深藍', s: 'tech', price: 2600, tex: () => canvasTex(256, 256, (g) => { g.fillStyle = '#34405c'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#2b3550'; g.fillRect(0, 150, 256, 106); g.fillStyle = '#63d6ea'; g.fillRect(0, 146, 256, 3); g.fillStyle = '#ffe9a8'; for (let i = 0; i < 6; i++) g.fillRect((i * 47) % 240, 20 + (i * 31) % 100, 3, 3); }) },
];
export const FLOORS = [
  { id: 'oak', name: '淺橡木地板', s: 'basic', price: 0, tex: () => plankTex('#e2bf8f', '#c9a273') },
  { id: 'herring', name: '人字拼木地板', s: 'wood', price: 2400, tex: () => canvasTex(256, 256, (g) => { g.fillStyle = '#d9b07c'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#b98d5a'; g.lineWidth = 3; for (let y = -256; y < 512; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y + 64); g.lineTo(256, y); g.stroke(); } }) },
  { id: 'check', name: '格紋地毯', s: 'retro', price: 2000, tex: () => canvasTex(128, 128, (g) => { g.fillStyle = '#f6e8d0'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f2c7b6'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); }) },
  { id: 'carpet', name: '靜音灰地毯', s: 'tech', price: 2200, tex: () => canvasTex(128, 128, (g) => { g.fillStyle = '#8e99ad'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#86919f'; for (let i = 0; i < 128; i += 8) g.fillRect(0, i, 128, 3); }) },
];

// 套組：按一下整間換成這個系列的擺法（缺的家具、牆、地板一起買；原本擺的收進收納；可以按復原）
// at：[id, 欄, 列, 轉向]；牆飾的列填 0
export const SETS = [
  { id: 'woodSet', name: '清新木作套組', s: 'wood', wall: 'sage', floor: 'herring', show: 'woodArm', at: [
    ['woodDesk', 1, 0, 0], ['woodChair', 2, 2, 2], ['woodDesk', 7, 0, 0], ['woodChair', 8, 2, 2], ['woodShelf', 4, 0, 0], ['monstera', 0, 0, 0], ['monstera', 10, 0, 0],
    ['woodCab', 0, 4, 1], ['woodTable', 4, 5, 0], ['woodArm', 7, 5, 3], ['bearFrame', 1, 0, 0]] },
  { id: 'retroSet', name: '復古文具套組', s: 'retro', wall: 'coral', floor: 'check', show: 'retroSofa', at: [
    ['kuiDesk', 1, 0, 0], ['basicChair', 2, 2, 2], ['jieDesk', 7, 0, 0], ['basicChair', 8, 2, 2], ['retroDrawers', 4, 0, 0], ['retroDrawers', 5, 0, 0], ['retroLamp', 10, 0, 0], ['smallPlant', 0, 0, 0],
    ['retroRug', 1, 4, 0], ['retroSofa', 0, 5, 1], ['retroStool', 3, 6, 0], ['retroStool', 7, 6, 0], ['smallPlant', 10, 7, 0], ['cork', 7, 0, 0], ['clock', 5, 0, 0]] },
  { id: 'techSet', name: '夜班科技套組', s: 'tech', wall: 'night', floor: 'carpet', show: 'techDesk', at: [
    ['techDesk', 1, 0, 0], ['techChair', 2, 2, 2], ['techDesk', 7, 0, 0], ['techChair', 8, 2, 2], ['techRack', 0, 0, 0], ['techRack', 10, 0, 0], ['whiteboard', 4, 0, 0],
    ['beanbag', 1, 5, 0], ['beanbag', 8, 5, 0], ['cactus', 4, 5, 0], ['neon', 4, 0, 0]] },
];

// 解鎖（達成一次就永久開）：清新木作一開始就有；其他靠升職、總機、請人、年份
export const UNLOCKS = {
  basic: { text: '', ok: () => true },
  wood: { text: '', ok: () => true },
  retro: { text: '小葵升到「專員」（Lv4）解鎖', ok: (c) => c.rank >= 3 },
  tech: { text: '電話總機升到「六線」解鎖', ok: (c) => c.phoneLv >= 3 },
  pet: { text: '請到小米之後解鎖', ok: (c) => c.mi },
};

// ---------- 評分 ----------
// 機能 40（兩張桌、兩張椅、燈、收納）、綠意 10、豐富 20（擺了幾種分類）、系列 15（同系列擺 3 件以上）、展示 15（牆飾、寵物）
export function scoreOf(placed) {
  const its = placed.map(p => ITEM[p.id]).filter(Boolean), cnt = (f) => its.filter(i => i.f === f).length;
  const fn = Math.min(2, cnt('desk')) * 10 + Math.min(2, cnt('chair')) * 5 + Math.min(1, cnt('lamp')) * 5 + Math.min(1, cnt('storage')) * 5;
  const green = Math.min(2, cnt('plant')) * 5;
  const cats = new Set(its.map(i => i.cat)).size, rich = Math.min(20, cats * 3);
  const per = {}; its.forEach(i => { if (SERIES[i.s] && i.s !== 'basic' && i.s !== 'pet') per[i.s] = (per[i.s] || 0) + 1; });
  const series = Object.values(per).filter(n => n >= 3).length * 5;
  const show = Math.min(3, its.filter(i => i.layer === 'wall').length) * 4 + Math.min(1, cnt('pet')) * 3;
  return { total: fn + green + rich + series + show, parts: { 機能: fn, 綠意: green, 豐富: rich, 系列: series, 展示: show } };
}
export const bonusOf = (best) => Math.min(10, Math.floor(best / 10));   // 每 10 分 +1%，最高 +10%

// 預設擺法：兩張桌子、兩張椅子
const DEFAULT = () => ({ v: 2, inv: {}, placed: [
  { id: 'kuiDesk', cx: 1, cz: 0, rot: 0 }, { id: 'basicChair', cx: 2, cz: 2, rot: 2 },
  { id: 'jieDesk', cx: 7, cz: 0, rot: 0 }, { id: 'basicChair', cx: 8, cz: 2, rot: 2 },
], wall: 'cream', floor: 'oak', owned: ['cream', 'oak'], best: 0, unl: ['basic', 'wood'] });

// ======================================================================
export function makeDeco({ ox, colliders, money, spend, ctx, toast, sfx = {}, popIn, onChange }) {
  const R = DECO_ROOM, X0 = ox + R.x0, data = DEFAULT();
  const objs = new Map();   // 擺出來的東西：placed 物件 → { g, col }
  let floorMesh = null, wallMesh = null, on = false, sel = null, undo = [], cat = 'set', drag = null;
  const el = document.getElementById('deco');
  // ---- 房間外殼：地板＋後牆（材質可換） ----
  function shell() {
    const w = R.cols * C + 0.2, d = R.rows * C;
    floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ roughness: 0.85 }));
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.position.set(X0 + R.cols * C / 2, 0.004, R.z0 + d / 2); floorMesh.receiveShadow = true; scene.add(floorMesh);
    wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 3.0, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.9 }));
    wallMesh.position.set(X0 + R.cols * C / 2, 1.5, R.wallZ - 0.16); wallMesh.receiveShadow = true; scene.add(wallMesh);
    // 踢腳板
    rbox(w, 0.12, 0.05, 0xe6d1b0, X0 + R.cols * C / 2, 0.06, R.wallZ + 0.01);
  }
  function applyTex() {
    const wv = WALLS.find(v => v.id === data.wall) || WALLS[0], fv = FLOORS.find(v => v.id === data.floor) || FLOORS[0];
    const wt = wv.tex(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(3, 1.2); wallMesh.material.map = wt; wallMesh.material.needsUpdate = true;
    const ft = fv.tex(); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(3, 2.4); floorMesh.material.map = ft; floorMesh.material.needsUpdate = true;
  }
  // ---- 格子 ↔ 世界座標 ----
  const dims = (p) => { const it = ITEM[p.id]; const w = it.w, d = it.layer === 'wall' ? 1 : it.d; return p.rot % 2 ? [d, w] : [w, d]; };
  function worldOf(p) {
    const it = ITEM[p.id], [w, d] = dims(p);
    if (it.layer === 'wall') return new THREE.Vector3(X0 + (p.cx + w / 2) * C, 0, R.wallZ);
    return new THREE.Vector3(X0 + (p.cx + w / 2) * C, 0, R.z0 + (p.cz + d / 2) * C);
  }
  function cellsOf(p) { const [w, d] = dims(p), out = []; for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push([p.cx + i, p.cz + j]); return out; }
  function valid(p) {
    const it = ITEM[p.id], [w, d] = dims(p);
    if (p.cx < 0 || p.cx + w > R.cols) return false;
    if (it.layer === 'wall') return !data.placed.some(o => o !== p && ITEM[o.id].layer === 'wall' && o.cx < p.cx + w && p.cx < o.cx + dims(o)[0]);
    if (p.cz < 0 || p.cz + d > R.rows) return false;
    const mine = cellsOf(p);
    if (it.layer !== 'rug' && mine.some(([x, z]) => z === R.rows - 1 && R.door.includes(x))) return false;   // 門口要留著
    return !data.placed.some(o => { if (o === p) return false; const oi = ITEM[o.id]; if (oi.layer === 'wall' || (oi.layer === 'rug') !== (it.layer === 'rug')) return false; const oc = cellsOf(o); return mine.some(([x, z]) => oc.some(([a, b]) => a === x && b === z)); });
  }
  // ---- 畫出／移除一件 ----
  function show(p, fancy) {
    hide(p);
    const it = ITEM[p.id], g = it.make(); g.traverse(m => { if (m.isMesh) { m.castShadow = it.layer !== 'rug'; m.receiveShadow = true; } });
    g.position.copy(worldOf(p)); g.rotation.y = it.layer === 'wall' ? 0 : -p.rot * Math.PI / 2; scene.add(g);
    let col = null;
    if (!it.layer && it.f !== 'pet') { const [w, d] = dims(p), c = g.position; col = { minX: c.x - w * C / 2 + 0.05, maxX: c.x + w * C / 2 - 0.05, minZ: c.z - d * C / 2 + 0.05, maxZ: c.z + d * C / 2 - 0.05, deco: true }; colliders.push(col); }
    objs.set(p, { g, col }); if (fancy && popIn) popIn(g, 1, 2.2);
  }
  function hide(p) { const o = objs.get(p); if (!o) return; scene.remove(o.g); if (o.col) { const i = colliders.indexOf(o.col); if (i >= 0) colliders.splice(i, 1); } objs.delete(p); }
  function rebuild() { for (const p of [...objs.keys()]) hide(p); data.placed.forEach(p => show(p)); applyTex(); }
  // ---- 選取外框（格子腳印） ----
  const foot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x5fd17a, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }));
  foot.rotation.x = -Math.PI / 2; foot.renderOrder = 5; foot.visible = false; scene.add(foot);
  const gridLines = (() => { const g = new THREE.Group(), m = new THREE.LineBasicMaterial({ color: 0x8a6a4c, transparent: true, opacity: 0.28 }); const pts = []; for (let i = 0; i <= R.cols; i++) pts.push(X0 + i * C, R.z0, X0 + i * C, R.z0 + R.rows * C); for (let j = 0; j <= R.rows; j++) pts.push(X0, R.z0 + j * C, X0 + R.cols * C, R.z0 + j * C); const geo = new THREE.BufferGeometry(); const arr = []; for (let k = 0; k < pts.length; k += 4) arr.push(pts[k], 0.02, pts[k + 1], pts[k + 2], 0.02, pts[k + 3]); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.add(new THREE.LineSegments(geo, m)); g.visible = false; scene.add(g); return g; })();
  function markSel() {
    if (!sel) { foot.visible = false; return; }
    const it = ITEM[sel.id], [w, d] = dims(sel), c = worldOf(sel), ok = valid(sel);
    foot.material.color.setHex(ok ? 0x5fd17a : 0xff5d5d); foot.visible = true;
    if (it.layer === 'wall') { foot.scale.set(w * C, 0.3, 1); foot.position.set(c.x, 0.03, R.wallZ + 0.3); }
    else { foot.scale.set(w * C, d * C, 1); foot.position.set(c.x, 0.03, c.z); }
    const o = objs.get(sel); if (o) { o.g.position.copy(c); o.g.position.y = it.layer === 'rug' ? 0.02 : 0.12; o.g.rotation.y = it.layer === 'wall' ? 0 : -sel.rot * Math.PI / 2; }
    el.querySelector('[data-a=ok]').disabled = !ok;
  }
  // ---- 復原：每次動作前存一份 ----
  const snap = () => JSON.stringify({ placed: data.placed, inv: data.inv, wall: data.wall, floor: data.floor });
  function pushUndo() { undo.push(snap()); if (undo.length > 30) undo.shift(); }
  function doUndo() {
    const s = undo.pop(); if (!s) return; const d = JSON.parse(s);
    for (const p of [...objs.keys()]) hide(p);
    data.placed = d.placed; data.inv = d.inv; data.wall = d.wall; data.floor = d.floor; sel = null; rebuild(); markSel(); changed(); render(); sfx.pick?.();
  }
  function changed() { const s = scoreOf(data.placed).total; if (s > data.best) data.best = s; onChange && onChange(); renderScore(); }
  // ---- 動作 ----
  function settle() {   // 放下：把選取的東西落地
    if (!sel) return; if (!valid(sel)) return;
    const o = objs.get(sel); if (o) { show(sel); }
    sel = null; markSel(); changed(); sfx.pick?.();
  }
  function pick(p) { if (sel && sel !== p) { if (!valid(sel)) return; settle(); } pushUndo(); sel = p; const o = objs.get(p); if (o?.col) { const i = colliders.indexOf(o.col); if (i >= 0) colliders.splice(i, 1); o.col = null; } markSel(); sfx.pick?.(); }
  function rotate() { if (!sel || ITEM[sel.id].layer === 'wall') return; sel.rot = (sel.rot + 1) % 4; clampSel(); markSel(); sfx.pick?.(); }
  function store() { if (!sel) return; data.inv[sel.id] = (data.inv[sel.id] || 0) + 1; hide(sel); data.placed.splice(data.placed.indexOf(sel), 1); sel = null; markSel(); changed(); render(); sfx.pick?.(); }
  function clampSel() { const [w, d] = dims(sel); sel.cx = Math.max(0, Math.min(R.cols - w, sel.cx)); if (ITEM[sel.id].layer !== 'wall') sel.cz = Math.max(0, Math.min(R.rows - d, sel.cz)); }
  // 新放一件：找第一個能放的位置（從房間中間往外找）
  function place(id) {
    if (sel && !valid(sel)) { toast('先把手上這件放到綠色的地方'); return false; }
    if (sel) settle();
    pushUndo();
    const p = { id, cx: 0, cz: 0, rot: 0 }, it = ITEM[id], [w, d] = dims(p);
    let best = null;
    for (let z = 0; z <= (it.layer === 'wall' ? 0 : R.rows - d) && !best; z++) for (let x = 0; x <= R.cols - w; x++) { p.cx = x; p.cz = z; data.placed.push(p); const ok = valid(p); data.placed.pop(); if (ok) { const sc = Math.abs(x + w / 2 - R.cols / 2) + Math.abs(z + d / 2 - R.rows / 2) * 0.8; if (!best || sc < best[2]) best = [x, z, sc]; } }
    if (!best) { p.cx = Math.floor((R.cols - w) / 2); p.cz = it.layer === 'wall' ? 0 : Math.floor((R.rows - d) / 2); } else [p.cx, p.cz] = best;
    data.placed.push(p); show(p, true); sel = p; const o = objs.get(p); if (o?.col) { colliders.splice(colliders.indexOf(o.col), 1); o.col = null; }
    markSel(); return true;
  }
  function useItem(id) {
    const it = ITEM[id]; if (!it) return;
    if (!unlocked(it.s)) { toast('🔒 ' + UNLOCKS[it.s].text); return; }
    if ((data.inv[id] || 0) > 0) { if (place(id)) { data.inv[id]--; render(); } return; }
    if (money() < it.price) { toast(`還差 $${(it.price - money()).toLocaleString()}`); return; }
    if (sel && !valid(sel)) { toast('先把手上這件放到綠色的地方'); return; }
    spend(it.price); sfx.upgrade?.(); data.inv[id] = (data.inv[id] || 0) + 1;   // 先放進收納再拿出來：按復原會回到收納，錢不會白花
    if (place(id)) { data.inv[id]--; } render();
  }
  // 套組：算出還缺哪些（扣掉收納和已經擺的），一次買齊，整間換掉
  function setCost(S) {
    const need = {}; S.at.forEach(([id]) => { need[id] = (need[id] || 0) + 1; });
    const have = { ...data.inv }; data.placed.forEach(p => { have[p.id] = (have[p.id] || 0) + 1; });
    let cost = 0; const buy = {};
    for (const [id, n] of Object.entries(need)) { const k = Math.max(0, n - (have[id] || 0)); if (k) { buy[id] = k; cost += k * ITEM[id].price; } }
    const skins = [['wall', S.wall, WALLS], ['floor', S.floor, FLOORS]].filter(([, v]) => !data.owned.includes(v));
    skins.forEach(([, v, arr]) => { cost += arr.find(x => x.id === v).price; });
    return { cost, buy, skins };
  }
  function useSet(id) {
    const S = SETS.find(x => x.id === id); if (!S) return;
    if (!unlocked(S.s)) { toast('🔒 ' + UNLOCKS[S.s].text); return; }
    const { cost, buy, skins } = setCost(S);
    if (money() < cost) { toast(`還差 $${(cost - money()).toLocaleString()}`); return; }
    if (sel) { if (valid(sel)) settle(); else store(); }
    if (cost) { spend(cost); sfx.upgrade?.(); }
    for (const [k, n] of Object.entries(buy)) data.inv[k] = (data.inv[k] || 0) + n;
    skins.forEach(([, v]) => data.owned.push(v));
    pushUndo();
    for (const p of data.placed) { data.inv[p.id] = (data.inv[p.id] || 0) + 1; hide(p); }   // 原本擺的收進收納
    data.placed = [];
    S.at.forEach(([iid, cx, cz, rot], i) => { data.inv[iid]--; const p = { id: iid, cx, cz, rot }; data.placed.push(p); show(p); const o = objs.get(p); if (o && popIn) setTimeout(() => popIn(o.g, 1, 2.2), i * 60); });
    data.wall = S.wall; data.floor = S.floor; applyTex(); changed(); render();
    toast(`套用「${S.name}」！原本的家具收進收納了`);
  }
  function useSkin(kind, v) {
    if (!unlocked(v.s)) { toast('🔒 ' + UNLOCKS[v.s].text); return; }
    const own = data.owned.includes(v.id);
    if (!own) { if (money() < v.price) { toast(`還差 $${(v.price - money()).toLocaleString()}`); return; } spend(v.price); data.owned.push(v.id); sfx.upgrade?.(); }
    pushUndo(); data[kind] = v.id; applyTex(); changed(); render(); sfx.pick?.();
  }
  const unlocked = (s) => { if (data.unl.includes(s)) return true; const u = UNLOCKS[s]; if (u && u.ok(ctx())) { data.unl.push(s); return true; } return false; };
  // ---- 觸控：點家具拿起、拖曳移動 ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), wallPl = new THREE.Plane(new THREE.Vector3(0, 0, 1), -R.wallZ - 0.05), hit = new THREE.Vector3();
  function castAt(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
  function pointerDown(e) {
    castAt(e);
    const hits = ray.intersectObjects([...objs.values()].map(o => o.g), true);
    let p = null;
    if (hits.length) { const h = hits[0].object; for (const [k, o] of objs) { let n = h; while (n && n !== o.g) n = n.parent; if (n === o.g) { p = k; break; } } }
    if (p && p !== sel) pick(p);
    if (sel && (p === sel || !p)) drag = { id: e.pointerId, moved: false, start: [sel.cx, sel.cz], off: null };
    return true;
  }
  function pointerMove(e) {
    if (!drag || e.pointerId !== drag.id || !sel) return;
    castAt(e); const it = ITEM[sel.id], [w, d] = dims(sel);
    if (it.layer === 'wall') { if (!ray.ray.intersectPlane(wallPl, hit)) return; }
    else if (!ray.ray.intersectPlane(floorPl, hit)) return;
    const cx = Math.round((hit.x - X0) / C - w / 2), cz = Math.round((hit.z - R.z0) / C - d / 2);
    if (cx !== sel.cx || (it.layer !== 'wall' && cz !== sel.cz)) { sel.cx = cx; if (it.layer !== 'wall') sel.cz = cz; clampSel(); markSel(); drag.moved = true; }
  }
  function pointerUp(e) { if (drag && e.pointerId === drag.id) drag = null; }
  // ---- 介面 ----
  function renderScore() {
    const s = scoreOf(data.placed), b = bonusOf(data.best);
    const sc = el.querySelector('.dc-score'); if (sc) sc.innerHTML = `<b>★ ${s.total}</b><small>最高 ${data.best} 分・1F 收入 +${b}%</small>`;
    const pt = el.querySelector('.dc-parts'); if (pt) pt.innerHTML = Object.entries(s.parts).map(([k, v]) => `<span>${k} ${v}</span>`).join('');
  }
  const thumbs = {};
  function thumbOf(it) { return thumbs[it.id] || ''; }
  function render() {
    if (!on) return;
    const tabs = el.querySelector('.dc-tabs'), list = el.querySelector('.dc-list');
    tabs.innerHTML = CATS.map(([k, n]) => `<button data-c="${k}" class="${k === cat ? 'on' : ''}">${n}</button>`).join('');
    let cards = '';
    if (cat === 'set') {
      cards = SETS.map(S => { const lock = !unlocked(S.s), { cost } = setCost(S);
        return `<button class="dc-card set ${lock ? 'lock' : ''}" data-set="${S.id}"><i style="background-image:url(${thumbs[S.show] || ''})"></i><b>${S.name}</b><small>${lock ? '🔒 ' + UNLOCKS[S.s].text.replace('解鎖', '') : cost ? '補齊 $' + cost.toLocaleString() : '全部都有・免費'}</small><em>${S.at.length} 件＋牆＋地板</em></button>`; }).join('');
    } else if (cat === 'room') {
      cards = [['wall', WALLS, '牆'], ['floor', FLOORS, '地']].map(([kind, arr, tag]) => arr.map(v => { const lock = !unlocked(v.s), own = data.owned.includes(v.id), cur = data[kind] === v.id;
        return `<button class="dc-card ${cur ? 'cur' : ''} ${lock ? 'lock' : ''}" data-skin="${kind}:${v.id}"><i class="sw" style="background-image:url(${swatch(v)})"></i><b>${v.name}</b><small>${lock ? '🔒' : cur ? '使用中' : own ? '換上' : '$' + v.price.toLocaleString()}</small><em>${tag}・${SERIES[v.s]}</em></button>`; }).join('')).join('');
    } else {
      cards = ITEMS.filter(i => i.cat === cat).map(it => { const lock = !unlocked(it.s), n = data.inv[it.id] || 0;
        return `<button class="dc-card ${lock ? 'lock' : ''}" data-id="${it.id}"><i style="background-image:url(${thumbOf(it)})"></i><b>${it.name}</b><small>${lock ? '🔒 ' + UNLOCKS[it.s].text.replace('解鎖', '') : n ? '收納中 ×' + n : it.price ? '$' + it.price.toLocaleString() : '免費'}</small><em>${SERIES[it.s]}</em></button>`; }).join('');
    }
    list.innerHTML = cards;
    renderScore();
  }
  const swatchCache = {};
  function swatch(v) { if (swatchCache[v.id]) return swatchCache[v.id]; const t = v.tex(); swatchCache[v.id] = t.image.toDataURL ? t.image.toDataURL() : ''; t.dispose(); return swatchCache[v.id]; }
  // 縮圖：開型錄時用一個小場景把每件家具拍一張
  function makeThumbs() {
    if (Object.keys(thumbs).length) return;
    const W = 160, rt = new THREE.WebGLRenderTarget(W, W), sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    sc.add(new THREE.HemisphereLight(0xffffff, 0xd9c2a5, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(2, 4, 3); sc.add(dl);
    const buf = new Uint8Array(W * W * 4), cv = document.createElement('canvas'); cv.width = cv.height = W; const cx = cv.getContext('2d'), img = cx.createImageData(W, W);
    const prevTarget = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const it of ITEMS) {
      const g = it.make(); sc.add(g); const bb = new THREE.Box3().setFromObject(g), s = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), r = Math.max(s.x, s.y, s.z, 0.4);
      if (it.layer === 'wall') { cam.position.set(c.x, c.y + r * 0.2, c.z + r * 2.4); } else cam.position.set(c.x + r * 1.3, c.y + r * 1.25, c.z + r * 1.9);
      cam.lookAt(c); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(sc, cam); renderer.readRenderTargetPixels(rt, 0, 0, W, W, buf);
      for (let y = 0; y < W; y++) img.data.set(buf.subarray((W - 1 - y) * W * 4, (W - y) * W * 4), y * W * 4);
      cx.putImageData(img, 0, 0); thumbs[it.id] = cv.toDataURL('image/png'); sc.remove(g);
    }
    renderer.setRenderTarget(prevTarget); renderer.setClearColor(prevClear, prevAlpha); rt.dispose();
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    if (b.dataset.c) { cat = b.dataset.c; render(); return; }
    if (b.dataset.id) { useItem(b.dataset.id); return; }
    if (b.dataset.set) { useSet(b.dataset.set); return; }
    if (b.dataset.skin) { const [k, id] = b.dataset.skin.split(':'); useSkin(k, (k === 'wall' ? WALLS : FLOORS).find(v => v.id === id)); return; }
    const a = b.dataset.a;
    if (a === 'rot') rotate(); else if (a === 'ok') settle(); else if (a === 'store') store(); else if (a === 'undo') doUndo(); else if (a === 'done') close();
  });
  // ---- 開／關 ----
  function open() { if (on) return; on = true; makeThumbs(); undo = []; gridLines.visible = true; el.classList.add('on'); render(); markSel(); }
  // 關掉：手上那件放不下就收進收納，不影響其他改動
  function close() { if (sel) { if (valid(sel)) settle(); else store(); } on = false; gridLines.visible = false; foot.visible = false; el.classList.remove('on'); drag = null; changed(); }
  // ---- 存讀檔 ----
  function load(d) {
    if (d && d.v === 2) Object.assign(data, DEFAULT(), d);
    data.placed = data.placed.filter(p => ITEM[p.id]);
    data.best = Math.max(data.best || 0, scoreOf(data.placed).total);
    rebuild();
    if (on) { sel = null; markSel(); render(); }
  }
  // 寵物：在自己那格附近晃一晃
  function update(dt, t) {
    if (on) { const o = sel && objs.get(sel); if (o) o.g.position.y = (ITEM[sel.id].layer === 'rug' ? 0.02 : 0.12) + Math.sin(t * 6) * 0.03; return; }
    for (const [p, o] of objs) if (ITEM[p.id].f === 'pet') { const c = worldOf(p); o.g.position.set(c.x + Math.sin(t * 0.5 + p.cx) * 0.18, Math.abs(Math.sin(t * 5)) * 0.03, c.z + Math.sin(t * 0.37 + p.cz) * 0.12); o.g.rotation.y = -p.rot * Math.PI / 2 + Math.sin(t * 0.5 + p.cx) * 0.6; }
  }
  shell();
  return {
    get on() { return on; }, open, close, load, update, pointerDown, pointerMove, pointerUp,
    save: () => ({ v: 2, inv: data.inv, placed: data.placed, wall: data.wall, floor: data.floor, owned: data.owned, best: data.best, unl: data.unl }),
    score: () => scoreOf(data.placed).total, best: () => data.best, bonus: () => bonusOf(data.best),
    center: new THREE.Vector3(X0 + R.cols * C / 2, 0, R.z0 + R.rows * C / 2 + 0.6),
    _data: data,
  };
}
