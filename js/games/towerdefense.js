// 🏰 Tower Defense – Türme bauen, aufrüsten (3 Stufen), verkaufen. Läufer, Tanks und Bosse. 2×-Tempo.
import { makeParticles } from './host.js';

export const modes = [
  { id: 'easy', label: 'Leicht', desc: '30 Leben, mehr Startgold' },
  { id: 'normal', label: 'Normal', desc: '20 Leben' },
  { id: 'hard', label: 'Schwer', desc: '10 Leben, zähere Gegner – Punkte ×1.5' },
];
const CFG = {
  easy: { lives: 30, gold: 300, hp: 0.8, mult: 1 },
  normal: { lives: 20, gold: 220, hp: 1, mult: 1 },
  hard: { lives: 10, gold: 200, hp: 1.35, mult: 1.5 },
};

export const TOWERS = [
  { name: 'Kanone', icon: '💣', color: '#00d4ff', cost: 60, dmg: 14, range: 2.3, rate: 50 },
  { name: 'Laser', icon: '⚡', color: '#00ff88', cost: 110, dmg: 5, range: 1.9, rate: 10 },
  { name: 'Rakete', icon: '🚀', color: '#ff006e', cost: 200, dmg: 40, range: 3.0, rate: 110, splash: 1.3 },
  { name: 'Eis', icon: '❄️', color: '#88ccff', cost: 90, dmg: 3, range: 2.0, rate: 40, slow: 90 },
];
export const MAX_LEVEL = 3;
/** Upgrade-Kosten: 70 % / 120 % des Grundpreises. */
export const upgradeCost = (type, level) => Math.round(TOWERS[type].cost * (level === 1 ? 0.7 : 1.2));
/** Werte eines Turms auf einer Stufe: +45 % Schaden und +12 % Reichweite pro Stufe. */
export function towerStats(type, level) {
  const T = TOWERS[type];
  return { ...T, dmg: T.dmg * (1 + 0.45 * (level - 1)), range: T.range * (1 + 0.12 * (level - 1)), rate: Math.round(T.rate * (1 - 0.1 * (level - 1))) };
}
/** Verkaufswert: 60 % von allem, was investiert wurde. */
export function sellValue(type, level) {
  let spent = TOWERS[type].cost;
  for (let l = 1; l < level; l++) spent += upgradeCost(type, l);
  return Math.floor(spent * 0.6);
}

