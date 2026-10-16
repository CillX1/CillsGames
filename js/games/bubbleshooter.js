// 🎯 Bubble Shooter – Sechseck-Raster, Kettenreaktionen, nachrückende Decke.
import { makeParticles } from './host.js';

const R = 20, COLS = 10, ROWS = 15, ROW_H = R * Math.sqrt(3), DANGER_ROW = 12;
const PALETTE = ['#ff4757', '#3f8efc', '#2ed573', '#ffc312', '#a55eea', '#ff7f50'];

/** Nachbarn im versetzten Raster. odd(r) sagt, ob Reihe r nach rechts eingerückt ist. */
export function neighbors(r, c, odd) {
  const o = odd(r) ? 1 : 0;
  return [
    [r - 1, c - 1 + o], [r - 1, c + o], [r, c - 1], [r, c + 1], [r + 1, c - 1 + o], [r + 1, c + o],
  ].filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS);
}

/** Alle gleichfarbigen, verbundenen Kugeln ab (r,c). */
export function findCluster(grid, r, c, odd) {
  const color = grid[r]?.[c];
  if (!color) return [];
  const seen = new Set([r + ',' + c]), out = [[r, c]];
  for (let i = 0; i < out.length; i++) {
    for (const [nr, nc] of neighbors(out[i][0], out[i][1], odd)) {
      const k = nr + ',' + nc;
      if (!seen.has(k) && grid[nr][nc] === color) { seen.add(k); out.push([nr, nc]); }
    }
  }
  return out;
}

/** Kugeln, die nicht mehr mit der Decke verbunden sind. */
export function findFloating(grid, odd) {
  const seen = new Set(), stack = [];
  for (let c = 0; c < COLS; c++) if (grid[0][c]) { seen.add('0,' + c); stack.push([0, c]); }
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [nr, nc] of neighbors(r, c, odd)) {
      const k = nr + ',' + nc;
      if (!seen.has(k) && grid[nr][nc]) { seen.add(k); stack.push([nr, nc]); }
    }
  }
  const out = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c] && !seen.has(r + ',' + c)) out.push([r, c]);
  return out;
}

