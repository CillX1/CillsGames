// ☄️ Asteroids – 3 Leben, kurze Unverwundbarkeit nach dem Respawn.
import { makeParticles } from './host.js';

export function start(host) {
  const W = 800, H = 600;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([
    { code: 'ArrowLeft', label: '⟲' }, { code: 'ArrowUp', label: '▲ Gas' },
    { code: 'ArrowRight', label: '⟳' }, { code: 'Space', label: '● Feuer', wide: true },
  ]);
  const ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, r: 13 };
  let rocks = [], bullets = [], score = 0, lives = 3, invul = 120, wave = 0, cooldown = 0;
  const parts = makeParticles();
  const starfield = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H, Math.random() * 1.5 + 0.3]);

  function rock(x, y, size) {
    const a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 1.5) * (60 / size) ** 0.4 + wave * 0.1;
    const n = 10 + Math.floor(Math.random() * 4);
    const verts = Array.from({ length: n }, (_, i) => [(i / n) * Math.PI * 2, size * (0.72 + Math.random() * 0.28)]);
    rocks.push({ x, y, size, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0, rs: (Math.random() - 0.5) * 0.04, verts });
  }
  function newWave() {
    wave++;
    for (let i = 0; i < 3 + wave; i++) {
      let x, y;
      do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - ship.x, y - ship.y) < 180);
      rock(x, y, 46 + Math.random() * 14);
    }
  }
  newWave();

  function shoot() {
    if (cooldown > 0 || bullets.length >= 6) return;
    cooldown = 10;
    bullets.push({ x: ship.x + Math.cos(ship.a) * 18, y: ship.y + Math.sin(ship.a) * 18, vx: Math.cos(ship.a) * 9 + ship.vx, vy: Math.sin(ship.a) * 9 + ship.vy, life: 55 });
    host.sound('shoot');
  }
  host.onKey((e, first) => { if (first && (e.code === 'Space' || e.code === 'KeyF')) shoot(); });

  const wrap = (o) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };

  host.loop(() => {
    if (cooldown > 0) cooldown--;
    if (invul > 0) invul--;
    if (host.left) ship.a -= 0.075;
    if (host.right) ship.a += 0.075;
    const thrust = host.up;
    if (thrust) {
      ship.vx += Math.cos(ship.a) * 0.14; ship.vy += Math.sin(ship.a) * 0.14;
      if (Math.random() < 0.6) parts.list.push({ x: ship.x - Math.cos(ship.a) * 14, y: ship.y - Math.sin(ship.a) * 14, vx: -Math.cos(ship.a) * 2 + (Math.random() - 0.5), vy: -Math.sin(ship.a) * 2 + (Math.random() - 0.5), life: 0.6, size: 2, color: '#ff8800' });
    }
    const sp = Math.hypot(ship.vx, ship.vy);
    if (sp > 6) { ship.vx = (ship.vx / sp) * 6; ship.vy = (ship.vy / sp) * 6; }
    ship.vx *= 0.992; ship.vy *= 0.992;
    ship.x += ship.vx; ship.y += ship.vy; wrap(ship);

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy; wrap(b);
      if (--b.life <= 0) bullets.splice(i, 1);
    }
    for (const r of rocks) { r.x += r.vx; r.y += r.vy; r.rot += r.rs; if (r.x < -r.size) r.x += W + 2 * r.size; if (r.x > W + r.size) r.x -= W + 2 * r.size; if (r.y < -r.size) r.y += H + 2 * r.size; if (r.y > H + r.size) r.y -= H + 2 * r.size; }

    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i];
      const bi = bullets.findIndex((b) => Math.hypot(b.x - r.x, b.y - r.y) < r.size * 0.9);
      if (bi >= 0) {
        bullets.splice(bi, 1);
        rocks.splice(i, 1);
        parts.burst(r.x, r.y, '#aaa', 10, 4);
        score += r.size > 35 ? 20 : r.size > 18 ? 50 : 100;
        if (r.size > 18) { rock(r.x, r.y, r.size / 2); rock(r.x, r.y, r.size / 2); }
        host.sound('pop');
        host.setScore(score);
        continue;
      }
      if (invul === 0 && Math.hypot(ship.x - r.x, ship.y - r.y) < r.size * 0.8 + ship.r) {
        parts.burst(ship.x, ship.y, '#00d4ff', 30, 6);
        host.sound('hit');
        lives--;
        if (lives <= 0) { host.end(score); return; }
        ship.x = W / 2; ship.y = H / 2; ship.vx = ship.vy = 0; ship.a = -Math.PI / 2; invul = 150;
        break;
      }
    }
    if (!rocks.length) { score += 200 * wave; host.setScore(score); host.sound('win'); newWave(); invul = Math.max(invul, 90); }
    parts.update();
  }, () => {
    ctx.fillStyle = '#07071a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [x, y, s] of starfield) ctx.fillRect(x, y, s, s);
    parts.draw(ctx);
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 2;
    for (const r of rocks) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.beginPath(); r.verts.forEach(([a, d], i) => (i ? ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d) : ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d))); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#fff';
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    if (!(invul > 0 && Math.floor(invul / 6) % 2)) {
      ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
      ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-13, -11); ctx.lineTo(-8, 0); ctx.lineTo(-13, 11); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('🚀'.repeat(lives), 12, 26);
    ctx.textAlign = 'right'; ctx.fillText(`Welle ${wave}`, W - 12, 26);
  });
}
