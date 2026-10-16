// 🏰 Tower Defense
import { makeParticles } from './host.js';

export const TOWERS = [
  { name: 'Kanone', icon: '💣', color: '#00d4ff', cost: 60, dmg: 14, range: 2.3, rate: 50 },
  { name: 'Laser', icon: '⚡', color: '#00ff88', cost: 110, dmg: 5, range: 1.9, rate: 10 },
  { name: 'Rakete', icon: '🚀', color: '#ff006e', cost: 200, dmg: 40, range: 3.0, rate: 110, splash: 1.3 },
  { name: 'Eis', icon: '❄️', color: '#88ccff', cost: 90, dmg: 3, range: 2.0, rate: 40, slow: 90 },
];

export function start(host) {
  const COLS = 14, ROWS = 10, CS = 50, W = COLS * CS, HUD = 96, H = ROWS * CS + HUD;
  const { ctx } = host.createCanvas(W, H);

  // Weg: von links nach rechts mit Kurven (Wegpunkte in Zellen)
  const route = [[-1, 1], [3, 1], [3, 5], [7, 5], [7, 2], [10, 2], [10, 7], [5, 7], [5, 8], [14, 8]];
  const pathCells = new Set();
  for (let i = 0; i < route.length - 1; i++) {
    const [x1, y1] = route[i], [x2, y2] = route[i + 1];
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    for (let x = x1, y = y1; ; x += dx, y += dy) {
      if (x >= 0 && x < COLS) pathCells.add(x + ',' + y);
      if (x === x2 && y === y2) break;
    }
  }
  const waypoints = route.map(([x, y]) => ({ x: x * CS + CS / 2, y: y * CS + CS / 2 }));

  const towers = [], enemies = [], shots = [];
  const parts = makeParticles();
  let gold = 220, lives = 20, wave = 0, score = 0, sel = 0, toSpawn = 0, spawnTick = 0, pause = 150, hover = null, message = '', msgT = 0;

  function say(t) { message = t; msgT = 120; }

  function startWave() {
    wave++;
    const boss = wave % 4 === 0;
    toSpawn = boss ? 1 + Math.floor(wave / 4) : 6 + wave * 2;
    spawnTick = 0;
    say(boss ? `👹 Boss-Welle ${wave}!` : `🌊 Welle ${wave}`);
  }
  function spawnEnemy() {
    const boss = wave % 4 === 0;
    const hp = boss ? 300 + wave * 120 : 20 + wave * 14 + wave * wave * 1.2;
    enemies.push({ x: waypoints[0].x, y: waypoints[0].y, wp: 1, hp, max: hp, speed: boss ? 0.7 : Math.min(2.4, 1 + wave * 0.06), slow: 0, boss, reward: boss ? 40 + wave * 6 : 5 + Math.floor(wave / 2) });
  }

  host.onKey((e, first) => { const n = parseInt(e.key, 10); if (first && n >= 1 && n <= 4) sel = n - 1; });
  host.onPointer('pointermove', (p) => { hover = p; });
  host.on(host.canvas, 'pointerleave', () => { hover = null; });
  host.onPointer('pointerdown', (p) => {
    if (p.y >= ROWS * CS) {
      const i = Math.floor((p.x - 10) / 120);
      if (i >= 0 && i < TOWERS.length && p.y >= ROWS * CS + 40) sel = i;
      return;
    }
    const cx = Math.floor(p.x / CS), cy = Math.floor(p.y / CS);
    const existing = towers.findIndex((t) => t.cx === cx && t.cy === cy);
    if (existing >= 0) {
      const t = towers[existing];
      const refund = Math.floor(TOWERS[t.type].cost * 0.6);
      gold += refund;
      towers.splice(existing, 1);
      say(`Verkauft: +${refund} 💰`);
      host.sound('coin');
      return;
    }
    if (pathCells.has(cx + ',' + cy)) return;
    const T = TOWERS[sel];
    if (gold < T.cost) { say('Zu wenig Gold!'); host.sound('error'); return; }
    gold -= T.cost;
    towers.push({ cx, cy, x: cx * CS + CS / 2, y: cy * CS + CS / 2, type: sel, cd: 0 });
    host.sound('click');
  });

  host.loop(() => {
    if (msgT > 0) msgT--;
    if (toSpawn === 0 && enemies.length === 0) {
      if (pause === 150 && wave > 0) { const b = 20 + wave * 5; gold += b; score += wave * 40; host.setScore(score); say(`Welle geschafft! +${b} 💰`); }
      if (--pause <= 0) { pause = 150; startWave(); }
    } else if (toSpawn > 0 && ++spawnTick >= (wave % 4 === 0 ? 70 : Math.max(16, 40 - wave))) {
      spawnTick = 0; toSpawn--; spawnEnemy();
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.slow > 0) e.slow--;
      let move = e.speed * (e.slow > 0 ? 0.45 : 1);
      while (move > 0 && e.wp < waypoints.length) {
        const t = waypoints[e.wp], dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy);
        if (d <= move) { e.x = t.x; e.y = t.y; e.wp++; move -= d; } else { e.x += (dx / d) * move; e.y += (dy / d) * move; move = 0; }
      }
      if (e.wp >= waypoints.length) {
        enemies.splice(i, 1);
        lives -= e.boss ? 5 : 1;
        host.sound('hit');
        if (lives <= 0) { lives = 0; host.end(score); return; }
      }
    }

    for (const t of towers) {
      if (t.cd > 0) { t.cd--; continue; }
      const T = TOWERS[t.type];
      // Ziel: der Gegner, der am weitesten vorne ist
      let target = null, bestProgress = -1;
      for (const e of enemies) {
        if (Math.hypot(e.x - t.x, e.y - t.y) > T.range * CS) continue;
        const prog = e.wp * 1000 - Math.hypot(waypoints[Math.min(e.wp, waypoints.length - 1)].x - e.x, waypoints[Math.min(e.wp, waypoints.length - 1)].y - e.y);
        if (prog > bestProgress) { bestProgress = prog; target = e; }
      }
      if (!target) continue;
      t.cd = T.rate;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      shots.push({ x: t.x, y: t.y, target, T, speed: t.type === 1 ? 14 : 7 });
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      if (!enemies.includes(s.target)) { shots.splice(i, 1); continue; }
      const dx = s.target.x - s.x, dy = s.target.y - s.y, d = Math.hypot(dx, dy);
      if (d < s.speed + 4) {
        const hit = (e, dmg) => {
          e.hp -= dmg;
          if (s.T.slow) e.slow = s.T.slow;
        };
        if (s.T.splash) {
          for (const e of enemies) if (Math.hypot(e.x - s.target.x, e.y - s.target.y) < s.T.splash * CS) hit(e, s.T.dmg);
          parts.burst(s.target.x, s.target.y, '#ff006e', 14, 4);
        } else { hit(s.target, s.T.dmg); parts.burst(s.target.x, s.target.y, s.T.color, 3, 2); }
        shots.splice(i, 1);
      } else { s.x += (dx / d) * s.speed; s.y += (dy / d) * s.speed; }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hp <= 0) {
        gold += e.reward; score += e.reward * 3;
        parts.burst(e.x, e.y, '#ffd700', e.boss ? 24 : 7, 4);
        host.sound(e.boss ? 'win' : 'pop');
        enemies.splice(i, 1);
        host.setScore(score);
      }
    }
    parts.update();
  }, () => {
    ctx.fillStyle = '#0d1f0d'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const path = pathCells.has(x + ',' + y);
      ctx.fillStyle = path ? '#5a4520' : (x + y) % 2 ? '#1d3d1d' : '#1a381a';
      ctx.fillRect(x * CS, y * CS, CS, CS);
      if (path) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x * CS + 4, y * CS + 4, CS - 8, CS - 8); }
    }
    ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏰', W - CS / 2, 8 * CS + CS / 2);
    if (hover && hover.y < ROWS * CS) {
      const cx = Math.floor(hover.x / CS), cy = Math.floor(hover.y / CS);
      const own = towers.find((t) => t.cx === cx && t.cy === cy);
      const T = own ? TOWERS[own.type] : TOWERS[sel];
      const ok = own || (!pathCells.has(cx + ',' + cy) && gold >= T.cost);
      ctx.strokeStyle = own ? 'rgba(255,215,0,0.8)' : ok ? 'rgba(255,255,255,0.7)' : 'rgba(255,60,60,0.8)';
      ctx.lineWidth = 2; ctx.strokeRect(cx * CS + 2, cy * CS + 2, CS - 4, CS - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.arc(cx * CS + CS / 2, cy * CS + CS / 2, T.range * CS, 0, Math.PI * 2); ctx.fill();
      if (own) { ctx.fillStyle = '#ffd700'; ctx.font = 'bold 11px system-ui'; ctx.fillText(`Verkaufen +${Math.floor(T.cost * 0.6)}`, cx * CS + CS / 2, cy * CS - 8); ctx.font = '22px system-ui'; }
    }
    for (const t of towers) {
      const T = TOWERS[t.type];
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = T.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillText(T.icon, t.x, t.y + 1);
    }
    for (const e of enemies) {
      const r = e.boss ? 18 : 11;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.8, r * 0.8, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.boss ? '#b0208f' : '#d8401f'; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
      if (e.slow > 0) { ctx.strokeStyle = '#9fdcff'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.font = (e.boss ? 22 : 15) + 'px system-ui'; ctx.fillText(e.boss ? '👹' : '👾', e.x, e.y + 1);
      ctx.fillStyle = '#300'; ctx.fillRect(e.x - r, e.y - r - 8, r * 2, 4);
      ctx.fillStyle = e.hp / e.max > 0.5 ? '#3f3' : e.hp / e.max > 0.25 ? '#fb0' : '#f33';
      ctx.fillRect(e.x - r, e.y - r - 8, r * 2 * Math.max(0, e.hp / e.max), 4);
    }
    ctx.font = '22px system-ui';
    for (const s of shots) { ctx.fillStyle = s.T.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.T.splash ? 5 : 3, 0, Math.PI * 2); ctx.fill(); }
    parts.draw(ctx);
    // HUD
    const hy = ROWS * CS;
    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, hy, W, HUD);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui';
    ctx.fillText(`❤️ ${lives}    💰 ${gold}    🌊 Welle ${wave}`, 12, hy + 26);
    if (msgT > 0) { ctx.textAlign = 'right'; ctx.fillStyle = '#ffd700'; ctx.fillText(message, W - 12, hy + 26); }
    else if (toSpawn === 0 && !enemies.length) { ctx.textAlign = 'right'; ctx.fillStyle = '#9fd'; ctx.fillText(`Nächste Welle in ${Math.ceil(pause / 60)}s`, W - 12, hy + 26); }
    TOWERS.forEach((T, i) => {
      const x = 10 + i * 120, y = hy + 40;
      const active = i === sel, afford = gold >= T.cost;
      ctx.fillStyle = active ? T.color + '33' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, 112, 46);
      ctx.strokeStyle = active ? T.color : 'rgba(255,255,255,0.15)'; ctx.lineWidth = active ? 2 : 1; ctx.strokeRect(x, y, 112, 46);
      ctx.fillStyle = afford ? '#fff' : '#777'; ctx.textAlign = 'left'; ctx.font = 'bold 13px system-ui';
      ctx.fillText(`${i + 1} ${T.icon} ${T.name}`, x + 8, y + 19);
      ctx.font = '12px system-ui'; ctx.fillStyle = afford ? '#ffd700' : '#a66';
      ctx.fillText(`${T.cost} 💰`, x + 8, y + 37);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '11px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('Eigenen Turm antippen = verkaufen', W - 12, H - 10);
  });
}
