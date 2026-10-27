// 小米的接電話挑戰：三關，響了就點。金色＝老闆（3 分），紫色 🤖＝Kevin 的 AI 推銷（別接！）
// 第 2 關多了 😡 客訴（要連點兩下）；第 3 關 4×4 最快，還有 🧧 黑財神來電（點到 4 秒內分數 ×2）
// 遊戲暫停主畫面，用真實時間跑（反應遊戲）。一關打完呼叫 onEnd({ level, score, best, newBest, unlocked, ... })；中途離開呼叫 onEnd(null)
// 玩到一半可按右上 ⏸ 叫出選單（繼續／重來／選關／離開），切到別的 App 也會自動暫停
export const LEVELS = [
  { name: '新人總機', icon: '☎', desc: '3×3，響了就點', cols: 3, cells: 9, dur: 30, gap: [0.85, 0.45], life: [1.5, 0.65], kevin: 0.13, vip: 0.1, angry: 0, cai: 0, pass: 25 },
  { name: '午休搶線', icon: '😡', desc: '3×4、更快，😡 客訴要連點兩下', cols: 3, cells: 12, dur: 30, gap: [0.68, 0.32], life: [1.2, 0.55], kevin: 0.16, vip: 0.09, angry: 0.14, cai: 0, pass: 35 },
  { name: '月底地獄', icon: '🔥', desc: '4×4、最快，🧧 黑財神來電分數 ×2', cols: 4, cells: 16, dur: 35, gap: [0.55, 0.24], life: [1.0, 0.46], kevin: 0.2, vip: 0.08, angry: 0.15, cai: 0.03, pass: 0 },
];
const LINES = {
  start: ['準備好了嗎？電話要響了！', '今天也一起努力接電話吧！'],
  start2: ['午休大家都在打電話……客訴要安撫兩次喔！', '😡 的要連點兩下才接得起來！'],
  start3: ['月底了，電話會響到爆！', '看到 🧧 一定要接，是黑財神！'],
  good: ['好快！', '厲害！', '接得漂亮～', '就是這樣！', '手速一流！'],
  combo: (n) => `${n} 連擊！太強了！`,
  miss: ['啊，漏接了……', '電話掛掉了啦～', '慢了一點點！'],
  kevin: ['那是 Kevin 的 AI 推銷啦！', '不要接 Kevin 的電話！', '又是那個特助……'],
  vip: ['老闆的電話！快接！', '是老闆！'],
  angry: ['客訴！再點一下安撫他！', '先生您冷靜一點……'],
  cai: ['黑財神來電！分數 ×2！', '🧧 恭喜發財！現在分數加倍！'],
  end: (n, lv) => n >= [40, 55, 90][lv] ? '你是總機之神！' : n >= [25, 35, 55][lv] ? '好厲害，可以來客服部了！' : n >= [12, 18, 30][lv] ? '不錯喔，再接再厲！' : '下次會更好的！',
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const ICONS = { call: '☎', vip: '👑', kevin: '🤖', angry: '😡', angry2: '😤', cai: '🧧' };
const TAGS = { vip: '老闆', kevin: 'AI 推銷', angry: '客訴', angry2: '再一下！', cai: '黑財神' };

// bests：三關各自的最佳分數。第 n 關要上一關達到 pass 分才開
export const unlockedUpTo = (bests) => { let n = 0; while (n < LEVELS.length - 1 && (bests[n] || 0) >= LEVELS[n].pass) n++; return n; };

export function openCallGame({ sfx, bests = [], onEnd, level = null }) {
  const el = document.getElementById('callgame'), grid = el.querySelector('.grid'), say = el.querySelector('.say'), bar = el.querySelector('.time i');
  const scoreEl = el.querySelector('.score b'), comboEl = el.querySelector('.combo'), big = el.querySelector('.big'), endEl = el.querySelector('.end'), selEl = el.querySelector('.levels'), legend = el.querySelector('.legend');
  const talk = (s) => { say.textContent = s; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop'); };
  endEl.classList.remove('on'); el.classList.add('on');
  if (level == null) return showLevels();
  return play(level);

  // 選關：三張卡，鎖住的寫要上一關幾分
  function showLevels() {
    const top = unlockedUpTo(bests);
    grid.innerHTML = ''; grid.style.display = 'none'; legend.style.display = 'none'; bar.style.width = '100%'; scoreEl.textContent = '0'; comboEl.textContent = '';
    talk('要挑戰哪一關？');
    selEl.innerHTML = LEVELS.map((L, i) => {
      const lock = i > top;
      return `<button class="lv${lock ? ' lock' : ''}" data-i="${i}" ${lock ? 'disabled' : ''}><span class="ic">${lock ? '🔒' : L.icon}</span><span class="tx"><b>第 ${i + 1} 關　${L.name}</b><small>${lock ? `第 ${i} 關拿到 ${LEVELS[i - 1].pass} 分解鎖` : L.desc}</small></span><span class="bs">${bests[i] ? '最佳 ' + bests[i] : ''}${L.pass && (bests[i] || 0) >= L.pass ? ' ✅' : ''}</span></button>`;
    }).join('') + '<button class="lvback">回去</button>';
    selEl.classList.add('on'); el.classList.add('picking');
    selEl.querySelectorAll('.lv[data-i]').forEach(b => b.onpointerdown = (e) => { e.preventDefault(); if (b.disabled) return; selEl.classList.remove('on'); play(+b.dataset.i); });
    selEl.querySelector('.lvback').onclick = () => { selEl.classList.remove('on'); el.classList.remove('on'); onEnd(null)?.close?.(); };
  }

  function play(lvI) {
    const L = LEVELS[lvI], best = bests[lvI] || 0;
    selEl.classList.remove('on'); endEl.classList.remove('on'); el.classList.remove('picking');
    grid.innerHTML = ''; grid.style.display = ''; legend.style.display = '';
    grid.style.gridTemplateColumns = `repeat(${L.cols}, 1fr)`; grid.classList.toggle('g4', L.cols >= 4);
    legend.textContent = ['☎ 響了就點　👑 老闆 3 分　🤖 AI 推銷別接！', '😡 客訴連點兩下（2 分）　👑 老闆 3 分　🤖 別接！', '🧧 黑財神：4 秒分數 ×2　😡 點兩下　🤖 別接！'][lvI];
    const cells = [];
    for (let i = 0; i < L.cells; i++) {
      const b = document.createElement('button'); b.className = 'cell'; b.innerHTML = '<span class="ph">☎</span><span class="tag"></span>';
      const c = { b, kind: null, until: 0 };
      b.onpointerdown = (e) => { e.preventDefault(); hit(c); };
      grid.appendChild(b); cells.push(c);
    }
    const st = { t: -3, points: 0, answered: 0, vip: 0, angry: 0, cai: 0, missed: 0, wrong: 0, combo: 0, maxCombo: 0, nextAt: 0, running: true, frenzy: -1 };
    let last = performance.now(), raf = 0, paused = false;
    const pzBtn = el.querySelector('.cgpause'), pzEl = el.querySelector('.cgmenu');
    pzBtn.style.display = ''; pzEl.classList.remove('on');
    const pause = () => { if (!st.running || paused) return; paused = true; pzEl.classList.add('on'); talk('先喘口氣～電話我先擋著！'); };
    const resume = () => { paused = false; pzEl.classList.remove('on'); last = performance.now(); };
    const quit = () => { st.running = false; cancelAnimationFrame(raf); pzEl.classList.remove('on'); pzBtn.style.display = 'none'; document.removeEventListener('visibilitychange', onHide); };
    const onHide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onHide);
    pzBtn.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); pause(); };
    pzEl.querySelector('[data-k="go"]').onclick = resume;
    pzEl.onclick = (e) => { if (e.target === pzEl) resume(); };   // 點暫停卡外面＝繼續
    pzEl.querySelector('[data-k="again"]').onclick = () => { quit(); play(lvI); };
    pzEl.querySelector('[data-k="pick"]').onclick = () => { quit(); showLevels(); };
    pzEl.querySelector('[data-k="out"]').onclick = () => { quit(); el.classList.remove('on'); onEnd(null)?.close?.(); };   // 中途離開不算分
    talk(pick([LINES.start, LINES.start2, LINES.start3][lvI]));
    const frenzy = () => st.t < st.frenzy;
    function setCell(c, kind) {
      c.kind = kind; c.b.className = 'cell' + (kind ? ' ring ' + (kind === 'angry2' ? 'angry calm' : kind) : '');
      c.b.querySelector('.ph').textContent = ICONS[kind] || '☎';
      c.b.querySelector('.tag').textContent = TAGS[kind] || '';
    }
    function flash(c, txt, cls) { const f = document.createElement('i'); f.className = 'fx ' + cls; f.textContent = txt; c.b.appendChild(f); setTimeout(() => f.remove(), 600); }
    function gain(c, n, cls) {
      const v = n * (frenzy() ? 2 : 1); st.points += v; st.answered++; st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
      flash(c, st.combo >= 5 ? `+${v} ×${st.combo}` : `+${v}`, cls);
      if (st.combo > 0 && st.combo % 10 === 0) talk(LINES.combo(st.combo)); else if (Math.random() < .15) talk(pick(LINES.good));
    }
    function hit(c) {
      if (!st.running || st.t < 0 || !c.kind) return;
      if (c.kind === 'kevin') { st.wrong++; st.combo = 0; flash(c, '✕', 'bad'); talk(pick(LINES.kevin)); sfx.punch?.(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setCell(c, null); return; }
      if (c.kind === 'angry') { setCell(c, 'angry2'); c.until += 0.45; flash(c, '😤', 'ok'); sfx.pick?.(); return; }   // 第一下：安撫中，再點一下
      if (c.kind === 'angry2') { st.angry++; gain(c, 2, 'ok'); sfx.answer(); }
      else if (c.kind === 'vip') { st.vip++; gain(c, 3, 'vip'); sfx.upgrade(); }
      else if (c.kind === 'cai') { st.cai++; st.frenzy = st.t + 4; gain(c, 2, 'vip'); talk(pick(LINES.cai)); sfx.promote(); el.classList.add('frenzy'); }
      else { gain(c, 1, 'ok'); sfx.answer(); }
      setCell(c, null);
    }
    function spawn() {
      const free = cells.filter(c => !c.kind); if (!free.length) return;
      const c = free[Math.floor(Math.random() * free.length)], p = st.t / L.dur, r = Math.random();
      const kevinP = L.kevin + p * .1;
      const kind = r < kevinP ? 'kevin' : r < kevinP + L.vip ? 'vip' : r < kevinP + L.vip + L.angry ? 'angry' : r < kevinP + L.vip + L.angry + L.cai ? 'cai' : 'call';
      const life = L.life[0] - p * (L.life[0] - L.life[1]);   // 越後面接聽時間越短
      setCell(c, kind); c.until = st.t + (kind === 'kevin' ? 1.6 : kind === 'angry' ? life + 0.35 : kind === 'cai' ? Math.max(0.75, life * 0.85) : life);
      if (kind === 'vip' && Math.random() < .5) talk(pick(LINES.vip));
      if (kind === 'angry' && Math.random() < .35) talk(pick(LINES.angry));
      if (kind !== 'kevin') sfx.ring();
    }
    function loop(now) {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      if (paused) { raf = requestAnimationFrame(loop); return; }   // 暫停中：時間不往前走
      if (step(dt)) raf = requestAnimationFrame(loop);
    }
    // 推進 dt 秒；回傳 false＝結束了（測試可以直接呼叫 el.__step 推時間）
    function step(dt) {
      if (!st.running) return false;
      st.t += dt;
      if (st.t < 0) { big.textContent = Math.ceil(-st.t); big.className = 'big on'; }
      else if (st.t < .6 && big.textContent !== '開始！') { big.textContent = '開始！'; big.className = 'big on'; }
      else if (st.t >= .6) big.className = 'big';
      if (st.t >= 0 && st.t < L.dur) {
        const p = st.t / L.dur;
        if (st.t >= st.nextAt) {
          spawn(); if (p > .4 && Math.random() < p * .6) spawn(); if (lvI === 2 && p > .6 && Math.random() < .3) spawn();
          st.nextAt = st.t + (L.gap[0] - p * (L.gap[0] - L.gap[1])) * (0.7 + Math.random() * .6);
        }
        for (const c of cells) if (c.kind && st.t > c.until) {
          if (c.kind !== 'kevin') { st.missed++; st.combo = 0; flash(c, '漏接', 'bad'); if (Math.random() < .5) talk(pick(LINES.miss)); }
          setCell(c, null);
        }
      }
      if (!frenzy()) el.classList.remove('frenzy');
      bar.style.width = `${Math.max(0, 1 - Math.max(0, st.t) / L.dur) * 100}%`;
      scoreEl.textContent = st.points;
      comboEl.textContent = frenzy() ? '🧧 分數 ×2！' : st.combo >= 3 ? `🔥 ${st.combo} 連擊` : '';
      if (st.t >= L.dur) { finish(); return false; }
      return true;
    }
    el.__step = step;
    function finish() {
      st.running = false; cells.forEach(c => setCell(c, null)); el.classList.remove('frenzy'); pzBtn.style.display = 'none'; document.removeEventListener('visibilitychange', onHide);
      const score = st.points, nb = Math.max(best, score), before = unlockedUpTo(bests);
      bests = bests.slice(); bests[lvI] = nb;
      const unlocked = unlockedUpTo(bests) > before ? unlockedUpTo(bests) : -1;
      talk(unlocked >= 0 ? `過關！第 ${unlocked + 1} 關「${LEVELS[unlocked].name}」開放了！` : LINES.end(score, lvI));
      const res = onEnd({ level: lvI, answered: st.answered, vip: st.vip, angry: st.angry, cai: st.cai, missed: st.missed, wrong: st.wrong, combo: st.maxCombo, score, best: nb, bests, newBest: score > best, unlocked });
      endEl.querySelector('h2').textContent = `📞 第 ${lvI + 1} 關　${L.name}`;
      endEl.querySelector('.rows').innerHTML = [
        ['接到', `${st.answered} 通`], ['老闆來電', `${st.vip} 通`], ...(L.angry ? [['安撫客訴', `${st.angry} 通`]] : []), ...(L.cai ? [['黑財神來電', `${st.cai} 通`]] : []),
        ['最高連擊', `${st.maxCombo}`], ['漏接', `${st.missed} 通`], ['接到 AI 推銷', `${st.wrong} 次`],
        ['分數', `${score}${score > best ? '　🏆 新紀錄！' : `（最佳 ${nb}）`}`], ...(L.pass ? [['過關', nb >= L.pass ? '✅ 已過關' : `要 ${L.pass} 分`]] : []), ['獎金', `+$${res.reward.toLocaleString()}`],
      ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('') + (unlocked >= 0 ? `<p class="unlock">🔓 解鎖第 ${unlocked + 1} 關「${LEVELS[unlocked].name}」！</p>` : '');
      endEl.classList.add('on'); sfx.promote();
      const next = endEl.querySelector('.next'), canNext = lvI + 1 < LEVELS.length && unlockedUpTo(bests) > lvI;
      next.style.display = canNext ? '' : 'none';
      next.onclick = () => { cancelAnimationFrame(raf); play(lvI + 1); };
      endEl.querySelector('.again').onclick = () => { cancelAnimationFrame(raf); play(lvI); };
      endEl.querySelector('.pick').onclick = () => { cancelAnimationFrame(raf); endEl.classList.remove('on'); showLevels(); };
      endEl.querySelector('.back').onclick = () => { el.classList.remove('on'); res.close?.(); };
    }
    raf = requestAnimationFrame(loop);
    // 給測試用：直接拿到格子狀態
    return { cells, st };
  }
}
