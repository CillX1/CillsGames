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

export const modes = [
  { id: 'easy', label: 'Leicht', desc: 'Die KI macht oft Fehler' },
  { id: 'normal', label: 'Mittel', desc: 'Die KI ist gut, aber schlagbar' },
  { id: 'hard', label: 'Unbesiegbar', desc: 'Perfekte KI – ein Unentschieden ist schon ein Erfolg (Punkte ×2)' },
];
const CFG = { easy: { mistake: 0.6, mult: 1 }, normal: { mistake: 0.25, mult: 1 }, hard: { mistake: 0, mult: 2 } };
export const GAMES_PER_SERIES = 3;

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  let board = Array(9).fill(null);
  let busy = false, done = false, round = 1, wins = 0, losses = 0, draws = 0, score = 0;

  const root = document.createElement('div');
  root.className = 'ttt';
  root.innerHTML = `<div class="ttt-series"></div><div class="ttt-status" aria-live="polite"></div><div class="ttt-board"></div>`;
  host.stage.appendChild(root);
  const status = root.querySelector('.ttt-status');
  const series = root.querySelector('.ttt-series');
  const boardEl = root.querySelector('.ttt-board');
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ttt-cell'; b.dataset.i = i; b.setAttribute('aria-label', `Feld ${i + 1}`);
    boardEl.appendChild(b);
  }
  const cells = [...boardEl.children];

  function renderSeries() {
    const dots = Array.from({ length: GAMES_PER_SERIES }, (_, i) => {
      const r = results[i];
      return `<span class="ttt-dot ${r || ''}">${r === 'win' ? '✓' : r === 'lose' ? '✗' : r === 'draw' ? '=' : i + 1}</span>`;
    }).join('');
    series.innerHTML = `Partie ${Math.min(round, GAMES_PER_SERIES)} von ${GAMES_PER_SERIES} ${dots}`;
  }
  const results = [];

  function render(win) {
    cells.forEach((c, i) => {
      c.textContent = board[i] === 'X' ? '✕' : board[i] === 'O' ? '◯' : '';
      c.className = 'ttt-cell' + (board[i] ? ' ' + board[i].toLowerCase() : '') + (win?.line.includes(i) ? ' win' : '');
      c.disabled = !!board[i] || busy || done;
    });
  }
  function endRound(result) {
    done = true;
    const w = winner(board);
    render(w);
    results.push(result);
    if (result === 'win') { wins++; score += 100 * C.mult; } else if (result === 'draw') { draws++; score += 30 * C.mult; } else losses++;
    host.setScore(score);
    status.textContent = result === 'win' ? '🎉 Du gewinnst die Partie!' : result === 'draw' ? '🤝 Unentschieden' : '🤖 Die KI gewinnt die Partie';
    host.sound(result === 'win' ? 'win' : result === 'draw' ? 'point' : 'lose');
    renderSeries();
    if (round >= GAMES_PER_SERIES) {
      host.timeout(() => {
        status.textContent = `Serie vorbei: ${wins} Siege · ${draws} Unentschieden · ${losses} Niederlagen`;
        host.timeout(() => host.end(score), 1300);
      }, 1100);
      return;
    }
    host.timeout(() => { round++; newRound(); }, 1400);
  }
  function check() {
    const w = winner(board);
    if (w) { endRound(w.p === 'X' ? 'win' : 'lose'); return true; }
    if (board.every(Boolean)) { endRound('draw'); return true; }
    return false;
  }
  function aiTurn() {
    const free = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    let move = free.find((i) => { board[i] = 'O'; const w = winner(board); board[i] = null; return w; });
    if (move === undefined) move = Math.random() < C.mistake ? free[Math.floor(Math.random() * free.length)] : bestMove(board, 'O');
    board[move] = 'O';
    host.sound('click');
    busy = false;
    if (!check()) { status.textContent = 'Du bist dran (✕)'; render(); }
  }
  function newRound() {
    board = Array(9).fill(null);
    done = false;
    renderSeries();
    // abwechselnd beginnen: Partie 1 und 3 du, Partie 2 die KI
    if (round % 2 === 0) {
      busy = true;
      status.textContent = 'Die KI beginnt…';
      render();
      host.timeout(aiTurn, 600);
    } else {
      busy = false;
      status.textContent = round === 1 ? 'Du bist dran (✕) – du fängst an' : 'Du beginnst (✕)';
      render();
    }
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
  newRound();
}
