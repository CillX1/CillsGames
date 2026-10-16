// 💣 Minesweeper – erster Klick sicher, Flaggen per Rechtsklick/langem Drücken/Flaggen-Modus, Akkord-Klick.
export function createBoard(rows, cols, mines, safeR, safeC, rng = Math.random) {
  const b = Array.from({ length: rows }, () => Array(cols).fill(0));
  const spots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (Math.abs(r - safeR) > 1 || Math.abs(c - safeC) > 1) spots.push([r, c]);
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  for (const [r, c] of spots.slice(0, mines)) b[r][c] = -1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (b[r][c] === -1) continue;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (b[r + dr]?.[c + dc] === -1) n++;
    b[r][c] = n;
  }
  return b;
}

export function start(host) {
  const ROWS = 12, COLS = 12, MINES = 22;
  let board = null, revealed, flagged, done = false, flagMode = false;
  const t0 = Date.now();
  revealed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  flagged = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  const root = document.createElement('div');
  root.className = 'mines';
  root.innerHTML = `<div class="ms-bar"><span class="ms-count">💣 ${MINES}</span>
    <button type="button" class="btn btn-small ms-mode" aria-pressed="false">⛏️ Aufdecken</button>
    <span class="ms-time">⏱️ 0s</span></div><div class="ms-grid" style="--cols:${COLS}"></div>`;
  host.stage.appendChild(root);
  const gridEl = root.querySelector('.ms-grid');
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ms-cell'; b.dataset.r = r; b.dataset.c = c;
    gridEl.appendChild(b); cells.push(b);
  }
  const modeBtn = root.querySelector('.ms-mode');
  host.on(modeBtn, 'click', () => {
    flagMode = !flagMode;
    modeBtn.textContent = flagMode ? '🚩 Flaggen' : '⛏️ Aufdecken';
    modeBtn.setAttribute('aria-pressed', String(flagMode));
  });
  host.interval(() => { if (!done) root.querySelector('.ms-time').textContent = `⏱️ ${Math.floor((Date.now() - t0) / 1000)}s`; }, 1000);

  const revealedSafe = () => revealed.flat().filter(Boolean).length;
  const score = () => revealedSafe() * 10;

  function flood(r, c) {
    const stack = [[r, c]];
    while (stack.length) {
      const [y, x] = stack.pop();
      if (y < 0 || x < 0 || y >= ROWS || x >= COLS || revealed[y][x] || flagged[y][x]) continue;
      revealed[y][x] = true;
      if (board[y][x] === 0) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) stack.push([y + dr, x + dc]);
    }
  }
  function reveal(r, c) {
    if (done || flagged[r][c]) return;
    if (!board) board = createBoard(ROWS, COLS, MINES, r, c);
    if (revealed[r][c]) { chord(r, c); return; }
    if (board[r][c] === -1) return lose(r, c);
    flood(r, c);
    host.sound('click');
    afterMove();
  }
  function chord(r, c) {
    const n = board[r][c];
    if (n <= 0) return;
    let flags = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (flagged[r + dr]?.[c + dc]) flags++;
    if (flags !== n) return;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const y = r + dr, x = c + dc;
      if (y < 0 || x < 0 || y >= ROWS || x >= COLS || flagged[y][x] || revealed[y][x]) continue;
      if (board[y][x] === -1) return lose(y, x);
      flood(y, x);
    }
    host.sound('click');
    afterMove();
  }
  function toggleFlag(r, c) {
    if (done || revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    host.sound('pop');
    render();
  }
  function afterMove() {
    host.setScore(score());
    if (revealedSafe() === ROWS * COLS - MINES) {
      done = true;
      const secs = Math.floor((Date.now() - t0) / 1000);
      const final = score() + 1000 + Math.max(0, 600 - secs * 3);
      render(); host.sound('win');
      host.timeout(() => host.end(final), 900);
      return;
    }
    render();
  }
  function lose(r, c) {
    done = true;
    host.sound('hit');
    render(r, c);
    host.timeout(() => host.end(score()), 1200);
  }

  const COLORS = ['', '#4da3ff', '#3ccf6e', '#ff5c5c', '#b57bff', '#ff9d3c', '#2fd0d0', '#ddd', '#aaa'];
  function render(boomR = -1, boomC = -1) {
    let flags = 0;
    cells.forEach((el) => {
      const r = +el.dataset.r, c = +el.dataset.c;
      const isMine = board && board[r][c] === -1;
      el.className = 'ms-cell';
      el.style.color = '';
      if (flagged[r][c]) flags++;
      if (revealed[r][c]) {
        el.classList.add('open');
        const n = board[r][c];
        el.textContent = n > 0 ? n : '';
        el.style.color = COLORS[n] || '';
      } else if (done && isMine) {
        el.classList.add('open', 'mine');
        if (r === boomR && c === boomC) el.classList.add('boom');
        el.textContent = flagged[r][c] ? '🚩' : '💣';
      } else if (done && flagged[r][c] && !isMine) {
        el.textContent = '❌';
      } else el.textContent = flagged[r][c] ? '🚩' : '';
      el.setAttribute('aria-label', revealed[r][c] ? `Offen ${el.textContent || 'leer'}` : flagged[r][c] ? 'Flagge' : 'Verdeckt');
    });
    root.querySelector('.ms-count').textContent = `💣 ${MINES - flags}`;
  }

  // Langes Drücken (Touch) = Flagge
  let pressTimer = 0, longPressed = false;
  host.on(gridEl, 'pointerdown', (e) => {
    const el = e.target.closest('.ms-cell');
    if (!el || e.pointerType === 'mouse') return;
    longPressed = false;
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => { longPressed = true; toggleFlag(+el.dataset.r, +el.dataset.c); navigator.vibrate?.(30); }, 420);
  });
  const cancel = () => clearTimeout(pressTimer);
  host.on(gridEl, 'pointerup', cancel);
  host.on(gridEl, 'pointercancel', cancel);
  host.on(gridEl, 'pointerleave', cancel);
  host.onCleanup(cancel);
  host.on(gridEl, 'click', (e) => {
    const el = e.target.closest('.ms-cell');
    if (!el || host.paused) return;
    if (longPressed) { longPressed = false; return; }
    const r = +el.dataset.r, c = +el.dataset.c;
    if (flagMode && !revealed[r][c]) toggleFlag(r, c); else reveal(r, c);
  });
  host.on(gridEl, 'contextmenu', (e) => {
    e.preventDefault();
    const el = e.target.closest('.ms-cell');
    if (el) toggleFlag(+el.dataset.r, +el.dataset.c);
  });
  render();
}
