// 🚀 Space Rocket – fliegen, schiessen, ausweichen. Asteroiden zerbrechen, UFOs schiessen zurück.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: '5 Leben, weniger Asteroiden' },
  { id: 'normal', label: 'Normal', desc: '3 Leben' },
  { id: 'hard', label: 'Schwer', desc: '1 Leben, viele Asteroiden, UFOs ab Start – Punkte ×2' },
];
const CFG = {
  easy: { lives: 5, rate: 0.7, ufoAt: 900, mult: 1 },
  normal: { lives: 3, rate: 1, ufoAt: 500, mult: 1 },
  hard: { lives: 1, rate: 1.4, ufoAt: 0, mult: 2 },
};

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const W = 800, H = 500;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([
    { code: 'ArrowLeft', label: '◀' }, { code: 'ArrowUp', label: '▲' }, { code: 'ArrowDown', label: '▼' },
    { code: 'ArrowRight', label: '▶' }, { code: 'Space', label: '● Feuer', wide: true },
  ]);
  host.requireStart('Pfeile/WASD fliegen · Leertaste schiessen · am Handy: Finger ziehen');

  const rocket = { x: 120, y: H / 2, vx: 0, vy: 0 };
  const asteroids = [], powerups = [], lasers = [], enemyShots = [], ufos = [];
  const layers = [0.4, 1, 2].map((v, i) => Array.from({ length: 50 - i * 12 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: v + Math.random() * 0.4, s: i * 0.7 + 0.6 })));
  const planets = [{ x: 600, y: 120, r: 50, c: '#6b4fd6', v: 0.15 }, { x: 200, y: 420, r: 26, c: '#d6704f', v: 0.25 }];
  const flames = makeParticles(), boom = makeParticles();
  let score = 0, tick = 0, lives = C.lives, invul = 0, shield = 0, rapid = 0, cooldown = 0;
  const SHIELD_TIME = 420;

  let target = null, autoFire = false;
  host.onPointer('pointerdown', (p) => { target = p; autoFire = true; });
  host.onPointer('pointermove', (p, e) => { if (e.buttons || e.pointerType === 'touch') target = p; });
  const release = () => { target = null; autoFire = false; };
  host.on(host.canvas, 'pointerup', release);
  host.on(host.canvas, 'pointercancel', release);

  function spawnAsteroid(x = W + 60, y = null, size = null) {
    size = size || 20 + Math.random() * 36;
    const pts = 8 + Math.floor(Math.random() * 5);
    const verts = Array.from({ length: pts }, (_, i) => {
      const a = (i / pts) * Math.PI * 2, r = size * (0.7 + Math.random() * 0.3);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    asteroids.push({ x, y: y ?? size + Math.random() * (H - size * 2), size, hp: Math.ceil(size / 20), vx: -(3.5 + Math.random() * 2.5 + score / 1500), vy: (Math.random() - 0.5) * 1.2, rot: 0, rs: (Math.random() - 0.5) * 0.08, verts });
  }
  function shoot() {
    if (cooldown > 0) return;
    cooldown = rapid > 0 ? 5 : 12;
    const ys = rapid > 0 ? [-8, 8] : [0];
    for (const dy of ys) lasers.push({ x: rocket.x + 24, y: rocket.y + dy, vx: 13 });
    host.sound('shoot');
  }
  function hurt() {
    if (invul > 0) return;
    if (shield > 0) { shield = 0; invul = 60; host.sound('hit'); host.shake(6); return; }
    lives--;
    boom.burst(rocket.x, rocket.y, '#ff6600', 28, 6);
    host.shake(12);
    host.sound('hit');
    if (lives <= 0) { host.end(score); return; }
    invul = 120;
  }
  function addScore(n, x, y, color = '#ffd700') {
    n *= C.mult;
    score += n;
    if (x != null) host.floatText(x, y, '+' + n, color, 18);
  }

  host.loop(() => {
    tick++;
    if (cooldown > 0) cooldown--;
    if (invul > 0) invul--;
    if (shield > 0) shield--;
    if (rapid > 0) rapid--;
    const acc = 0.6;
    if (host.up) rocket.vy -= acc;
    if (host.down) rocket.vy += acc;
    if (host.left) rocket.vx -= acc * 0.8;
    if (host.right) rocket.vx += acc * 0.8;
    if (target) {
      rocket.vx += Math.max(-1, Math.min(1, (target.x - rocket.x) / 50)) * acc;
      rocket.vy += Math.max(-1, Math.min(1, (target.y - rocket.y) / 50)) * acc;
    }
    if (host.isDown('Space', 'KeyF') || autoFire) shoot();
    rocket.vx *= 0.92; rocket.vy *= 0.92;
    rocket.x = Math.max(25, Math.min(W * 0.7, rocket.x + rocket.vx));
    rocket.y = Math.max(20, Math.min(H - 20, rocket.y + rocket.vy));
    if (tick % 2 === 0) flames.list.push({ x: rocket.x - 22, y: rocket.y + (Math.random() - 0.5) * 8, vx: -3 - Math.random() * 3, vy: (Math.random() - 0.5) * 1.5, life: 1, size: 3 + Math.random() * 3, color: Math.random() > 0.5 ? '#ff6600' : '#ffcc00' });
    flames.update(); boom.update();

    const rate = Math.min(0.08, (0.022 + score / 12000) * C.rate);
    if (Math.random() < rate) spawnAsteroid();
    if (score >= C.ufoAt && tick % Math.max(240, 600 - Math.floor(score / 20)) === 0) {
      ufos.push({ x: W + 40, y: 60 + Math.random() * (H - 120), hp: 3, t: Math.random() * 6, fire: 60 });
    }
    if (tick % 480 === 240) {
      const r = Math.random();
      powerups.push({ x: W + 20, y: 60 + Math.random() * (H - 120), r: 16, type: r < 0.4 ? 'shield' : r < 0.75 ? 'rapid' : 'life' });
    }

    for (let i = lasers.length - 1; i >= 0; i--) { lasers[i].x += lasers[i].vx; if (lasers[i].x > W + 20) lasers.splice(i, 1); }
    for (let i = enemyShots.length - 1; i >= 0; i--) {
      const s = enemyShots[i];
      s.x += s.vx; s.y += s.vy;
      if (s.x < -10 || s.y < -10 || s.y > H + 10) { enemyShots.splice(i, 1); continue; }
      if (Math.hypot(s.x - rocket.x, s.y - rocket.y) < 16) { enemyShots.splice(i, 1); hurt(); if (host.over) return; }
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.x -= 2.5;
      if (p.x < -30) { powerups.splice(i, 1); continue; }
      if (Math.hypot(rocket.x - p.x, rocket.y - p.y) < p.r + 26) {
        if (p.type === 'shield') { shield = SHIELD_TIME; host.floatText(p.x, p.y, 'Schild!', '#00d4ff', 18); }
        if (p.type === 'rapid') { rapid = 480; host.floatText(p.x, p.y, 'Doppel-Laser!', '#ff006e', 18); }
        if (p.type === 'life') { lives = Math.min(lives + 1, 6); host.floatText(p.x, p.y, '+1 Leben', '#00e68a', 18); }
        powerups.splice(i, 1);
        host.sound('coin');
      }
    }
    for (let i = ufos.length - 1; i >= 0; i--) {
      const u = ufos[i];
      u.t += 0.05;
      u.x -= u.x > W - 150 ? 2.5 : 0.6;
      u.y += Math.sin(u.t) * 2;
      if (--u.fire <= 0) {
        u.fire = 90;
        const a = Math.atan2(rocket.y - u.y, rocket.x - u.x);
        enemyShots.push({ x: u.x, y: u.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5 });
      }
      if (u.x < -40) { ufos.splice(i, 1); continue; }
      const li = lasers.findIndex((l) => Math.abs(l.x - u.x) < 26 && Math.abs(l.y - u.y) < 16);
      if (li >= 0) {
        lasers.splice(li, 1);
        if (--u.hp <= 0) { boom.burst(u.x, u.y, '#a855f7', 24, 6); addScore(150, u.x, u.y, '#a855f7'); host.sound('win'); host.shake(5); ufos.splice(i, 1); continue; }
        host.sound('click');
      }
      if (Math.hypot(u.x - rocket.x, u.y - rocket.y) < 34) { hurt(); if (host.over) return; }
    }
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x += a.vx; a.y += a.vy; a.rot += a.rs;
      if (a.y < a.size || a.y > H - a.size) a.vy = -a.vy;
      if (a.x < -a.size * 2) { asteroids.splice(i, 1); score += 5; continue; }
      const li = lasers.findIndex((l) => Math.hypot(l.x - a.x, l.y - a.y) < a.size);
      if (li >= 0) {
        lasers.splice(li, 1);
        if (--a.hp <= 0) {
          boom.burst(a.x, a.y, '#a89070', 12, 4);
          asteroids.splice(i, 1);
          addScore(a.size > 35 ? 20 : 40, a.x, a.y);
          if (a.size > 32) { spawnAsteroid(a.x, a.y - 10, a.size / 2); spawnAsteroid(a.x, a.y + 10, a.size / 2); }
          host.sound('pop');
        } else host.sound('click');
        continue;
      }
      if (Math.hypot(rocket.x - a.x, rocket.y - a.y) < a.size * 0.72 + 14) {
        if (shield > 0) {
          boom.burst(a.x, a.y, '#aaa', 12, 5);
          asteroids.splice(i, 1);
          addScore(25, a.x, a.y);
          host.sound('hit');
          continue;
        }
        asteroids.splice(i, 1);
        hurt();
        if (host.over) return;
      }
    }
    for (const layer of layers) for (const s of layer) { s.x -= s.v; if (s.x < 0) { s.x = W; s.y = Math.random() * H; } }
    for (const p of planets) { p.x -= p.v; if (p.x < -p.r) p.x = W + p.r; }
    if (tick % 6 === 0) score++;
    host.setScore(score);
  }, () => {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 520);
    g.addColorStop(0, '#1a1a3e'); g.addColorStop(0.5, '#0d0d2b'); g.addColorStop(1, '#050510');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const p of planets) {
      const pg = ctx.createRadialGradient(p.x - p.r * 0.4, p.y - p.r * 0.4, 2, p.x, p.y, p.r);
      pg.addColorStop(0, '#ffffff55'); pg.addColorStop(0.3, p.c); pg.addColorStop(1, '#00000088');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    layers.forEach((layer, i) => { ctx.fillStyle = `rgba(255,255,255,${0.35 + i * 0.25})`; for (const s of layer) ctx.fillRect(s.x, s.y, s.s, s.s); });
    flames.draw(ctx);
    for (const a of asteroids) {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
      const ag = ctx.createRadialGradient(-a.size * 0.3, -a.size * 0.3, 0, 0, 0, a.size);
      ag.addColorStop(0, '#9b8365'); ag.addColorStop(1, '#4a4a4a');
      ctx.fillStyle = ag;
      ctx.beginPath(); a.verts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(a.size * 0.2, a.size * 0.1, a.size * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const u of ufos) {
      ctx.save(); ctx.translate(u.x, u.y);
      ctx.fillStyle = '#9fe8ff88'; ctx.beginPath(); ctx.ellipse(0, -8, 12, 10, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.ellipse(0, 0, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd700';
      for (let k = -2; k <= 2; k++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(tick / 5 + k); ctx.beginPath(); ctx.arc(k * 10, 2, 2.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.restore();
    }
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff2a6d'; ctx.shadowColor = '#ff2a6d';
    for (const s of enemyShots) { ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#7df9ff'; ctx.shadowColor = '#00d4ff';
    for (const l of lasers) ctx.fillRect(l.x - 12, l.y - 2, 24, 4);
    ctx.shadowBlur = 0;
    for (const p of powerups) {
      ctx.save(); ctx.translate(p.x, p.y);
      const col = p.type === 'shield' ? '#00d4ff' : p.type === 'rapid' ? '#ff006e' : '#00e68a';
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.fillStyle = col + '33';
      ctx.beginPath(); ctx.arc(0, 0, p.r + Math.sin(tick / 8) * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '17px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.type === 'shield' ? '🛡️' : p.type === 'rapid' ? '⚡' : '❤️', 0, 1);
      ctx.restore();
    }
    // Rakete
    if (!(invul > 0 && Math.floor(invul / 6) % 2)) {
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
      if (shield > 0 && !(shield < 90 && Math.floor(shield / 8) % 2 === 0)) {
        ctx.strokeStyle = 'rgba(0,212,255,0.9)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0,212,255,0.12)'; ctx.fill();
      }
      ctx.restore();
    }
    boom.draw(ctx);
    // HUD
    ctx.textAlign = 'left'; ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = '#ff4d6d'; ctx.fillText('❤'.repeat(Math.max(0, lives)), 12, 26);
    let y = 48;
    const bar = (label, val, max, col) => {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(10, y - 14, 150, 20);
      ctx.fillStyle = col; ctx.fillRect(10, y + 4, 150 * (val / max), 3);
      ctx.font = 'bold 13px system-ui'; ctx.fillText(`${label} ${Math.ceil(val / 60)}s`, 16, y);
      y += 28;
    };
    if (shield > 0) bar('🛡️ Schild', shield, SHIELD_TIME, '#00d4ff');
    if (rapid > 0) bar('⚡ Doppel-Laser', rapid, 480, '#ff006e');
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px ui-monospace, monospace';
    ctx.fillText(score, W - 14, 28);
  });
}
