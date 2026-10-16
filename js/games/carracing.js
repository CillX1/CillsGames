// 🚗 Car Racing
import { makeParticles } from './host.js';

export function start(host) {
  const W = 420, H = 620, ROAD_L = 30, ROAD_R = W - 30;
  const LANES = [75, 165, 255, 345];
  const { ctx } = host.createCanvas(W, H);
  const player = { x: W / 2 - 18, y: 500, w: 36, h: 64 };
  const COLORS = ['#ff4444', '#4466ff', '#ffaa00', '#ff00ff', '#44ffaa', '#ff8800'];
  let cars = [], items = [], dist = 0, bonus = 0, speed = 4, shield = 0, boost = 0, tick = 0, roadOff = 0;
  let touchDir = 0;
  const parts = makeParticles();

  host.onPointer('pointerdown', (p) => { touchDir = p.x < W / 2 ? -1 : 1; });
  host.on(host.canvas, 'pointerup', () => { touchDir = 0; });
  host.on(host.canvas, 'pointercancel', () => { touchDir = 0; });
  host.on(host.canvas, 'pointerleave', () => { touchDir = 0; });

  const score = () => Math.floor(dist / 10) + bonus;

  function spawnCar() {
    const lane = Math.floor(Math.random() * LANES.length);
    const x = LANES[lane] - 18;
    if (cars.some((c) => c.y < 60 && Math.abs(c.x - x) < 40)) return;
    // nie alle 4 Spuren gleichzeitig blockieren
    const blocked = new Set(cars.filter((c) => c.y < 140).map((c) => Math.round(c.x)));
    blocked.add(Math.round(x));
    if (blocked.size >= LANES.length) return;
    cars.push({ x, y: -80, w: 36, h: 64, color: COLORS[Math.floor(Math.random() * COLORS.length)], v: 0.35 + Math.random() * 0.3 });
  }

  host.loop(() => {
    tick++;
    const base = 4 + Math.min(8, dist / 2500);
    speed = boost > 0 ? base + 4 : base;
    if (boost > 0) boost--;
    if (shield > 0) shield--;
    dist += speed;
    roadOff = (roadOff + speed) % 80;
    const steer = (host.left ? -1 : 0) + (host.right ? 1 : 0) + touchDir;
    player.x = Math.max(ROAD_L + 4, Math.min(ROAD_R - player.w - 4, player.x + Math.sign(steer) * 6.5));

    const every = Math.max(22, 65 - Math.floor(dist / 900));
    if (tick % every === 0) spawnCar();
    if (tick % 110 === 55) {
      const r = Math.random();
      items.push({ x: LANES[Math.floor(Math.random() * 4)], y: -20, type: r < 0.12 ? 'shield' : r < 0.25 ? 'boost' : 'star' });
    }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      c.y += speed * (1 - c.v);
      if (c.y > H + 80) { cars.splice(i, 1); continue; }
      const m = 5;
      if (player.x + m < c.x + c.w - m && player.x + player.w - m > c.x + m && player.y + m < c.y + c.h - m && player.y + player.h - m > c.y + m) {
        if (shield > 0 || boost > 0) {
          parts.burst(c.x + 18, c.y + 32, c.color, 16, 6);
          cars.splice(i, 1);
          bonus += 25;
          host.sound('hit');
          continue;
        }
        parts.burst(player.x + 18, player.y + 32, '#ff4444', 24, 6);
        host.sound('hit');
        host.end(score());
        return;
      }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += speed;
      if (it.y > H + 20) { items.splice(i, 1); continue; }
      if (Math.hypot(player.x + 18 - it.x, player.y + 32 - it.y) < 34) {
        if (it.type === 'shield') shield = 300;
        else if (it.type === 'boost') boost = 150;
        else bonus += 50;
        parts.burst(it.x, it.y, '#ffd700', 10, 4);
        host.sound('coin');
        items.splice(i, 1);
      }
    }
    parts.update();
    host.setScore(score());
  }, () => {
    ctx.fillStyle = '#2f6b2f'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4; ctx.setLineDash([40, 40]); ctx.lineDashOffset = -roadOff;
    for (const x of [120, 210, 300]) { ctx.beginPath(); ctx.moveTo(x, -80); ctx.lineTo(x, H + 80); ctx.stroke(); }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ROAD_L, 0); ctx.lineTo(ROAD_L, H); ctx.moveTo(ROAD_R, 0); ctx.lineTo(ROAD_R, H); ctx.stroke();
    for (const c of cars) car(c.x, c.y, c.color, false);
    ctx.font = '24px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const it of items) ctx.fillText(it.type === 'shield' ? '🛡️' : it.type === 'boost' ? '⚡' : '⭐', it.x, it.y);
    ctx.textBaseline = 'alphabetic';
    if (shield > 0 && !(shield < 60 && Math.floor(shield / 6) % 2)) {
      ctx.strokeStyle = 'rgba(0,212,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(player.x + 18, player.y + 32, 42, 0, Math.PI * 2); ctx.stroke();
    }
    if (boost > 0) { ctx.fillStyle = 'rgba(255,215,0,0.25)'; ctx.beginPath(); ctx.arc(player.x + 18, player.y + 32, 44, 0, Math.PI * 2); ctx.fill(); }
    car(player.x, player.y, '#00aaff', true);
    parts.draw(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`🏁 ${score()}`, 10, 21);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700'; ctx.fillText(`${Math.round(speed * 20)} km/h`, W / 2, 21);
    ctx.textAlign = 'right';
    if (shield > 0) { ctx.fillStyle = '#00d4ff'; ctx.fillText(`🛡️ ${Math.ceil(shield / 60)}s`, W - 10, 21); }
    else if (boost > 0) { ctx.fillStyle = '#ffd700'; ctx.fillText('⚡ TURBO', W - 10, 21); }
  });

  function car(x, y, color, me) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 4, y + 6, 36, 64);
    const g = ctx.createLinearGradient(x, 0, x + 36, 0);
    g.addColorStop(0, color); g.addColorStop(0.5, '#ffffff55'); g.addColorStop(1, color);
    ctx.fillStyle = color; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, 36, 64, 7); else ctx.rect(x, y, 36, 64);
    ctx.fill();
    ctx.fillStyle = g; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(150,220,255,0.75)';
    ctx.fillRect(x + 5, y + (me ? 10 : 40), 26, 12);
    ctx.fillRect(x + 5, y + (me ? 42 : 12), 26, 9);
    ctx.fillStyle = '#111';
    for (const [wx, wy] of [[-3, 8], [33, 8], [-3, 44], [33, 44]]) ctx.fillRect(x + wx, y + wy, 6, 13);
    ctx.fillStyle = me ? '#ffff99' : '#ff3300';
    ctx.fillRect(x + 4, y + (me ? 1 : 59), 8, 4); ctx.fillRect(x + 24, y + (me ? 1 : 59), 8, 4);
  }
}
