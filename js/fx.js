// 特效與音效：飄字、彩帶、光柱、地面衝擊波、彈出放大、合成音效
import * as THREE from 'three';
import { scene, canvasTex, FONT, cam, V } from './world.js?v=0.16.3';

const fxList = [];   // 每個特效自己有 update(dt) 回傳 false 就移除
export function updateFx(dt) { for (let i = fxList.length - 1; i >= 0; i--) if (!fxList[i](dt)) fxList.splice(i, 1); }

// 飄字（+$30、升級！）
export function floatText(pos, text, color = '#ff7a45', size = 1) {
  const t = canvasTex(320, 110, (g, W, H) => {
    g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = '#fff'; g.strokeText(text, W / 2, H / 2); g.fillStyle = color; g.fillText(text, W / 2, H / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.2 * size, 0.41 * size, 1); s.position.copy(pos); s.renderOrder = 20; scene.add(s);
  let life = 1.1, vy = 1.4;
  fxList.push(dt => {
    life -= dt; vy *= Math.exp(-dt * 2.5); s.position.y += vy * dt;
    const k = Math.min(1, (1.1 - life) * 8); s.scale.set(1.2 * size * k, 0.41 * size * k, 1);
    s.material.opacity = Math.min(1, life * 2.5);
    if (life <= 0) { scene.remove(s); t.dispose(); s.material.dispose(); return false; }
    return true;
  });
}

// 彈出放大（easeOutBack），蓋好東西、升級時用
export function popIn(obj, to = 1, speed = 3.2) {
  let t = 0; obj.scale.setScalar(0.01); obj.userData.popping = true;
  fxList.push(dt => {
    t = Math.min(1, t + dt * speed);
    const u = t - 1, e = 1 + 2.70158 * u * u * u + 1.70158 * u * u;
    obj.scale.setScalar(Math.max(0.01, e) * to);
    if (t >= 1) obj.userData.popping = false;
    return t < 1;
  });
}
// 壓扁再彈回（做好一個貨、收到東西）。彈出中不壓；壓到一半再被叫就重新開始，不會越壓越小
export function squash(obj, amt = 0.18) {
  const u = obj.userData;
  if (u.popping) return;
  if (u.sq) { u.sq.t = 0; return; }
  const base = obj.scale.clone(); u.sq = { t: 0 };
  fxList.push(dt => {
    const s = u.sq; if (!s) return false;
    s.t += dt * 6; const k = Math.sin(Math.min(s.t, Math.PI)) * amt * (1 - s.t / Math.PI);
    obj.scale.set(base.x * (1 + k), base.y * (1 - k), base.z * (1 + k));
    if (s.t >= Math.PI) { obj.scale.copy(base); u.sq = null; return false; }
    return true;
  });
}

// 彩帶爆發
const confGeo = new THREE.PlaneGeometry(0.09, 0.05);
const COLORS = [0xff5d73, 0xffc93c, 0x4cd964, 0x3fa7ff, 0xb46bff, 0xff8a3d];
export function confetti(pos, n = 70, power = 1) {
  const g = new THREE.Group(); scene.add(g);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length], side: THREE.DoubleSide, transparent: true }));
    m.position.copy(pos);
    const a = Math.random() * Math.PI * 2, up = 3 + Math.random() * 3;
    parts.push({ m, v: V(Math.cos(a) * (1 + Math.random() * 2.2) * power, up * power, Math.sin(a) * (1 + Math.random() * 2.2) * power), r: V(Math.random() * 9, Math.random() * 9, Math.random() * 9) });
    g.add(m);
  }
  let life = 2.4;
  fxList.push(dt => {
    life -= dt;
    for (const p of parts) {
      p.v.y -= 7 * dt; p.v.multiplyScalar(Math.exp(-dt * 1.4));
      if (p.v.y < -1.2) p.v.y = -1.2;   // 紙片飄落比較慢
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += p.r.x * dt; p.m.rotation.y += p.r.y * dt; p.m.rotation.z += p.r.z * dt;
      if (p.m.position.y < 0.02) p.m.position.y = 0.02;
      p.m.material.opacity = Math.min(1, life);
    }
    if (life <= 0) { scene.remove(g); parts.forEach(p => p.m.material.dispose()); return false; }
    return true;
  });
}

