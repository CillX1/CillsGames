// 🏓 Pong – erster mit 5 Punkten gewinnt. Bewegt sich dein Schläger beim Treffen, bekommt der Ball Spin.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: 'Langsame KI, die oft daneben liegt' },
  { id: 'normal', label: 'Mittel', desc: 'Ausgeglichen' },
  { id: 'hard', label: 'Profi', desc: 'Schnelle, genaue KI – Punkte ×2' },
];
const CFG = {
  easy: { aiBase: 3.6, aiMax: 6, err: 1.6, mult: 1 },
  normal: { aiBase: 4.5, aiMax: 8.5, err: 1, mult: 1 },
  hard: { aiBase: 6, aiMax: 11, err: 0.45, mult: 2 },
};

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const W = 800, H = 500, PH = 100, PW = 14, R = 9, WIN = 5;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([{ code: 'ArrowUp', label: '▲', wide: true }, { code: 'ArrowDown', label: '▼', wide: true }]);

  const player = { y: H / 2 - PH / 2, vy: 0, score: 0 };
  const ai = { y: H / 2 - PH / 2, score: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  const trail = [];
  const parts = makeParticles();
  let serveTimer = 70, pointerY = null, aiError = 0, rally = 0, flash = 0;

  host.onPointer('pointermove', (p) => { pointerY = p.y; });
  host.onPointer('pointerdown', (p) => { pointerY = p.y; });

  function serve(dirSign) {
    ball.x = W / 2; ball.y = H / 2;
    const angle = (Math.random() - 0.5) * 0.8;
    const speed = 6;
    ball.vx = Math.cos(angle) * speed * dirSign;
    ball.vy = Math.sin(angle) * speed;
    aiError = (Math.random() - 0.5) * 60 * C.err;
    rally = 0;
  }
  const score = () => (player.score * 100 + (player.score >= WIN ? 500 : 0)) * C.mult;
  const matchPoint = () => player.score === WIN - 1 || ai.score === WIN - 1;

  host.loop(() => {
    const oldY = player.y;
    if (host.up) { player.y -= 8; pointerY = null; }
    if (host.down) { player.y += 8; pointerY = null; }
    if (pointerY != null) player.y += Math.max(-11, Math.min(11, pointerY - (player.y + PH / 2)));
    player.y = Math.max(0, Math.min(H - PH, player.y));
    player.vy = player.y - oldY;
    parts.update();
    if (flash > 0) flash--;

    if (serveTimer > 0) {
      if (--serveTimer === 0) serve(Math.random() < 0.5 ? -1 : 1);
      return;
    }
    const level = player.score + ai.score;
    const aiSpeed = Math.min(C.aiMax, C.aiBase + level * 0.45);
    let targetY = H / 2;
    if (ball.vx > 0) {
      let sx = ball.x, sy = ball.y, svy = ball.vy, n = 0;
      while (sx < W - 30 && n++ < 300) { sx += ball.vx; sy += svy; if (sy < R || sy > H - R) svy = -svy; }
      targetY = sy + aiError * Math.max(0.3, 1 - level * 0.08);
    }
    const c = ai.y + PH / 2;
    if (Math.abs(targetY - c) > 6) ai.y += Math.sign(targetY - c) * Math.min(aiSpeed, Math.abs(targetY - c));
    ai.y = Math.max(0, Math.min(H - PH, ai.y));

    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 12) trail.shift();
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); host.sound('click'); }
    if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy); host.sound('click'); }

    const hitPaddle = (px, py, dir, spin) => {
      if (ball.y + R < py || ball.y - R > py + PH) return false;
      const rel = (ball.y - (py + PH / 2)) / (PH / 2);
      const speed = Math.min(16, Math.hypot(ball.vx, ball.vy) * 1.06);
      const angle = Math.max(-1.1, Math.min(1.1, rel * 1.0 + spin * 0.04));
      ball.vx = Math.cos(angle) * speed * dir;
      ball.vy = Math.sin(angle) * speed;
      ball.x = px + (dir > 0 ? PW + R : -R);
      aiError = (Math.random() - 0.5) * 70 * C.err;
      rally++;
      parts.burst(ball.x, ball.y, dir > 0 ? '#00d4ff' : '#ff006e', 10, 4);
      if (speed > 12) host.shake(3);
      host.sound('click');
      return true;
    };
    if (ball.vx < 0 && ball.x - R <= 20 + PW && ball.x - R > 4) hitPaddle(20, player.y, 1, player.vy);
    if (ball.vx > 0 && ball.x + R >= W - 20 - PW && ball.x + R < W - 4) hitPaddle(W - 20 - PW, ai.y, -1, 0);

    if (ball.x < -R) { ai.score++; host.sound('lose'); host.shake(6); flash = 20; next(); }
    else if (ball.x > W + R) {
      player.score++;
      host.sound('point');
      host.floatText(W * 0.75, H / 2, '+' + 100 * C.mult, '#00d4ff', 28);
      flash = 20;
      host.setScore(score());
      next();
    }
  }, draw);

  function next() {
    trail.length = 0;
    if (player.score >= WIN || ai.score >= WIN) { host.end(score()); return; }
    serveTimer = 60;
    ball.x = W / 2; ball.y = H / 2; ball.vx = 0; ball.vy = 0;
  }

  function draw() {
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, W, H);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash / 120})`; ctx.fillRect(0, 0, W, H); }
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.setLineDash([18, 14]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.font = 'bold 80px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(player.score, W / 4, 100); ctx.fillText(ai.score, (W * 3) / 4, 100);
    ctx.font = '14px system-ui'; ctx.fillText('DU', W / 4, 125); ctx.fillText('KI', (W * 3) / 4, 125);
    trail.forEach((p, i) => {
      ctx.globalAlpha = (i / trail.length) * 0.35;
      ctx.fillStyle = Math.hypot(ball.vx, ball.vy) > 11 ? '#ff8800' : '#fff';
      ctx.beginPath(); ctx.arc(p.x, p.y, R * (i / trail.length), 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00d4ff'; ctx.fillStyle = '#00d4ff'; ctx.fillRect(20, player.y, PW, PH);
    ctx.shadowColor = '#ff006e'; ctx.fillStyle = '#ff006e'; ctx.fillRect(W - 20 - PW, ai.y, PW, PH);
    ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    parts.draw(ctx);
    if (rally >= 4) { ctx.fillStyle = 'rgba(255,215,0,0.8)'; ctx.font = 'bold 14px system-ui'; ctx.fillText(`Ballwechsel: ${rally}`, W / 2, H - 16); }
    if (serveTimer > 0 && !host.over) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 22px system-ui';
      ctx.fillText(player.score + ai.score === 0 ? 'Erster bis 5 gewinnt!' : matchPoint() ? '🔥 Matchball!' : 'Bereit…', W / 2, H / 2 + 80);
    }
  }
}
