// Alle kosmetischen Gegenstände. Rahmen & Namensfarben werden aus `c` (Farben) erzeugt,
// damit Profil und Rangliste immer gleich aussehen.

export const SLOTS = { badge: '🏅 Abzeichen', title: '📛 Titel', color: '🌈 Namensfarbe', frame: '🖼️ Rahmen' };
export const RARITY = {
  common: { label: '◆ GEWÖHNLICH', order: 0 },
  rare: { label: '★ SELTEN', order: 1 },
  epic: { label: '★★ EPISCH', order: 2 },
  legendary: { label: '★★★ LEGENDÄR', order: 3 },
};

const I = (id, slot, name, icon, price, rarity, extra = {}) => ({ id, slot, name, icon, price, rarity, ...extra });

export const ITEMS = [
  // Abzeichen
  I('badge_fire', 'badge', 'Feuer', '🔥', 200, 'common'),
  I('badge_thunder', 'badge', 'Donner', '⚡', 250, 'common'),
  I('badge_gold', 'badge', 'Gold', '🥇', 300, 'common'),
  I('badge_moon', 'badge', 'Mond', '🌙', 300, 'common'),
  I('badge_alien', 'badge', 'Alien', '👾', 350, 'common'),
  I('badge_skull', 'badge', 'Totenkopf', '💀', 400, 'common'),
  I('badge_robot', 'badge', 'Roboter', '🤖', 450, 'common'),
  I('badge_sigma', 'badge', 'Sigma', '🗿', 900, 'rare'),
  I('badge_diam', 'badge', 'Diamant', '💎', 1000, 'epic'),
  I('badge_dragon2', 'badge', 'Drache', '🐉', 1500, 'rare'),
  I('badge_mystery', 'badge', 'Mystery', '🎭', 1600, 'rare'),
  I('badge_ghost', 'badge', 'Geist', '👻', 2000, 'epic'),
  I('badge_galaxy', 'badge', 'Galaxie', '💫', 3000, 'epic'),
  I('badge_godeye', 'badge', 'Gottesauge', '👁️', 8000, 'legendary'),
  I('badge_crown', 'badge', 'VIP-Krone', '👑', 0, 'legendary', { exclusive: true }),
  I('badge_dragon', 'badge', 'Ur-Drache', '🐲', 0, 'legendary', { exclusive: true }),
  // Rollen-Items: gibt es nur automatisch mit der Rolle (nicht kaufbar, nicht per Gutschein)
  I('badge_admin', 'badge', 'Admin', '🛡️', 0, 'legendary', { exclusive: true, role: 'admin' }),
  // Titel
  I('title_noob', 'title', 'Noob', '😅', 50, 'common'),
  I('title_afk', 'title', 'AFK', '😴', 100, 'common'),
  I('title_tryhard', 'title', 'Tryhard', '🎯', 400, 'common'),
  I('title_pro', 'title', 'Pro Gamer', '🎮', 500, 'common'),
  I('title_ghost', 'title', 'Ghost', '👻', 600, 'common'),
  I('title_grinder', 'title', 'Grinder', '⚙️', 800, 'common'),
  I('title_bigbrain', 'title', 'Big Brain', '🧠', 1200, 'rare'),
  I('title_ninja', 'title', 'Ninja', '🥷', 1200, 'rare'),
  I('title_goat', 'title', 'G.O.A.T', '🐐', 1500, 'rare'),
  I('title_legend', 'title', 'Legende', '🏆', 2000, 'epic'),
  I('title_rainbow', 'title', 'Rainbow', '🌈', 2500, 'epic'),
  I('title_starlord', 'title', 'Star Lord', '🌟', 3000, 'epic'),
  I('title_gambler', 'title', 'Gambling Master', '🎰', 3000, 'epic'),
  I('title_king', 'title', 'King', '👑', 4000, 'epic'),
  I('title_immortal', 'title', 'Immortal', '🌌', 10000, 'legendary'),
  I('title_leiter', 'title', 'Leiter', '👔', 0, 'epic', { exclusive: true, role: 'leiter' }),
  I('title_admin', 'title', 'Admin', '🔐', 0, 'legendary', { exclusive: true, role: 'admin' }),
  // Namensfarben
  I('color_neon', 'color', 'Neon', '🌈', 150, 'common', { c: ['#00d4ff', '#ff006e', '#00ff88'] }),
  I('color_gold', 'color', 'Gold', '✨', 700, 'rare', { c: ['#ffd700', '#ff8800'] }),
  I('color_red', 'color', 'Feuerrot', '🔴', 1000, 'rare', { c: ['#ff2222', '#ff8800'] }),
  I('color_purple', 'color', 'Violett', '🟣', 2500, 'epic', { c: ['#a855f7', '#e879f9'] }),
  // Rahmen
  I('frame_side', 'frame', 'Seitenstreifen', '▌', 400, 'common', { c: ['#ff006e'] }),
  I('frame_dark', 'frame', 'Dunkel', '🌑', 500, 'common', { c: ['#c0c0e8'] }),
  I('frame_gold', 'frame', 'Gold', '🖼️', 600, 'rare', { c: ['#ffd700', '#ffaa00'] }),
  I('frame_neon', 'frame', 'Neon', '💡', 900, 'rare', { c: ['#00d4ff'] }),
  I('frame_rainbow', 'frame', 'Regenbogen', '🌈', 1200, 'rare', { c: ['#ff006e', '#ff8800', '#ffd700', '#00ff88', '#00d4ff', '#a855f7'] }),
  I('frame_ice', 'frame', 'Eis', '❄️', 1400, 'rare', { c: ['#00cfff', '#80eaff'] }),
  I('frame_thunder', 'frame', 'Donner', '⚡', 1500, 'rare', { c: ['#ffe000', '#ffffff'] }),
  I('frame_flame', 'frame', 'Flamme', '🔥', 2500, 'epic', { c: ['#ff4400', '#ffcc00'] }),
  I('frame_plasma', 'frame', 'Plasma', '🟣', 3000, 'epic', { c: ['#ff00ff', '#ff88ff'] }),
  I('frame_galaxy', 'frame', 'Galaxie', '🌌', 3500, 'epic', { c: ['#c084fc', '#f0abfc'] }),
  I('frame_cyber', 'frame', 'Cyber', '🔷', 4000, 'epic', { c: ['#00ffff', '#0088ff'] }),
  I('frame_hacker', 'frame', 'Hacker', '💻', 4000, 'legendary', { c: ['#00ff41'], mono: true }),
  I('frame_lava', 'frame', 'Lava', '🌋', 6000, 'legendary', { c: ['#ff5500', '#ffaa00'] }),
  I('frame_solar', 'frame', 'Solar', '☀️', 7500, 'legendary', { c: ['#ff7700', '#ffdd00'] }),
  I('frame_diamond', 'frame', 'Diamant', '💎', 15000, 'legendary', { c: ['#a0f0ff', '#ffffff'] }),
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const SHOP_ITEMS = ITEMS.filter((i) => !i.exclusive);

/** Items, die zu einer Rolle gehören. Admins bekommen auch die Leiter-Items nicht automatisch – nur ihre eigenen. */
export const ROLE_ITEMS = { admin: ['title_admin', 'badge_admin'], leiter: ['title_leiter'] };
export const ALL_ROLE_ITEM_IDS = ITEMS.filter((i) => i.role).map((i) => i.id);

/** Welche Rollen-Items darf jemand mit dieser Rolle besitzen? (muss zu firestore.rules passen) */
export function allowedRoleItems(role) {
  if (role === 'admin') return ['title_admin', 'badge_admin', 'title_leiter'];
  if (role === 'leiter') return ['title_leiter'];
  return [];
}

/** Gibt nur ausgerüstete Items zurück, die es wirklich gibt und (falls Inventar bekannt) im Besitz sind. */
export function resolveEquipped(equipped, inventory) {
  const out = {};
  if (!equipped || typeof equipped !== 'object') return out;
  for (const slot of Object.keys(SLOTS)) {
    const id = equipped[slot];
    const item = ITEM_BY_ID[id];
    if (!item || item.slot !== slot) continue;
    if (Array.isArray(inventory) && !inventory.includes(id)) continue;
    out[slot] = item;
  }
  return out;
}

function gradient(colors) {
  return colors.length === 1 ? colors[0] : `linear-gradient(90deg,${colors.join(',')})`;
}

/** CSS für einen farbigen Namen (Namensfarbe hat Vorrang vor Rahmenfarbe). */
export function nameStyle(eq) {
  const src = eq.color || eq.frame;
  if (!src?.c) return '';
  if (src.c.length === 1) return `color:${src.c[0]};font-weight:800;${src.mono ? 'font-family:ui-monospace,monospace;letter-spacing:1px;' : ''}`;
  return `background:${gradient(src.c)};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:800;`;
}

/** CSS für den Avatar-Rahmen im Profil. */
export function avatarFrameStyle(frame) {
  if (!frame?.c) return '';
  const main = frame.c[0];
  if (frame.c.length > 2) {
    return `border:6px solid transparent;background:linear-gradient(#1a1a2e,#1a1a2e) padding-box,linear-gradient(135deg,${frame.c.join(',')}) border-box;box-shadow:0 0 30px ${main}88;`;
  }
  return `border:6px solid ${main};box-shadow:0 0 30px ${main}aa,0 0 60px ${main}55;background:${main}1a;`;
}

/** CSS für eine Ranglisten-Zeile mit Rahmen. */
export function rowFrameStyle(frame) {
  if (!frame?.c) return '';
  const main = frame.c[0];
  return `--row-accent:${main};`;
}
