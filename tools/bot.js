// 自動玩測試：不靠 requestAnimationFrame，直接用 G.step 推進遊戲（電腦閒置時瀏覽器會被節流也能跑）
// 用法（在遊戲頁的主控台）：const b = (await import('/tools/bot.js?' + Date.now())).install(); b.run(60)
// 策略（貪婪）：有貨先送 → 買得起的格子先買（最便宜的）→ 收錢 → 接電話 → 去出貨口裝滿
export function install() {
  const G = window.G, S = G.shops;
  const B = { mode: null, shop: null, events: [], prev: '' };
  const isLine = s => s.def.levels[s.lv].line;
  const lvls = () => `咖${S.coffee.lv + 1} 印${S.printer.unlocked ? S.printer.lv + 1 : '-'} 電${G.phone.unlocked ? G.phone.lv + 1 : '-'} 職${G.state.rank + 1} 人${Object.keys(G.hires).join(',')}`;
  B.decide = () => {
    const p = G.player;
    const pad = G.pads.filter(q => q.shown && G.state.money >= q.price() - q.paid).sort((a, b) => a.price() - b.price())[0];
    if (B.mode === 'fill') {
      const s = B.shop;
      B.idle = s.tray.length ? 0 : (B.idle || 0) + 1 / 30;
      if (!p.carry.length && pad) B.mode = null;
      else if (isLine(s) || p.carry.length >= p.carryMax || (!s.tray.length && p.carry.length)) B.mode = null;
      else if (B.idle > 2) { B.mode = null; B.idle = 0; B.skip = G.state.t + 3; }   // 空等太久就去做別的
      else return s.pickup;
    }
    if (p.carry.length) return S[p.type === 'coffee' ? 'coffee' : 'printer'].d.drop;
    // 選定的格子就付到完，不要半路換目標
    if (B.pad && B.pad.shown && G.state.money > 0) return B.pad.at;
    B.pad = pad || null;
    if (pad) return pad.at;
    const cashS = Object.values(S).filter(s => s.unlocked && s.cash.length).sort((a, b) => b.cash.length - a.cash.length)[0];
    if (cashS) return cashS.d.cash;
    if (G.phone.unlocked && !G.hires.mi && G.phone.lines.some(l => l.ringing)) return [5.4, -4.2];
    const s = Object.values(S).filter(s => s.unlocked && !isLine(s) && (s.tray.length || !(B.skip > G.state.t))).sort((a, b) => b.tray.length - a.tray.length)[0];
    if (s) { B.mode = 'fill'; B.shop = s; return s.pickup; }
    return G.phone.unlocked ? [5.4, -4.2] : null;
  };
  // 櫃台一排擋在 z -2.85～-1.95，要穿越就先走到缺口
  B.nav = (at, pos) => {
    const north = z => z < -2.4;
    if (north(pos.z) === north(at[1])) return at;
    const blocked = x => (x > -5.4 && x < -2.6) || (S.printer.unlocked && x > 0.0 && x < 2.8);
    if (!blocked(pos.x) && !blocked(at[0]) && !blocked((pos.x + at[0]) / 2)) return at;
    const gx = [-1.3, 3.6, -5.95].filter(x => !blocked(x)).sort((a, b) => (Math.abs(a - pos.x) + Math.abs(a - at[0])) - (Math.abs(b - pos.x) + Math.abs(b - at[0])))[0];
    if (Math.abs(pos.x - gx) > 0.25) return [gx, north(pos.z) ? -3.35 : -1.45];
    return [gx, at[1] > pos.z ? pos.z + 1 : pos.z - 1];
  };
  B.run = (sec, dt = 1 / 30) => {
    const n = Math.round(sec / dt);
    for (let i = 0; i < n; i++) {
      const pos = G.player.actor.root.position; let at = B.decide();
      if (at) at = B.nav(at, pos);
      if (at) { const dx = at[0] - pos.x, dz = at[1] - pos.z, d = Math.hypot(dx, dz); G.force = d > 0.18 ? [dx / d, dz / d] : [0, 0]; } else G.force = [0, 0];
      G.step(dt);
      const now = lvls(); if (now !== B.prev) { B.events.push(`${Math.round(G.state.t)}s $${G.state.money} ${now}`); B.prev = now; }
    }
    return `${Math.round(G.state.t)}s $${G.state.money} ${lvls()}`;
  };
  B.allMax = () => S.coffee.lv >= 4 && S.printer.lv >= 4 && G.phone.lv >= 4 && Object.keys(G.hires).length >= 4;
  B.toMax = (limit = 1800) => { while (!B.allMax() && G.state.t < limit) B.run(10); return B.run(0); };
  window.BOT = B; G.force = null;
  return B;
}
