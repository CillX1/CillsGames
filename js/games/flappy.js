// 🐦 Flappy Bird – drei Modi, bewegliche Röhren, Bonus-Sterne, Medaillen.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: 'Breite Lücken, gemütliches Tempo' },
  { id: 'normal', label: 'Normal', desc: 'Wie das Original – ab 15 Röhren bewegen sie sich' },
  { id: 'hard', label: 'Schwer', desc: 'Enge Lücken, Röhren bewegen sich von Anfang an' },
];
const CFG = {
  easy: { gap: 190, minGap: 150, speed: 2.3, maxSpeed: 4.2, moveAt: 30 },
  normal: { gap: 160, minGap: 118, speed: 2.6, maxSpeed: 5.5, moveAt: 15 },
  hard: { gap: 138, minGap: 110, speed: 3.1, maxSpeed: 6, moveAt: 0 },
};

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const W = 400, H = 600, FLOOR = H - 50;
  const { ctx } = host.createCanvas(W, H);
  const bird = { x: 90, y: H / 2, vy: 0, r: 15, flap: 0 };
  let pipes = [], score = 0, started = false, speed = C.speed, gap = C.gap, groundOff = 0, tick = 0, cityOff = 0;
  const clouds = Array.from({ length: 5 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 160, s: 30 + Math.random() * 40 }));
  const city = Array.from({ length: 14 }, (_, i) => ({ x: i * 34, w: 26 + Math.random() * 12, h: 40 + Math.random() * 70 }));
  const parts = makeParticles();

  function flap() {
    if (host.over) return;
    started = true;
    bird.vy = -7.2;
    bird.flap = 10;
    parts.burst(bird.x - 10, bird.y + 4, '#ffe680', 3, 1.5);
    host.sound('jump');
  }
  host.onKey((e, first) => { if (first && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) flap(); });
  host.onPointer('pointerdown', () => flap());

  function spawn() {
    const minTop = 60, maxTop = FLOOR - gap - 60;
    const moving = score >= C.moveAt;
    const p = { x: W + 10, top: minTop + Math.random() * (maxTop - minTop), scored: false, gap, move: moving ? (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6) : 0, minTop, maxTop };
    if (Math.random() < 0.35) p.star = { got: false };
    pipes.push(p);
  }

  function die() {
    host.shake(8);
    parts.burst(bird.x, bird.y, '#ffd700', 18, 5);
    host.sound('hit');
    host.end(score);
  }

  host.loop(() => {
    tick++;
    if (bird.flap > 0) bird.flap--;
    groundOff = (groundOff + (started ? speed : 1)) % 24;
    cityOff = (cityOff + (started ? speed * 0.3 : 0.3)) % 34;
    for (const c of clouds) { c.x -= 0.4; if (c.x < -c.s * 1.5) c.x = W + c.s; }
    parts.update(0.12);
    if (!started) { bird.y = H / 2 + Math.sin(tick / 12) * 8; return; }
    bird.vy = Math.min(10, bird.vy + 0.38);
    bird.y += bird.vy;
    if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }
    if (bird.y + bird.r >= FLOOR) { die(); return; }
    if (!pipes.length || pipes[pipes.length - 1].x < W - 230) spawn();
    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= speed;
      if (p.move) { p.top += p.move; if (p.top < p.minTop || p.top > p.maxTop) p.move = -p.move; }
      if (p.x < -70) { pipes.splice(i, 1); continue; }
      if (p.star && !p.star.got && Math.hypot(bird.x - (p.x + 30), bird.y - (p.top + p.gap / 2)) < 24) {
        p.star.got = true;
        score += 2;
        host.floatText(p.x + 30, p.top + p.gap / 2 - 12, '+2', '#ffd700', 20);
        parts.burst(p.x + 30, p.top + p.gap / 2, '#ffd700', 10, 3);
        host.sound('coin');
      }
      if (!p.scored && p.x + 60 < bird.x - bird.r) {
        p.scored = true;
        score++;
        host.sound('point');
        if (score % 5 === 0) { speed = Math.min(C.maxSpeed, speed + 0.3); gap = Math.max(C.minGap, gap - 6); }
      }
      const hit = (rx, ry, rw, rh) => {
        const cx = Math.max(rx, Math.min(bird.x, rx + rw)), cy = Math.max(ry, Math.min(bird.y, ry + rh));
        return Math.hypot(bird.x - cx, bird.y - cy) < bird.r - 2;
      };
      if (hit(p.x, -10, 60, p.top + 10) || hit(p.x, p.top + p.gap, 60, FLOOR - p.top - p.gap)) { die(); return; }
    }
    host.setScore(score);
  }, () => {
    const night = Math.floor(score / 25) % 2 === 1 ? 1 : 0; // alle 25 Röhren wechselt Tag/Nacht
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, night > 0.5 ? '#1b2250' : '#87CEEB'); sky.addColorStop(1, night > 0.5 ? '#3a4a7a' : '#c8f7c5');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = night > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)';
    for (const c of clouds) { ctx.beginPath(); ctx.arc(c.x, c.y, c.s * 0.5, 0, 7); ctx.arc(c.x + c.s * 0.4, c.y - 5, c.s * 0.4, 0, 7); ctx.arc(c.x + c.s * 0.75, c.y, c.s * 0.35, 0, 7); ctx.fill(); }
    // Stadt-Silhouette
    for (const b of city) {
      const x = b.x - cityOff;
      ctx.fillStyle = night > 0.5 ? '#232b55' : '#9fd3c7';
      ctx.fillRect(x, FLOOR - b.h, b.w, b.h);
      if (night > 0.5) { ctx.fillStyle = '#ffe680aa'; for (let wy = FLOOR - b.h + 8; wy < FLOOR - 8; wy += 12) ctx.fillRect(x + 6, wy, 4, 5); }
    }
    for (const p of pipes) {
      const g = ctx.createLinearGradient(p.x, 0, p.x + 60, 0);
      g.addColorStop(0, '#228B22'); g.addColorStop(0.35, '#3fd13f'); g.addColorStop(1, '#1a6b1a');
      ctx.fillStyle = g;
      ctx.fillRect(p.x, 0, 60, p.top); ctx.fillRect(p.x - 5, p.top - 26, 70, 26);
      const by = p.top + p.gap;
      ctx.fillRect(p.x, by, 60, FLOOR - by); ctx.fillRect(p.x - 5, by, 70, 26);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(p.x - 5, p.top - 4, 70, 4); ctx.fillRect(p.x - 5, by + 22, 70, 4);
      if (p.star && !p.star.got) {
        const sx = p.x + 30, sy = p.top + p.gap / 2;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(tick / 30);
        ctx.fillStyle = '#ffd700'; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const r = k % 2 ? 5 : 12, a = (k / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
    ctx.fillStyle = '#ded895'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = '#73bf2e'; ctx.fillRect(0, FLOOR, W, 12);
    ctx.fillStyle = '#5a9a20';
    for (let x = -groundOff; x < W; x += 24) ctx.fillRect(x, FLOOR + 4, 12, 4);
    parts.draw(ctx);
    ctx.save(); ctx.translate(bird.x, bird.y);
    ctx.rotate(Math.max(-0.5, Math.min(1.2, bird.vy * 0.09)));
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFA500'; ctx.beginPath(); ctx.ellipse(-6, bird.flap > 0 ? -4 : 4 + Math.sin(tick / 3) * 2, 11, 7, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -5, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(10, -5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF6347'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(25, 2); ctx.lineTo(14, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.textAlign = 'center';
    ctx.font = 'bold 44px system-ui';
    ctx.strokeText(score, W / 2, 70); ctx.fillText(score, W / 2, 70);
    const medal = score >= 40 ? '🥇' : score >= 20 ? '🥈' : score >= 10 ? '🥉' : '';
    if (medal) { ctx.font = '26px system-ui'; ctx.fillText(medal, W / 2 + 52, 66); }
    if (!started) {
      ctx.font = 'bold 22px system-ui'; ctx.lineWidth = 4;
      ctx.strokeText('Tippen oder Leertaste', W / 2, H / 2 + 70); ctx.fillText('Tippen oder Leertaste', W / 2, H / 2 + 70);
      ctx.font = '15px system-ui'; ctx.lineWidth = 3;
      ctx.strokeText('🥉 10 · 🥈 20 · 🥇 40 Röhren', W / 2, H / 2 + 100); ctx.fillText('🥉 10 · 🥈 20 · 🥇 40 Röhren', W / 2, H / 2 + 100);
    }
  });
}
