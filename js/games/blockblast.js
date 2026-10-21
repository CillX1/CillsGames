// 🟦 Block Blast – Teile antippen/ziehen und ins 8×8-Feld legen.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'classic', label: 'Klassisch', desc: 'Spielen, bis kein Teil mehr passt' },
  { id: 'timed', label: 'Zeitjagd', desc: '2 Minuten – so viele Punkte wie möglich' },
];
const TIME_LIMIT = 120 * 60;

export const SHAPES = [
  [[1]], [[1, 1]], [[1], [1]], [[1, 1, 1]], [[1], [1], [1]], [[1, 1, 1, 1]], [[1], [1], [1], [1]],
  [[1, 1], [1, 1]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 1, 1], [0, 1, 0]], [[0, 1, 0], [1, 1, 1]], [[1, 0], [1, 1], [1, 0]], [[0, 1], [1, 1], [0, 1]],
  [[1, 0], [1, 1], [0, 1]], [[0, 1], [1, 1], [1, 0]], [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 1], [1, 0, 0]], [[1, 1, 1], [0, 0, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 0]], [[1, 1], [0, 1]], [[1, 0], [1, 1]], [[0, 1], [1, 1]],
];
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

export function canPlace(grid, shape, row, col) {
  for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) {
    if (!shape[r][c]) continue;
    const gr = row + r, gc = col + c;
    if (gr < 0 || gc < 0 || gr >= grid.length || gc >= grid[0].length || grid[gr][gc]) return false;
  }
  return true;
}

export function fitsAnywhere(grid, shape) {
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[0].length; c++) if (canPlace(grid, shape, r, c)) return true;
  return false;
}

/** Löscht volle Reihen/Spalten gleichzeitig. Gibt Anzahl gelöschter Linien zurück. */
export function clearLines(grid) {
  const N = grid.length, M = grid[0].length;
  const rows = [], cols = [];
  for (let r = 0; r < N; r++) if (grid[r].every(Boolean)) rows.push(r);
  for (let c = 0; c < M; c++) if (grid.every((row) => row[c])) cols.push(c);
  for (const r of rows) for (let c = 0; c < M; c++) grid[r][c] = null;
  for (const c of cols) for (let r = 0; r < N; r++) grid[r][c] = null;
  return { lines: rows.length + cols.length, rows, cols };
}

