// 🧱 Breakout – mit Leveln, 3 Leben und Powerups.
import { makeParticles } from './host.js';

export function start(host) {
  const W = 800, H = 600, PADDLE_Y = H - 34, R = 8;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([{ code: 'ArrowLeft', label: '◀', wide: true }, { code: 'Space', label: '● Start' }, { code: 'ArrowRight', label: '▶', wide: true }]);
  const COLORS = ['#ff4444', '#ff8844', '#ffcc44', '#44ff44', '#44ccff', '#cc44ff'];
  const paddle = { x: W / 2 - 50, w: 100 };
  let bricks = [], balls = [], drops = [], score = 0, lives = 3, level = 1, mouseX = null;
  const parts = makeParticles();

  function buildLevel() {
    bricks = [];
    const rows = Math.min(8, 4 + level), cols = 10, bw = 70, bh = 24, pad = 5, left = (W - (cols * (bw + pad) - pad)) / 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (level >= 3 && (r + c) % 7 === 3) continue; // Lücken ab Level 3
      const hp = level >= 2 && r < Math.floor(level / 2) ? 2 : 1;
      bricks.push({ x: left + c * (bw + pad), y: 60 + r * (bh + pad), w: bw, h: bh, color: COLORS[r % COLORS.length], hp, pts: (rows - r) * 10 });
    }
    resetBall();
  }
  function resetBall() {
    paddle.w = 100;
    balls = [{ x: paddle.x + paddle.w / 2, y: PADDLE_Y - R - 1, vx: 0, vy: 0, stuck: true }];
    drops = [];
  }
  function launch() {
    for (const b of balls) if (b.stuck) {
      const sp = 6 + level * 0.5;
      b.stuck = false; b.vx = sp * 0.55 * (Math.random() < 0.5 ? -1 : 1); b.vy = -sp * 0.85;
    }
  }
  buildLevel();

  host.onKey((e, first) => { if (first && e.code === 'Space') launch(); });
  host.onPointer('pointermove', (p) => { mouseX = p.x; });
  host.onPointer('pointerdown', (p) => { mouseX = p.x; launch(); });

  function bounceBrick(b, br) {
    // Von welcher Seite kam der Ball? -> sauberes Abprallen
    const overlapX = Math.min(b.x + R - br.x, br.x + br.w - (b.x - R));
    const overlapY = Math.min(b.y + R - br.y, br.y + br.h - (b.y - R));
    if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
  }

  host.loop(() => {
    if (host.left) { paddle.x -= 11; mouseX = null; }
    if (host.right) { paddle.x += 11; mouseX = null; }
    if (mouseX != null) paddle.x += (mouseX - paddle.w / 2 - paddle.x) * 0.5;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += 2.6;
      if (d.y > H) { drops.splice(i, 1); continue; }
      if (d.y + 10 >= PADDLE_Y && d.y - 10 <= PADDLE_Y + 14 && d.x >= paddle.x - 8 && d.x <= paddle.x + paddle.w + 8) {
        if (d.type === 'grow') paddle.w = Math.min(200, paddle.w + 35);
        else if (d.type === 'shrink') paddle.w = Math.max(50, paddle.w - 30);
        else {
          const src = balls.find((b) => !b.stuck) || balls[0];
          for (const s of [-1, 1]) balls.push({ x: src.x, y: src.y, vx: 4 * s, vy: -Math.abs(src.vy || 6), stuck: false });
        }
        host.sound('coin');
        drops.splice(i, 1);
      }
    }

    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.stuck) { b.x = paddle.x + paddle.w / 2; b.y = PADDLE_Y - R - 1; continue; }
      // In kleinen Schritten bewegen, damit schnelle Bälle nicht durch Blöcke "tunneln"
      const steps = Math.ceil(Math.hypot(b.vx, b.vy) / 4);
      for (let s = 0; s < steps; s++) {
        b.x += b.vx / steps; b.y += b.vy / steps;
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
        if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); }
        if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y + R >= PADDLE_Y && b.y + R <= PADDLE_Y + 16 && b.x >= paddle.x - R && b.x <= paddle.x + paddle.w + R) {
          const rel = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          const sp = Math.min(13, Math.hypot(b.vx, b.vy) * 1.01);
          const ang = Math.max(-1, Math.min(1, rel)) * 1.05;
          b.vx = Math.sin(ang) * sp; b.vy = -Math.cos(ang) * sp;
          b.y = PADDLE_Y - R;
          host.sound('click');
        }
        for (const br of bricks) {
          if (br.hp <= 0) continue;
          if (b.x + R > br.x && b.x - R < br.x + br.w && b.y + R > br.y && b.y - R < br.y + br.h) {
            bounceBrick(b, br);
            br.hp--;
            if (br.hp <= 0) {
              score += br.pts;
              parts.burst(br.x + br.w / 2, br.y + br.h / 2, br.color, 10, 4);
              if (Math.random() < 0.15) drops.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, type: ['grow', 'shrink', 'multi'][Math.floor(Math.random() * 3)] });
              host.sound('pop');
            } else host.sound('click');
            host.setScore(score);
            break;
          }
        }
      }
      if (Math.abs(b.vy) < 1.5) b.vy = b.vy < 0 ? -2 : 2; // nie waagrecht festhängen
      if (b.y > H + R) balls.splice(i, 1);
    }
    bricks = bricks.filter((br) => br.hp > 0);
    parts.update(0.15);

    if (!balls.length) {
      lives--;
      host.sound('lose');
      if (lives <= 0) { host.end(score); return; }
      resetBall();
    }
    if (!bricks.length) {
      score += 250 * level;
      host.setScore(score);
      host.sound('win');
      level++;
      buildLevel();
    }
  }, () => {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    for (const br of bricks) {
      const g = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
      g.addColorStop(0, br.color); g.addColorStop(1, '#00000088');
      ctx.fillStyle = g; ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(br.x, br.y, br.w, 3);
      if (br.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(br.x + 2, br.y + 2, br.w - 4, br.h - 4); }
    }
    for (const d of drops) {
      ctx.fillStyle = d.type === 'grow' ? '#00ff88' : d.type === 'shrink' ? '#ff4444' : '#00d4ff';
      ctx.beginPath(); ctx.arc(d.x, d.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(d.type === 'grow' ? '+' : d.type === 'shrink' ? '−' : '×3', d.x, d.y + 4.5);
    }
    const pg = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + 14);
    pg.addColorStop(0, '#00d4ff'); pg.addColorStop(1, '#0066cc');
    ctx.fillStyle = pg; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(paddle.x, PADDLE_Y, paddle.w, 14, 7); else ctx.rect(paddle.x, PADDLE_Y, paddle.w, 14);
    ctx.fill();
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff';
    for (const b of balls) { ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill(); }
    ctx.shadowBlur = 0;
    parts.draw(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('❤️'.repeat(lives), 12, 28);
    ctx.textAlign = 'right'; ctx.fillText(`Level ${level}`, W - 12, 28);
    if (balls.some((b) => b.stuck)) {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('Klick oder Leertaste zum Starten', W / 2, H / 2 + 80);
    }
  });
}
