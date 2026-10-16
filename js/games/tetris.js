// 🧩 Tetris – 7er-Beutel, Wandkicks, Halten, Vorschau, Level, gedrückt halten = wiederholen.
export const COLS = 10, ROWS = 20;
export const PIECES = {
  I: { color: '#00d4ff', m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { color: '#ffd700', m: [[1, 1], [1, 1]] },
  T: { color: '#a855f7', m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { color: '#00ff88', m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { color: '#ff4466', m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { color: '#3f6fff', m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: '#ff8800', m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
export const LINE_SCORES = [0, 100, 300, 500, 800];

export function rotateCW(m) {
  const n = m.length;
  return m.map((row, r) => row.map((_, c) => m[n - 1 - c][r]));
}

export function collides(board, m, x, y) {
  for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
    if (!m[r][c]) continue;
    const bx = x + c, by = y + r;
    if (bx < 0 || bx >= COLS || by >= ROWS) return true;
    if (by >= 0 && board[by][bx]) return true;
  }
  return false;
}

export function clearFullRows(board) {
  const kept = board.filter((row) => !row.every(Boolean));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
  return { board: kept, cleared };
}

export function makeBag(rng = Math.random) {
  const b = Object.keys(PIECES);
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function start(host) {
  const CS = 28, PANEL = 130, W = COLS * CS + PANEL, H = ROWS * CS;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([
    { code: 'ArrowLeft', label: '◀' }, { code: 'ArrowUp', label: '⟳' }, { code: 'ArrowRight', label: '▶' },
    { code: 'ArrowDown', label: '▼' }, { code: 'Space', label: '⤓' }, { code: 'KeyC', label: 'Halten' },
  ]);
  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  let bag = [], queue = [], cur = null, hold = null, canHold = true;
  let score = 0, lines = 0, level = 1, dropT = 0, lockT = 0;
  const das = { dir: 0, t: 0 };
  let clearFlash = [];

  const nextType = () => { if (!bag.length) bag = makeBag(); return bag.pop(); };
  while (queue.length < 3) queue.push(nextType());

  function spawn(type) {
    const t = type || queue.shift();
    if (!type) queue.push(nextType());
    const m = PIECES[t].m.map((r) => [...r]);
    cur = { t, m, x: Math.floor((COLS - m[0].length) / 2), y: t === 'I' ? -1 : 0 };
    lockT = 0;
    if (collides(board, cur.m, cur.x, cur.y)) { host.sound('lose'); host.end(score); }
  }
  spawn();

  const gravity = () => Math.max(3, 48 - (level - 1) * 4);

  function move(dx) {
    if (!collides(board, cur.m, cur.x + dx, cur.y)) { cur.x += dx; lockT = 0; return true; }
    return false;
  }
  function rotate() {
    const r = rotateCW(cur.m);
    for (const k of [0, -1, 1, -2, 2]) {
      for (const ky of [0, -1]) {
        if (!collides(board, r, cur.x + k, cur.y + ky)) { cur.m = r; cur.x += k; cur.y += ky; lockT = 0; host.sound('click'); return; }
      }
    }
  }
  function lock() {
    let above = false;
    cur.m.forEach((row, r) => row.forEach((v, c) => {
      if (!v) return;
      if (cur.y + r < 0) above = true; else board[cur.y + r][cur.x + c] = PIECES[cur.t].color;
    }));
    if (above) { host.sound('lose'); host.end(score); return; }
    const full = board.map((row, i) => (row.every(Boolean) ? i : -1)).filter((i) => i >= 0);
    const res = clearFullRows(board);
    board = res.board;
    if (res.cleared) {
      clearFlash = full.map((r) => ({ r, t: 12 }));
      score += LINE_SCORES[res.cleared] * level;
      lines += res.cleared;
      level = 1 + Math.floor(lines / 10);
      host.sound(res.cleared >= 4 ? 'win' : 'coin');
    } else host.sound('click');
    host.setScore(score);
    canHold = true;
    spawn();
  }
  function hardDrop() {
    let d = 0;
    while (!collides(board, cur.m, cur.x, cur.y + 1)) { cur.y++; d++; }
    score += d * 2;
    lock();
  }
  function doHold() {
    if (!canHold) return;
    const t = cur.t;
    if (hold) spawn(hold); else spawn();
    hold = t;
    canHold = false;
  }

  host.onKey((e, first) => {
    if (host.over) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (first) { move(-1); das.dir = -1; das.t = 0; } }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (first) { move(1); das.dir = 1; das.t = 0; } }
    else if ((e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyX') && first) rotate();
    else if (e.code === 'Space' && first) hardDrop();
    else if ((e.code === 'KeyC' || e.code === 'ShiftLeft') && first) doHold();
  });

  host.loop(() => {
    for (let i = clearFlash.length - 1; i >= 0; i--) if (--clearFlash[i].t <= 0) clearFlash.splice(i, 1);
    // gehaltene Pfeiltaste: nach kurzer Pause schnell wiederholen
    const dir = host.left ? -1 : host.right ? 1 : 0;
    if (dir && dir === das.dir) { if (++das.t > 10 && das.t % 3 === 0) move(dir); } else { das.dir = dir; das.t = 0; }
    const soft = host.down;
    dropT++;
    if (dropT >= (soft ? 2 : gravity())) {
      dropT = 0;
      if (!collides(board, cur.m, cur.x, cur.y + 1)) { cur.y++; if (soft) { score++; host.setScore(score); } }
    }
    if (collides(board, cur.m, cur.x, cur.y + 1)) { if (++lockT > 30) lock(); } else lockT = 0;
  }, () => {
    ctx.fillStyle = '#0f0c29'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CS); ctx.lineTo(COLS * CS, r * CS); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CS, 0); ctx.lineTo(c * CS, H); ctx.stroke(); }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) cell(c * CS, r * CS, CS, board[r][c]);
    for (const f of clearFlash) { ctx.fillStyle = `rgba(255,255,255,${f.t / 14})`; ctx.fillRect(0, f.r * CS, COLS * CS, CS); }
    if (cur && !host.over) {
      let gy = cur.y;
      while (!collides(board, cur.m, cur.x, gy + 1)) gy++;
      cur.m.forEach((row, r) => row.forEach((v, c) => {
        if (!v) return;
        ctx.strokeStyle = PIECES[cur.t].color + '99'; ctx.lineWidth = 2;
        if (gy + r >= 0) ctx.strokeRect((cur.x + c) * CS + 3, (gy + r) * CS + 3, CS - 6, CS - 6);
        if (cur.y + r >= 0) cell((cur.x + c) * CS, (cur.y + r) * CS, CS, PIECES[cur.t].color);
      }));
    }
    const px = COLS * CS;
    ctx.fillStyle = '#17123d'; ctx.fillRect(px, 0, PANEL, H);
    ctx.fillStyle = '#ccc'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('NÄCHSTE', px + 14, 22);
    queue.slice(0, 3).forEach((t, i) => mini(t, px + 14, 32 + i * 58));
    ctx.fillText('HALTEN (C)', px + 14, 222);
    if (hold) { ctx.globalAlpha = canHold ? 1 : 0.4; mini(hold, px + 14, 232); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#fff';
    ctx.fillText(`Level ${level}`, px + 14, 330);
    ctx.fillText(`Linien ${lines}`, px + 14, 352);
    ctx.fillStyle = '#ffd700'; ctx.fillText(`${score}`, px + 14, 380);
  });

  function cell(x, y, s, color) {
    ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + 1, y + 1, s - 2, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 1, y + s - 5, s - 2, 4);
  }
  function mini(t, x, y) {
    const m = PIECES[t].m;
    const rows = m.filter((r) => r.some(Boolean));
    const s = 18;
    rows.forEach((row, r) => row.forEach((v, c) => { if (v) cell(x + c * s, y + r * s, s, PIECES[t].color); }));
  }
}
