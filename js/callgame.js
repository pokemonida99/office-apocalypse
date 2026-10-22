// 小米的接電話挑戰：30 秒、3×3 總機，響了就點。金色＝老闆（3 倍），紫色 🤖＝Kevin 的 AI 推銷（別接！）
// 遊戲暫停主畫面，用真實時間跑（反應遊戲）。結束時呼叫 onEnd({ answered, vip, best, combo, missed, wrong })
const DUR = 30;
const LINES = {
  start: ['準備好了嗎？電話要響了！', '今天也一起努力接電話吧！'],
  good: ['好快！', '厲害！', '接得漂亮～', '就是這樣！', '手速一流！'],
  combo: (n) => `${n} 連擊！太強了！`,
  miss: ['啊，漏接了……', '電話掛掉了啦～', '慢了一點點！'],
  kevin: ['那是 Kevin 的 AI 推銷啦！', '不要接 Kevin 的電話！', '又是那個特助……'],
  vip: ['老闆的電話！快接！', '是老闆！'],
  end: (n) => n >= 40 ? '你是總機之神！' : n >= 25 ? '好厲害，可以來客服部了！' : n >= 12 ? '不錯喔，再接再厲！' : '下次會更好的！',
};
const pick = a => a[Math.floor(Math.random() * a.length)];

export function openCallGame({ sfx, best = 0, onEnd }) {
  const el = document.getElementById('callgame'), grid = el.querySelector('.grid'), say = el.querySelector('.say'), bar = el.querySelector('.time i');
  const scoreEl = el.querySelector('.score b'), comboEl = el.querySelector('.combo'), big = el.querySelector('.big'), endEl = el.querySelector('.end');
  grid.innerHTML = ''; endEl.classList.remove('on'); el.classList.add('on');
  const cells = [];
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button'); b.className = 'cell'; b.innerHTML = '<span class="ph">☎</span><span class="tag"></span>';
    const c = { b, kind: null, until: 0 };
    b.onpointerdown = (e) => { e.preventDefault(); hit(c); };
    grid.appendChild(b); cells.push(c);
  }
  const st = { t: -3, answered: 0, vip: 0, missed: 0, wrong: 0, combo: 0, maxCombo: 0, nextAt: 0, running: true };
  let last = performance.now(), raf = 0;
  const talk = (s) => { say.textContent = s; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop'); };
  talk(pick(LINES.start));
  function setCell(c, kind) {
    c.kind = kind; c.b.className = 'cell' + (kind ? ' ring ' + kind : '');
    c.b.querySelector('.ph').textContent = kind === 'kevin' ? '🤖' : kind === 'vip' ? '👑' : '☎';
    c.b.querySelector('.tag').textContent = kind === 'kevin' ? 'AI 推銷' : kind === 'vip' ? '老闆' : '';
  }
  function flash(c, txt, cls) { const f = document.createElement('i'); f.className = 'fx ' + cls; f.textContent = txt; c.b.appendChild(f); setTimeout(() => f.remove(), 600); }
  function hit(c) {
    if (!st.running || st.t < 0) return;
    if (!c.kind) { return; }
    if (c.kind === 'kevin') { st.wrong++; st.combo = 0; flash(c, '✕', 'bad'); talk(pick(LINES.kevin)); sfx.punch?.(); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    else {
      st.answered++; st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
      if (c.kind === 'vip') { st.vip++; flash(c, '+3', 'vip'); sfx.upgrade(); }
      else { flash(c, st.combo >= 5 ? `×${st.combo}` : '+1', 'ok'); sfx.answer(); }
      if (st.combo > 0 && st.combo % 10 === 0) talk(LINES.combo(st.combo)); else if (Math.random() < .18) talk(pick(LINES.good));
    }
    setCell(c, null);
  }
  function spawn() {
    const free = cells.filter(c => !c.kind); if (!free.length) return;
    const c = free[Math.floor(Math.random() * free.length)], p = st.t / DUR;
    const r = Math.random(), kind = r < .13 + p * .1 ? 'kevin' : r < .23 + p * .1 ? 'vip' : 'call';
    setCell(c, kind); c.until = st.t + (kind === 'kevin' ? 1.6 : 1.5 - p * .65);   // 越後面接聽時間越短
    if (kind === 'vip' && Math.random() < .5) talk(pick(LINES.vip));
    if (kind !== 'kevin') sfx.ring();
  }
  function loop(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (step(dt)) raf = requestAnimationFrame(loop);
  }
  // 推進 dt 秒；回傳 false＝結束了（測試可以直接呼叫 el.__step 推時間）
  function step(dt) {
    if (!st.running) return false;
    st.t += dt;
    if (st.t < 0) { big.textContent = Math.ceil(-st.t); big.className = 'big on'; }
    else if (st.t < .6 && big.textContent !== '開始！') { big.textContent = '開始！'; big.className = 'big on'; }
    else if (st.t >= .6) big.className = 'big';
    if (st.t >= 0 && st.t < DUR) {
      const p = st.t / DUR;
      if (st.t >= st.nextAt) { spawn(); if (p > .4 && Math.random() < p * .6) spawn(); st.nextAt = st.t + (0.85 - p * .45) * (0.7 + Math.random() * .6); }
      for (const c of cells) if (c.kind && st.t > c.until) {
        if (c.kind !== 'kevin') { st.missed++; st.combo = 0; flash(c, '漏接', 'bad'); if (Math.random() < .5) talk(pick(LINES.miss)); }
        setCell(c, null);
      }
    }
    bar.style.width = `${Math.max(0, 1 - Math.max(0, st.t) / DUR) * 100}%`;
    scoreEl.textContent = st.answered + st.vip * 2;
    comboEl.textContent = st.combo >= 3 ? `🔥 ${st.combo} 連擊` : '';
    if (st.t >= DUR) { finish(); return false; }
    return true;
  }
  el.__step = step;
  function finish() {
    st.running = false; cells.forEach(c => setCell(c, null));
    const score = st.answered + st.vip * 2, nb = Math.max(best, score);
    talk(LINES.end(score));
    const res = onEnd({ answered: st.answered, vip: st.vip, missed: st.missed, wrong: st.wrong, combo: st.maxCombo, score, best: nb, newBest: score > best });
    endEl.querySelector('.rows').innerHTML = [
      ['接到', `${st.answered} 通`], ['老闆來電', `${st.vip} 通`], ['最高連擊', `${st.maxCombo}`], ['漏接', `${st.missed} 通`], ['接到 AI 推銷', `${st.wrong} 次`],
      ['分數', `${score}${score > best ? '　🏆 新紀錄！' : `（最佳 ${nb}）`}`], ['獎金', `+$${res.reward.toLocaleString()}`],
    ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    endEl.classList.add('on'); sfx.promote();
    endEl.querySelector('.again').onclick = () => { cancelAnimationFrame(raf); openCallGame({ sfx, best: nb, onEnd }); };
    endEl.querySelector('.back').onclick = () => { el.classList.remove('on'); res.close?.(); };
  }
  raf = requestAnimationFrame(loop);
  // 給測試用：直接拿到格子狀態
  return { cells, st };
}
