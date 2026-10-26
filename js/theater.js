// 小劇場（v0.8）：參考 Kairosoft 的演出——畫面變暗、中間跳出紙框，框裡是一間小房間，3D 角色在裡面演，下面是頭像＋對話，點一下推進
// 舞台用同一台 renderer 畫在紙框挖空的那一塊（scissor），不用另外下載影片
// play(script) 演一段劇（年度開場、年度結尾…）；gain(opt) 跳「獲得」卡（新設施、新角色）。兩個都回傳 Promise，關掉才 resolve
// script = { title, wall, floor, cast: { id: { kind, x } }, steps: [{ who, face, text, act: [[動作, id, ...]], auto }], card: { title, items } }
//   動作：enter id 'left'|'right' x ／ walk id x ／ face id 'cam'|'left'|'right' ／ jump id ／ emote id '❗' ／ exit id 'left'|'right' ／ shake ／ cap id（阿強帽子飛走）
const FACES = ['happy', 'shock', 'angry', 'tired', 'smug', 'cry'];
const NAMES = { kui: '小葵', jie: '阿傑', mi: '小米', vivi: 'Vivi 老闆', kevin: '特助 Kevin', yan: 'PM 小燕', heilun: '業務黑輪', cha: '茶茶', qiang: '阿強', senpai: '學姊', caishen: '黑財神' };
const HAS_ICON = { kui: 1, jie: 1, mi: 1, vivi: 1 };   // 沒有表情頭像時的備用大頭貼

