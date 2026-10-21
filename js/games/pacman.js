// 👻 Pac-Man – Labyrinth mit Tunnel, Geisterhaus und vier Geistern mit eigener Persönlichkeit.
export const MAP = [
  '#####################',
  '#.........#.........#',
  '#o###.###.#.###.###o#',
  '#...................#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.### # ###.#####',
  '#####.#       #.#####',
  '#####.# ##-## #.#####',
  '     .  #GGG#  .     ',
  '#####.# ##### #.#####',
  '#####.#       #.#####',
  '#####.# ##### #.#####',
  '#.........#.........#',
  '#.###.###.#.###.###.#',
  '#o..#.....P.....#..o#',
  '###.#.#.#####.#.#.###',
  '#.....#...#...#.....#',
  '#.#######.#.#######.#',
  '#...................#',
  '#####################',
];
export const COLS = MAP[0].length, ROWS = MAP.length;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const HOUSE = { x: 10, y: 9 }, EXIT = { x: 10, y: 7 }; // Geisterhaus und Ausgang (Tür liegt bei 10,8)

export const pacWalkable = (x, y) => {
  if (y < 0 || y >= ROWS) return false;
  const ch = MAP[y][(x + COLS) % COLS];
  return ch !== '#' && ch !== '-' && ch !== 'G';
};
const ghostWalkable = (x, y, canHouse) => {
  if (y < 0 || y >= ROWS) return false;
  const ch = MAP[y][(x + COLS) % COLS];
  if (ch === '#') return false;
  if (ch === '-' || ch === 'G') return canHouse;
  return true;
};

/** Erster Schritt eines kürzesten Weges (Breitensuche). */
function bfsStep(from, to, canHouse) {
  if (from.x === to.x && from.y === to.y) return null;
  const key = (x, y) => y * COLS + x;
  const prev = new Map([[key(from.x, from.y), null]]);
  const q = [[from.x, from.y]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === to.x && y === to.y) {
      let cur = key(x, y), p = prev.get(cur);
      while (p !== null && p !== key(from.x, from.y)) { cur = p; p = prev.get(cur); }
      const cx = cur % COLS, cy = Math.floor(cur / COLS);
      for (const [d, [dx, dy]] of Object.entries(DIRS)) if ((from.x + dx + COLS) % COLS === cx && from.y + dy === cy) return d;
      return null;
    }
    for (const [dx, dy] of Object.values(DIRS)) {
      const nx = (x + dx + COLS) % COLS, ny = y + dy;
      if (!ghostWalkable(nx, ny, canHouse) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(x, y));
      q.push([nx, ny]);
    }
  }
  return null;
}

