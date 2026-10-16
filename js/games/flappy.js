// 🐦 Flappy Bird
export function start(host) {
  const W = 400, H = 600, FLOOR = H - 50;
  const { ctx } = host.createCanvas(W, H);
  const bird = { x: 90, y: H / 2, vy: 0, r: 15 };
  let pipes = [], score = 0, started = false, speed = 2.6, gap = 160, groundOff = 0, tick = 0;
  const clouds = Array.from({ length: 5 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 160, s: 30 + Math.random() * 40 }));

  function flap() {
    if (host.over) return;
    started = true;
    bird.vy = -7.2;
    host.sound('jump');
  }
  host.onKey((e, first) => { if (first && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) flap(); });
  host.onPointer('pointerdown', () => flap());

  function spawn() {
    const minTop = 60, maxTop = FLOOR - gap - 60;
    pipes.push({ x: W + 10, top: minTop + Math.random() * (maxTop - minTop), scored: false, gap });
  }

  host.loop(() => {
    tick++;
    groundOff = (groundOff + (started ? speed : 1)) % 24;
    for (const c of clouds) { c.x -= 0.4; if (c.x < -c.s * 1.5) c.x = W + c.s; }
    if (!started) { bird.y = H / 2 + Math.sin(tick / 12) * 8; return; }
    bird.vy = Math.min(10, bird.vy + 0.38);
    bird.y += bird.vy;
    if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }
    if (bird.y + bird.r >= FLOOR) { host.sound('hit'); host.end(score); return; }
    if (!pipes.length || pipes[pipes.length - 1].x < W - 230) spawn();
    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= speed;
      if (p.x < -70) { pipes.splice(i, 1); continue; }
      if (!p.scored && p.x + 60 < bird.x - bird.r) {
        p.scored = true;
        score++;
        host.sound('point');
        if (score % 5 === 0) { speed = Math.min(5.5, speed + 0.3); gap = Math.max(118, gap - 6); }
      }
      // Kreis-gegen-Rechteck-Kollision (fair, nicht "eckig")
      const hit = (rx, ry, rw, rh) => {
        const cx = Math.max(rx, Math.min(bird.x, rx + rw)), cy = Math.max(ry, Math.min(bird.y, ry + rh));
        return Math.hypot(bird.x - cx, bird.y - cy) < bird.r - 2;
      };
      if (hit(p.x, -10, 60, p.top + 10) || hit(p.x, p.top + p.gap, 60, FLOOR - p.top - p.gap)) {
        host.sound('hit'); host.end(score); return;
      }
    }
    host.setScore(score);
  }, () => {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#87CEEB'); sky.addColorStop(1, '#c8f7c5');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of clouds) { ctx.beginPath(); ctx.arc(c.x, c.y, c.s * 0.5, 0, 7); ctx.arc(c.x + c.s * 0.4, c.y - 5, c.s * 0.4, 0, 7); ctx.arc(c.x + c.s * 0.75, c.y, c.s * 0.35, 0, 7); ctx.fill(); }
    for (const p of pipes) {
      const g = ctx.createLinearGradient(p.x, 0, p.x + 60, 0);
      g.addColorStop(0, '#228B22'); g.addColorStop(0.35, '#3fd13f'); g.addColorStop(1, '#1a6b1a');
      ctx.fillStyle = g;
      ctx.fillRect(p.x, 0, 60, p.top); ctx.fillRect(p.x - 5, p.top - 26, 70, 26);
      const by = p.top + p.gap;
      ctx.fillRect(p.x, by, 60, FLOOR - by); ctx.fillRect(p.x - 5, by, 70, 26);
    }
    ctx.fillStyle = '#ded895'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = '#73bf2e'; ctx.fillRect(0, FLOOR, W, 12);
    ctx.fillStyle = '#5a9a20';
    for (let x = -groundOff; x < W; x += 24) ctx.fillRect(x, FLOOR + 4, 12, 4);
    ctx.save(); ctx.translate(bird.x, bird.y);
    ctx.rotate(Math.max(-0.5, Math.min(1.2, bird.vy * 0.09)));
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFA500'; ctx.beginPath(); ctx.ellipse(-6, 4 + Math.sin(tick / 3) * 3, 11, 7, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -5, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(10, -5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF6347'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(25, 2); ctx.lineTo(14, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.textAlign = 'center';
    ctx.font = 'bold 44px system-ui';
    ctx.strokeText(score, W / 2, 70); ctx.fillText(score, W / 2, 70);
    if (!started) {
      ctx.font = 'bold 22px system-ui'; ctx.lineWidth = 4;
      ctx.strokeText('Tippen oder Leertaste', W / 2, H / 2 + 70); ctx.fillText('Tippen oder Leertaste', W / 2, H / 2 + 70);
    }
  });
}
