// 🚗 Car Racing – Verkehr, Lastwagen, Ölflecken, Münzen, Knapp-vorbei-Kombo, Nachtfahrt.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: 'Wenig Verkehr, 2 Schilde zum Start' },
  { id: 'normal', label: 'Normal', desc: 'Normaler Verkehr' },
  { id: 'hard', label: 'Schwer', desc: 'Dichter Verkehr, Ölflecken, schneller – Punkte ×1.5' },
];
const CFG = {
  easy: { traffic: 0.7, speed: 3.5, max: 10, oil: 0, shields: 2, mult: 1 },
  normal: { traffic: 1, speed: 4, max: 12, oil: 0.25, shields: 0, mult: 1 },
  hard: { traffic: 1.35, speed: 5, max: 14, oil: 0.5, shields: 0, mult: 1.5 },
};

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const W = 420, H = 620, ROAD_L = 30, ROAD_R = W - 30;
  const LANES = [75, 165, 255, 345];
  const { ctx } = host.createCanvas(W, H);
  host.requireStart('← → oder links/rechts tippen');
  const player = { x: W / 2 - 18, y: 500, w: 36, h: 64, tilt: 0 };
  const COLORS = ['#ff4444', '#4466ff', '#ffaa00', '#ff00ff', '#44ffaa', '#ff8800'];
  let cars = [], items = [], oils = [], dist = 0, bonus = 0, speed = C.speed, shield = C.shields ? 300 : 0, shieldsLeft = Math.max(0, C.shields - 1);
  let boost = 0, slide = 0, tick = 0, roadOff = 0, combo = 0, comboT = 0, touchDir = 0;
  const parts = makeParticles();
  const trees = Array.from({ length: 10 }, (_, i) => ({ y: i * 70, side: i % 2 }));

  host.onPointer('pointerdown', (p) => { touchDir = p.x < W / 2 ? -1 : 1; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) host.on(host.canvas, ev, () => { touchDir = 0; });

  const score = () => Math.floor((dist / 10 + bonus) * C.mult);

  function spawnCar() {
    const lane = Math.floor(Math.random() * LANES.length);
    const truck = Math.random() < 0.2;
    const w = truck ? 40 : 36, h = truck ? 110 : 64;
    const x = LANES[lane] - w / 2;
    if (cars.some((c) => c.y < 130 && Math.abs(c.x - x) < 44)) return;
    const blocked = new Set(cars.filter((c) => c.y < 170).map((c) => Math.round(c.x + c.w / 2)));
    blocked.add(LANES[lane]);
    if (blocked.size >= LANES.length) return;
    cars.push({ x, y: -h - 10, w, h, truck, color: truck ? '#d9d9d9' : COLORS[Math.floor(Math.random() * COLORS.length)], v: truck ? 0.55 : 0.3 + Math.random() * 0.3, passed: false });
  }

  host.loop(() => {
    tick++;
    const base = Math.min(C.max, C.speed + dist / 2500);
    speed = boost > 0 ? base + 4 : base;
    if (boost > 0) boost--;
    if (shield > 0) shield--;
    if (slide > 0) slide--;
    if (comboT > 0 && --comboT === 0) combo = 0;
    dist += speed;
    roadOff = (roadOff + speed) % 80;
    for (const t of trees) { t.y += speed * 0.9; if (t.y > H + 40) t.y -= 700; }
    let steer = (host.left ? -1 : 0) + (host.right ? 1 : 0) + touchDir;
    if (slide > 0) steer = Math.sin(slide / 4) * 1.5; // Ölfleck: Auto rutscht
    player.tilt += (Math.sign(steer) * 0.12 - player.tilt) * 0.2;
    player.x = Math.max(ROAD_L + 4, Math.min(ROAD_R - player.w - 4, player.x + Math.sign(steer) * 6.5));

    const every = Math.max(18, Math.floor((65 - dist / 900) / C.traffic));
    if (tick % every === 0) spawnCar();
    if (tick % 110 === 55) {
      const r = Math.random();
      items.push({ x: LANES[Math.floor(Math.random() * 4)], y: -20, type: r < 0.1 ? 'shield' : r < 0.22 ? 'boost' : 'coin' });
    }
    if (C.oil && tick % 240 === 120 && Math.random() < C.oil + dist / 40000) oils.push({ x: LANES[Math.floor(Math.random() * 4)], y: -30 });

    const pcx = player.x + player.w / 2;
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      c.y += speed * (1 - c.v);
      if (c.y > H + 120) { cars.splice(i, 1); continue; }
      if (!c.passed && c.y > player.y + player.h) {
        c.passed = true;
        const gapX = Math.abs(c.x + c.w / 2 - pcx) - (c.w + player.w) / 2;
        if (gapX < 14) {
          combo++; comboT = 180;
          const v = 10 * combo;
          bonus += v;
          host.floatText(pcx, player.y - 10, `Knapp! +${Math.round(v * C.mult)}${combo > 1 ? ` ×${combo}` : ''}`, '#ff9f1c', 16);
          host.sound('point');
        }
      }
      const m = 5;
      if (player.x + m < c.x + c.w - m && player.x + player.w - m > c.x + m && player.y + m < c.y + c.h - m && player.y + player.h - m > c.y + m) {
        if (shield > 0 || boost > 0) {
          parts.burst(c.x + c.w / 2, c.y + c.h / 2, c.color, 18, 6);
          cars.splice(i, 1);
          bonus += 25;
          host.floatText(c.x + c.w / 2, c.y + c.h / 2, '💥 +25', '#fff', 16);
          host.shake(5);
          host.sound('hit');
          continue;
        }
        if (shieldsLeft > 0) { shieldsLeft--; shield = 120; cars.splice(i, 1); host.floatText(pcx, player.y, 'Ersatz-Schild!', '#00d4ff', 16); host.sound('hit'); continue; }
        parts.burst(pcx, player.y + 32, '#ff4444', 26, 7);
        host.shake(12);
        host.sound('hit');
        host.end(score());
        return;
      }
    }
    for (let i = oils.length - 1; i >= 0; i--) {
      const o = oils[i];
      o.y += speed;
      if (o.y > H + 30) { oils.splice(i, 1); continue; }
      if (slide === 0 && Math.abs(o.x - pcx) < 30 && Math.abs(o.y - (player.y + 32)) < 30) { slide = 50; host.sound('error'); host.floatText(pcx, player.y, 'Öl!', '#aaa', 16); }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += speed;
      if (it.y > H + 20) { items.splice(i, 1); continue; }
      if (Math.hypot(pcx - it.x, player.y + 32 - it.y) < 34) {
        if (it.type === 'shield') { shield = 300; host.floatText(it.x, it.y, 'Schild!', '#00d4ff', 16); }
        else if (it.type === 'boost') { boost = 150; host.floatText(it.x, it.y, 'TURBO!', '#ffd700', 18); }
        else { bonus += 50; host.floatText(it.x, it.y, '+' + Math.round(50 * C.mult), '#ffd700', 16); }
        parts.burst(it.x, it.y, '#ffd700', 10, 4);
        host.sound('coin');
        items.splice(i, 1);
      }
    }
    if (boost > 0 && tick % 2 === 0) parts.list.push({ x: pcx + (Math.random() - 0.5) * 20, y: player.y + 66, vx: 0, vy: 4, life: 0.7, size: 3, color: '#ffaa00' });
    parts.update();
    host.setScore(score());
  }, () => {
    const night = Math.floor(dist / 6000) % 2 === 1;
    ctx.fillStyle = night ? '#0f2a12' : '#2f6b2f'; ctx.fillRect(0, 0, W, H);
    for (const t of trees) {
      const x = t.side ? W - 14 : 14;
      ctx.fillStyle = night ? '#0a3d10' : '#1e5a1e'; ctx.beginPath(); ctx.arc(x, t.y, 13, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = night ? '#161616' : '#2a2a2a'; ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4; ctx.setLineDash([40, 40]); ctx.lineDashOffset = -roadOff;
    for (const x of [120, 210, 300]) { ctx.beginPath(); ctx.moveTo(x, -80); ctx.lineTo(x, H + 80); ctx.stroke(); }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ROAD_L, 0); ctx.lineTo(ROAD_L, H); ctx.moveTo(ROAD_R, 0); ctx.lineTo(ROAD_R, H); ctx.stroke();
    for (const o of oils) { ctx.fillStyle = 'rgba(10,10,10,0.85)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 26, 14, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(120,80,200,0.35)'; ctx.beginPath(); ctx.ellipse(o.x - 5, o.y - 3, 10, 4, 0.3, 0, Math.PI * 2); ctx.fill(); }
    for (const c of cars) car(c.x, c.y, c.color, false, c.truck, c.w, c.h);
    ctx.font = '24px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const it of items) ctx.fillText(it.type === 'shield' ? '🛡️' : it.type === 'boost' ? '⚡' : '🪙', it.x, it.y);
    ctx.textBaseline = 'alphabetic';
    const pcx = player.x + player.w / 2;
    if (night) {
      const g = ctx.createLinearGradient(0, player.y - 200, 0, player.y);
      g.addColorStop(0, 'rgba(255,255,200,0)'); g.addColorStop(1, 'rgba(255,255,200,0.28)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(pcx - 14, player.y); ctx.lineTo(pcx - 70, player.y - 200); ctx.lineTo(pcx + 70, player.y - 200); ctx.lineTo(pcx + 14, player.y); ctx.fill();
    }
    if (shield > 0 && !(shield < 60 && Math.floor(shield / 6) % 2)) {
      ctx.strokeStyle = 'rgba(0,212,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pcx, player.y + 32, 42, 0, Math.PI * 2); ctx.stroke();
    }
    if (boost > 0) { ctx.fillStyle = 'rgba(255,215,0,0.22)'; ctx.beginPath(); ctx.arc(pcx, player.y + 32, 44, 0, Math.PI * 2); ctx.fill(); }
    parts.draw(ctx);
    ctx.save(); ctx.translate(pcx, player.y + 32); ctx.rotate(player.tilt); car(-18, -32, '#00aaff', true, false, 36, 64); ctx.restore();
    if (night) { ctx.fillStyle = 'rgba(0,0,30,0.35)'; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`🏁 ${score()}`, 10, 21);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700'; ctx.fillText(`${Math.round(speed * 20)} km/h`, W / 2, 21);
    ctx.textAlign = 'right';
    if (combo > 1) { ctx.fillStyle = '#ff9f1c'; ctx.fillText(`Kombo ×${combo}`, W - 10, 21); }
    else if (shield > 0) { ctx.fillStyle = '#00d4ff'; ctx.fillText(`🛡️ ${Math.ceil(shield / 60)}s`, W - 10, 21); }
    else if (boost > 0) { ctx.fillStyle = '#ffd700'; ctx.fillText('⚡ TURBO', W - 10, 21); }
  });

  function car(x, y, color, me, truck, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 4, y + 6, w, h);
    if (truck) {
      ctx.fillStyle = '#c0392b'; ctx.fillRect(x, y + h - 30, w, 30);
      ctx.fillStyle = '#ecf0f1'; ctx.fillRect(x, y, w, h - 34);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 8; k < h - 34; k += 12) ctx.fillRect(x + 3, y + k, w - 6, 2);
      ctx.fillStyle = 'rgba(150,220,255,0.75)'; ctx.fillRect(x + 5, y + h - 14, w - 10, 8);
      ctx.fillStyle = '#ff3300'; ctx.fillRect(x + 3, y + 2, 7, 4); ctx.fillRect(x + w - 10, y + 2, 7, 4);
      return;
    }
    ctx.fillStyle = color; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 7); else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + w / 2 - 3, y + 4, 6, h - 8);
    ctx.fillStyle = 'rgba(150,220,255,0.75)';
    ctx.fillRect(x + 5, y + (me ? 10 : 40), w - 10, 12);
    ctx.fillRect(x + 5, y + (me ? 42 : 12), w - 10, 9);
    ctx.fillStyle = '#111';
    for (const [wx, wy] of [[-3, 8], [w - 3, 8], [-3, 44], [w - 3, 44]]) ctx.fillRect(x + wx, y + wy, 6, 13);
    ctx.fillStyle = me ? '#ffff99' : '#ff3300';
    ctx.fillRect(x + 4, y + (me ? 1 : h - 5), 8, 4); ctx.fillRect(x + w - 12, y + (me ? 1 : h - 5), 8, 4);
  }
}
