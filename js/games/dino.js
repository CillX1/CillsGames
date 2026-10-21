// 🦖 Dino Runner – Doppelsprung, Münzen, Tag/Nacht, drei Schwierigkeiten.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: 'Langsamer Start, mehr Platz zwischen Hindernissen' },
  { id: 'normal', label: 'Normal', desc: 'Das klassische Tempo' },
  { id: 'hard', label: 'Schwer', desc: 'Schnell, Flugsaurier von Anfang an – doppelte Münzen' },
];
const CFG = {
  easy: { speed: 5, max: 12, gap: 1.35, birdsAt: 600, coin: 1 },
  normal: { speed: 6, max: 15, gap: 1, birdsAt: 300, coin: 1 },
  hard: { speed: 8, max: 18, gap: 0.85, birdsAt: 0, coin: 2 },
};

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const W = 800, H = 400, GROUND = 350;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([{ code: 'ArrowDown', label: '⬇ Ducken', wide: true }, { code: 'Space', label: '⬆ Springen', wide: true }]);
  host.requireStart('Leertaste / Tippen = springen · zweimal = Doppelsprung');

  const dino = { x: 80, y: GROUND - 70, w: 60, h: 70, vy: 0, jumps: 0, ducking: false, frame: 0 };
  const obstacles = [], coins = [];
  const clouds = Array.from({ length: 5 }, () => ({ x: Math.random() * W, y: 40 + Math.random() * 90, s: 30 + Math.random() * 30 }));
  const stars = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * 220, s: Math.random() * 1.6 + 0.4 }));
  const parts = makeParticles();
  let lastMilestone = 0;
  let speed = C.speed, nextGap = 70, nextCoin = 120, groundOff = 0, dist = 0, bonus = 0, wasAir = false;

  const score = () => Math.floor(dist) + bonus;

  function jump() {
    if (host.over) return;
    if (dino.jumps >= 2) return;
    dino.vy = dino.jumps === 0 ? -15 : -12;
    dino.jumps++;
    dino.ducking = false;
    if (dino.jumps === 2) parts.burst(dino.x + 30, dino.y + dino.h, '#ffffffaa', 8, 3);
    host.sound('jump');
  }
  host.onKey((e, first) => { if (first && ['Space', 'ArrowUp', 'KeyW'].includes(e.code)) jump(); });
  host.onPointer('pointerdown', () => jump());

  function spawn() {
    const type = score() >= C.birdsAt && Math.random() < 0.3 ? 'bird' : Math.random() < 0.5 ? 'small' : Math.random() < 0.75 ? 'large' : 'double';
    if (type === 'bird') {
      const low = Math.random() < 0.5;
      obstacles.push({ type, x: W + 20, y: low ? GROUND - 45 : GROUND - 95, w: 70, h: 30, wing: 0 });
    } else if (type === 'double') {
      obstacles.push({ type: 'small', x: W + 20, y: GROUND - 50, w: 35, h: 50 });
      obstacles.push({ type: 'small', x: W + 58, y: GROUND - 50, w: 35, h: 50 });
    } else {
      const h = type === 'small' ? 50 : 70;
      obstacles.push({ type, x: W + 20, y: GROUND - h, w: type === 'small' ? 35 : 55, h });
    }
    nextGap = Math.floor(((380 + Math.random() * 300) / speed + 18) * C.gap);
  }
  function spawnCoins() {
    const n = 3 + Math.floor(Math.random() * 3);
    const high = Math.random() < 0.5;
    for (let i = 0; i < n; i++) {
      const arc = high ? Math.sin((i / (n - 1)) * Math.PI) * 60 : 0;
      coins.push({ x: W + 30 + i * 34, y: GROUND - 40 - (high ? 50 : 0) - arc, t: Math.random() * 6 });
    }
    nextCoin = 200 + Math.floor(Math.random() * 260);
  }

  function hitbox() {
    if (dino.ducking && dino.jumps === 0) return { x: dino.x + 6, y: GROUND - 36, w: dino.w + 10, h: 34 };
    return { x: dino.x + 12, y: dino.y + 6, w: dino.w - 24, h: dino.h - 10 };
  }

  host.loop(() => {
    dino.frame++;
    dino.ducking = host.down && dino.jumps === 0;
    if (dino.jumps > 0) {
      dino.vy += host.down ? 1.6 : 0.8;
      dino.y += dino.vy;
      if (dino.y >= GROUND - dino.h) {
        dino.y = GROUND - dino.h; dino.jumps = 0; dino.vy = 0;
        if (wasAir) parts.burst(dino.x + 30, GROUND, '#b8a07a', 6, 2.5);
      }
    }
    wasAir = dino.jumps > 0;
    if (--nextGap <= 0) spawn();
    if (--nextCoin <= 0) spawnCoins();
    const hb = hitbox();
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed;
      if (o.type === 'bird') o.wing += 0.25;
      if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
      const m = 6;
      if (hb.x < o.x + o.w - m && hb.x + hb.w > o.x + m && hb.y < o.y + o.h - m && hb.y + hb.h > o.y + m) {
        parts.burst(dino.x + 30, dino.y + 30, '#2d5a2d', 24, 6);
        host.shake(10);
        host.sound('hit');
        host.end(score());
        return;
      }
    }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.x -= speed; c.t += 0.15;
      if (c.x < -20) { coins.splice(i, 1); continue; }
      if (c.x > hb.x - 12 && c.x < hb.x + hb.w + 12 && c.y > hb.y - 12 && c.y < hb.y + hb.h + 12) {
        coins.splice(i, 1);
        const v = 25 * C.coin;
        bonus += v;
        host.floatText(c.x, c.y - 10, '+' + v, '#ffd700', 18);
        parts.burst(c.x, c.y, '#ffd700', 6, 3);
        host.sound('coin');
      }
    }
    for (const c of clouds) { c.x -= speed * 0.25; if (c.x < -80) { c.x = W + 40; c.y = 40 + Math.random() * 90; } }
    groundOff = (groundOff + speed) % 40;
    parts.update(0.2);
    dist += speed / 6;
    const s = score();
    const milestone = Math.floor(dist / 500);
    if (milestone > lastMilestone) {
      lastMilestone = milestone;
      host.sound('point');
      host.floatText(W - 70, 64, `${milestone * 500}!`, '#fff', 20);
    }
    speed = Math.min(C.max, C.speed + dist / 900);
    host.setScore(s);
  }, draw);

  // 0 = Tag, 1 = Nacht (wechselt alle 1200 Distanz, sanft überblendet)
  function nightAmount() {
    const phase = (dist % 2400) / 2400;
    if (phase < 0.42) return 0;
    if (phase < 0.5) return (phase - 0.42) / 0.08;
    if (phase < 0.92) return 1;
    return 1 - (phase - 0.92) / 0.08;
  }
  const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

  function draw() {
    const n = nightAmount();
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, mix([135, 206, 235], [12, 16, 48], n));
    sky.addColorStop(0.7, mix([176, 224, 230], [30, 40, 90], n));
    sky.addColorStop(1, mix([144, 238, 144], [40, 70, 70], n));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, GROUND);
    if (n > 0) {
      ctx.fillStyle = `rgba(255,255,255,${n * 0.8})`;
      for (const s of stars) ctx.fillRect(s.x, s.y, s.s, s.s);
      ctx.fillStyle = `rgba(245,245,220,${n})`;
      ctx.beginPath(); ctx.arc(700, 70, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mix([135, 206, 235], [12, 16, 48], n);
      ctx.beginPath(); ctx.arc(714, 62, 26, 0, Math.PI * 2); ctx.fill();
    }
    if (n < 1) {
      ctx.globalAlpha = 1 - n;
      ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(700, 60, 38, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = `rgba(255,255,255,${0.95 - n * 0.6})`;
    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.s * 0.5, 0, Math.PI * 2);
      ctx.arc(c.x + c.s * 0.4, c.y - 5, c.s * 0.4, 0, Math.PI * 2);
      ctx.arc(c.x + c.s * 0.8, c.y, c.s * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = mix([107, 142, 107], [40, 55, 60], n);
    ctx.beginPath(); ctx.moveTo(0, GROUND);
    [[100, 250], [200, 320], [300, 220], [450, 300], [550, 230], [700, 280], [800, 200], [800, GROUND]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.fill();
    const gg = ctx.createLinearGradient(0, GROUND, 0, H);
    gg.addColorStop(0, mix([139, 115, 85], [70, 60, 50], n)); gg.addColorStop(1, mix([107, 83, 68], [50, 40, 35], n));
    ctx.fillStyle = gg; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = -groundOff; x < W; x += 40) ctx.fillRect(x, GROUND + 12, 14, 3);
    ctx.fillRect(0, GROUND, W, 3);

    for (const c of coins) {
      const sx = Math.abs(Math.cos(c.t)) * 9 + 2;
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.ellipse(c.x, c.y, sx, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const o of obstacles) (o.type === 'bird' ? drawBird : drawCactus)(o);
    drawDino();
    parts.draw(ctx);

    ctx.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
    ctx.font = 'bold 22px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(score()).padStart(5, '0'), W - 20, 34);
  }

  function drawDino() {
    const ducking = dino.ducking;
    const h = ducking ? 40 : dino.h;
    const y = ducking ? GROUND - 40 : dino.y;
    const x = dino.x;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x + 30, GROUND + 3, 26 * (1 - Math.min(0.6, (GROUND - (y + h)) / 200)), 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d5a2d';
    ctx.beginPath(); ctx.ellipse(x + 25 + (ducking ? 8 : 0), y + h - 25, ducking ? 32 : 25, ducking ? 16 : 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d7a3d';
    const hx = ducking ? x + 62 : x + 45, hy = ducking ? y + 12 : y + 15;
    ctx.beginPath(); ctx.ellipse(hx, hy, 18, 14, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx + 7, hy - 5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(hx + 9, hy - 5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d5a2d';
    const legOff = dino.jumps === 0 ? Math.sin(dino.frame * 0.35) * 7 : 0;
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
