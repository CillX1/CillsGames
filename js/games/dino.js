// 🦖 Dino Runner
import { makeParticles } from './host.js';

export function start(host) {
  const W = 800, H = 400, GROUND = 350;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([{ code: 'ArrowDown', label: '⬇ Ducken', wide: true }, { code: 'Space', label: '⬆ Springen', wide: true }]);

  const dino = { x: 80, y: GROUND - 70, w: 60, h: 70, vy: 0, jumping: false, ducking: false, frame: 0 };
  let obstacles = [];
  const clouds = Array.from({ length: 5 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 90, s: 30 + Math.random() * 30 }));
  const parts = makeParticles();
  let speed = 6, nextGap = 60, groundOff = 0, score = 0;

  function jump() {
    if (dino.jumping || host.over) return;
    dino.jumping = true;
    dino.ducking = false;
    dino.vy = -15;
    host.sound('jump');
  }

  host.onKey((e, first) => { if (first && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) jump(); });
  host.onPointer('pointerdown', () => jump());

  function spawn() {
    const birdAllowed = score > 300;
    const type = birdAllowed && Math.random() < 0.3 ? 'bird' : Math.random() < 0.5 ? 'small' : 'large';
    if (type === 'bird') {
      // Zwei Höhen: hoch (drunter ducken) oder tief (drüber springen)
      const low = Math.random() < 0.5;
      obstacles.push({ type, x: W + 20, y: low ? GROUND - 45 : GROUND - 95, w: 70, h: 30, wing: 0 });
    } else {
      const h = type === 'small' ? 50 : 70;
      obstacles.push({ type, x: W + 20, y: GROUND - h, w: type === 'small' ? 35 : 55, h });
    }
    // Mindestabstand wächst mit der Geschwindigkeit -> immer schaffbar
    nextGap = Math.floor((380 + Math.random() * 300) / speed + 18);
  }

  function hitbox() {
    if (dino.ducking && !dino.jumping) return { x: dino.x + 6, y: GROUND - 36, w: dino.w + 10, h: 34 };
    return { x: dino.x + 12, y: dino.y + 6, w: dino.w - 24, h: dino.h - 10 };
  }

  host.loop(() => {
    dino.frame++;
    dino.ducking = host.down && !dino.jumping;
    if (dino.jumping) {
      dino.vy += host.down ? 1.6 : 0.8; // ↓ in der Luft = schneller landen
      dino.y += dino.vy;
      if (dino.y >= GROUND - dino.h) { dino.y = GROUND - dino.h; dino.jumping = false; dino.vy = 0; }
    }
    if (--nextGap <= 0) spawn();
    const hb = hitbox();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed;
      if (o.type === 'bird') o.wing += 0.25;
      if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
      const m = 6;
      if (hb.x < o.x + o.w - m && hb.x + hb.w > o.x + m && hb.y < o.y + o.h - m && hb.y + hb.h > o.y + m) {
        parts.burst(dino.x + 30, dino.y + 30, '#2d5a2d', 20, 6);
        host.sound('hit');
        host.end(score);
        return;
      }
    }
    for (const c of clouds) { c.x -= speed * 0.25; if (c.x < -80) { c.x = W + 40; c.y = 40 + Math.random() * 90; } }
    groundOff = (groundOff + speed) % 40;
    parts.update(0.2);
    score++;
    if (score % 100 === 0) host.sound('point');
    if (score % 400 === 0) speed = Math.min(16, speed + 0.6);
    host.setScore(score);
  }, draw);

  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#87CEEB'); sky.addColorStop(0.7, '#B0E0E6'); sky.addColorStop(1, '#90EE90');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
    ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(700, 60, 38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.s * 0.5, 0, Math.PI * 2);
      ctx.arc(c.x + c.s * 0.4, c.y - 5, c.s * 0.4, 0, Math.PI * 2);
      ctx.arc(c.x + c.s * 0.8, c.y, c.s * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#6B8E6B';
    ctx.beginPath(); ctx.moveTo(0, GROUND);
    [[100, 250], [200, 320], [300, 220], [450, 300], [550, 230], [700, 280], [800, 200], [800, GROUND]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.fill();
    const gg = ctx.createLinearGradient(0, GROUND, 0, H);
    gg.addColorStop(0, '#8B7355'); gg.addColorStop(1, '#6B5344');
    ctx.fillStyle = gg; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#5a4a3a';
    for (let x = -groundOff; x < W; x += 40) ctx.fillRect(x, GROUND + 12, 14, 3);
    ctx.fillRect(0, GROUND, W, 3);

    for (const o of obstacles) (o.type === 'bird' ? drawBird : drawCactus)(o);
    drawDino();
    parts.draw(ctx);

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = 'bold 22px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(score).padStart(5, '0'), W - 20, 34);
  }

  function drawDino() {
    const ducking = dino.ducking;
    const h = ducking ? 40 : dino.h;
    const y = ducking ? GROUND - 40 : dino.y;
    const x = dino.x;
    ctx.fillStyle = '#2d5a2d';
    ctx.beginPath(); ctx.ellipse(x + 25 + (ducking ? 8 : 0), y + h - 25, ducking ? 32 : 25, ducking ? 16 : 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d7a3d';
    const hx = ducking ? x + 62 : x + 45, hy = ducking ? y + 12 : y + 15;
    ctx.beginPath(); ctx.ellipse(hx, hy, 18, 14, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx + 7, hy - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(hx + 9, hy - 5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d5a2d';
    const legOff = !dino.jumping ? Math.sin(dino.frame * 0.35) * 7 : 0;
    ctx.fillRect(x + 15, y + h - 10, 8, 12 + legOff);
    ctx.fillRect(x + 35, y + h - 10, 8, 12 - legOff);
    ctx.fillStyle = '#3d7a3d';
    ctx.beginPath();
    ctx.moveTo(x, y + h - 30);
    ctx.quadraticCurveTo(x - 25, y + h - 40, x - 20, y + h - 20);
    ctx.quadraticCurveTo(x - 10, y + h - 25, x + 5, y + h - 25);
    ctx.fill();
  }

  function drawCactus(o) {
    ctx.fillStyle = '#228B22';
    const mid = o.x + o.w / 2 - 8;
    ctx.fillRect(mid, o.y, 16, o.h);
    ctx.fillRect(o.x, o.y + o.h * 0.3, 10, o.h * 0.35);
    ctx.fillRect(o.x, o.y + o.h * 0.55, mid - o.x, 8);
    ctx.fillRect(o.x + o.w - 10, o.y + o.h * 0.2, 10, o.h * 0.35);
    ctx.fillRect(mid + 16, o.y + o.h * 0.45, o.x + o.w - mid - 16, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(mid + 3, o.y + 4, 3, o.h - 8);
  }

  function drawBird(o) {
    const wing = Math.sin(o.wing) * 14;
    ctx.fillStyle = '#8B4513';
    ctx.beginPath(); ctx.ellipse(o.x + 30, o.y + 15, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(o.x + 8, o.y + 11, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#CD853F';
    ctx.beginPath(); ctx.moveTo(o.x, o.y + 10); ctx.lineTo(o.x - 14, o.y + 13); ctx.lineTo(o.x, o.y + 15); ctx.fill();
    ctx.fillStyle = '#A0522D';
    ctx.beginPath(); ctx.moveTo(o.x + 20, o.y + 14); ctx.lineTo(o.x + 38, o.y - 6 + wing); ctx.lineTo(o.x + 44, o.y + 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x + 6, o.y + 9, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}
