// 片頭（約 4.8 秒，匆忙感）：08:59 遠景快遲到 → 小葵抱水桶衝過來 → 阿傑拉推車追 → 衝向鏡頭、紙張擦過去 → 「上班啟示錄」砸下來＋09:00 打卡章
// 用遊戲本身的 1F 場景和角色模型即時演出（不用下載影片）。第一次按「打卡上班」才播（那一下也解鎖音效），可跳過，選單可重看
// 節奏照 GPT 建議：先遠景交代、一個近景笑點、白閃改成紙張擦鏡
// makeIntro(...) 回傳 { step(dt), skip() }；step 回傳 false＝播完了（錄影用 G.introTick 一格一格推）
const T_END = 4.8;
const PATH_X = -1.5, Z0 = -5.6, RUN = 2.9;   // 兩人沿 x=-1.5 往 +z（鏡頭這邊）跑

export function makeIntro({ THREE, scene, camera, render, sun, kinds, makeActor, addJog, updateActor, jugMesh, cartLook, rbox, sfx = {}, onDone }) {
  const el = document.getElementById('intro');
  el.innerHTML = `
    <div class="bars"><i></i><i></i></div>
    <div class="lines"></div>
    <div class="clock"><b>08<span>:</span>59</b><small>要遲到了！！</small></div>
    <div class="wipe"></div>
    <div class="title"><h1>上班啟示錄</h1><div class="stamp">09:00<br>打卡！</div></div>
    <button class="skip">跳過 ⏭</button>`;
  const $ = (s) => el.querySelector(s);
  const clock = $('.clock'), clockB = $('.clock b'), lines = $('.lines'), wipe = $('.wipe'), title = $('.title');
  // 音效時間點（每個只響一次）；腳步另外算
  const CUES = [[0, 'tick'], [0.3, 'tick'], [0.6, 'tick'], [0.9, 'whoosh'], [2.1, 'whoosh'], [3.3, 'whoosh'], [3.75, 'stamp'], [4.05, 'stamp'], [4.3, 'bell']];
  let cueI = 0, stepT = 0;
  const play = (n) => { try { sfx[n]?.(); } catch {} };
  el.classList.add('on');

  // ---------- 角色 ----------
  const kui = addJog(makeActor(kinds.kui, 1), kinds.kuiJog), jie = addJog(makeActor(kinds.jie, 1), kinds.jieJog);
  const jug = jugMesh(); jug.position.set(0, 0.3, 0.27); jug.rotation.set(0.25, 0, Math.PI / 2); jug.scale.setScalar(0.8); kui.root.add(jug);   // 橫抱在胸前（公仔頭大，肩膀其實很低）
  const cart = cartLook(2); cart.position.set(0, 0, -0.62); jie.root.add(cart);
  const boxes = [[-0.12, 0.42, 0xc9915b], [0.14, 0.42, 0xc9915b], [0, 0.66, 0xe8d6b8], [0.04, 0.88, 0x8a5a32]].map(([x, y, c]) => rbox(0.26, 0.22, 0.3, c, x, y, -0.62, jie.root));
  for (const a of [kui, jie]) scene.add(a.root);

  // ---------- 小特效：汗珠、紙張、腳下的灰 ----------
  const bits = [];
  const sweatMat = new THREE.MeshBasicMaterial({ color: 0x8fd3ff }), paperMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), dustMat = new THREE.MeshBasicMaterial({ color: 0xfff1dd, transparent: true, opacity: 0.8 });
  const sweatGeo = new THREE.SphereGeometry(0.035, 8, 6), paperGeo = new THREE.PlaneGeometry(0.16, 0.21), dustGeo = new THREE.SphereGeometry(0.07, 8, 6);
  function emit(geo, mat, p, v, life, spin = 0) { const m = new THREE.Mesh(geo, mat); m.position.copy(p); scene.add(m); bits.push({ m, v, life, age: 0, spin }); }
  const tmp = new THREE.Vector3();
  let sweatT = 0, paperT = 0, dustT = 0;

  const prevFov = camera.fov;
  let t = 0, done = false;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const ease = (x) => 1 - Math.pow(1 - clamp01(x), 3);
  const backOut = (x) => { x = clamp01(x) - 1; return 1 + 2.7 * x * x * x + 1.7 * x * x; };   // 彈一下再停
  const jit = (k) => (Math.random() - 0.5) * k;
  const stamp = el.querySelector('.stamp');
  const shake = (k) => { camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; };

  function finish() {
    if (done) return; done = true;
    for (const a of [kui, jie]) scene.remove(a.root);
    for (const b of bits) scene.remove(b.m);
    camera.fov = prevFov; camera.updateProjectionMatrix();
    el.classList.add('out'); setTimeout(() => { el.classList.remove('on', 'out'); el.innerHTML = ''; }, 400);
    onDone && onDone();
  }
  $('.skip').onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); finish(); };

  function step(dt) {
    if (done) return false;
    t += dt;
    while (cueI < CUES.length && t >= CUES[cueI][0]) play(CUES[cueI++][1]);
    if (t > 0.9 && t < 3.3) { stepT += dt; if (stepT > 0.16) { stepT = 0; play('step'); } }
    // 兩人一直往前衝
    const kz = Z0 + RUN * t, jz = kz - 1.8;
    kui.root.position.set(PATH_X + Math.sin(t * 9) * 0.04, 0, kz); kui.root.rotation.set(0, 0, Math.sin(t * 18) * 0.06);
    jie.root.position.set(PATH_X + 0.15, 0, jz); jie.root.rotation.set(0, 0, Math.sin(t * 17 + 1) * 0.05);
    kui.speed = jie.speed = RUN; updateActor(kui, dt, t); updateActor(jie, dt, t);
    jug.position.y = 0.3 + Math.abs(Math.sin(t * 18)) * 0.03;
    boxes.forEach((b, i) => { b.rotation.z = Math.sin(t * 20 + i * 1.7) * 0.12; b.position.y = [0.42, 0.42, 0.66, 0.88][i] + Math.abs(Math.sin(t * 20 + i)) * 0.03; });

    // 特效
    sweatT += dt; paperT += dt; dustT += dt;
    if (sweatT > 0.07) { sweatT = 0; kui.root.getWorldPosition(tmp); tmp.y = 0.95; emit(sweatGeo, sweatMat, tmp, new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.4 + Math.random(), -0.6), 0.5); }
    if (paperT > 0.16 && t > 1.6) { paperT = 0; jie.root.getWorldPosition(tmp); tmp.y = 1.05; tmp.z -= 0.6; emit(paperGeo, paperMat, tmp, new THREE.Vector3((Math.random() - 0.5) * 2.5, 1.6 + Math.random(), -1.4), 1.0, 6); }
    if (dustT > 0.09) { dustT = 0; for (const a of [kui, jie]) { a.root.getWorldPosition(tmp); tmp.y = 0.06; tmp.z -= 0.2; emit(dustGeo, dustMat, tmp, new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4, -0.8), 0.4); } }
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i]; b.age += dt; b.v.y -= 6 * dt; b.m.position.addScaledVector(b.v, dt);
      if (b.spin) { b.m.rotation.x += b.spin * dt; b.m.rotation.y += b.spin * 0.7 * dt; b.v.multiplyScalar(0.97); }
      b.m.scale.setScalar(Math.max(0.01, 1 - b.age / b.life * (b.spin ? 0.2 : 0.8)));
      if (b.age > b.life || b.m.position.y < 0) { scene.remove(b.m); bits.splice(i, 1); }
    }

    // ---------- 鏡頭：遠景 → 小葵近景 → 阿傑側拍 → 衝向鏡頭 ----------
    camera.fov = 40;
    if (t < 0.9) {   // 0：遠景交代走廊，時鐘大字，兩人遠遠起跑
      camera.position.set(PATH_X + 0.8, 2.2, kz + 8); camera.lookAt(PATH_X, 0.8, kz - 0.5);
    } else if (t < 2.1) {   // 1：小葵正前方往後退著拍（低角度、汗一直噴）
      const k = ease((t - 0.9) / 0.5);
      camera.position.set(PATH_X + 0.35, 0.75 + 0.15 * (1 - k), kz + 2.6 - 0.5 * k); camera.lookAt(PATH_X, 0.85, kz - 0.8); shake(0.025);
    } else if (t < 3.2) {   // 2：側面跟拍阿傑拉推車（箱子快掉了）
      const k = ease((t - 2.1) / 0.4);
      camera.position.set(PATH_X + 3.0 - 0.4 * k, 1.0, jz + 0.9); camera.lookAt(PATH_X, 0.75, jz - 0.15); shake(0.02);
    } else {   // 3：鏡頭停住，兩人衝過來，紙張從左邊擦過去蓋住畫面
      const cz = Z0 + RUN * 3.2 + 3.4;
      camera.position.set(PATH_X + 0.25, 0.95, cz); camera.lookAt(PATH_X, 0.9, cz - 4); shake(0.03);
    }
    camera.updateProjectionMatrix();
    sun.position.set(PATH_X + 4, 10, kz + 5); sun.target.position.set(PATH_X, 0, kz); sun.target.updateMatrixWorld();

    // ---------- 畫面上的字（每格算好，不靠 CSS 動畫） ----------
    const ck = t < 0.95;
    clock.style.opacity = ck ? 1 : 0;
    if (ck) { clock.style.transform = `translate(calc(-50% + ${jit(6)}px), calc(-50% + ${jit(4)}px)) scale(${0.6 + 0.4 * backOut(t / 0.2)})`; clockB.querySelector('span').style.opacity = (Math.floor(t * 8) % 2) ? 0.2 : 1; }
    const ln = t > 0.9 && t < 3.6;
    lines.style.opacity = ln ? 0.55 : 0; if (ln) lines.style.transform = `rotate(${jit(3)}deg) scale(${1 + Math.random() * 0.04})`;
    // 紙張擦鏡：3.3～3.65 秒從左滑進來蓋滿，之後當標題的底
    wipe.style.width = '160%'; wipe.style.left = '-30%';
    wipe.style.transform = `translateX(${-110 + 110 * ease((t - 3.3) / 0.35)}%) skewX(-12deg)`;
    if (t >= 3.75) {
      const k = (t - 3.75) / 0.32;
      title.style.opacity = clamp01(k * 3);
      title.style.transform = `translate(-50%, -50%) scale(${2.6 - 1.6 * backOut(k)}) rotate(${-6 + 3 * clamp01(k)}deg)`;
      stamp.style.transform = `rotate(14deg) scale(${t > 4.05 ? backOut((t - 4.05) / 0.25) : 0})`;
    }
    if (t >= T_END) { finish(); return false; }
    return true;
  }
  return { step, skip: finish };
}
