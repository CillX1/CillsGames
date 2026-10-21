// 🃏 Memory – drei Grössen, wechselnde Themen, Kombo-Bonus.
import { shuffle } from '../util.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: '8 Paare (4×4)' },
  { id: 'normal', label: 'Normal', desc: '12 Paare (6×4)' },
  { id: 'hard', label: 'Schwer', desc: '18 Paare (6×6) – Punkte ×1.5' },
];
const CFG = { easy: { pairs: 8, cols: 4, mult: 1 }, normal: { pairs: 12, cols: 6, mult: 1 }, hard: { pairs: 18, cols: 6, mult: 1.5 } };

export const THEMES = {
  Tiere: ['🐶', '🐱', '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '🦋', '🐢', '🐧', '🦉', '🐬', '🐝', '🦒', '🦔', '🐳', '🦩'],
  Essen: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥨', '🍩', '🍪', '🎂', '🍫', '🍦', '🍉', '🍓', '🍌', '🍍', '🥑', '🌮', '🍣', '🥐'],
  Sport: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🥊', '⛷️', '🏂', '🚴', '🏊', '🛹', '🎳', '⛳', '🏒', '🥋', '🏹', '🤿'],
  Weltall: ['🚀', '🛸', '🌍', '🌙', '⭐', '☄️', '🪐', '🌞', '👽', '🛰️', '🌌', '🔭', '👩‍🚀', '🌠', '🌑', '🌕', '💫', '📡', '🎆', '🧪'],
  Natur: ['🌲', '🌵', '🌻', '🌹', '🍄', '🌴', '🍁', '🌊', '⛰️', '🌋', '❄️', '🌈', '⚡', '🔥', '💧', '🌷', '🍀', '🌾', '🪨', '🌸'],
};
export const PAIRS = 12;

export function memoryScore(moves, seconds, pairs = PAIRS) {
  const extra = Math.max(0, moves - pairs);
  return Math.max(200, pairs * 250 - extra * 70 - Math.floor(seconds) * 4);
}

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const themeName = Object.keys(THEMES)[Math.floor(Math.random() * Object.keys(THEMES).length)];
  const symbols = [...new Set(THEMES[themeName])];
  const deck = shuffle(shuffle(symbols).slice(0, C.pairs).flatMap((e) => [e, e]));
  const open = [], matched = new Set();
  let moves = 0, lock = false, streak = 0, bonus = 0;
  const t0 = Date.now();

  const root = document.createElement('div');
  root.className = 'memory';
  root.innerHTML = `<div class="mem-info"><span>Thema: <b>${themeName}</b></span><span class="mem-moves">Züge: 0</span><span class="mem-pairs">Paare: 0/${C.pairs}</span><span class="mem-time">⏱️ 0s</span></div>
    <div class="mem-streak" aria-live="polite"></div>
    <div class="mem-grid" style="--cols:${C.cols}"></div>`;
  host.stage.appendChild(root);
  const grid = root.querySelector('.mem-grid');
  deck.forEach((e, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mem-card';
    b.dataset.i = i;
    b.setAttribute('aria-label', 'Verdeckte Karte');
    b.innerHTML = `<span class="mem-inner"><span class="mem-front">❔</span><span class="mem-back">${e}</span></span>`;
    grid.appendChild(b);
  });
  const cards = [...grid.children];
  host.interval(() => { root.querySelector('.mem-time').textContent = `⏱️ ${Math.floor((Date.now() - t0) / 1000)}s`; }, 1000);

  host.on(grid, 'click', (ev) => {
    const card = ev.target.closest('.mem-card');
    if (!card || lock || host.paused) return;
    const i = +card.dataset.i;
    if (matched.has(i) || open.includes(i)) return;
    open.push(i);
    card.classList.add('flipped');
    card.setAttribute('aria-label', deck[i]);
    host.sound('click');
    if (open.length < 2) return;
    moves++;
    root.querySelector('.mem-moves').textContent = 'Züge: ' + moves;
    const [a, b] = open;
    if (deck[a] === deck[b]) {
      matched.add(a); matched.add(b);
      streak++;
      if (streak >= 2) bonus += 50 * (streak - 1);
      cards[a].classList.add('matched'); cards[b].classList.add('matched');
      open.length = 0;
      host.sound(streak >= 2 ? 'win' : 'coin');
      root.querySelector('.mem-streak').textContent = streak >= 2 ? `🔥 ${streak} Paare in Folge! +${50 * (streak - 1)}` : '';
      root.querySelector('.mem-pairs').textContent = `Paare: ${matched.size / 2}/${C.pairs}`;
      host.setScore(Math.round((matched.size * 50 + bonus) * C.mult));
      if (matched.size === deck.length) {
        const s = Math.round((memoryScore(moves, (Date.now() - t0) / 1000, C.pairs) + bonus) * C.mult);
        host.setScore(s);
        root.querySelector('.mem-streak').textContent = `🎉 Geschafft in ${moves} Zügen!`;
        host.timeout(() => host.end(s), 900);
      }
    } else {
      streak = 0;
      root.querySelector('.mem-streak').textContent = '';
      lock = true;
      cards[a].classList.add('nope'); cards[b].classList.add('nope');
      host.timeout(() => {
        cards[a].classList.remove('flipped', 'nope'); cards[b].classList.remove('flipped', 'nope');
        cards[a].setAttribute('aria-label', 'Verdeckte Karte'); cards[b].setAttribute('aria-label', 'Verdeckte Karte');
        open.length = 0;
        lock = false;
      }, 750);
    }
  });
}