export function start(host) {
  const W = COLS * 2 * R + R, H = 620, SHOOT_Y = H - 50;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([{ code: 'ArrowLeft', label: '⟲' }, { code: 'Space', label: '● Schuss', wide: true }, { code: 'ArrowRight', label: '⟳' }]);
  let shift = 0; // wie oft die Decke nachgerückt ist (bestimmt die Einrückung)
  const odd = (r) => (r + shift) % 2 === 1;
  const cx = (r, c) => R + c * 2 * R + (odd(r) ? R : 0);
  const cy = (r) => R + r * ROW_H;
  let grid, level = 0, numColors = 4;
  let shooter = { angle: -Math.PI / 2, color: '', next: '' };
  let bullet = null, score = 0, shots = 0, combo = 0;
  const parts = makeParticles();
  const falling = [];

  function newBoard() {
    level++;
    numColors = Math.min(PALETTE.length, 3 + level);
    grid = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
      if (r >= 5) return null;
      if (odd(r) && c === COLS - 1) return null; // eingerückte Reihe: letzte Kugel würde rausragen
      return PALETTE[Math.floor(Math.random() * numColors)];
    }));
    shooter.color = pickColor(); shooter.next = pickColor();
  }
  function colorsOnBoard() {
    const s = new Set();
    for (const row of grid) for (const c of row) if (c) s.add(c);
    return [...s];
  }
  function pickColor() {
    const on = colorsOnBoard();
    const pool = on.length ? on : PALETTE.slice(0, numColors);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  newBoard();

  function aimAt(p) {
    let a = Math.atan2(p.y - SHOOT_Y, p.x - W / 2);
    if (a > -0.12) a = a > Math.PI / 2 ? -Math.PI + 0.12 : -0.12;
    shooter.angle = Math.max(-Math.PI + 0.12, Math.min(-0.12, a));
  }
  function shoot() {
    if (bullet || host.over) return;
    bullet = { x: W / 2, y: SHOOT_Y, vx: Math.cos(shooter.angle) * 11, vy: Math.sin(shooter.angle) * 11, color: shooter.color };
    shooter.color = shooter.next;
    shooter.next = pickColor();
    host.sound('shoot');
  }
  host.onPointer('pointermove', aimAt);
  host.onPointer('pointerdown', aimAt);
  host.onPointer('pointerup', (p) => { aimAt(p); shoot(); });
  host.onKey((e, first) => { if (first && e.code === 'Space') shoot(); });

  function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS && !(odd(r) && c === COLS - 1); }

  function snap() {
    // Nächste freie Zelle, die an der Decke oder neben einer Kugel liegt
    let best = null, bestD = Infinity;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!inBounds(r, c) || grid[r][c]) continue;
      const attached = r === 0 || neighbors(r, c, odd).some(([nr, nc]) => grid[nr][nc]);
      if (!attached) continue;
      const d = Math.hypot(bullet.x - cx(r, c), bullet.y - cy(r));
      if (d < bestD) { bestD = d; best = [r, c]; }
    }
    const color = bullet.color;
    bullet = null;
    if (!best) return;
    const [r, c] = best;
    grid[r][c] = color;
    shots++;
    const cluster = findCluster(grid, r, c, odd);
    if (cluster.length >= 3) {
      combo++;
      for (const [rr, cc] of cluster) { parts.burst(cx(rr, cc), cy(rr), grid[rr][cc], 6, 4); grid[rr][cc] = null; }
      const floating = findFloating(grid, odd);
      for (const [rr, cc] of floating) { falling.push({ x: cx(rr, cc), y: cy(rr), vy: 0, color: grid[rr][cc] }); grid[rr][cc] = null; }
      score += cluster.length * 10 * Math.min(5, combo) + floating.length * 20;
      host.sound(floating.length ? 'win' : 'pop');
    } else {
      combo = 0;
      host.sound('click');
      if (shots % 6 === 0) dropCeiling();
    }
    if (!colorsOnBoard().length) {
      score += 1000 * level;
      host.sound('win');
      shift = 0;
      newBoard();
    }
    if (!colorsOnBoard().includes(shooter.color)) shooter.color = pickColor();
    if (!colorsOnBoard().includes(shooter.next)) shooter.next = pickColor();
    host.setScore(score);
    checkLose();
  }
  function dropCeiling() {
    shift++;
    grid.pop();
    grid.unshift(Array.from({ length: COLS }, (_, c) => (odd(0) && c === COLS - 1 ? null : PALETTE[Math.floor(Math.random() * numColors)])));
  }
  function checkLose() {
    for (let r = DANGER_ROW; r < ROWS; r++) if (grid[r].some(Boolean)) { host.sound('lose'); host.end(score); return; }
  }

  host.loop(() => {
    if (host.left) shooter.angle = Math.max(-Math.PI + 0.12, shooter.angle - 0.03);
    if (host.right) shooter.angle = Math.min(-0.12, shooter.angle + 0.03);
    if (bullet) {
      for (let s = 0; s < 3 && bullet; s++) {
        bullet.x += bullet.vx / 3; bullet.y += bullet.vy / 3;
        if (bullet.x < R) { bullet.x = R; bullet.vx = Math.abs(bullet.vx); }
        if (bullet.x > W - R) { bullet.x = W - R; bullet.vx = -Math.abs(bullet.vx); }
        if (bullet.y <= R) { snap(); break; }
        let hit = false;
        for (let r = 0; r < ROWS && !hit; r++) for (let c = 0; c < COLS; c++) {
          if (grid[r][c] && Math.hypot(bullet.x - cx(r, c), bullet.y - cy(r)) < R * 1.75) { hit = true; break; }
        }
        if (hit) snap();
      }
    }
    for (let i = falling.length - 1; i >= 0; i--) { const f = falling[i]; f.vy += 0.5; f.y += f.vy; if (f.y > H + R) falling.splice(i, 1); }
    parts.update(0.1);
  }, () => {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0a2e'); bg.addColorStop(1, '#1a0a3e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const dangerY = cy(DANGER_ROW) - R;
    ctx.fillStyle = 'rgba(255,0,60,0.08)'; ctx.fillRect(0, dangerY, W, H - dangerY);
    ctx.strokeStyle = 'rgba(255,60,90,0.5)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, dangerY); ctx.lineTo(W, dangerY); ctx.stroke(); ctx.setLineDash([]);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c]) ball(cx(r, c), cy(r), grid[r][c]);
    for (const f of falling) ball(f.x, f.y, f.color);
    // Ziellinie mit einer Abprall-Vorschau
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([5, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, SHOOT_Y);
    let x = W / 2, y = SHOOT_Y, vx = Math.cos(shooter.angle) * 10, vy = Math.sin(shooter.angle) * 10;
    for (let i = 0; i < 45 && y > R; i++) { x += vx; y += vy; if (x < R || x > W - R) { vx = -vx; x = Math.max(R, Math.min(W - R, x)); } ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    ball(W / 2, SHOOT_Y, shooter.color);
    if (bullet) ball(bullet.x, bullet.y, bullet.color);
    parts.draw(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Nächste', 12, H - 30);
    ball(36, H - 14, shooter.next, 0.6);
    ctx.textAlign = 'right';
    ctx.fillText(`Decke rückt in ${6 - (shots % 6)}`, W - 10, H - 14);
  });

  function ball(x, y, color, scale = 1) {
    const r = (R - 1) * scale;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, color); g.addColorStop(1, color);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  }
}