// 光柱：從地面往上的金色光
const pillarTex = canvasTex(64, 256, (g, W, H) => {
  const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#fff6c8ff'); gr.addColorStop(0.5, '#ffd76a88'); gr.addColorStop(1, '#ffd76a00');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
});
export function pillar(pos, color = 0xffd76a, radius = 0.9, height = 6) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.15, height, 32, 1, true),
    new THREE.MeshBasicMaterial({ map: pillarTex, color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.position.set(pos.x, height / 2, pos.z); scene.add(m);
  let t = 0;
  fxList.push(dt => {
    t += dt; m.rotation.y += dt * 1.5;
    const k = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.2) / 1.3);
    m.material.opacity = k; m.scale.set(0.6 + 0.4 * Math.min(1, t * 4), 1, 0.6 + 0.4 * Math.min(1, t * 4));
    if (t > 1.5) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
    return true;
  });
}
// 地面衝擊波
const ringTex = canvasTex(256, 256, (g, W) => {
  const gr = g.createRadialGradient(W / 2, W / 2, W * 0.3, W / 2, W / 2, W / 2);
  gr.addColorStop(0, '#ffffff00'); gr.addColorStop(0.75, '#ffffffff'); gr.addColorStop(1, '#ffffff00');
  g.fillStyle = gr; g.fillRect(0, 0, W, W);
});
export function shockwave(pos, color = 0xffe08a, size = 4) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.03, pos.z); scene.add(m);
  let t = 0;
  fxList.push(dt => {
    t += dt; const k = t / 0.7; m.scale.setScalar(0.2 + k * size); m.material.opacity = 1 - k;
    if (t >= 0.7) { scene.remove(m); m.material.dispose(); return false; }
    return true;
  });
}
// 閃亮小星星（高級咖啡機、金色東西周圍）
const sparkTex = canvasTex(64, 64, (g, W) => {
  g.translate(W / 2, W / 2); g.fillStyle = '#fff';
  g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 30, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
});
export function sparkle(pos, color = 0xffe08a, size = 0.25) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.position.copy(pos); scene.add(s);
  let t = 0;
  fxList.push(dt => {
    t += dt; const k = Math.sin(Math.min(1, t / 0.6) * Math.PI);
    s.scale.setScalar(size * k); s.material.rotation += dt * 3; s.position.y += dt * 0.3;
    if (t >= 0.6) { scene.remove(s); s.material.dispose(); return false; }
    return true;
  });
}
// 冒煙（爛爛的咖啡機、舊印表機）
const puffMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, transparent: true, roughness: 1 });
export function puff(pos, color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), color ? new THREE.MeshStandardMaterial({ color, transparent: true }) : puffMat.clone());
  m.position.copy(pos); scene.add(m);
  let t = 0; const dx = (Math.random() - 0.5) * 0.3;
  fxList.push(dt => {
    t += dt; m.position.y += dt * 0.6; m.position.x += dx * dt; m.scale.setScalar(1 + t * 2.2); m.material.opacity = Math.max(0, 0.7 - t * 0.6);
    if (t > 1.2) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
    return true;
  });
}
export function camKick(k = 1) { cam.kick = Math.max(cam.kick, k); }

// ---------- DOM：橫幅與提示 ----------
const toastEl = document.getElementById('toast'); let toastTimer = 0;
export function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200); }
const bannerEl = document.getElementById('banner'); let bannerTimer = 0;
// 大橫幅：升級、升職時用（標題＋副標＋星星）
export function banner(title, sub = '', stars = 0, color = '#ff7a45') {
  bannerEl.innerHTML = `<div class="b-stars">${'★'.repeat(stars)}</div><div class="b-title">${title}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`;
  bannerEl.style.setProperty('--bc', color);
  bannerEl.classList.remove('on'); void bannerEl.offsetWidth; bannerEl.classList.add('on');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => bannerEl.classList.remove('on'), 2600);
}

// ---------- 音效（WebAudio 合成，音量小） ----------
let ac = null, master = null;
// 靜音（選單切換，記在這台裝置上）
const MUTE_KEY = 'office-apocalypse-mute';
let muted = false; try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch {}
export const isMuted = () => muted;
export function setMuted(m) { muted = m; try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch {} if (master) master.gain.value = m ? 0 : 0.16; music.apply(); }
export function audioInit() {
  if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume(); return; } try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.16; master.connect(ac.destination);
    music.init();
  } catch { ac = null; }
}
// 切到別的 App／分頁：聲音整個暫停，回來再接著放
document.addEventListener('visibilitychange', () => { if (!ac) return; document.hidden ? ac.suspend() : ac.resume(); });

