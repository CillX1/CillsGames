// 🧱 Breakout – Level-Muster, Spezial-Steine, sieben Powerups.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: '5 Leben, breiter Schläger' },
  { id: 'normal', label: 'Normal', desc: '3 Leben' },
  { id: 'hard', label: 'Schwer', desc: '2 Leben, schneller Ball – Punkte ×1.5' },
];
const CFG = {
  easy: { lives: 5, paddle: 130, speed: 5.5, mult: 1 },
  normal: { lives: 3, paddle: 100, speed: 6, mult: 1 },
  hard: { lives: 2, paddle: 90, speed: 7, mult: 1.5 },
};

// Level-Muster: . = leer, 1–3 = normaler Stein (Härte), M = Metall (5 Treffer), X = Explosiv
export const LEVELS = [
  ['1111111111', '1111111111', '1111111111', '1111111111', '1111111111'],
  ['..222222..', '.21111112.', '2111XX1112', '.21111112.', '..222222..'],
  ['1.1.1.1.1.', '.2.2.2.2.2', '1.1.X.1.1.', '.2.2.2.2.2', '3.3.3.3.3.', '.1.1.1.1.1'],
  ['MM......MM', '1111111111', '22X2222X22', '1111111111', '3333333333', '..M....M..'],
  ['....11....', '...2112...', '..321123..', '.32X11X23.', '3211111123', 'M........M'],
  ['X1X1X1X1X1', '2222222222', 'M33333333M', '2222222222', '1X1X1X1X1X', '1111111111'],
];
const ROW_COLORS = ['#ff4444', '#ff8844', '#ffcc44', '#44ff44', '#44ccff', '#cc44ff', '#ff66aa'];
const DROPS = [
  { type: 'grow', col: '#00ff88', label: '↔' },
  { type: 'shrink', col: '#ff4444', label: '−' },
  { type: 'multi', col: '#00d4ff', label: '×3' },
  { type: 'laser', col: '#ff006e', label: '⚡' },
  { type: 'slow', col: '#9fe8ff', label: '🐢' },
  { type: 'life', col: '#ffd700', label: '♥' },
];

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const W = 800, H = 600, PADDLE_Y = H - 34, R = 8;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([{ code: 'ArrowLeft', label: '◀', wide: true }, { code: 'Space', label: '● Start/Laser' }, { code: 'ArrowRight', label: '▶', wide: true }]);
  const paddle = { x: W / 2 - C.paddle / 2, w: C.paddle };
  let bricks = [], balls = [], drops = [], bolts = [], score = 0, lives = C.lives, level = 1, mouseX = null;
  let laser = 0, slow = 0, laserCd = 0;
  const parts = makeParticles();

  function buildLevel() {
    bricks = [];
    const pattern = LEVELS[(level - 1) % LEVELS.length];
    const cols = 10, bw = 70, bh = 24, pad = 5, left = (W - (cols * (bw + pad) - pad)) / 2;
    const extraHp = Math.floor((level - 1) / LEVELS.length); // nach jedem Durchlauf werden Steine härter
    pattern.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      const base = { x: left + c * (bw + pad), y: 60 + r * (bh + pad), w: bw, h: bh };
      if (ch === 'M') bricks.push({ ...base, kind: 'metal', hp: 5, max: 5, color: '#9aa4b8', pts: 50 });
      else if (ch === 'X') bricks.push({ ...base, kind: 'bomb', hp: 1, max: 1, color: '#ff3b3b', pts: 30 });
      else { const hp = +ch + extraHp; bricks.push({ ...base, kind: 'normal', hp, max: hp, color: ROW_COLORS[r % ROW_COLORS.length], pts: 10 * hp }); }
    }));
    resetBall();
  }
  function resetBall() {
    paddle.w = C.paddle;
    laser = 0; slow = 0;
    balls = [{ x: paddle.x + paddle.w / 2, y: PADDLE_Y - R - 1, vx: 0, vy: 0, stuck: true, trail: [] }];
    drops = []; bolts = [];
  }
  function launch() {
    for (const b of balls) if (b.stuck) {
      const sp = C.speed + level * 0.35;
      b.stuck = false; b.vx = sp * 0.55 * (Math.random() < 0.5 ? -1 : 1); b.vy = -sp * 0.85;
    }
  }
  function fire() {
    if (laser <= 0 || laserCd > 0) return;
    laserCd = 14;
    bolts.push({ x: paddle.x + 8, y: PADDLE_Y }, { x: paddle.x + paddle.w - 8, y: PADDLE_Y });
    host.sound('shoot');
  }
  buildLevel();

  host.onKey((e, first) => { if (first && e.code === 'Space') { if (balls.some((b) => b.stuck)) launch(); else fire(); } });
  host.onPointer('pointermove', (p) => { mouseX = p.x; });
  host.onPointer('pointerdown', (p) => { mouseX = p.x; if (balls.some((b) => b.stuck)) launch(); else fire(); });

  function addPoints(n, x, y) {
    n = Math.round(n * C.mult);
    score += n;
    if (x != null) host.floatText(x, y, '+' + n, '#fff', 14);
    host.setScore(score);
  }
  function damage(br, amount = 1) {
    if (br.hp <= 0) return;
    br.hp -= amount;
    if (br.hp > 0) { host.sound('click'); return; }
    addPoints(br.pts, br.x + br.w / 2, br.y);
    parts.burst(br.x + br.w / 2, br.y + br.h / 2, br.color, 10, 4);
    if (br.kind === 'bomb') {
      host.shake(8);
      host.sound('hit');
      parts.burst(br.x + br.w / 2, br.y + br.h / 2, '#ffaa00', 30, 7);
      for (const o of bricks) {
        if (o.hp > 0 && Math.abs(o.x + o.w / 2 - (br.x + br.w / 2)) < 90 && Math.abs(o.y + o.h / 2 - (br.y + br.h / 2)) < 36) damage(o, 99);
      }
    } else host.sound('pop');
    if (Math.random() < 0.13) {
      const d = DROPS[Math.floor(Math.random() * (lives < 3 ? DROPS.length : DROPS.length - 1))];
      drops.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, ...d });
    }
  }
  function bounceBrick(b, br) {
    const overlapX = Math.min(b.x + R - br.x, br.x + br.w - (b.x - R));
    const overlapY = Math.min(b.y + R - br.y, br.y + br.h - (b.y - R));
    if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
  }

  host.loop(() => {
    if (laser > 0) laser--;
    if (slow > 0) slow--;
    if (laserCd > 0) laserCd--;
    if (host.left) { paddle.x -= 11; mouseX = null; }
    if (host.right) { paddle.x += 11; mouseX = null; }
    if (mouseX != null) paddle.x += (mouseX - paddle.w / 2 - paddle.x) * 0.5;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
    if (host.isDown('Space') && laser > 0) fire();

    for (let i = bolts.length - 1; i >= 0; i--) {
      const z = bolts[i];
      z.y -= 10;
      const br = bricks.find((o) => o.hp > 0 && z.x > o.x && z.x < o.x + o.w && z.y > o.y && z.y < o.y + o.h);
      if (br) { damage(br); bolts.splice(i, 1); continue; }
      if (z.y < 0) bolts.splice(i, 1);
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += 2.6;
      if (d.y > H) { drops.splice(i, 1); continue; }
      if (d.y + 10 >= PADDLE_Y && d.y - 10 <= PADDLE_Y + 14 && d.x >= paddle.x - 8 && d.x <= paddle.x + paddle.w + 8) {
        const txt = { grow: 'Grösser!', shrink: 'Kleiner…', multi: 'Multiball!', laser: 'Laser!', slow: 'Zeitlupe', life: '+1 Leben' }[d.type];
        if (d.type === 'grow') paddle.w = Math.min(200, paddle.w + 35);
        else if (d.type === 'shrink') paddle.w = Math.max(50, paddle.w - 30);
        else if (d.type === 'laser') laser = 600;
        else if (d.type === 'slow') slow = 480;
        else if (d.type === 'life') lives = Math.min(lives + 1, 6);
        else {
          const src = balls.find((b) => !b.stuck) || balls[0];
          for (const s of [-1, 1]) balls.push({ x: src.x, y: src.y, vx: 4 * s, vy: -Math.abs(src.vy || 6), stuck: false, trail: [] });
        }
        host.floatText(d.x, PADDLE_Y - 20, txt, d.col, 16);
        host.sound(d.type === 'shrink' ? 'error' : 'coin');
        drops.splice(i, 1);
      }
    }

    const speedFactor = slow > 0 ? 0.6 : 1;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.stuck) { b.x = paddle.x + paddle.w / 2; b.y = PADDLE_Y - R - 1; continue; }
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 8) b.trail.shift();
      const steps = Math.ceil(Math.hypot(b.vx, b.vy) / 4);
      for (let s = 0; s < steps; s++) {
        b.x += (b.vx / steps) * speedFactor; b.y += (b.vy / steps) * speedFactor;
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
        const br = bricks.find((o) => o.hp > 0 && b.x + R > o.x && b.x - R < o.x + o.w && b.y + R > o.y && b.y - R < o.y + o.h);
        if (br) { bounceBrick(b, br); damage(br); }
      }
      if (Math.abs(b.vy) < 1.5) b.vy = b.vy < 0 ? -2 : 2;
      if (b.y > H + R) balls.splice(i, 1);
    }
    bricks = bricks.filter((br) => br.hp > 0);
    parts.update(0.15);

    if (!balls.length) {
      lives--;
      host.sound('lose');
      host.shake(8);
      if (lives <= 0) { host.end(score); return; }
      resetBall();
    }
    if (!bricks.some((b) => b.kind !== 'metal') ) {
      addPoints(250 * level, W / 2, H / 2);
      host.floatText(W / 2, H / 2 + 40, `Level ${level} geschafft!`, '#00e68a', 30);
      host.sound('win');
      level++;
      buildLevel();
    }
  }, () => {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a1a2e'); bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (const br of bricks) {
      const g = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
      g.addColorStop(0, br.color); g.addColorStop(1, '#00000088');
      ctx.globalAlpha = br.kind === 'normal' ? 0.55 + 0.45 * (br.hp / br.max) : 1;
      ctx.fillStyle = g; ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(br.x, br.y, br.w, 3);
      if (br.kind === 'metal') {
        ctx.strokeStyle = '#e5e9f0'; ctx.lineWidth = 2; ctx.strokeRect(br.x + 2, br.y + 2, br.w - 4, br.h - 4);
        ctx.fillStyle = '#e5e9f0'; for (const [dx, dy] of [[6, 6], [br.w - 6, 6], [6, br.h - 6], [br.w - 6, br.h - 6]]) { ctx.beginPath(); ctx.arc(br.x + dx, br.y + dy, 2, 0, Math.PI * 2); ctx.fill(); }
      } else if (br.kind === 'bomb') {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('💥', br.x + br.w / 2, br.y + 18);
      } else if (br.hp > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(br.hp, br.x + br.w / 2, br.y + 17);
      }
    }
    for (const d of drops) {
      ctx.fillStyle = d.col; ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(d.label, d.x, d.y + 4.5);
    }
    ctx.fillStyle = '#ff006e';
    for (const z of bolts) ctx.fillRect(z.x - 2, z.y - 10, 4, 12);
    const pg = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + 14);
    pg.addColorStop(0, laser > 0 ? '#ff4d9a' : '#00d4ff'); pg.addColorStop(1, laser > 0 ? '#a0004a' : '#0066cc');
    ctx.fillStyle = pg; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(paddle.x, PADDLE_Y, paddle.w, 14, 7); else ctx.rect(paddle.x, PADDLE_Y, paddle.w, 14);
    ctx.fill();
    if (laser > 0) { ctx.fillStyle = '#ff006e'; ctx.fillRect(paddle.x + 5, PADDLE_Y - 6, 6, 6); ctx.fillRect(paddle.x + paddle.w - 11, PADDLE_Y - 6, 6, 6); }
    for (const b of balls) {
      b.trail.forEach((p, i) => { ctx.globalAlpha = (i / b.trail.length) * 0.3; ctx.fillStyle = slow > 0 ? '#9fe8ff' : '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, R * (i / b.trail.length), 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    parts.draw(ctx);
    ctx.fillStyle = '#ff4d6d'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('❤'.repeat(lives), 12, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'right'; ctx.fillText(`Level ${level}`, W - 12, 28);
    ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui';
    const st = [laser > 0 && `⚡ Laser ${Math.ceil(laser / 60)}s`, slow > 0 && `🐢 ${Math.ceil(slow / 60)}s`].filter(Boolean).join('   ');
    if (st) { ctx.fillStyle = '#ffd700'; ctx.fillText(st, W / 2, 28); }
    if (balls.some((b) => b.stuck)) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 16px system-ui';
      ctx.fillText('Klick oder Leertaste zum Starten', W / 2, H / 2 + 80);
    }
  });
}
