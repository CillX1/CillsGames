// 🃏 Memory – 12 Paare. Weniger Züge = mehr Punkte.
import { shuffle } from '../util.js';

const EMOJIS = ['🐶', '🐱', '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐙', '🦄', '🦋', '🐢', '🐧', '🦉', '🐬', '🐝'];
export const PAIRS = 12;

export function memoryScore(moves, seconds) {
  const extra = Math.max(0, moves - PAIRS);
  return Math.max(200, 3000 - extra * 70 - Math.floor(seconds) * 4);
}

export function start(host) {
  const deck = shuffle(shuffle(EMOJIS).slice(0, PAIRS).flatMap((e) => [e, e]));
  const open = [], matched = new Set();
  let moves = 0, lock = false;
  const t0 = Date.now();

  const root = document.createElement('div');
  root.className = 'memory';
  root.innerHTML = '<div class="mem-info"><span class="mem-moves">Züge: 0</span><span class="mem-pairs">Paare: 0/' + PAIRS + '</span></div><div class="mem-grid"></div>';
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
      cards[a].classList.add('matched'); cards[b].classList.add('matched');
      open.length = 0;
      host.sound('coin');
      root.querySelector('.mem-pairs').textContent = `Paare: ${matched.size / 2}/${PAIRS}`;
      host.setScore(matched.size * 50);
      if (matched.size === deck.length) {
        const s = memoryScore(moves, (Date.now() - t0) / 1000);
        host.setScore(s);
        host.sound('win');
        host.timeout(() => host.end(s), 700);
      }
    } else {
      lock = true;
      host.timeout(() => {
        cards[a].classList.remove('flipped'); cards[b].classList.remove('flipped');
        cards[a].setAttribute('aria-label', 'Verdeckte Karte'); cards[b].setAttribute('aria-label', 'Verdeckte Karte');
        open.length = 0;
        lock = false;
      }, 750);
    }
  });
}
