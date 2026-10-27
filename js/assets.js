// 角色模型：載入、量步伐、複製成會走路的角色
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// 模型都用 gltf-transform 壓過（meshopt＋webp 貼圖），要配解碼器
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

// 載入一個角色：縮成 1 單位高、腳踩地，順便量出不滑步的速度
// 模型都要先轉正（臉朝 +z）再綁原地走路動作（見 tools/face_front.py）
export async function loadKind(url) {
  const g = await loader.loadAsync(url);
  g.scene.updateMatrixWorld(true);   // 先更新矩陣，不然骨架節點的縮放沒算進去，高度會量錯
  const box = new THREE.Box3().setFromObject(g.scene), size = box.getSize(new THREE.Vector3());
  const s = 1 / size.y;
  const base = new THREE.Group(); base.add(g.scene);
  g.scene.scale.multiplyScalar(s);
  g.scene.position.set(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
  const clip = g.animations[0] || null;
  // 記下站姿（綁骨架時的 A 字站姿），量完步伐要還原；停下來時動畫權重降到 0 就會回到這個站姿
  const rest = [];
  base.traverse(o => { if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
  const natural = clip ? measureNatural(base, clip) : 0.25;
  const lean = clip ? measureLean(base, clip) : 0;
  for (const [b, p, q, sc] of rest) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(sc); }
  return { base, clip, natural, lean };
}

// 動畫平均往前傾幾度（臀部→頭）。成人跑步動作套在大頭 Q 版身上會像在鞠躬，要用 leanFix 扶正
function measureLean(base, clip) {
  const mixer = new THREE.AnimationMixer(base), a = mixer.clipAction(clip).play();
  let hips, head; base.traverse(o => { if (o.isBone && o.name === 'Hips') hips = o; if (o.isBone && o.name === 'Head') head = o; });
  if (!hips || !head) return 0;
  const hp = new THREE.Vector3(), hd = new THREE.Vector3(); let sum = 0; const N = 24;
  for (let i = 0; i < N; i++) {
    a.time = clip.duration * i / N; mixer.update(0); base.updateMatrixWorld(true);
    hips.getWorldPosition(hp); head.getWorldPosition(hd); sum += Math.atan2(hd.z - hp.z, hd.y - hp.y);   // 臉朝 +z
  }
  a.stop(); mixer.uncacheRoot(base);
  return sum / N;
}

// 掛上第二段動作（小跑步），之後依速度跟走路混合；跑步太前傾的部分扶正到只剩 keepDeg 度
export function addJog(a, jogKind, keepDeg = 7) {
  a.jog = a.mixer.clipAction(jogKind.clip).play(); a.jog.setEffectiveWeight(0);
  a.jogNatural = jogKind.natural;
  a.leanFix = Math.max(0, jogKind.lean - THREE.MathUtils.degToRad(keepDeg));
  a.model.traverse(o => { if (o.isBone && o.name === 'Spine02') a.spine = o; });
  return a;
}
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _ax = new THREE.Vector3(), _hp = new THREE.Vector3(), _fp = new THREE.Vector3();

// 走路動畫原速時，貼地那隻腳往後移的速度（每秒幾個身高）。播放速度＝實際移動速度 ÷ 這個值，腳就會踩實
function measureNatural(base, clip) {
  const mixer = new THREE.AnimationMixer(base), a = mixer.clipAction(clip).play();
  let foot, hips; base.traverse(o => { if (o.isBone && o.name === 'LeftFoot') foot = o; if (o.isBone && o.name === 'Hips') hips = o; });
  if (!foot || !hips) return 0.25;
  const N = 240, p = new THREE.Vector3(), h = new THREE.Vector3(), zs = [], ys = [];
  for (let i = 0; i <= N; i++) {
    a.time = clip.duration * i / N; mixer.update(0); base.updateMatrixWorld(true);
    foot.getWorldPosition(p); hips.getWorldPosition(h); zs.push(p.z - h.z); ys.push(p.y);
  }
  a.stop(); mixer.uncacheRoot(base);
  const ymin = Math.min(...ys), sp = [];
  for (let i = 1; i <= N; i++) if (ys[i] < ymin + 0.01 && ys[i - 1] < ymin + 0.01) sp.push(Math.abs(zs[i] - zs[i - 1]) / (clip.duration / N));
  sp.sort((x, y) => x - y);
  return sp.length ? sp[sp.length >> 1] : 0.25;
}

// 複製一個角色。speed 由遊戲每幀設定（每秒幾單位），updateActor 會換算動畫速度
export function makeActor(kind, scale = 1) {
  const root = new THREE.Group();
  const model = SkeletonUtils.clone(kind.base);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  root.add(model); root.scale.setScalar(scale);
  const mixer = new THREE.AnimationMixer(model);
  const action = kind.clip ? mixer.clipAction(kind.clip).play() : null;
  if (action) action.setEffectiveWeight(0);
  let head = null, headFront = null; model.traverse(o => { if (o.name === 'Head') head = o; if (o.name === 'headfront') headFront = o; });
  return { root, model, mixer, action, natural: kind.natural, speed: 0, w: 0, phase: Math.random() * 6, head, headFront };
}

// 走路權重平滑切換：走＝播放走路，停＝回到站姿並輕輕呼吸
export function updateActor(a, dt, t) {
  const moving = a.speed > 0.05;
  a.w += ((moving ? 1 : 0) - a.w) * Math.min(1, dt * 10);
  if (a.action) {
    a.action.setEffectiveWeight(a.w);
    if (moving) a.action.timeScale = a.speed / (a.natural * a.root.scale.x);
  }
  let jogW = 0;
  if (a.jog) {   // 有掛小跑步的角色：慢走、快跑依速度混合
    const k = THREE.MathUtils.clamp((a.speed / a.root.scale.x - 1.3) / 0.8, 0, 1);
    a.jk = (a.jk ?? 0) + (k - (a.jk ?? 0)) * Math.min(1, dt * 8);
    a.action.setEffectiveWeight(a.w * (1 - a.jk)); a.jog.setEffectiveWeight(a.w * a.jk);
    if (moving) a.jog.timeScale = a.speed / (a.jogNatural * a.root.scale.x);
    jogW = a.w * a.jk;
  }
  a.mixer.update(dt);
  // 扶正小跑步的前傾：在世界座標繞角色的右手方向往後轉，再換回骨頭自己的座標
  if (a.spine && jogW > 0.01 && a.leanFix) {
    a.root.updateMatrixWorld(true);
    const h = a.root.rotation.y;
    _ax.set(Math.cos(h), 0, -Math.sin(h));
    _q.setFromAxisAngle(_ax, -a.leanFix * jogW);
    a.spine.parent.getWorldQuaternion(_pq);
    a.spine.quaternion.premultiply(_pq.clone().invert().multiply(_q).multiply(_pq));
  }
  // 走路動作會低頭約 13°（俯視不明顯，近看像在看地上）：量這一格臉的俯仰，往下的部分繞頭骨本地 X 抬回水平
  if (a.head && a.headFront && a.w > 0.01) {
    a.headFront.updateWorldMatrix(true, false);
    a.head.getWorldPosition(_hp); a.headFront.getWorldPosition(_fp);
    const pitch = Math.atan2(_fp.y - _hp.y, Math.hypot(_fp.x - _hp.x, _fp.z - _hp.z));
    if (pitch < 0) a.head.rotateX(pitch);
  }
  a.model.scale.y = 1 + (1 - a.w) * 0.015 * Math.sin(t * 3 + a.phase);
}

// 朝目標走一步；到了回傳 true
export function walkTo(a, x, z, speed, dt) {
  const p = a.root.position, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
  if (d < 0.04) { a.speed = 0; return true; }
  const step = Math.min(d, speed * dt);
  p.x += dx / d * step; p.z += dz / d * step;
  a.speed = step / dt;
  turnTo(a, Math.atan2(dx, dz), dt);
  return false;
}

export function turnTo(a, target, dt) {
  const r = a.root.rotation;
  let d = target - r.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  r.y += d * Math.min(1, dt * 12);
}

// 阿強的帽子掉了：帽子那一截（頭頂往下約 0.125）用裁切平面切掉，換成剛好頭大小的光頭
// 尺寸照模型量的（角色本地座標）：頭頂 y＝1、帽緣 y≈0.9、頭寬約 0.33、頭深約 0.31（帽簷往前凸不算）
const BALD = { cut: 0.875, rx: 0.166, ry: 0.13, rz: 0.158, z: -0.012 };
const baldGeo = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), baldMat = new THREE.MeshStandardMaterial({ color: 0xf2c9a5, roughness: 0.35 });
export function setBald(a, on, renderer) {
  if (on) {
    if (a.bald) return;
    renderer.localClippingEnabled = true;
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);   // 只留下 y ≤ 切線的部分
    a.root.traverse(o => { if (o.isMesh && !o.userData.mat0) { o.userData.mat0 = o.material; o.material = o.material.clone(); o.material.clippingPlanes = [plane]; } });
    const g = new THREE.Group(), dome = new THREE.Mesh(baldGeo, baldMat); dome.scale.set(BALD.rx, BALD.ry, BALD.rz); dome.castShadow = true; g.add(dome);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); shine.position.set(-0.06, BALD.ry * 0.82, 0.07); g.add(shine);
    g.position.set(0, BALD.cut, BALD.z); a.root.add(g); a.bald = { g, plane }; baldTick(a);
  } else if (a.bald) {
    a.root.remove(a.bald.g); a.root.traverse(o => { if (o.userData.mat0) { o.material.dispose(); o.material = o.userData.mat0; delete o.userData.mat0; } }); a.bald = null;
  }
}
const _v = new THREE.Vector3();
export function baldTick(a) { if (a.bald) a.bald.plane.constant = a.root.localToWorld(_v.set(0, BALD.cut, 0)).y; }   // 裁切平面跟著角色走（世界座標）
