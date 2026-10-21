// 🐍 Snake – drei Modi, flüssige Bewegung, Spezial-Früchte.
// Eingabe-Puffer: schnelle Doppel-Kurven gehen nicht verloren, 180°-Wenden sind unmöglich.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'classic', label: 'Klassisch', desc: 'Wand berühren = Ende' },
  { id: 'wrap', label: 'Ohne Wände', desc: 'Durch den Rand auf die andere Seite – entspannter' },
  { id: 'walls', label: 'Hindernisse', desc: 'Mit jedem Level kommen Mauern dazu – Punkte ×1.5' },
];
const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };

export function start(host, mode = 'classic') {
  const N = 20, CELL = 25, W = N * CELL, HUD = 30;
  const { ctx } = host.createCanvas(W, W + HUD);
  host.touchControls([
    { code: 'ArrowLeft', label: '◀' }, { code: 'ArrowUp', label: '▲' },
    { code: 'ArrowDown', label: '▼' }, { code: 'ArrowRight', label: '▶' },
  ]);
  host.requireStart('Pfeiltasten / WASD oder wischen');
  const wrap = mode === 'wrap';
  const mult = mode === 'walls' ? 1.5 : 1;

  let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  let prev = snake.map((s) => ({ ...s }));
  let dir = DIRS.right;
  const queue = [];
  let food = null, special = null;
  const walls = new Set();
  let score = 0, tick = 0, interval = 8, eaten = 0, level = 1, slow = 0;
  const parts = makeParticles();
  const key = (x, y) => y * N + x;

  const occupied = (x, y) => walls.has(key(x, y)) || snake.some((s) => s.x === x && s.y === y)
    || (food && food.x === x && food.y === y) || (special && special.x === x && special.y === y);
  function freeCell(minDistHead = 0) {
    const free = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (occupied(x, y)) continue;
      if (minDistHead && Math.abs(x - snake[0].x) + Math.abs(y - snake[0].y) < minDistHead) continue;
      free.push({ x, y });
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }
  food = freeCell();

  function addWalls() {
    // kleines Mauerstück, nie direkt vor dem Kopf
    for (let tries = 0; tries < 40; tries++) {
      const c = freeCell(6);
      if (!c) return;
      const horiz = Math.random() < 0.5, len = 3 + Math.floor(Math.random() * 3);
      const cells = [];
      for (let i = 0; i < len; i++) {
        const x = c.x + (horiz ? i : 0), y = c.y + (horiz ? 0 : i);
        if (x >= N || y >= N || occupied(x, y)) { cells.length = 0; break; }
        cells.push(key(x, y));
      }
      if (cells.length) { cells.forEach((k) => walls.add(k)); return; }
    }
  }

  function turn(name) {
    const d = DIRS[name];
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (d === last || (d.x === -last.x && d.y === -last.y)) return;
    if (queue.length < 3) queue.push(d);
  }
  host.onKey((e) => { if (KEYMAP[e.code]) turn(KEYMAP[e.code]); });
  host.onSwipe(turn);

  function die() {
    const h = snake[0];
    parts.burst(h.x * CELL + CELL / 2, h.y * CELL + CELL / 2, '#4CAF50', 24, 5);
    host.shake(8);
    host.sound('hit');
    host.end(Math.floor(score));
  }

  host.loop(() => {
    tick++;
    parts.update();
    if (special && --special.t <= 0) special = null;
    if (slow > 0) slow--;
    const stepEvery = interval + (slow > 0 ? 4 : 0);
    if (tick < stepEvery) return;
    tick = 0;
    if (queue.length) dir = queue.shift();
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (wrap) head = { x: (head.x + N) % N, y: (head.y + N) % N };
    const willEat = (food && food.x === head.x && food.y === head.y) || (special && special.x === head.x && special.y === head.y);
    const body = willEat ? snake : snake.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || walls.has(key(head.x, head.y)) || body.some((s) => s.x === head.x && s.y === head.y)) {
      die();
      return;
    }
    prev = snake.map((s) => ({ ...s }));
    snake.unshift(head);
    const px = head.x * CELL + CELL / 2, py = head.y * CELL + CELL / 2;
    let ate = false;
    if (food && food.x === head.x && food.y === head.y) {
      ate = true; eaten++;
      const v = Math.round(10 * mult);
      score += v;
      host.floatText(px, py, '+' + v, '#fff', 16);
      parts.burst(px, py, '#ff4444', 8, 3);
      host.sound('point');
      food = freeCell();
      if (eaten % 5 === 0) {
        if (interval > 4) interval--;
        level++;
        if (mode === 'walls') addWalls();
        host.floatText(W / 2, W / 2, `Level ${level}`, '#00d4ff', 28);
      }
      if (!special && Math.random() < 0.35) {
        const c = freeCell();
        if (c) special = { ...c, t: 330, type: Math.random() < 0.65 ? 'gold' : 'ice' };
      }
    } else if (special && special.x === head.x && special.y === head.y) {
      ate = true;
      if (special.type === 'gold') {
        const v = Math.round(50 * mult);
        score += v;
        host.floatText(px, py, '+' + v, '#ffd700', 20);
        parts.burst(px, py, '#ffd700', 14, 4);
      } else {
        slow = 300;
        score += 5;
        host.floatText(px, py, 'Langsam!', '#9fe8ff', 18);
        parts.burst(px, py, '#9fe8ff', 14, 4);
      }
      special = null;
      host.sound('coin');
    }
    if (!ate) snake.pop();
    if (snake.length >= N * N - walls.size) host.end(Math.floor(score) + 500);
    host.setScore(Math.floor(score));
  }, () => {
    // Fortschritt zwischen zwei Schritten -> flüssige Animation
    const t = host.waiting || host.over ? 1 : Math.min(1, tick / (interval + (slow > 0 ? 4 : 0)));
    ctx.fillStyle = '#1a472a'; ctx.fillRect(0, 0, W, W + HUD);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
    if (wrap) { ctx.strokeStyle = 'rgba(0,212,255,0.35)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, W - 2); ctx.setLineDash([]); }
    for (const k of walls) {
      const x = (k % N) * CELL, y = Math.floor(k / N) * CELL;
      ctx.fillStyle = '#5b5b6b'; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 1, y + 1, CELL - 2, 4);
    }
    if (food) {
      const cx = food.x * CELL + CELL / 2, cy = food.y * CELL + CELL / 2;
      const bob = Math.sin(performance.now() / 200) * 1.2;
      ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.arc(cx, cy + 1 + bob, CELL / 2 - 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(cx - 3, cy - 2 + bob, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.ellipse(cx + 4, cy - 8 + bob, 4, 2, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    if (special) {
      const cx = special.x * CELL + CELL / 2, cy = special.y * CELL + CELL / 2;
      const pulse = 0.75 + Math.sin(performance.now() / 120) * 0.25;
      const col = special.type === 'gold' ? '255,215,0' : '140,220,255';
      ctx.fillStyle = `rgba(${col},${pulse})`;
      ctx.beginPath(); ctx.arc(cx, cy, CELL / 2 - 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = special.type === 'gold' ? '#7a5a00' : '#0b4a6b'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(special.type === 'gold' ? '+50' : '❄', cx, cy + 4);
      ctx.fillStyle = `rgba(${col},0.8)`; ctx.fillRect(special.x * CELL + 2, special.y * CELL, (CELL - 4) * special.t / 330, 3);
    }
    // Schlange: jedes Segment gleitet von seiner alten zur neuen Position
    const pos = snake.map((s, i) => {
      const p = prev[i] || prev[prev.length - 1] || s;
      let dx = s.x - p.x, dy = s.y - p.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) { dx = 0; dy = 0; } // durch den Rand gesprungen
      return { x: (s.x - dx * (1 - t)) * CELL, y: (s.y - dy * (1 - t)) * CELL };
    });
    for (let i = pos.length - 1; i >= 0; i--) {
      const p = pos[i];
      const shade = 1 - (i / pos.length) * 0.45;
      ctx.fillStyle = i === 0 ? (slow > 0 ? '#5ec7e8' : '#4CAF50') : `rgb(60,${Math.floor(185 * shade)},${slow > 0 ? 160 : 60})`;
      const pad = i === 0 ? 1 : 2 + (i / pos.length) * 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(p.x + pad, p.y + pad, CELL - pad * 2, CELL - pad * 2, i === 0 ? 8 : 6); else ctx.rect(p.x + pad, p.y + pad, CELL - pad * 2, CELL - pad * 2);
      ctx.fill();
    }
    const h = pos[0];
    const ex = dir.x * 3, ey = dir.y * 3;
    const eyes = dir.x !== 0 ? [[12, 7], [12, 17]] : [[7, 12], [17, 12]];
    for (const [ox, oy] of eyes) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.x + ox + ex, h.y + oy + ey, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(h.x + ox + ex * 1.4, h.y + oy + ey * 1.4, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    parts.draw(ctx);
    ctx.fillStyle = '#0f2e1b'; ctx.fillRect(0, W, W, HUD);
    ctx.fillStyle = '#cfe9d6'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`Level ${level}   Länge ${snake.length}`, 10, W + 20);
    ctx.textAlign = 'right';
    ctx.fillText(slow > 0 ? `❄ ${Math.ceil(slow / 60)}s` : `${Math.floor(score)}`, W - 10, W + 20);
  });
}