export function start(host, mode = 'classic') {
  const timed = mode === 'timed';
  const N = 8, CELL = 56, GX = 26, GY = 40, W = GX * 2 + N * CELL, TRAY_Y = GY + N * CELL + 24, H = TRAY_Y + 150;
  const { ctx } = host.createCanvas(W, H);
  const grid = Array.from({ length: N }, () => Array(N).fill(null));
  let pieces = [], selected = null, hover = null, dragging = false, score = 0, combo = 0, bestCombo = 0, timeLeft = TIME_LIMIT, dragOffset = 0;
  const parts = makeParticles();
  const flashes = [];
  const slotW = (W - 20) / 3;

  function newPieces() {
    pieces = [0, 1, 2].map((i) => {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      return { shape, color: COLORS[Math.floor(Math.random() * COLORS.length)], slot: i, used: false };
    });
  }
  newPieces();

  const anchorFor = (p, pt) => ({
    row: Math.round((pt.y + dragOffset - GY) / CELL - p.shape.length / 2),
    col: Math.round((pt.x - GX) / CELL - p.shape[0].length / 2),
  });
  const pieceAt = (pt) => {
    if (pt.y < TRAY_Y - 10) return null;
    const i = Math.floor((pt.x - 10) / slotW);
    const p = pieces[i];
    return p && !p.used ? p : null;
  };

  function tryPlace(pt) {
    if (!selected) return false;
    const { row, col } = anchorFor(selected, pt);
    if (!canPlace(grid, selected.shape, row, col)) { host.sound('error'); return false; }
    let cells = 0;
    const selected_w = selected.shape[0].length;
    selected.shape.forEach((rr, r) => rr.forEach((v, c) => { if (v) { grid[row + r][col + c] = selected.color; cells++; } }));
    selected.used = true;
    selected = null;
    score += cells;
    const before = grid.map((r) => r.slice());
    const { lines, rows, cols } = clearLines(grid);
    if (lines) {
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      const gained = lines * 100 + (lines - 1) * 60 + (combo - 1) * 25;
      score += gained;
      rows.forEach((r) => flashes.push({ r, c: -1, t: 18 }));
      cols.forEach((c) => flashes.push({ r: -1, c, t: 18 }));
      for (const r of rows) for (let c = 0; c < N; c++) parts.burst(GX + c * CELL + CELL / 2, GY + r * CELL + CELL / 2, before[r][c] || '#fff', 3, 4);
      for (const c of cols) for (let r = 0; r < N; r++) parts.burst(GX + c * CELL + CELL / 2, GY + r * CELL + CELL / 2, before[r][c] || '#fff', 3, 4);
      const cx = GX + (col + selected_w / 2) * CELL, cy = GY + row * CELL;
      host.floatText(Math.min(W - 60, Math.max(60, cx)), Math.max(40, cy), `+${gained}`, '#ffd700', 26);
      if (lines > 1) host.floatText(W / 2, GY + N * CELL / 2, ['', '', 'Doppel!', 'Dreifach!', 'Mega!', 'WAHNSINN!'][Math.min(lines, 5)], '#00e68a', 34);
      if (combo > 1) host.floatText(W / 2, GY + N * CELL / 2 + 40, `Kombo ×${combo}`, '#ff006e', 24);
      if (lines > 1) host.shake(4 + lines * 2);
      if (grid.every((r) => r.every((v) => !v))) { score += 500; host.floatText(W / 2, GY + 60, 'Feld leer! +500', '#00d4ff', 28); }
      host.sound(lines > 1 ? 'win' : 'coin');
    } else {
      combo = 0;
      host.sound('click');
    }
    if (pieces.every((p) => p.used)) newPieces();
    host.setScore(score);
    if (!pieces.filter((p) => !p.used).some((p) => fitsAnywhere(grid, p.shape))) {
      if (timed) {
        // Zeitjagd: kein Ende, sondern Feld teilweise leeren und neue Teile
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (Math.random() < 0.5) grid[r][c] = null;
        newPieces();
        host.floatText(W / 2, GY + N * CELL / 2, 'Feld gemischt!', '#a855f7', 26);
        host.sound('error');
      } else host.timeout(() => host.end(score), 500);
    }
    return true;
  }

  host.onPointer('pointerdown', (pt, e) => {
    const p = pieceAt(pt);
    if (p) { selected = p; dragging = true; hover = null; dragOffset = e.pointerType === 'touch' ? -CELL * 1.4 : 0; host.canvas.setPointerCapture?.(e.pointerId); return; }
    if (selected) tryPlace(pt);
  });
  host.onPointer('pointermove', (pt) => { if (selected) hover = pt; });
  host.onPointer('pointerup', (pt) => {
    if (dragging && selected && pt.y < TRAY_Y - 10) tryPlace(pt);
    dragging = false;
  });

  host.loop(() => {
    for (let i = flashes.length - 1; i >= 0; i--) if (--flashes[i].t <= 0) flashes.splice(i, 1);
    parts.update(0.15);
    if (timed && timeLeft > 0 && --timeLeft === 0) { host.sound('win'); host.end(score); }
  }, () => {
    ctx.fillStyle = '#14142b'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(GX - 6, GY - 6, N * CELL + 12, N * CELL + 12);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = GX + c * CELL, y = GY + r * CELL;
      if (grid[r][c]) block(x, y, CELL, grid[r][c]);
      else { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4); }
    }
    for (const f of flashes) {
      ctx.fillStyle = `rgba(255,255,255,${f.t / 30})`;
      if (f.r >= 0) ctx.fillRect(GX, GY + f.r * CELL, N * CELL, CELL);
      else ctx.fillRect(GX + f.c * CELL, GY, CELL, N * CELL);
    }
    if (selected && hover && hover.y < TRAY_Y - 10) {
      const { row, col } = anchorFor(selected, hover);
      const ok = canPlace(grid, selected.shape, row, col);
      selected.shape.forEach((rr, r) => rr.forEach((v, c) => {
        if (!v) return;
        const gr = row + r, gc = col + c;
        if (gr < 0 || gc < 0 || gr >= N || gc >= N) return;
        ctx.fillStyle = ok ? 'rgba(255,255,255,0.35)' : 'rgba(255,60,60,0.35)';
        ctx.fillRect(GX + gc * CELL + 2, GY + gr * CELL + 2, CELL - 4, CELL - 4);
      }));
    }
    pieces.forEach((p, i) => {
      const sx = 10 + i * slotW;
      ctx.strokeStyle = p === selected ? '#00d4ff' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = p === selected ? 3 : 1;
      ctx.strokeRect(sx + 4, TRAY_Y, slotW - 8, 120);
      if (p.used) return;
      const bs = 22;
      const ox = sx + slotW / 2 - (p.shape[0].length * bs) / 2, oy = TRAY_Y + 60 - (p.shape.length * bs) / 2;
      const fits = fitsAnywhere(grid, p.shape);
      ctx.globalAlpha = fits ? 1 : 0.35;
      p.shape.forEach((rr, r) => rr.forEach((v, c) => { if (v) block(ox + c * bs, oy + r * bs, bs, p.color); }));
      ctx.globalAlpha = 1;
    });
    parts.draw(ctx);
    // gezogenes Teil folgt dem Finger/Mauszeiger
    if (selected && dragging && hover) {
      const bs = 34;
      ctx.globalAlpha = 0.85;
      selected.shape.forEach((rr, r) => rr.forEach((v, c) => {
        if (v) block(hover.x - (selected.shape[0].length * bs) / 2 + c * bs, hover.y + dragOffset - (selected.shape.length * bs) / 2 + r * bs, bs, selected.color);
      }));
      ctx.globalAlpha = 1;
    }
    // Kopfzeile
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui';
    ctx.fillText(score, GX, 27);
    ctx.textAlign = 'right'; ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = combo > 1 ? '#ff006e' : 'rgba(255,255,255,0.5)';
    ctx.fillText(combo > 1 ? `Kombo ×${combo}` : `Beste Kombo ${bestCombo}`, W - GX, 27);
    if (timed) {
      const frac = timeLeft / TIME_LIMIT;
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(GX + 90, 16, W - GX * 2 - 230, 10);
      ctx.fillStyle = frac < 0.2 ? '#ff4d5e' : '#00d4ff'; ctx.fillRect(GX + 90, 16, (W - GX * 2 - 230) * frac, 10);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui';
      ctx.fillText(`${Math.ceil(timeLeft / 60)}s`, GX + 90 + (W - GX * 2 - 230) / 2, 25);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(selected ? 'Jetzt ins Feld tippen (oder ziehen)' : 'Tippe ein Teil an', W / 2, H - 10);
  });

  function block(x, y, s, color) {
    ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x + 2, y + 2, s - 4, Math.max(3, s * 0.12));
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 2, y + s - 2 - Math.max(3, s * 0.1), s - 4, Math.max(3, s * 0.1));
  }
}
