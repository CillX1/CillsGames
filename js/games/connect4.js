// 🔴 Vier gewinnt – KI mit Minimax + Alpha-Beta (Tiefe 5). Eine Runde pro Spiel.
export const ROWS = 6, COLS = 7;

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

export function dropRow(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r;
  return -1;
}

export function isWin(b, p) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (b[r][c] !== p) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      let n = 1;
      while (n < 4) {
        const rr = r + dr * n, cc = c + dc * n;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr][cc] !== p) break;
        n++;
      }
      if (n === 4) return true;
    }
  }
  return false;
}

export function winLine(b, p) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells = [0, 1, 2, 3].map((i) => [r + dr * i, c + dc * i]);
      if (cells.every(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === p)) return cells;
    }
  }
  return null;
}

function windowScore(w, me) {
  const opp = me === 2 ? 1 : 2;
  const m = w.filter((v) => v === me).length, o = w.filter((v) => v === opp).length, e = w.filter((v) => !v).length;
  if (m === 4) return 1000;
  if (m === 3 && e === 1) return 6;
  if (m === 2 && e === 2) return 2;
  if (o === 3 && e === 1) return -8;
  return 0;
}

export function evaluate(b, me) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) if (b[r][3] === me) s += 3;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (c + 3 < COLS) s += windowScore([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]], me);
    if (r + 3 < ROWS) s += windowScore([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]], me);
    if (r + 3 < ROWS && c + 3 < COLS) s += windowScore([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]], me);
    if (r - 3 >= 0 && c + 3 < COLS) s += windowScore([b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]], me);
  }
  return s;
}

const ORDER = [3, 2, 4, 1, 5, 0, 6];

/** Bester Zug für Spieler `me` (2 = KI). */
export function aiMove(b, me = 2, depth = 5) {
  const opp = me === 2 ? 1 : 2;
  function search(d, alpha, beta, maximizing) {
    const valid = ORDER.filter((c) => !b[0][c]);
    if (!valid.length) return { s: 0 };
    if (d === 0) return { s: evaluate(b, me) };
    let best = { s: maximizing ? -Infinity : Infinity, c: valid[0] };
    for (const c of valid) {
      const r = dropRow(b, c);
      const who = maximizing ? me : opp;
      b[r][c] = who;
      let s;
      if (isWin(b, who)) s = maximizing ? 100000 + d : -100000 - d;
      else s = search(d - 1, alpha, beta, !maximizing).s;
      b[r][c] = 0;
      if (maximizing ? s > best.s : s < best.s) best = { s, c };
      if (maximizing) alpha = Math.max(alpha, s); else beta = Math.min(beta, s);
      if (alpha >= beta) break;
    }
    return best;
  }
  return search(depth, -Infinity, Infinity, true).c;
}

export function start(host) {
  const board = emptyBoard();
  let turn = 1, done = false, moves = 0;
  const root = document.createElement('div');
  root.className = 'c4';
  root.innerHTML = '<div class="c4-status" aria-live="polite">Du bist dran 🔴</div><div class="c4-board" role="grid"></div>';
  host.stage.appendChild(root);
  const status = root.querySelector('.c4-status');
  const boardEl = root.querySelector('.c4-board');
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('button');
    col.type = 'button'; col.className = 'c4-col'; col.dataset.c = c; col.setAttribute('aria-label', `Spalte ${c + 1}`);
    for (let r = 0; r < ROWS; r++) { const s = document.createElement('span'); s.className = 'c4-slot'; col.appendChild(s); }
    boardEl.appendChild(col);
  }
  const cols = [...boardEl.children];

  function render(line) {
    cols.forEach((col, c) => {
      [...col.children].forEach((slot, r) => {
        slot.className = 'c4-slot' + (board[r][c] === 1 ? ' p1' : board[r][c] === 2 ? ' p2' : '') + (line?.some(([rr, cc]) => rr === r && cc === c) ? ' win' : '');
      });
      col.disabled = done || turn !== 1 || !!board[0][c];
    });
  }
  function finish(result) {
    done = true;
    render(result === 'win' ? winLine(board, 1) : result === 'lose' ? winLine(board, 2) : null);
    // schneller Sieg = mehr Punkte
    const s = result === 'win' ? 200 + Math.max(0, 21 - Math.ceil(moves / 2)) * 15 : result === 'draw' ? 60 : 0;
    status.textContent = result === 'win' ? '🎉 Du gewinnst!' : result === 'draw' ? '🤝 Unentschieden' : '🤖 Die KI gewinnt';
    host.setScore(s);
    host.sound(result === 'win' ? 'win' : result === 'draw' ? 'point' : 'lose');
    host.timeout(() => host.end(s), 1500);
  }
  function play(c, who) {
    const r = dropRow(board, c);
    if (r < 0) return false;
    board[r][c] = who;
    moves++;
    host.sound('click');
    if (isWin(board, who)) { finish(who === 1 ? 'win' : 'lose'); return true; }
    if (board[0].every(Boolean)) { finish('draw'); return true; }
    return true;
  }
  host.on(boardEl, 'click', (e) => {
    const col = e.target.closest('.c4-col');
    if (!col || done || turn !== 1 || host.paused) return;
    if (!play(+col.dataset.c, 1) || done) return;
    turn = 2;
    status.textContent = 'Die KI überlegt… 🟡';
    render();
    host.timeout(() => {
      // Ab und zu (15 %) ein schwächerer Zug, damit die KI schlagbar bleibt
      const c = Math.random() < 0.15 ? aiMove(board, 2, 2) : aiMove(board, 2, 5);
      play(c, 2);
      if (!done) { turn = 1; status.textContent = 'Du bist dran 🔴'; render(); }
    }, 350);
  });
  host.onKey((e, first) => {
    const n = parseInt(e.key, 10);
    if (first && n >= 1 && n <= 7) cols[n - 1].click();
  });
  render();
}
