// 自動玩測試：不靠 requestAnimationFrame，直接用 G.step 推進遊戲（電腦閒置時瀏覽器會被節流也能跑）
// 用法（在遊戲頁的主控台）：const b = (await import('./tools/bot.js?' + Date.now())).install(); b.toMax()
// 策略（貪婪）：有貨先送 → 買得起的格子先買（最便宜的）→ 收錢 → 接電話 → 去最缺貨的店裝滿
// 走路用格子 A*，自己繞過櫃台、攤位、機器
export function install() {
  const G = window.G, S = G.shops;
  const B = { mode: null, shop: null, events: [], prev: '', path: [], pathFor: '' };
  const isLine = s => !!s.def.levels[s.lv].line;
  const shopOf = item => Object.values(S).find(s => s.item === item);
  const lv = s => s.unlocked ? s.lv + 1 : '-';
  const lvls = () => `Q${G.state.q} 咖${lv(S.coffee)} 印${lv(S.printer)} 販${lv(S.vending)} 牛${lv(S.beef)} 雞${lv(S.chicken)} 魚${lv(S.fish)} 電${G.phone.unlocked ? G.phone.lv + 1 : '-'} 職${G.state.rank + 1} 人${Object.keys(G.hires).length}`;
  const PHONE = [5.4, -4.2];
  B.decide = () => {
    const p = G.player;
    const pad = G.pads.filter(q => q.shown && G.state.money >= q.price() - q.paid).sort((a, b) => a.price() - b.price())[0];
    if (B.mode === 'fill') {
      const s = B.shop;
      B.idle = s.tray.length ? 0 : (B.idle || 0) + 1 / 30;
      if (!p.carry.length && pad) B.mode = null;
      else if (isLine(s) || p.carry.length >= p.carryMax || (!s.tray.length && p.carry.length)) B.mode = null;
      else if (B.idle > 2) { B.mode = null; B.idle = 0; B.skip = G.state.t + 3; }
      else return s.pickup;
    }
    if (G.kevin && G.kevin.phase !== 'flee') { const k = G.kevin.a.root.position; return [k.x, k.z]; }   // Kevin 來鬧事：先去揍他
    if (p.carry.length) return shopOf(p.type).d.drop;
    if (B.pad && B.pad.shown && G.state.money > 0) return B.pad.at;   // 選定的格子就付到完
    B.pad = pad || null;
    if (pad) return pad.at;
    // 採購部：買得起最便宜的就去買
    const item = G.kiosk && G.shopItems().filter(i => i.price != null && G.state.money >= i.price).sort((a, b) => a.price - b.price)[0];
    if (item) {
      const z = G.KIOSK.zone, pos = p.actor.root.position;
      if (Math.hypot(pos.x - z[0], pos.z - z[1]) < 0.8) { G.buy(item.kind, item.id); B.events.push(`${Math.round(G.state.t)}s 買 ${item.name}`); }
      return z;
    }
    const cashS = Object.values(S).filter(s => s.unlocked && s.cash.length).sort((a, b) => b.cash.length - a.cash.length)[0];
    if (cashS && cashS.cash.length >= 3) return cashS.d.cash;
    if (G.phone.unlocked && !G.hires.mi && G.phone.lines.filter(l => l.ringing).length >= 2) return PHONE;
    // 最缺貨：有人在排隊、櫃台快空的店先補
    const need = s => (s.queue.length ? 10 : 0) - s.stack.length;
    const s = Object.values(S).filter(s => s.unlocked && !isLine(s) && s.tray.length && !(B.skip > G.state.t && s === B.shop)).sort((a, b) => need(b) - need(a))[0];
    if (s) { B.mode = 'fill'; B.shop = s; return s.pickup; }
    if (cashS) return cashS.d.cash;
    return G.phone.unlocked ? PHONE : null;
  };
  // 格子 A*：0.25 一格，障礙＝碰撞框加上角色半徑
  const CELL = 0.25, b = G.L.bounds, NX = Math.ceil((b.maxX - b.minX) / CELL) + 1, NZ = Math.ceil((b.maxZ - b.minZ) / CELL) + 1;
  let grid = null, gridN = -1;
  const blockedAt = (x, z) => G.colliders.some(c => x > c.minX - 0.3 && x < c.maxX + 0.3 && z > c.minZ - 0.3 && z < c.maxZ + 0.3);
  const buildGrid = () => { grid = new Uint8Array(NX * NZ); for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) grid[j * NX + i] = blockedAt(b.minX + i * CELL, b.minZ + j * CELL) ? 1 : 0; gridN = G.colliders.length; };
  const cellOf = (x, z) => [Math.max(0, Math.min(NX - 1, Math.round((x - b.minX) / CELL))), Math.max(0, Math.min(NZ - 1, Math.round((z - b.minZ) / CELL)))];
  function astar(from, to) {
    if (gridN !== G.colliders.length) buildGrid();
    const [sx, sz] = cellOf(from.x, from.z), [tx, tz] = cellOf(to[0], to[1]);
    const key = (x, z) => z * NX + x, open = new Map(), came = new Map(), gS = new Map();
    // 不打算拿貨時，繞過別家的出貨框（不然路過會自動背一個，來回卡住）
    const avoid = Object.values(S).filter(s => s.unlocked && !isLine(s) && Math.hypot(s.pickup[0] - to[0], s.pickup[1] - to[1]) > 1).map(s => s.pickup);
    const avoidCell = (cx, cz) => { const x = b.minX + cx * CELL, z = b.minZ + cz * CELL; return avoid.some(([ax, az]) => Math.hypot(x - ax, z - az) < 0.95); };
    const h = (x, z) => Math.hypot(x - tx, z - tz);
    open.set(key(sx, sz), h(sx, sz)); gS.set(key(sx, sz), 0);
    for (let iter = 0; iter < 6000 && open.size; iter++) {
      let ck = -1, cf = Infinity; for (const [k, f] of open) if (f < cf) { cf = f; ck = k; }
      open.delete(ck); const cx = ck % NX, cz = (ck / NX) | 0;
      if (cx === tx && cz === tz) { const path = []; let k = ck; while (k !== undefined) { path.push([b.minX + (k % NX) * CELL, b.minZ + ((k / NX) | 0) * CELL]); k = came.get(k); } return path.reverse(); }
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue; const nx = cx + dx, nz = cz + dz; if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue;
        const nk = key(nx, nz); if ((grid[nk] || avoidCell(nx, nz)) && !(nx === tx && nz === tz)) continue;
        const g2 = gS.get(ck) + Math.hypot(dx, dz); if (g2 < (gS.get(nk) ?? Infinity)) { gS.set(nk, g2); came.set(nk, ck); open.set(nk, g2 + h(nx, nz)); }
      }
    }
    return [to];
  }
  B.run = (sec, dt = 1 / 30) => {
    const n = Math.round(sec / dt);
    for (let i = 0; i < n; i++) {
      const pos = G.player.actor.root.position, at = B.decide();
      if (at) {
        const k = at.join(',');
        if (k !== B.pathFor || !B.path.length) { B.path = astar(pos, at); B.pathFor = k; }
        while (B.path.length > 1 && Math.hypot(B.path[0][0] - pos.x, B.path[0][1] - pos.z) < 0.3) B.path.shift();
        const wp = B.path[0] || at, dx = wp[0] - pos.x, dz = wp[1] - pos.z, d = Math.hypot(dx, dz);
        G.force = d > 0.15 ? [dx / d, dz / d] : [0, 0];
      } else G.force = [0, 0];
      G.step(dt);
      if (document.getElementById('finale').classList.contains('on')) { B.events.push(`${Math.round(G.state.t)}s 尾牙結束`); G.endFinale(); }
      const now = lvls(); if (now !== B.prev) { B.events.push(`${Math.round(G.state.t)}s $${G.state.money} ${now}`); B.prev = now; }
    }
    return `${Math.round(G.state.t)}s $${G.state.money} ${lvls()}`;
  };
  B.allMax = () => Object.values(S).every(s => s.unlocked && s.lv >= s.def.levels.length - 1) && G.phone.lv >= 4 && Object.keys(G.hires).length >= 5;
  B.allDone = () => B.allMax() && G.state.finaleDone && G.shopItems().every(i => i.price == null) && G.state.q >= 4;
  window.BOT = B; G.force = null;
  return B;
}