export const modes = [
  { id: 'easy', label: 'Leicht', desc: '5 Leben, langsamere Geister, lange Angst-Zeit' },
  { id: 'normal', label: 'Normal', desc: '3 Leben' },
  { id: 'hard', label: 'Schwer', desc: '2 Leben, schnelle Geister, kurze Angst-Zeit – Punkte ×1.5' },
];
const CFG = {
  easy: { lives: 5, ghost: 0.85, fright: 1.4, mult: 1 },
  normal: { lives: 3, ghost: 1, fright: 1, mult: 1 },
  hard: { lives: 2, ghost: 1.12, fright: 0.6, mult: 1.5 },
};
const FRUITS = [{ icon: '🍒', pts: 100 }, { icon: '🍓', pts: 300 }, { icon: '🍊', pts: 500 }, { icon: '🍎', pts: 700 }, { icon: '🍇', pts: 1000 }, { icon: '🔔', pts: 2000 }];

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  const T = 26, HUD = 34, W = COLS * T, H = ROWS * T + HUD;
  const { ctx } = host.createCanvas(W, H);
  host.touchControls([
    { code: 'ArrowLeft', label: '◀' }, { code: 'ArrowUp', label: '▲' },
    { code: 'ArrowDown', label: '▼' }, { code: 'ArrowRight', label: '▶' },
  ]);

  let dots = new Set(), powers = new Set();
  function fillDots() {
    dots = new Set(); powers = new Set();
    MAP.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') dots.add(y * COLS + x);
      if (ch === 'o') powers.add(y * COLS + x);
    }));
  }
  fillDots();
  const pacStart = { x: MAP[15].indexOf('P'), y: 15 };

  let fruit = null, dotsEaten = 0, extraLife = false;
  let score = 0, lives = C.lives, level = 1, frightT = 0, ghostChain = 0, ready = 120, modeT = 0, tick = 0, deathT = 0;
  let wanted = null;
  const pac = { x: 0, y: 0, nx: 0, ny: 0, t: 0, dir: null, mouth: 0 };
  const ghostDefs = [
    { name: 'blinky', color: '#ff2a2a', home: { x: 10, y: 7 }, corner: { x: COLS - 2, y: 1 }, release: 0 },
    { name: 'pinky', color: '#ffb8ff', home: { x: 10, y: 9 }, corner: { x: 1, y: 1 }, release: 120 },
    { name: 'inky', color: '#00ffff', home: { x: 9, y: 9 }, corner: { x: COLS - 2, y: ROWS - 2 }, release: 360 },
    { name: 'clyde', color: '#ffb852', home: { x: 11, y: 9 }, corner: { x: 1, y: ROWS - 2 }, release: 600 },
  ];
  let ghosts = [];

  function resetPositions() {
    Object.assign(pac, { x: pacStart.x, y: pacStart.y, nx: pacStart.x, ny: pacStart.y, t: 0, dir: null });
    wanted = null;
    ghosts = ghostDefs.map((d, i) => ({
      ...d, x: d.home.x, y: d.home.y, nx: d.home.x, ny: d.home.y, t: 0, dir: 'left',
      mode: i === 0 ? 'active' : 'house', wait: d.release, fright: false,
    }));
    frightT = 0;
    ready = 100;
  }
  resetPositions();

  const KEY = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  host.onKey((e) => { if (KEY[e.code]) wanted = KEY[e.code]; });
  host.onSwipe((d) => { wanted = d; });

  const scatterPhase = () => { const c = modeT % (60 * 27); return c < 60 * 7; }; // 7s verteilen, 20s jagen
  const pacSpeed = () => Math.min(0.17, 0.13 + level * 0.008);
  const ghostSpeed = (g) => g.mode === 'eyes' ? 0.33 : g.fright ? 0.065 : g.y === 9 && (g.x <= 4 || g.x >= COLS - 5) ? 0.07 : Math.min(0.16, 0.115 + level * 0.009) * C.ghost;
  const add = (n) => { n = Math.round(n * C.mult); score += n; if (!extraLife && score >= 10000) { extraLife = true; lives++; host.floatText(W / 2, ROWS * T / 2, 'Extraleben!', '#00e68a', 26); host.sound('win'); } return n; };

  function canGo(x, y, d) {
    const [dx, dy] = DIRS[d];
    return pacWalkable(x + dx, y + dy);
  }

  function stepPac() {
    if (pac.dir && wanted === OPP[pac.dir] && pac.t > 0) {
      // sofort umdrehen
      [pac.x, pac.nx] = [pac.nx, pac.x]; [pac.y, pac.ny] = [pac.ny, pac.y];
      pac.t = 1 - pac.t; pac.dir = wanted;
    }
    if (pac.t === 0) {
      if (wanted && canGo(pac.x, pac.y, wanted)) pac.dir = wanted;
      if (pac.dir && canGo(pac.x, pac.y, pac.dir)) {
        const [dx, dy] = DIRS[pac.dir];
        pac.nx = (pac.x + dx + COLS) % COLS; pac.ny = pac.y + dy;
      } else { pac.nx = pac.x; pac.ny = pac.y; return; }
    }
    pac.t += pacSpeed();
    pac.mouth += 0.3;
    if (pac.t >= 1) {
      pac.x = pac.nx; pac.y = pac.ny; pac.t = 0;
      const k = pac.y * COLS + pac.x;
      if (dots.delete(k)) {
        add(10); dotsEaten++;
        if (dots.size % 2 === 0) host.sound('click');
        if (dotsEaten === 60 || dotsEaten === 140) fruit = { ...FRUITS[Math.min(level - 1, FRUITS.length - 1)], t: 600 };
      }
      if (fruit && pac.x === 10 && pac.y === 11) {
        const n = add(fruit.pts);
        host.floatText(10 * T + T / 2, 11 * T, '+' + n, '#ff6b9d', 20);
        host.sound('coin');
        fruit = null;
      }
      if (powers.delete(k)) {
        add(50);
        frightT = Math.round(Math.max(150, 420 - level * 40) * C.fright);
        ghostChain = 0;
        for (const g of ghosts) if (g.mode === 'active') { g.fright = true; if (g.t > 0) { [g.x, g.nx] = [g.nx, g.x]; [g.y, g.ny] = [g.ny, g.y]; g.t = 1 - g.t; g.dir = OPP[g.dir]; } }
        host.sound('coin');
      }
      host.setScore(score);
      if (!dots.size && !powers.size) {
        add(1000);
        host.setScore(score);
        host.sound('win');
        host.floatText(W / 2, ROWS * T / 2 + 30, `Level ${level + 1}!`, '#ffd700', 30);
        level++;
        dotsEaten = 0; fruit = null;
        fillDots();
        resetPositions();
        modeT = 0;
      }
    }
  }

  function ghostTarget(g) {
    if (g.mode === 'eyes') return HOUSE;
    if (g.mode === 'leaving') return EXIT;
    if (scatterPhase()) return g.corner;
    const [dx, dy] = pac.dir ? DIRS[pac.dir] : [0, 0];
    switch (g.name) {
      case 'pinky': return { x: pac.x + dx * 4, y: pac.y + dy * 4 };
      case 'inky': { const b = ghosts[0]; return { x: pac.x * 2 - b.x, y: pac.y * 2 - b.y }; }
      case 'clyde': return Math.hypot(g.x - pac.x, g.y - pac.y) > 7 ? pac : g.corner;
      default: return pac;
    }
  }

  function chooseDir(g) {
    if (g.mode === 'eyes' || g.mode === 'leaving') return bfsStep(g, ghostTarget(g), true) || g.dir;
    const options = Object.keys(DIRS).filter((d) => {
      if (d === OPP[g.dir]) return false;
      const [dx, dy] = DIRS[d];
      return ghostWalkable(g.x + dx, g.y + dy, false);
    });
    if (!options.length) return OPP[g.dir];
    if (g.fright) return options[Math.floor(Math.random() * options.length)];
    const t = ghostTarget(g);
    let best = options[0], bestD = Infinity;
    for (const d of options) {
      const [dx, dy] = DIRS[d];
      const dist = Math.hypot(g.x + dx - t.x, g.y + dy - t.y);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  }

  function stepGhost(g) {
    if (g.mode === 'house') {
      if (--g.wait <= 0) g.mode = 'leaving';
      return;
    }
    if (g.t === 0) {
      if (g.mode === 'leaving' && g.x === EXIT.x && g.y === EXIT.y) { g.mode = 'active'; g.dir = 'left'; }
      if (g.mode === 'eyes' && g.x === HOUSE.x && g.y === HOUSE.y) { g.mode = 'leaving'; g.fright = false; }
      g.dir = chooseDir(g);
      const [dx, dy] = DIRS[g.dir];
      const nx = (g.x + dx + COLS) % COLS, ny = g.y + dy;
      if (!ghostWalkable(nx, ny, g.mode !== 'active')) return;
      g.nx = nx; g.ny = ny;
    }
    g.t += ghostSpeed(g);
    if (g.t >= 1) { g.x = g.nx; g.y = g.ny; g.t = 0; }
  }

  // Position zwischen zwei Feldern (Tunnel: kein "Durchfliegen" über den ganzen Bildschirm)
  function pos(e) {
    if (Math.abs(e.nx - e.x) > 1) return { x: e.t < 0.5 ? e.x + (e.nx > e.x ? -e.t : e.t) : e.nx + (e.nx > e.x ? 1 - e.t : -(1 - e.t)), y: e.y };
    return { x: e.x + (e.nx - e.x) * e.t, y: e.y + (e.ny - e.y) * e.t };
  }

  host.loop(() => {
    tick++;
    if (deathT > 0) {
      if (--deathT === 0) {
        if (lives <= 0) { host.end(score); return; }
        resetPositions();
      }
      return;
    }
    if (ready > 0) { ready--; return; }
    if (fruit && --fruit.t <= 0) fruit = null;
    if (frightT > 0) { if (--frightT === 0) ghosts.forEach((g) => (g.fright = false)); } else modeT++;
    stepPac();
    for (const g of ghosts) stepGhost(g);
    const p = pos(pac);
    for (const g of ghosts) {
      if (g.mode !== 'active') continue;
      const q = pos(g);
      if (Math.hypot(p.x - q.x, p.y - q.y) > 0.6) continue;
      if (g.fright) {
        ghostChain++;
        const pts = add(200 * 2 ** (ghostChain - 1));
        host.floatText(q.x * T + T / 2, q.y * T, '+' + pts, '#00d4ff', 18);
        host.setScore(score);
        g.mode = 'eyes'; g.fright = false;
        host.sound('win');
      } else {
        lives--;
        host.sound('lose');
        host.shake(8);
        fruit = null;
        deathT = 90;
        return;
      }
    }
  }, () => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = MAP[y][x];
      if (ch === '#') {
        // Wand: dunkle Füllung, helle Linie nur dort, wo ein Gang angrenzt
        ctx.fillStyle = '#06104a'; ctx.fillRect(x * T, y * T, T, T);
        const open = (dx, dy) => { const yy = y + dy, xx = x + dx; return yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS && MAP[yy][xx] !== '#'; };
        ctx.strokeStyle = '#3f6bff'; ctx.lineWidth = 2.5; ctx.beginPath();
        if (open(0, -1)) { ctx.moveTo(x * T, y * T + 3); ctx.lineTo(x * T + T, y * T + 3); }
        if (open(0, 1)) { ctx.moveTo(x * T, y * T + T - 3); ctx.lineTo(x * T + T, y * T + T - 3); }
        if (open(-1, 0)) { ctx.moveTo(x * T + 3, y * T); ctx.lineTo(x * T + 3, y * T + T); }
        if (open(1, 0)) { ctx.moveTo(x * T + T - 3, y * T); ctx.lineTo(x * T + T - 3, y * T + T); }
        ctx.stroke();
      } else if (ch === '-') { ctx.fillStyle = '#ffb8ff'; ctx.fillRect(x * T, y * T + T / 2 - 2, T, 4); }
    }
    ctx.fillStyle = '#ffd7b0';
    for (const k of dots) { const x = k % COLS, y = Math.floor(k / COLS); ctx.beginPath(); ctx.arc(x * T + T / 2, y * T + T / 2, 2.6, 0, Math.PI * 2); ctx.fill(); }
    if (Math.floor(tick / 15) % 2 === 0) for (const k of powers) { const x = k % COLS, y = Math.floor(k / COLS); ctx.beginPath(); ctx.arc(x * T + T / 2, y * T + T / 2, 7, 0, Math.PI * 2); ctx.fill(); }

    const p = pos(pac);
    const px = p.x * T + T / 2, py = p.y * T + T / 2;
    const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[pac.dir || 'left'];
    let mouth = 0.08 + Math.abs(Math.sin(pac.mouth)) * 0.32;
    if (deathT > 0) mouth = Math.min(Math.PI, (1 - deathT / 90) * Math.PI);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, T / 2 - 2, ang + mouth * Math.PI, ang + Math.PI * 2 - mouth * Math.PI); ctx.closePath(); ctx.fill();

    if (deathT === 0) for (const g of ghosts) drawGhost(g);

    if (fruit) { ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fruit.icon, 10 * T + T / 2, 11 * T + T / 2 + 1); ctx.textBaseline = 'alphabetic'; }
    ctx.fillStyle = '#000'; ctx.fillRect(0, ROWS * T, W, HUD);
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('🟡'.repeat(Math.max(0, lives)), 10, ROWS * T + 23);
    ctx.textAlign = 'center'; ctx.fillText(score, W / 2, ROWS * T + 23);
    ctx.textAlign = 'right'; ctx.fillText(`Level ${level}  ${FRUITS[Math.min(level - 1, FRUITS.length - 1)].icon}`, W - 10, ROWS * T + 23);
    if (ready > 0 && deathT === 0) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700'; ctx.font = 'bold 20px system-ui';
      ctx.fillText('BEREIT!', W / 2, 11 * T + T / 2 + 7);
    }
  });

  function drawGhost(g) {
    if (g.mode === 'house' && Math.floor(tick / 20) % 2) g.bob = 2; else g.bob = 0;
    const q = pos(g);
    const x = q.x * T + T / 2, y = q.y * T + T / 2 - (g.bob || 0), r = T / 2 - 2;
    if (g.mode !== 'eyes') {
      const blinking = g.fright && frightT < 100 && Math.floor(tick / 10) % 2;
      ctx.fillStyle = g.fright ? (blinking ? '#fff' : '#2233ff') : g.color;
      ctx.beginPath(); ctx.arc(x, y - 2, r, Math.PI, 0); ctx.lineTo(x + r, y + r);
      for (let i = 0; i < 4; i++) ctx.lineTo(x + r - (i + 0.5) * (r / 2), y + r - (i % 2 ? 0 : 4));
      ctx.lineTo(x - r, y + r); ctx.closePath(); ctx.fill();
    }
    if (g.fright && g.mode !== 'eyes') {
      ctx.fillStyle = '#ffd7b0'; ctx.fillRect(x - 5, y - 4, 3, 3); ctx.fillRect(x + 2, y - 4, 3, 3);
      return;
    }
    const [dx, dy] = DIRS[g.dir] || [0, 0];
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 4, y - 4, 3.6, 0, Math.PI * 2); ctx.arc(x + 4, y - 4, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1aff';
    ctx.beginPath(); ctx.arc(x - 4 + dx * 1.6, y - 4 + dy * 1.6, 1.8, 0, Math.PI * 2); ctx.arc(x + 4 + dx * 1.6, y - 4 + dy * 1.6, 1.8, 0, Math.PI * 2); ctx.fill();
  }
}
