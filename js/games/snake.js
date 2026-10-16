// 🐍 Snake – mit Eingabe-Puffer, damit schnelle Doppel-Kurven nicht verloren gehen
// und man sich nie durch eine 180°-Wende selbst beisst.
const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };

export function start(host) {
  const N = 20, CELL = 25, W = N * CELL;
  const { ctx } = host.createCanvas(W, W);
  host.touchControls([
    { code: 'ArrowLeft', label: '◀' }, { code: 'ArrowUp', label: '▲' },
    { code: 'ArrowDown', label: '▼' }, { code: 'ArrowRight', label: '▶' },
  ]);

  let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  let dir = DIRS.right;
  const queue = [];
  let foods = [];
  let golden = null;
  let score = 0, tick = 0, interval = 8; // Ticks pro Schritt (8 = 7.5 Felder/s)
  let started = false;

  const occupied = (x, y) => snake.some((s) => s.x === x && s.y === y) || foods.some((f) => f.x === x && f.y === y) || (golden && golden.x === x && golden.y === y);
  function freeCell() {
    const free = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!occupied(x, y)) free.push({ x, y });
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }
  foods.push(freeCell(), freeCell());

  function turn(name) {
    const d = DIRS[name];
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (d === last || (d.x === -last.x && d.y === -last.y)) return;
    if (queue.length < 3) queue.push(d);
    started = true;
  }
  host.onKey((e) => { if (KEYMAP[e.code]) turn(KEYMAP[e.code]); });
  host.onSwipe(turn);

  host.loop(() => {
    if (!started) return;
    if (golden && --golden.t <= 0) golden = null;
    if (++tick < interval) return;
    tick = 0;
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const willEat = foods.some((f) => f.x === head.x && f.y === head.y) || (golden && golden.x === head.x && golden.y === head.y);
    const body = willEat ? snake : snake.slice(0, -1); // Schwanzende bewegt sich weg
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || body.some((s) => s.x === head.x && s.y === head.y)) {
      host.sound('hit');
      host.end(score);
      return;
    }
    snake.unshift(head);
    let ate = false;
    const fi = foods.findIndex((f) => f.x === head.x && f.y === head.y);
    if (fi >= 0) {
      foods.splice(fi, 1);
      score += 10; ate = true;
      host.sound('point');
      const c = freeCell(); if (c) foods.push(c);
      if (snake.length % 5 === 0 && interval > 4) interval--;
    } else if (golden && golden.x === head.x && golden.y === head.y) {
      score += 50; ate = true; golden = null;
      host.sound('coin');
    }
    if (!ate) snake.pop();
    if (!golden && Math.random() < 0.02) { const c = freeCell(); if (c) golden = { ...c, t: 360 }; }
    if (snake.length >= N * N) host.end(score + 500);
    host.setScore(score);
  }, () => {
    ctx.fillStyle = '#1a472a'; ctx.fillRect(0, 0, W, W);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
    for (const f of foods) {
      const cx = f.x * CELL + CELL / 2, cy = f.y * CELL + CELL / 2;
      ctx.fillStyle = '#ff4444'; ctx.beginPath(); ctx.arc(cx, cy + 1, CELL / 2 - 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#228B22'; ctx.beginPath(); ctx.ellipse(cx + 4, cy - 8, 4, 2, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    if (golden) {
      const cx = golden.x * CELL + CELL / 2, cy = golden.y * CELL + CELL / 2;
      const pulse = 0.75 + Math.sin(performance.now() / 120) * 0.25;
      ctx.fillStyle = `rgba(255,215,0,${pulse})`;
      ctx.beginPath(); ctx.arc(cx, cy, CELL / 2 - 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5a00'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('+50', cx, cy + 4);
      ctx.fillStyle = 'rgba(255,215,0,0.8)'; ctx.fillRect(golden.x * CELL + 2, golden.y * CELL, (CELL - 4) * golden.t / 360, 3);
    }
    snake.forEach((s, i) => {
      const shade = 1 - (i / snake.length) * 0.45;
      ctx.fillStyle = i === 0 ? '#4CAF50' : `rgb(60,${Math.floor(185 * shade)},60)`;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 7 : 5); else ctx.rect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
      ctx.fill();
    });
    const h = snake[0];
    const ex = dir.x * 3, ey = dir.y * 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(h.x * CELL + 8 + ex, h.y * CELL + 9 + ey, 3, 0, Math.PI * 2); ctx.arc(h.x * CELL + 17 + ex, h.y * CELL + 9 + ey, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(h.x * CELL + 8 + ex * 1.3, h.y * CELL + 9 + ey * 1.3, 1.5, 0, Math.PI * 2); ctx.arc(h.x * CELL + 17 + ex * 1.3, h.y * CELL + 9 + ey * 1.3, 1.5, 0, Math.PI * 2); ctx.fill();
    if (!started) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, W / 2 - 40, W, 80);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 22px system-ui';
      ctx.fillText('Pfeiltaste drücken oder wischen', W / 2, W / 2 + 8);
    }
  });
}
