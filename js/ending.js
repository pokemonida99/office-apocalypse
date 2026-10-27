// 離職結局播放（C 手帳風）：方格紙上用紙膠帶貼一張劇照，下面打字機旁白，點一下下一張；最後一張結局卡＋「已解鎖」章
// play(id, { buttons }) 回傳 Promise；buttons＝最後結局卡的按鈕 [{ label, main, fn }]
import { ENDINGS } from './stories.js?v=0.15.0';
const SEEN_KEY = 'office-apocalypse-endings';
export const seenEndings = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch { return []; } };
export function makeEnding({ sfx = {}, onOpen, onClose }) {
  const el = document.getElementById('ending');
  let typing = null;
  function play(id, { buttons } = {}) {
    const E = ENDINGS[id]; if (!E) return Promise.resolve();
    return new Promise((done) => {
      if (window.G?.autoTheater) { mark(); return done(); }
      let i = -1; el.classList.add('on'); onOpen && onOpen();
      el.innerHTML = `<div class="en-page"><div class="en-head">${E.icon} ${E.title}</div><div class="en-photo"><i class="tape a"></i><i class="tape b"></i><img alt=""></div><p class="en-text"></p><div class="en-btns"></div><span class="en-next">點一下繼續 ▶</span><button class="en-skip">跳過 ⏭</button></div>`;
      const img = el.querySelector('img'), txt = el.querySelector('.en-text'), btns = el.querySelector('.en-btns'), photo = el.querySelector('.en-photo');
      function mark() { try { const s = seenEndings(); if (!s.includes(id)) { s.push(id); localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } } catch {} }
      const close = () => { clearInterval(typing); el.classList.remove('on'); el.innerHTML = ''; onClose && onClose(); done(); };
      function finish() {   // 結局卡
        mark(); clearInterval(typing); i = 99;
        photo.classList.add('card'); photo.innerHTML = `<div class="en-card"><b>${E.icon}</b><h2>${E.title}</h2><div class="en-stamp">已解鎖<br>${E.no} / ${Object.keys(ENDINGS).length}</div></div>`;
        txt.textContent = '謝謝你陪小葵走到這裡。'; el.querySelector('.en-next').style.display = 'none'; el.querySelector('.en-skip').style.display = 'none';
        btns.innerHTML = ''; for (const b of (buttons || [{ label: '關閉', main: true }])) { const x = document.createElement('button'); x.className = 'a4btn' + (b.main ? ' main' : ''); x.textContent = b.label; x.onclick = (e) => { e.stopPropagation(); close(); b.fn && b.fn(); }; btns.appendChild(x); }
        sfx.stamp?.(); sfx.bell?.();
      }
      function next() {
        if (i >= 99) return;
        if (typing) { clearInterval(typing); typing = null; txt.textContent = E.shots[i][1]; return; }
        i++; if (i >= E.shots.length) return finish();
        const [file, line] = E.shots[i];
        photo.classList.remove('in'); void photo.offsetWidth; photo.classList.add('in');
        img.src = `art/ending/${file}.webp?v=0.12.0`; photo.style.transform = `rotate(${i % 2 ? 2 : -2}deg)`;
        let n = 0; txt.textContent = ''; clearInterval(typing);
        typing = setInterval(() => { n++; txt.textContent = line.slice(0, n); if (n >= line.length) { clearInterval(typing); typing = null; } }, 45);
        sfx.pick?.();
      }
      el.onclick = (e) => { if (e.target.closest('.en-skip')) return finish(); if (!e.target.closest('.en-btns')) next(); };
      next();
    });
  }
  return { play };
}