const ENEMIES = {
  normal: { icon: '👾', color: '#d8401f', r: 11, speed: 1, hp: 1, reward: 1 },
  fast: { icon: '🦎', color: '#e8c41f', r: 9, speed: 1.8, hp: 0.55, reward: 1 },
  tank: { icon: '🛡️', color: '#6b6bd8', r: 14, speed: 0.6, hp: 3, reward: 2.5, armor: 4 },
  boss: { icon: '👹', color: '#b0208f', r: 18, speed: 0.7, hp: 14, reward: 10 },
};

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const COLS = 14, ROWS = 10, CS = 50, W = COLS * CS, HUD = 96, H = ROWS * CS + HUD;
  const { ctx } = host.createCanvas(W, H);

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
  let gold = C.gold, lives = C.lives, wave = 0, score = 0, sel = 0, selTower = null, toSpawn = [], spawnTick = 0, pause = 240, hover = null;
  let fast = false, message = '', msgT = 0;
  const say = (t) => { message = t; msgT = 150; };
  const PAUSE = 360;

  function startWave() {
    wave++;
    const boss = wave % 5 === 0;
    const list = [];
    if (boss) { for (let i = 0; i < Math.floor(wave / 5); i++) list.push('boss'); for (let i = 0; i < wave; i++) list.push('fast'); }
    else {
      const n = 6 + wave * 2;
      for (let i = 0; i < n; i++) {
        const r = Math.random();
        list.push(wave >= 3 && r < 0.2 ? 'tank' : wave >= 2 && r < 0.45 ? 'fast' : 'normal');
      }
    }
    toSpawn = list;
    spawnTick = 0;
    say(boss ? `👹 Boss-Welle ${wave}!` : `🌊 Welle ${wave}`);
    host.sound(boss ? 'lose' : 'point');
  }
  function spawnEnemy(kind) {
    const E = ENEMIES[kind];
    const hp = (22 + wave * 14 + wave * wave * 1.3) * E.hp * C.hp;
    enemies.push({ kind, x: waypoints[0].x, y: waypoints[0].y, wp: 1, hp, max: hp, speed: Math.min(2.6, 1 + wave * 0.05) * E.speed, slow: 0, reward: Math.round((5 + wave / 2) * E.reward), E });
  }
  const addScore = (n) => { score += Math.round(n * C.mult); host.setScore(score); };

  // HUD-Bereiche
  const hudY = ROWS * CS;
  const btnSpeed = { x: W - 128, y: hudY + 40, w: 56, h: 46 };
  const btnWave = { x: W - 66, y: hudY + 40, w: 56, h: 46 };
  const btnUp = { x: 10, y: hudY + 40, w: 180, h: 46 };
  const btnSell = { x: 200, y: hudY + 40, w: 150, h: 46 };
  const btnClose = { x: 360, y: hudY + 40, w: 46, h: 46 };
  const inBtn = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

  function upgrade() {
    const t = selTower;
    if (!t || t.level >= MAX_LEVEL) return;
    const cost = upgradeCost(t.type, t.level);
    if (gold < cost) { say('Zu wenig Gold!'); host.sound('error'); return; }
    gold -= cost; t.level++;
    parts.burst(t.x, t.y, TOWERS[t.type].color, 16, 4);
    host.floatText(t.x, t.y - 20, `Stufe ${t.level}!`, '#ffd700', 16);
    host.sound('coin');
  }
  function sell() {
    const t = selTower;
    if (!t) return;
    const v = sellValue(t.type, t.level);
    gold += v;
    towers.splice(towers.indexOf(t), 1);
    host.floatText(t.x, t.y, `+${v} 💰`, '#ffd700', 16);
    selTower = null;
    host.sound('coin');
  }
  function callWave() {
    if (toSpawn.length || enemies.length) return;
    const bonus = Math.ceil(pause / 60) * 3;
    if (wave > 0 && bonus > 0) { gold += bonus; host.floatText(W / 2, hudY - 20, `Früh gestartet: +${bonus} 💰`, '#ffd700', 16); }
    pause = PAUSE;
    startWave();
  }

  host.onKey((e, first) => {
    if (!first) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { sel = n - 1; selTower = null; }
    if (e.code === 'KeyU') upgrade();
    if (e.code === 'KeyV' || e.code === 'Delete') sell();
    if (e.code === 'KeyF') fast = !fast;
    if (e.code === 'KeyN' || e.code === 'Enter') callWave();
    if (e.code === 'Escape') selTower = null;
  });
  host.onPointer('pointermove', (p) => { hover = p; });
  host.on(host.canvas, 'pointerleave', () => { hover = null; });
  host.onPointer('pointerdown', (p) => {
    if (p.y >= hudY) {
      if (inBtn(p, btnSpeed)) { fast = !fast; host.sound('click'); return; }
      if (inBtn(p, btnWave)) { callWave(); return; }
      if (selTower) {
        if (inBtn(p, btnUp)) upgrade();
        else if (inBtn(p, btnSell)) sell();
        else if (inBtn(p, btnClose)) selTower = null;
        return;
      }
      const i = Math.floor((p.x - 10) / 118);
      if (i >= 0 && i < TOWERS.length && p.y >= hudY + 40 && p.x < 10 + 4 * 118) sel = i;
      return;
    }
    const cx = Math.floor(p.x / CS), cy = Math.floor(p.y / CS);
    const own = towers.find((t) => t.cx === cx && t.cy === cy);
    if (own) { selTower = selTower === own ? null : own; host.sound('click'); return; }
    selTower = null;
    if (pathCells.has(cx + ',' + cy)) return;
    const T = TOWERS[sel];
    if (gold < T.cost) { say('Zu wenig Gold!'); host.sound('error'); return; }
    gold -= T.cost;
    towers.push({ cx, cy, x: cx * CS + CS / 2, y: cy * CS + CS / 2, type: sel, level: 1, cd: 0, angle: 0 });
    parts.burst(cx * CS + CS / 2, cy * CS + CS / 2, T.color, 8, 3);
    host.sound('click');
  });

  function step() {
    if (msgT > 0) msgT--;
    if (!toSpawn.length && !enemies.length) {
      if (pause === PAUSE && wave > 0) {
        const b = 20 + wave * 5;
        gold += b; addScore(wave * 40);
        say(`Welle ${wave} geschafft! +${b} 💰`);
        host.sound('win');
      }
      if (--pause <= 0) { pause = PAUSE; startWave(); }
    } else if (toSpawn.length && ++spawnTick >= Math.max(14, 40 - wave)) {
      spawnTick = 0;
      spawnEnemy(toSpawn.shift());
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
        lives -= e.kind === 'boss' ? 5 : e.kind === 'tank' ? 2 : 1;
        host.shake(5);
        host.sound('hit');
        if (lives <= 0) { lives = 0; host.end(score); return; }
      }
    }

    for (const t of towers) {
      if (t.cd > 0) { t.cd--; continue; }
      const S = towerStats(t.type, t.level);
      let target = null, best = -1;
      for (const e of enemies) {
        if (Math.hypot(e.x - t.x, e.y - t.y) > S.range * CS) continue;
        const wpI = Math.min(e.wp, waypoints.length - 1);
        const prog = e.wp * 1000 - Math.hypot(waypoints[wpI].x - e.x, waypoints[wpI].y - e.y);
        if (prog > best) { best = prog; target = e; }
      }
      if (!target) continue;
      t.cd = S.rate;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      shots.push({ x: t.x, y: t.y, target, S, speed: t.type === 1 ? 14 : 7 });
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      if (!enemies.includes(s.target)) { shots.splice(i, 1); continue; }
      const dx = s.target.x - s.x, dy = s.target.y - s.y, d = Math.hypot(dx, dy);
      if (d < s.speed + 4) {
        const hit = (e, dmg) => {
          e.hp -= Math.max(dmg * 0.25, dmg - (e.E.armor || 0)); // Panzer schluckt etwas Schaden
          if (s.S.slow && e.kind !== 'boss') e.slow = s.S.slow;
        };
        if (s.S.splash) {
          for (const e of enemies) if (Math.hypot(e.x - s.target.x, e.y - s.target.y) < s.S.splash * CS) hit(e, s.S.dmg);
          parts.burst(s.target.x, s.target.y, '#ff006e', 14, 4);
        } else { hit(s.target, s.S.dmg); parts.burst(s.target.x, s.target.y, s.S.color, 3, 2); }
        shots.splice(i, 1);
      } else { s.x += (dx / d) * s.speed; s.y += (dy / d) * s.speed; }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hp <= 0) {
        gold += e.reward; addScore(e.reward * 3);
        host.floatText(e.x, e.y - 10, `+${e.reward}`, '#ffd700', 13);
        parts.burst(e.x, e.y, e.E.color, e.kind === 'boss' ? 30 : 8, 4);
        if (e.kind === 'boss') host.shake(8);
        host.sound(e.kind === 'boss' ? 'win' : 'pop');
        enemies.splice(i, 1);
      }
    }
    parts.update();
  }

  host.loop(() => { step(); if (fast && !host.over) step(); }, draw);

  function draw() {
    ctx.fillStyle = '#0d1f0d'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const path = pathCells.has(x + ',' + y);
      ctx.fillStyle = path ? '#5a4520' : (x + y) % 2 ? '#1d3d1d' : '#1a381a';
      ctx.fillRect(x * CS, y * CS, CS, CS);
      if (path) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x * CS + 4, y * CS + 4, CS - 8, CS - 8); }
    }
    ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏰', W - CS / 2, 8 * CS + CS / 2);
    // Reichweite: ausgewählter Turm oder Bau-Vorschau
    if (selTower) {
      const S = towerStats(selTower.type, selTower.level);
      ctx.fillStyle = 'rgba(255,215,0,0.1)'; ctx.strokeStyle = 'rgba(255,215,0,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(selTower.x, selTower.y, S.range * CS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (hover && hover.y < hudY) {
      const cx = Math.floor(hover.x / CS), cy = Math.floor(hover.y / CS);
      const own = towers.find((t) => t.cx === cx && t.cy === cy);
      const T = TOWERS[sel];
      const ok = own || (!pathCells.has(cx + ',' + cy) && gold >= T.cost);
      ctx.strokeStyle = own ? 'rgba(255,215,0,0.8)' : ok ? 'rgba(255,255,255,0.7)' : 'rgba(255,60,60,0.8)';
      ctx.lineWidth = 2; ctx.strokeRect(cx * CS + 2, cy * CS + 2, CS - 4, CS - 4);
      if (!own) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.arc(cx * CS + CS / 2, cy * CS + CS / 2, T.range * CS, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const t of towers) {
      const T = TOWERS[t.type];
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = t === selTower ? '#ffd700' : T.color; ctx.lineWidth = 2 + t.level; ctx.stroke();
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle);
      ctx.fillStyle = T.color; ctx.fillRect(6, -3, 14, 6); ctx.restore();
      ctx.font = '20px system-ui'; ctx.fillText(T.icon, t.x, t.y + 1);
      for (let l = 0; l < t.level; l++) { ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(t.x - 8 + l * 8, t.y + 17, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
    for (const e of enemies) {
      const r = e.E.r;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.8, r * 0.8, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.E.color; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
      if (e.slow > 0) { ctx.strokeStyle = '#9fdcff'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.font = (r + 6) + 'px system-ui'; ctx.fillText(e.E.icon, e.x, e.y + 1);
      ctx.fillStyle = '#300'; ctx.fillRect(e.x - r, e.y - r - 8, r * 2, 4);
      ctx.fillStyle = e.hp / e.max > 0.5 ? '#3f3' : e.hp / e.max > 0.25 ? '#fb0' : '#f33';
      ctx.fillRect(e.x - r, e.y - r - 8, r * 2 * Math.max(0, e.hp / e.max), 4);
    }
    for (const s of shots) { ctx.fillStyle = s.S.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.S.splash ? 5 : 3, 0, Math.PI * 2); ctx.fill(); }
    parts.draw(ctx);
    ctx.textBaseline = 'alphabetic';
    // HUD
    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, hudY, W, HUD);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui';
    ctx.fillText(`❤️ ${lives}    💰 ${gold}    🌊 Welle ${wave}    🎯 ${score}`, 12, hudY + 26);
    ctx.textAlign = 'right';
    if (msgT > 0) { ctx.fillStyle = '#ffd700'; ctx.fillText(message, W - 12, hudY + 26); }
    else if (!toSpawn.length && !enemies.length) { ctx.fillStyle = '#9fd'; ctx.fillText(`Nächste Welle in ${Math.ceil(pause / 60)}s`, W - 12, hudY + 26); }
    const button = (b, label, active, col = '#00d4ff', enabled = true) => {
      ctx.globalAlpha = enabled ? 1 : 0.4;
      ctx.fillStyle = active ? col + '44' : 'rgba(255,255,255,0.06)'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = active ? col : 'rgba(255,255,255,0.18)'; ctx.lineWidth = active ? 2 : 1; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui';
      const lines = label.split('\n');
      lines.forEach((l, i) => ctx.fillText(l, b.x + b.w / 2, b.y + b.h / 2 + 5 + (i - (lines.length - 1) / 2) * 16));
      ctx.globalAlpha = 1;
    };
    if (selTower) {
      const T = TOWERS[selTower.type];
      const maxed = selTower.level >= MAX_LEVEL;
      const cost = maxed ? 0 : upgradeCost(selTower.type, selTower.level);
      button(btnUp, maxed ? `${T.icon} Max. Stufe` : `⬆ Aufrüsten (U)\n${cost} 💰 → Stufe ${selTower.level + 1}`, !maxed && gold >= cost, '#00e68a', !maxed && gold >= cost);
      button(btnSell, `Verkaufen (V)\n+${sellValue(selTower.type, selTower.level)} 💰`, true, '#ffd700');
      button(btnClose, '✕', false);
    } else {
      TOWERS.forEach((T, i) => {
        const b = { x: 10 + i * 118, y: hudY + 40, w: 110, h: 46 };
        button(b, `${i + 1} ${T.icon} ${T.name}\n${T.cost} 💰`, i === sel, T.color, gold >= T.cost);
      });
    }
    button(btnSpeed, fast ? '⏩ 2×' : '▶ 1×', fast, '#a855f7');
    button(btnWave, 'Welle\njetzt', !toSpawn.length && !enemies.length, '#ff006e', !toSpawn.length && !enemies.length);
  }
}
