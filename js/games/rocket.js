// 🚀 Space Rocket
import { makeParticles } from './host.js';

export function start(host) {
  const W = 800, H = 500;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([
    { code: 'ArrowLeft', label: '◀' }, { code: 'ArrowUp', label: '▲' },
    { code: 'ArrowDown', label: '▼' }, { code: 'ArrowRight', label: '▶' },
  ]);

  const rocket = { x: 100, y: H / 2, vx: 0, vy: 0 };
  const asteroids = [], powerups = [];
  const stars = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.4, v: Math.random() * 2 + 0.8 }));
  const flames = makeParticles();
  const boom = makeParticles();
  let score = 0, shield = 0, tick = 0;
  const SHIELD_TIME = 420;

  // Finger/Maus: Rakete folgt dem Zeiger
  let target = null;
  host.onPointer('pointerdown', (p) => { target = p; });
  host.onPointer('pointermove', (p, e) => { if (e.buttons || e.pointerType === 'touch') target = p; });
  host.on(host.canvas, 'pointerup', () => { target = null; });

  function spawnAsteroid() {
    const size = 18 + Math.random() * 38;
    const pts = 8 + Math.floor(Math.random() * 5);
    const verts = Array.from({ length: pts }, (_, i) => {
      const a = (i / pts) * Math.PI * 2, r = size * (0.7 + Math.random() * 0.3);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    asteroids.push({ x: W + size, y: size + Math.random() * (H - size * 2), size, speed: 4 + Math.random() * 3 + score / 600, rot: 0, rs: (Math.random() - 0.5) * 0.08, verts });
  }

  host.loop(() => {
    tick++;
    const acc = 0.55;
    if (host.up) rocket.vy -= acc;
    if (host.down) rocket.vy += acc;
    if (host.left) rocket.vx -= acc * 0.7;
    if (host.right) rocket.vx += acc * 0.7;
    if (target) {
      rocket.vx += Math.max(-1, Math.min(1, (target.x - rocket.x) / 60)) * acc;
      rocket.vy += Math.max(-1, Math.min(1, (target.y - rocket.y) / 60)) * acc;
    }
    rocket.vx *= 0.93; rocket.vy *= 0.93;
    rocket.x = Math.max(25, Math.min(W - 30, rocket.x + rocket.vx));
    rocket.y = Math.max(20, Math.min(H - 20, rocket.y + rocket.vy));
    if (tick % 2 === 0) flames.list.push({ x: rocket.x - 22, y: rocket.y + (Math.random() - 0.5) * 8, vx: -3 - Math.random() * 3, vy: (Math.random() - 0.5) * 1.5, life: 1, size: 3 + Math.random() * 3, color: Math.random() > 0.5 ? '#ff6600' : '#ffcc00' });
    flames.update(); boom.update();

    const rate = Math.min(0.09, 0.03 + score / 6000);
    if (Math.random() < rate) spawnAsteroid();
    if (tick % 600 === 300 && Math.random() < 0.7) powerups.push({ x: W + 20, y: 60 + Math.random() * (H - 120), r: 16 });

    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.x -= 2.5;
      if (p.x < -30) { powerups.splice(i, 1); continue; }
      if (Math.hypot(rocket.x - p.x, rocket.y - p.y) < p.r + 26) {
        shield = SHIELD_TIME;
        powerups.splice(i, 1);
        host.sound('coin');
      }
    }
    if (shield > 0) shield--;

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x -= a.speed;
      a.rot += a.rs;
      if (a.x < -a.size * 2) { asteroids.splice(i, 1); score += 10; continue; }
      if (Math.hypot(rocket.x - a.x, rocket.y - a.y) < a.size * 0.72 + 14) {
        if (shield > 0) {
          boom.burst(a.x, a.y, '#aaa', 12, 5);
          asteroids.splice(i, 1);
          score += 25;
          host.sound('hit');
          continue;
        }
        boom.burst(rocket.x, rocket.y, '#ff6600', 30, 7);
        host.sound('hit');
        host.end(score);
        return;
      }
    }
    for (const s of stars) { s.x -= s.v; if (s.x < 0) { s.x = W; s.y = Math.random() * H; } }
    score++;
    host.setScore(score);
  }, () => {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 520);
    g.addColorStop(0, '#1a1a3e'); g.addColorStop(0.5, '#0d0d2b'); g.addColorStop(1, '#050510');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${0.4 + s.s / 4})`; ctx.fillRect(s.x, s.y, s.s, s.s); }
    flames.draw(ctx);
    for (const a of asteroids) {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
      const ag = ctx.createRadialGradient(-a.size * 0.3, -a.size * 0.3, 0, 0, 0, a.size);
      ag.addColorStop(0, '#9b8365'); ag.addColorStop(1, '#4a4a4a');
      ctx.fillStyle = ag;
      ctx.beginPath(); a.verts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (const p of powerups) {
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.strokeStyle = `hsl(${(tick * 3) % 360},100%,60%)`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '18px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🛡️', 0, 1);
      ctx.restore();
    }
    // Rakete
    ctx.save(); ctx.translate(rocket.x, rocket.y); ctx.rotate(Math.max(-0.3, Math.min(0.3, rocket.vy * 0.04)));
    const rg = ctx.createLinearGradient(0, -15, 0, 15);
    rg.addColorStop(0, '#e0e0e0'); rg.addColorStop(0.5, '#fff'); rg.addColorStop(1, '#b0b0b0');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-14, -14); ctx.lineTo(-20, -14); ctx.lineTo(-20, 14); ctx.lineTo(-14, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(11, -8); ctx.lineTo(11, 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(-26, -25); ctx.lineTo(-20, -14); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(-26, 25); ctx.lineTo(-20, 14); ctx.fill();
    ctx.fillStyle = '#00d4ff'; ctx.beginPath(); ctx.arc(2, 0, 6, 0, Math.PI * 2); ctx.fill();
    if (shield > 0) {
      const blink = shield < 90 && Math.floor(shield / 8) % 2 === 0;
      if (!blink) {
        ctx.strokeStyle = 'rgba(0,212,255,0.9)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0,212,255,0.12)'; ctx.fill();
      }
    }
    ctx.restore();
    boom.draw(ctx);
    if (shield > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(10, 10, 170, 34);
      ctx.fillStyle = '#00d4ff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`🛡️ Schild: ${Math.ceil(shield / 60)}s`, 18, 28);
      ctx.fillRect(10, 40, 170 * (shield / SHIELD_TIME), 4);
    }
  });
}