// ---------- 背景音樂（使用者用 Suno 做的，audio/*.m4a） ----------
// 每首解碼一次；循環時尾巴跟開頭交叉淡化（Suno 的歌結尾會收一個和弦，直接接回開頭很自然）
// 換曲：舊的淡出、新的淡入。選單／小遊戲時壓小聲（duck），音量記在這台裝置
const MUSIC_KEY = 'office-apocalypse-music';
export const music = {
  vol: (() => { try { const v = localStorage.getItem(MUSIC_KEY); return v == null ? 0.6 : +v; } catch { return 0.6; } })(),
  gain: null, duckK: 1, bufs: {}, raw: {}, cur: null, want: null, timer: 0,
  init() { this.gain = ac.createGain(); this.gain.connect(ac.destination); this.apply(); for (const n in this.raw) this.decode(n); if (this.want) this.play(this.want); },
  level() { return muted ? 0 : this.vol * this.vol * 0.55 * this.duckK; },   // 平方：滑桿低的地方比較好調
  apply(t = 0.25) { if (!this.gain) return; const g = this.gain.gain, now = ac.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(this.level(), now + t); },
  setVol(v) { this.vol = v; try { localStorage.setItem(MUSIC_KEY, v); } catch {} this.apply(); },
  duck(k, t = 0.4) { this.duckK = k; this.apply(t); },
  // 先抓檔（不用等點擊），有 AudioContext 才解碼
  load(name, url) { if (this.raw[name] || this.bufs[name]) return; this.raw[name] = fetch(url).then(r => r.arrayBuffer()); if (ac) this.decode(name); },
  decode(name) {
    const p = this.raw[name]; if (!p || this.bufs[name]) return;
    this.bufs[name] = p.then(b => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)));   // 舊版 Safari 只吃 callback 寫法
  },
  play(name, xf = 1.2) {
    this.want = name;
    if (!ac || !this.bufs[name] || (this.cur && this.cur.name === name)) return;
    this.bufs[name].then(buf => {
      if (this.want !== name || (this.cur && this.cur.name === name)) return;
      this.stop(xf);
      this.cur = { name, buf, srcs: [], next: 0 };
      this.loopFrom(this.cur, ac.currentTime + 0.05, xf);
    }).catch(() => {});
  },
  // 從 when 開始放一遍；在結尾前 XF 秒排好下一遍，兩遍交疊淡化
  loopFrom(c, when, fadeIn, XF = 0.8) {
    if (this.cur !== c) return;
    const src = ac.createBufferSource(), g = ac.createGain(), dur = c.buf.duration;
    src.buffer = c.buf; src.connect(g); g.connect(this.gain);
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(1, when + Math.max(0.05, fadeIn));
    g.gain.setValueAtTime(1, when + dur - XF); g.gain.linearRampToValueAtTime(0.0001, when + dur);
    src.start(when); src.stop(when + dur + 0.05);
    c.srcs.push({ src, g }); if (c.srcs.length > 3) c.srcs.shift();
    const nextAt = when + dur - XF;
    clearTimeout(this.timer);
    const wait = () => { if (this.cur !== c) return; if (ac.currentTime >= nextAt - 1.5) this.loopFrom(c, nextAt, XF, XF); else this.timer = setTimeout(wait, 500); };
    this.timer = setTimeout(wait, 500);
  },
  stop(t = 1.0) {
    const c = this.cur; if (!c) return; this.cur = null; clearTimeout(this.timer);
    const now = ac.currentTime;
    for (const { src, g } of c.srcs) { try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0.0001, now + t); src.stop(now + t + 0.05); } catch {} }
  },
};
function tone(freq, dur = 0.12, type = 'sine', vol = 1, when = 0, slide = 0) {
  if (!ac) return;
  const t0 = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
let pickN = 0, pickT = 0;
export const sfx = {
  // 連續拿東西音階會往上爬，越拿越爽
  pick() { const now = performance.now(); pickN = now - pickT < 300 ? Math.min(pickN + 1, 14) : 0; pickT = now; tone(520 * Math.pow(2, pickN / 12), 0.07, 'triangle', 0.7); },
  drop() { tone(380, 0.06, 'triangle', 0.6); },
  coin() { tone(1320, 0.05, 'square', 0.25); tone(1760, 0.08, 'square', 0.25, 0.04); },
  pay() { tone(660, 0.04, 'triangle', 0.35); },
  ring() { tone(1046, 0.05, 'square', 0.18); tone(1318, 0.05, 'square', 0.18, 0.07); },
  answer() { tone(784, 0.08, 'sine', 0.6); tone(1175, 0.12, 'sine', 0.6, 0.06); },
  build() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.7, i * 0.07)); },
  upgrade() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.7, i * 0.06)); tone(2093, 0.5, 'sine', 0.4, 0.38); },
  punch() { tone(150, 0.09, 'square', 0.7); tone(95, 0.14, 'sawtooth', 0.45, 0.02); },   // 揍 Kevin
  alarm() { for (let i = 0; i < 3; i++) { tone(880, 0.14, 'square', 0.22, i * 0.32); tone(660, 0.14, 'square', 0.22, i * 0.32 + 0.16); } },   // Kevin 來了
  // 片頭用：時鐘滴答、腳步、咻、蓋章、上班鈴
  tick() { tone(1568, 0.04, 'square', 0.25); },
  step() { tone(120 + Math.random() * 40, 0.05, 'sine', 0.5); },
  whoosh() { tone(240, 0.28, 'sawtooth', 0.12, 0, 4); tone(480, 0.22, 'triangle', 0.1, 0.03, 3); },
  stamp() { tone(110, 0.12, 'square', 0.7); tone(70, 0.22, 'sine', 0.8, 0.01); },
  bell() { [1318, 1046, 1318, 1046].forEach((f, i) => tone(f, 0.35, 'sine', 0.45, i * 0.16)); },
  promote() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, 'square', 0.3, i * 0.09)); [1046, 1318, 1568].forEach((f) => tone(f, 0.6, 'triangle', 0.45, 0.4)); },
};
