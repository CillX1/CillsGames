// ☄️ Asteroids – Wellen, UFOs, Hyperraum, Powerups.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: '5 Leben, weniger Brocken' },
  { id: 'normal', label: 'Normal', desc: '3 Leben' },
  { id: 'hard', label: 'Schwer', desc: '2 Leben, schnelle Brocken, UFOs ab Welle 1 – Punkte ×1.5' },
];
const CFG = {
  easy: { lives: 5, rocks: 2, speed: 0.8, ufoWave: 3, mult: 1 },
  normal: { lives: 3, rocks: 3, speed: 1, ufoWave: 2, mult: 1 },
  hard: { lives: 2, rocks: 4, speed: 1.3, ufoWave: 1, mult: 1.5 },
};

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const W = 800, H = 600;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([
    { code: 'ArrowLeft', label: '⟲' }, { code: 'ArrowUp', label: '▲ Gas' }, { code: 'ArrowRight', label: '⟳' },
    { code: 'Space', label: '● Feuer', wide: true }, { code: 'ShiftLeft', label: '✦ Sprung' },
  ]);
  host.requireStart('↑ Gas · ←→ drehen · Leertaste schiessen · Shift = Hyperraum');
  const ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, r: 13 };
  let rocks = [], bullets = [], ufoShots = [], ufo = null, items = [];
  let score = 0, lives = C.lives, invul = 120, wave = 0, cooldown = 0, triple = 0, shield = 0, hyperCd = 0, tick = 0;
  const parts = makeParticles();
  const starfield = Array.from({ length: 90 }, () => [Math.random() * W, Math.random() * H, Math.random() * 1.5 + 0.3]);

  function rock(x, y, size) {
    const a = Math.random() * Math.PI * 2, sp = ((1 + Math.random() * 1.5) * (60 / size) ** 0.4 + wave * 0.1) * C.speed;
    const n = 10 + Math.floor(Math.random() * 4);
    const verts = Array.from({ length: n }, (_, i) => [(i / n) * Math.PI * 2, size * (0.72 + Math.random() * 0.28)]);
    rocks.push({ x, y, size, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: 0, rs: (Math.random() - 0.5) * 0.04, verts });
  }
  function newWave() {
    wave++;
    for (let i = 0; i < C.rocks + wave; i++) {
      let x, y;
      do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - ship.x, y - ship.y) < 180);
      rock(x, y, 46 + Math.random() * 14);
    }
    if (wave > 1) host.floatText(W / 2, H / 2 - 40, `Welle ${wave}`, '#00d4ff', 30);
  }
  newWave();

  const points = (n, x, y, col = '#fff') => { n = Math.round(n * C.mult); score += n; host.floatText(x, y, '+' + n, col, 15); host.setScore(score); };

  function shoot() {
    if (cooldown > 0 || bullets.length >= (triple > 0 ? 15 : 6)) return;
    cooldown = triple > 0 ? 8 : 10;
    const spread = triple > 0 ? [-0.18, 0, 0.18] : [0];
    for (const d of spread) {
      const a = ship.a + d;
      bullets.push({ x: ship.x + Math.cos(a) * 18, y: ship.y + Math.sin(a) * 18, vx: Math.cos(a) * 9 + ship.vx, vy: Math.sin(a) * 9 + ship.vy, life: 55 });
    }
    host.sound('shoot');
  }
  function hyperspace() {
    if (hyperCd > 0) return;
    hyperCd = 240;
    parts.burst(ship.x, ship.y, '#a855f7', 16, 4);
    ship.x = 40 + Math.random() * (W - 80); ship.y = 40 + Math.random() * (H - 80); ship.vx = ship.vy = 0;
    parts.burst(ship.x, ship.y, '#a855f7', 16, 4);
    invul = Math.max(invul, 40);
    host.sound('jump');
  }
  host.onKey((e, first) => {
    if (first && (e.code === 'Space' || e.code === 'KeyF')) shoot();
    if (first && (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyH')) hyperspace();
  });

  function hitShip() {
    if (invul > 0) return false;
    if (shield > 0) { shield = 0; invul = 60; host.shake(5); host.sound('hit'); return false; }
    parts.burst(ship.x, ship.y, '#00d4ff', 34, 6);
    host.shake(12);
    host.sound('hit');
    lives--;
    if (lives <= 0) { host.end(score); return true; }
    ship.x = W / 2; ship.y = H / 2; ship.vx = ship.vy = 0; ship.a = -Math.PI / 2; invul = 150;
    return false;
  }
  const wrap = (o) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };

  host.loop(() => {
    tick++;
    if (cooldown > 0) cooldown--;
    if (invul > 0) invul--;
    if (triple > 0) triple--;
    if (shield > 0) shield--;
    if (hyperCd > 0) hyperCd--;
    if (host.left) ship.a -= 0.075;
    if (host.right) ship.a += 0.075;
    if (host.isDown('Space') && triple > 0) shoot();
    if (host.up) {
      ship.vx += Math.cos(ship.a) * 0.14; ship.vy += Math.sin(ship.a) * 0.14;
      if (Math.random() < 0.7) parts.list.push({ x: ship.x - Math.cos(ship.a) * 14, y: ship.y - Math.sin(ship.a) * 14, vx: -Math.cos(ship.a) * 2.5 + (Math.random() - 0.5), vy: -Math.sin(ship.a) * 2.5 + (Math.random() - 0.5), life: 0.6, size: 2.5, color: Math.random() < 0.5 ? '#ff8800' : '#ffd700' });
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

    // UFO
    if (!ufo && wave >= C.ufoWave && tick % 900 === 450) {
      const left = Math.random() < 0.5;
      ufo = { x: left ? -30 : W + 30, y: 60 + Math.random() * (H - 120), vx: left ? 1.8 : -1.8, hp: 2, fire: 80, t: 0 };
    }
    if (ufo) {
      ufo.t += 0.04; ufo.x += ufo.vx; ufo.y += Math.sin(ufo.t) * 1.5;
      if (--ufo.fire <= 0) {
        ufo.fire = 70;
        const a = Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + (Math.random() - 0.5) * 0.5;
        ufoShots.push({ x: ufo.x, y: ufo.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, life: 120 });
      }
      const bi = bullets.findIndex((b) => Math.abs(b.x - ufo.x) < 24 && Math.abs(b.y - ufo.y) < 12);
      if (bi >= 0) {
        bullets.splice(bi, 1);
        if (--ufo.hp <= 0) { parts.burst(ufo.x, ufo.y, '#a855f7', 30, 6); points(300, ufo.x, ufo.y, '#a855f7'); host.sound('win'); host.shake(6); ufo = null; }
      }
      if (ufo && (ufo.x < -60 || ufo.x > W + 60)) ufo = null;
      if (ufo && invul === 0 && Math.hypot(ufo.x - ship.x, ufo.y - ship.y) < 30 && hitShip()) return;
    }
    for (let i = ufoShots.length - 1; i >= 0; i--) {
      const s = ufoShots[i];
      s.x += s.vx; s.y += s.vy; wrap(s);
      if (--s.life <= 0) { ufoShots.splice(i, 1); continue; }
      if (Math.hypot(s.x - ship.x, s.y - ship.y) < ship.r) { ufoShots.splice(i, 1); if (hitShip()) return; }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (--it.life <= 0) { items.splice(i, 1); continue; }
      if (Math.hypot(it.x - ship.x, it.y - ship.y) < 26) {
        if (it.type === 'triple') { triple = 600; host.floatText(it.x, it.y, 'Dreifach-Schuss!', '#ff006e', 16); }
        else { shield = 600; host.floatText(it.x, it.y, 'Schild!', '#00d4ff', 16); }
        host.sound('coin');
        items.splice(i, 1);
      }
    }

    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i];
      const bi = bullets.findIndex((b) => Math.hypot(b.x - r.x, b.y - r.y) < r.size * 0.9);
      if (bi >= 0) {
        bullets.splice(bi, 1);
        rocks.splice(i, 1);
        parts.burst(r.x, r.y, '#bbb', r.size > 35 ? 16 : 8, 4);
        points(r.size > 35 ? 20 : r.size > 18 ? 50 : 100, r.x, r.y);
        if (r.size > 18) { rock(r.x, r.y, r.size / 2); rock(r.x, r.y, r.size / 2); }
        else if (Math.random() < 0.08) items.push({ x: r.x, y: r.y, type: Math.random() < 0.5 ? 'triple' : 'shield', life: 480 });
        if (r.size > 35) host.shake(2);
        host.sound('pop');
        continue;
      }
      if (invul === 0 && Math.hypot(ship.x - r.x, ship.y - r.y) < r.size * 0.8 + ship.r) {
        if (shield > 0) { rocks.splice(i, 1); parts.burst(r.x, r.y, '#00d4ff', 12, 4); if (r.size > 18) { rock(r.x, r.y, r.size / 2); rock(r.x, r.y, r.size / 2); } shield = 0; invul = 60; host.sound('hit'); continue; }
        if (hitShip()) return;
        break;
      }
    }
    if (!rocks.length) { points(200 * wave, W / 2, H / 2); host.sound('win'); newWave(); invul = Math.max(invul, 90); }
    parts.update();
  }, () => {
    ctx.fillStyle = '#07071a'; ctx.fillRect(0, 0, W, H);
    for (const [x, y, s] of starfield) { ctx.fillStyle = `rgba(255,255,255,${0.3 + s / 3})`; ctx.fillRect(x, y, s, s); }
    parts.draw(ctx);
    ctx.lineWidth = 2;
    for (const r of rocks) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.beginPath(); r.verts.forEach(([a, d], i) => (i ? ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d) : ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d))); ctx.closePath();
      ctx.fillStyle = 'rgba(160,150,140,0.12)'; ctx.fill();
      ctx.strokeStyle = '#c8c8c8'; ctx.stroke();
      ctx.restore();
    }
    for (const it of items) {
      if (it.life < 120 && Math.floor(it.life / 8) % 2) continue;
      ctx.strokeStyle = it.type === 'triple' ? '#ff006e' : '#00d4ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(it.x, it.y, 13 + Math.sin(tick / 6) * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.type === 'triple' ? '⚡' : '🛡️', it.x, it.y + 1); ctx.textBaseline = 'alphabetic';
    }
    if (ufo) {
      ctx.save(); ctx.translate(ufo.x, ufo.y); ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-24, 2); ctx.lineTo(24, 2); ctx.lineTo(14, 10); ctx.lineTo(-14, 10); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(14, 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -6, 6, Math.PI, 0); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = '#ff4d8d';
    for (const s of ufoShots) { ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = triple > 0 ? '#ff7ab8' : '#fff';
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    if (!(invul > 0 && Math.floor(invul / 6) % 2)) {
      ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
      ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(0,212,255,0.12)';
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-13, -11); ctx.lineTo(-8, 0); ctx.lineTo(-13, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (host.up && !host.over) { ctx.strokeStyle = '#ff8800'; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(-18 - Math.random() * 8, 0); ctx.lineTo(-9, 5); ctx.stroke(); }
      if (shield > 0) { ctx.strokeStyle = 'rgba(0,212,255,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('🚀'.repeat(Math.max(0, lives)), 12, 26);
    ctx.fillStyle = hyperCd > 0 ? 'rgba(255,255,255,0.35)' : '#c084fc';
    ctx.font = 'bold 12px system-ui'; ctx.fillText(hyperCd > 0 ? `Hyperraum ${Math.ceil(hyperCd / 60)}s` : 'Hyperraum bereit (Shift)', 12, 46);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'right'; ctx.fillText(`Welle ${wave}`, W - 12, 26);
    ctx.font = 'bold 20px ui-monospace, monospace'; ctx.fillText(score, W - 12, 50);
  });
}
