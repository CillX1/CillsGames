// ⭕ Tic Tac Toe – eine Runde pro Spiel (keine Punkte-Farm durch Endlosrunden).
export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function winner(b) {
  for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { p: b[l[0]], line: l };
  return null;
}

/** Perfekter Zug für `me` (Minimax). */
export function bestMove(b, me = 'O') {
  const opp = me === 'O' ? 'X' : 'O';
  function mm(board, turn, depth) {
    const w = winner(board);
    if (w) return w.p === me ? 10 - depth : depth - 10;
    if (board.every(Boolean)) return 0;
    let best = turn === me ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) if (!board[i]) {
      board[i] = turn;
      const s = mm(board, turn === me ? opp : me, depth + 1);
      board[i] = null;
      best = turn === me ? Math.max(best, s) : Math.min(best, s);
    }
    return best;
  }
  let move = -1, score = -Infinity;
  for (let i = 0; i < 9; i++) if (!b[i]) {
    b[i] = me;
    const s = mm(b, opp, 1);
    b[i] = null;
    if (s > score) { score = s; move = i; }
  }
  return move;
}

export function start(host) {
  const board = Array(9).fill(null);
  let busy = false, done = false;
  const MISTAKE = 0.28; // Wahrscheinlichkeit, dass die KI nicht perfekt spielt -> man kann gewinnen

  const root = document.createElement('div');
  root.className = 'ttt';
  root.innerHTML = '<div class="ttt-status" aria-live="polite"></div><div class="ttt-board"></div>';
  host.stage.appendChild(root);
  const status = root.querySelector('.ttt-status');
  const boardEl = root.querySelector('.ttt-board');
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ttt-cell'; b.dataset.i = i; b.setAttribute('aria-label', `Feld ${i + 1}`);
    boardEl.appendChild(b);
  }
  const cells = [...boardEl.children];

  function render(win) {
    cells.forEach((c, i) => {
      c.textContent = board[i] === 'X' ? '✕' : board[i] === 'O' ? '◯' : '';
      c.className = 'ttt-cell' + (board[i] ? ' ' + board[i].toLowerCase() : '') + (win?.line.includes(i) ? ' win' : '');
      c.disabled = !!board[i] || busy || done;
    });
  }
  function finish(result) {
    done = true;
    const w = winner(board);
    render(w);
    const s = result === 'win' ? 100 : result === 'draw' ? 30 : 0;
    status.textContent = result === 'win' ? '🎉 Du gewinnst!' : result === 'draw' ? '🤝 Unentschieden' : '🤖 Die KI gewinnt';
    host.setScore(s);
    host.sound(result === 'win' ? 'win' : result === 'draw' ? 'point' : 'lose');
    host.timeout(() => host.end(s), 1300);
  }
  function check() {
    const w = winner(board);
    if (w) { finish(w.p === 'X' ? 'win' : 'lose'); return true; }
    if (board.every(Boolean)) { finish('draw'); return true; }
    return false;
  }
  function aiTurn() {
    const free = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    // Gewinnzug nimmt die KI immer, sonst manchmal ein zufälliger Zug
    let move = free.find((i) => { board[i] = 'O'; const w = winner(board); board[i] = null; return w; });
    if (move === undefined) move = Math.random() < MISTAKE ? free[Math.floor(Math.random() * free.length)] : bestMove(board, 'O');
    board[move] = 'O';
    host.sound('click');
    busy = false;
    if (!check()) { status.textContent = 'Du bist dran (✕)'; render(); }
  }
  host.on(boardEl, 'click', (e) => {
    const c = e.target.closest('.ttt-cell');
    if (!c || busy || done || host.paused) return;
    const i = +c.dataset.i;
    if (board[i]) return;
    board[i] = 'X';
    host.sound('click');
    if (check()) return;
    busy = true;
    status.textContent = 'Die KI überlegt…';
    render();
    host.timeout(aiTurn, 450);
  });
  host.onKey((e, first) => {
    const n = parseInt(e.key, 10);
    if (first && n >= 1 && n <= 9) cells[n - 1].click();
  });
  status.textContent = 'Du bist dran (✕) – du fängst an';
  render();
}