export function makeTheater({ THREE, renderer, kinds, makeActor, updateActor, addJog, rbox, canvasTex, sfx = {}, onOpen, onClose }) {
  const el = document.getElementById('theater');
  const stage = new THREE.Scene();
  stage.add(new THREE.HemisphereLight(0xfff4e0, 0xb08a6a, 2.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 4, 5); stage.add(key);
  const cam = new THREE.PerspectiveCamera(30, 1.6, 0.1, 50);
  // ---------- 小房間：牆、地板、窗、踢腳板、盆栽 ----------
  const room = new THREE.Group(); stage.add(room);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf6e6cc, roughness: 0.95 }), floorMat = new THREE.MeshStandardMaterial({ color: 0xd9a86c, roughness: 0.85 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), wallMat); wall.position.set(0, 2.2, -1.6); room.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1.2); room.add(floor);
  rbox(14, 0.18, 0.08, 0xc9915b, 0, 0.09, -1.55, room);
  const sky = canvasTex(256, 192, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#7cc4ff'); gr.addColorStop(1, '#d6efff'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffffffee'; for (const [x, y, r] of [[60, 44, 18], [82, 40, 22], [190, 62, 18]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    for (let i = 0; i < 9; i++) { const w = 22 + (i * 13) % 16, h = 50 + (i * 37) % 70, x = i * 30 - 6; g.fillStyle = ['#9fb6cf', '#b7c9dc', '#8ea7c2'][i % 3]; g.fillRect(x, H - h, w, h); }
  });
  for (const x of [-1.9, 1.9]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ map: sky, toneMapped: false })); w.position.set(x, 1.75, -1.58); room.add(w);
    rbox(1.62, 0.1, 0.1, 0xffffff, x, 1.18, -1.54, room); rbox(0.07, 1.15, 0.08, 0xffffff, x, 1.75, -1.54, room);
  }
  const plant = (x) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 14), new THREE.MeshStandardMaterial({ color: 0xff8a5c }))); g.children[0].position.y = 0.16; for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: 0x47b35a })); l.position.set(Math.cos(i * 1.6) * 0.12, 0.5 + (i % 2) * 0.16, Math.sin(i * 1.6) * 0.12 - 0.05); l.scale.y = 1.2; g.add(l); } g.position.set(x, 0, -1.2); room.add(g); };
  plant(-3.2); plant(3.2);

  let active = null, rect = null;
  const $ = (s) => el.querySelector(s);
  // ---------- 角色 ----------
  function spawn(id, kind, x) {
    const k = kinds[kind || id]; if (!k) return null;
    const a = makeActor(k, 1); if (kinds[(kind || id) + 'Jog']) addJog(a, kinds[(kind || id) + 'Jog']);
    a.root.position.set(x, 0, 0); stage.add(a.root);
    return { id, a, x, tx: x, jump: 0, face: 0, emote: null, emoteT: 0, gone: false };
  }
  function emoteSprite(ch) {
    const t = canvasTex(128, 128, (g, W) => { g.fillStyle = '#fffdf8'; g.beginPath(); g.arc(W / 2, W / 2, 54, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#142b45'; g.stroke(); g.font = `64px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, W / 2, W / 2 + 4); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(0.42, 0.42, 1); s.renderOrder = 9; return s;
  }
  const off = (side) => side === 'left' ? -4.6 : 4.6;
  function act(c, [kind, id, a1, a2]) {
    const ch = c.cast[id];
    if (kind === 'shake') { c.shake = 0.5; sfx.punch?.(); return; }
    if (!ch) return;
    if (kind === 'enter') { ch.a.root.position.x = ch.x = off(a1); ch.tx = a2 ?? 0; ch.gone = false; ch.a.root.visible = true; }
    else if (kind === 'walk') ch.tx = a1;
    else if (kind === 'exit') { ch.tx = off(a1); ch.gone = true; }
    else if (kind === 'face') ch.face = a1 === 'left' ? -Math.PI / 2 : a1 === 'right' ? Math.PI / 2 : 0;
    else if (kind === 'jump') { ch.jump = 0.0001; sfx.pick?.(); }
    else if (kind === 'emote') { if (ch.emote) ch.a.root.remove(ch.emote); ch.emote = emoteSprite(a1); ch.emote.position.y = 1.45; ch.a.root.add(ch.emote); ch.emoteT = 1.6; }
    else if (kind === 'cap') {   // 阿強的帽子被吹走：帽子飛出去、頭頂冒出光頭（蓋一個膚色半球）
      const g = new THREE.Group();
      const capM = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x15171c })); capM.scale.set(1.15, 0.7, 1.15);
      const bill = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x15171c })); bill.position.set(0, 0, 0.12); g.add(capM, bill);
      g.position.set(ch.a.root.position.x, 1.05, 0.1); stage.add(g); c.flying = { g, t: 0 };
      const bald = new THREE.Mesh(new THREE.SphereGeometry(0.235, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2c9a5, roughness: 0.35 }));
      bald.position.set(0, 0.86, -0.01); bald.scale.set(1.05, 0.75, 1.05); ch.a.root.add(bald); ch.bald = bald;
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); shine.position.set(-0.08, 1.01, 0.12); ch.a.root.add(shine);
      sfx.whoosh?.();
    }
  }
  function portrait(who, face) {
    const img = $('.th-pic');
    if (!who) { img.style.visibility = 'hidden'; return; }
    img.style.visibility = 'visible';
    img.onerror = () => { img.onerror = null; img.src = HAS_ICON[who] ? `icons/${who}-180.png` : 'icons/kui-180.png'; };
    img.src = `icons/expr/${who}_${FACES.includes(face) ? face : 'happy'}.webp?v=0.10.0`;
  }
  // ---------- 打字機對話 ----------
  let typing = null;
  function say(who, face, text) {
    portrait(who, face);
    $('.th-name').textContent = who ? NAMES[who] || who : ''; $('.th-name').style.visibility = who ? 'visible' : 'hidden';
    const t = $('.th-text'); clearInterval(typing); let n = 0; t.textContent = '';
    typing = setInterval(() => { n++; t.textContent = text.slice(0, n); if (n >= text.length) { clearInterval(typing); typing = null; } }, 32);
  }
  function open(c) {
    active = c; el.classList.add('on'); el.classList.toggle('gain', !!c.gain); onOpen && onOpen();
    $('.th-title').textContent = c.title || ''; $('.th-title').style.display = c.title ? '' : 'none';
    wallMat.color.setHex(c.wall ?? 0xf6e6cc); floorMat.color.setHex(c.floor ?? 0xd9a86c);
    $('.th-btns').innerHTML = ''; $('.th-list').innerHTML = ''; $('.th-list').style.display = 'none'; $('.th-talk').style.display = '';
  }
  function close() {
    const c = active; if (!c) return;
    for (const ch of Object.values(c.cast || {})) stage.remove(ch.a.root);
    if (c.model) stage.remove(c.model);
    if (c.flying) stage.remove(c.flying.g);
    active = null; clearInterval(typing); typing = null;
    el.classList.remove('on'); onClose && onClose(); c.done();
  }
  function showButtons(btns) {
    const box = $('.th-btns'); box.innerHTML = '';
    for (const b of btns) { const x = document.createElement('button'); x.className = 'a4btn' + (b.main ? ' main' : ''); x.textContent = b.label; x.onclick = (e) => { e.stopPropagation(); b.fn ? b.fn() : close(); }; box.appendChild(x); }
  }
  function next(c) {
    if (c.cardShown) return;   // 字卡出來後只能按按鈕關
    if (typing) { clearInterval(typing); typing = null; const s = c.steps[c.i]; $('.th-text').textContent = s.text; return; }   // 打字中：先整句顯示
    c.i++;
    if (c.i < c.steps.length) {
      const s = c.steps[c.i]; (s.act || []).forEach(x => act(c, x)); say(s.who, s.face, s.text); c.auto = s.auto || 0; sfx.pick?.();
      return;
    }
    if (c.card && !c.cardShown) {   // 結尾字卡：今年哪裡不一樣
      c.cardShown = true; $('.th-talk').style.display = 'none';
      const L = $('.th-list'); L.style.display = ''; L.innerHTML = `<b>${c.card.title}</b>` + c.card.items.map(t => `<div>${t}</div>`).join('');
      showButtons([{ label: c.card.button || '開工！', main: true }]); sfx.stamp?.(); return;
    }
    close();
  }
  el.onclick = (e) => { if (!active || active.gain) return; if (e.target.closest('.th-skip')) { close(); return; } if (!e.target.closest('.th-btns')) next(active); };

  function play(script) {
    return new Promise((done) => {
      if (window.G?.autoTheater) return done();
      const cast = {};
      for (const [id, o] of Object.entries(script.cast || {})) { const ch = spawn(id, o.kind, o.x ?? 0); if (ch) { cast[id] = ch; if (o.hidden) ch.a.root.visible = false; } }
      const c = { ...script, cast, i: -1, done, shake: 0 };
      open(c); next(c);
    });
  }
  // 「獲得」卡：舞台中間轉著新東西的模型，下面一句「獲得了 ○○」，按鈕：關閉／去看看
  function gain({ name, desc, model, go, scale = 1 }) {
    return new Promise((done) => {
      if (window.G?.autoTheater) return done();
      const c = { gain: true, cast: {}, done, title: '獲得', wall: 0xfdf3e1, floor: 0xe9c98f };
      open(c);
      if (model) { c.model = model; model.position.set(0, 0, 0.2); model.scale.multiplyScalar(scale); stage.add(model); }
      $('.th-talk').style.display = 'none';
      const L = $('.th-list'); L.style.display = ''; L.innerHTML = `<div class="gain-name">獲得了${name}</div>${desc ? `<small>${desc}</small>` : ''}`;
      showButtons([{ label: '關閉' }, ...(go ? [{ label: '去看看', main: true, fn: () => { close(); go(); } }] : [])]);
      sfx.upgrade?.();
    });
  }
  // 每格：角色走位／跳／表情計時；畫舞台（畫在紙框挖空的那一塊）
  function update(dt, t) {
    const c = active; if (!c) return;
    for (const ch of Object.values(c.cast)) {
      const p = ch.a.root.position, d = ch.tx - p.x;
      if (Math.abs(d) > 0.02) { const v = Math.sign(d) * Math.min(Math.abs(d), dt * 1.6); p.x += v; ch.a.speed = 1.6; ch.a.root.rotation.y += ((d > 0 ? Math.PI / 2 : -Math.PI / 2) - ch.a.root.rotation.y) * Math.min(1, dt * 10); }
      else { ch.a.speed = 0; ch.a.root.rotation.y += (ch.face - ch.a.root.rotation.y) * Math.min(1, dt * 8); if (ch.gone) ch.a.root.visible = false; }
      if (ch.jump) { ch.jump += dt; p.y = Math.max(0, Math.sin(Math.min(1, ch.jump / 0.4) * Math.PI) * 0.35); if (ch.jump > 0.4) { ch.jump = 0; p.y = 0; } }
      if (ch.emote) { ch.emoteT -= dt; ch.emote.position.y = 1.45 + Math.sin(t * 6) * 0.03; if (ch.emoteT <= 0) { ch.a.root.remove(ch.emote); ch.emote = null; } }
      updateActor(ch.a, dt, t);
    }
    if (c.model) c.model.rotation.y += dt * 0.8;
    if (c.flying) { const f = c.flying; f.t += dt; f.g.position.x += dt * 3.2; f.g.position.y += dt * (2.2 - f.t * 4); f.g.rotation.z += dt * 9; if (f.t > 2) { stage.remove(f.g); c.flying = null; } }
    if (c.auto) { c.auto -= dt; if (c.auto <= 0) { c.auto = 0; next(c); } }
    // 畫：紙框裡的舞台
    const box = $('.th-stage').getBoundingClientRect(); if (box.width < 4) return;
    cam.aspect = box.width / box.height; cam.position.set(0, c.gain ? 1.5 : 1.05, c.gain ? 3.6 : 5.0); cam.lookAt(0, c.gain ? 0.55 : 0.68, 0);
    if (c.shake > 0) { c.shake -= dt; cam.position.x += (Math.random() - 0.5) * 0.12; cam.position.y += (Math.random() - 0.5) * 0.08; }
    cam.updateProjectionMatrix();
    const H = renderer.domElement.clientHeight, ac = renderer.autoClear;
    renderer.setScissorTest(true); renderer.setScissor(box.left, H - box.bottom, box.width, box.height); renderer.setViewport(box.left, H - box.bottom, box.width, box.height);
    renderer.autoClear = true; renderer.render(stage, cam);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, renderer.domElement.clientWidth, H); renderer.autoClear = ac;
  }
  return { play, gain, update, close, get active() { return !!active; } };
}
