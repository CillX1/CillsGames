// Zentraler Spielstand. Alle Änderungen an Punkten, Sternen, Items usw. laufen hier durch.
// Speichern geschieht nacheinander (nie zwei Schreibvorgänge gleichzeitig), damit nichts verloren geht.
import { GAMES, GAME_BY_ID, pointsForScore } from './data/games.js';
import { ITEM_BY_ID, ROLE_ITEMS, ALL_ROLE_ITEM_IDS, allowedRoleItems } from './data/shop.js';
import { todayKey, friendlyError, nameToEmail } from './util.js';

export const STAR_PRICE = 100; // 100 Punkte = 1 Stern
export const DAILY_BASE = 25;
export const DAILY_STREAK_STEP = 5;
export const DAILY_MAX = 75;

const state = {
  backend: null,
  uid: null,
  user: null,
  role: null,
  authResolved: false,
};
const listeners = new Set();
let onErrorHandler = () => {};

export function getState() { return state; }
export const user = () => state.user;
export const isLoggedIn = () => !!state.user;
export const isStaff = () => state.role === 'admin' || state.role === 'leiter';

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

export function setErrorHandler(fn) { onErrorHandler = fn; }

export function setBackend(backend) { state.backend = backend; }

// Bei der Registrierung meldet Firebase den neuen Login, bevor der Anzeigename gesetzt ist.
// Darum merken wir uns den gewünschten Namen (mit Gross-/Kleinschreibung) hier.
let pendingName = null;
export function setPendingRegistration(name) { pendingName = name ? { name, email: nameToEmail(name) } : null; }

export function defaultUser(name, email = '') {
  return {
    name, email,
    points: 0, stars: 0, gamesPlayed: 0, totalPointsEver: 0,
    highscores: {}, unlocked: [], adminUnlocked: [], inventory: [], equipped: {},
    usedVouchers: [], lastDaily: '', dailyStreak: 0,
    createdAt: Date.now(),
  };
}

const int = (v) => Math.max(0, Math.floor(Number(v) || 0));
const strArr = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))] : []);

/** Bringt (auch alte) Spielstände in ein sauberes Format. */
export function sanitizeUser(raw, fallbackName = 'Spieler') {
  const u = { ...defaultUser(fallbackName), ...(raw || {}) };
  u.name = typeof u.name === 'string' && u.name.trim() ? u.name : fallbackName;
  for (const f of ['points', 'stars', 'gamesPlayed', 'totalPointsEver', 'dailyStreak']) u[f] = int(u[f]);
  for (const f of ['unlocked', 'adminUnlocked', 'inventory', 'usedVouchers']) u[f] = strArr(u[f]);
  const hs = {};
  if (u.highscores && typeof u.highscores === 'object') {
    for (const [k, v] of Object.entries(u.highscores)) if (GAME_BY_ID[k]) hs[k] = int(v);
  }
  u.highscores = hs;
  const eq = {};
  if (u.equipped && typeof u.equipped === 'object') {
    for (const [slot, id] of Object.entries(u.equipped)) {
      const it = ITEM_BY_ID[id];
      if (it && it.slot === slot && u.inventory.includes(id)) eq[slot] = id;
    }
  }
  u.equipped = eq;
  if (typeof u.lastDaily !== 'string') u.lastDaily = '';
  delete u.uid;
  return u;
}

// ── Laden & Speichern ────────────────────────────────────

export async function loadSession(authInfo) {
  state.authResolved = true;
  if (!authInfo) {
    state.uid = null; state.user = null; state.role = null;
    notify();
    return;
  }
  const { backend } = state;
  const fromRegistration = pendingName && pendingName.email === authInfo.email ? pendingName.name : null;
  const fallbackName = fromRegistration || authInfo.displayName || (authInfo.email || 'spieler').split('@')[0];
  let data = await backend.getUser(authInfo.uid);
  const isNew = !data;
  state.uid = authInfo.uid;
  state.user = sanitizeUser(data, fallbackName);
  if (isNew) state.user.email = authInfo.email || '';
  pendingName = null;
  state.role = await backend.getRole(authInfo.uid);
  checkAutoUnlock();
  const roleChanged = syncRoleItems();
  if (isNew || roleChanged) await save();
  notify();
}

/**
 * Rollen-Items (Admin-/Leiter-Titel) passend zur Rolle vergeben bzw. entfernen.
 * Neue Titel werden automatisch ausgerüstet, wenn noch keiner getragen wird.
 * Gibt true zurück, wenn sich etwas geändert hat.
 */
export function syncRoleItems(u = state.user, role = state.role) {
  if (!u) return false;
  const allowed = allowedRoleItems(role);
  const before = JSON.stringify([u.inventory, u.equipped]);
  u.inventory = u.inventory.filter((id) => !ALL_ROLE_ITEM_IDS.includes(id) || allowed.includes(id));
  for (const [slot, id] of Object.entries(u.equipped)) if (!u.inventory.includes(id)) delete u.equipped[slot];
  for (const id of ROLE_ITEMS[role] || []) {
    if (u.inventory.includes(id)) continue;
    u.inventory.push(id);
    const slot = ITEM_BY_ID[id].slot;
    if (!u.equipped[slot]) u.equipped[slot] = id;
  }
  return JSON.stringify([u.inventory, u.equipped]) !== before;
}

/** Neu vom Server laden (z. B. nach einem abgelehnten Speichern). */
export async function reloadUser() {
  if (!state.uid) return;
  const data = await state.backend.getUser(state.uid);
  if (data) state.user = sanitizeUser(data, state.user?.name);
  notify();
}

let saving = null;
let pending = false;

/** Speichert den aktuellen Stand. Mehrere Aufrufe kurz hintereinander werden zusammengefasst. */
export function save() {
  if (!state.user || !state.uid) return Promise.resolve();
  pending = true;
  notify();
  if (!saving) saving = runSaves();
  return saving;
}

async function runSaves() {
  try {
    while (pending) {
      pending = false;
      const uid = state.uid;
      const snapshot = JSON.parse(JSON.stringify(state.user));
      try {
        await state.backend.saveUser(uid, snapshot);
      } catch (e) {
        console.error('Speichern fehlgeschlagen', e);
        onErrorHandler('Speichern fehlgeschlagen: ' + friendlyError(e));
        if (e?.code === 'permission-denied') { try { await reloadUser(); } catch { /* ignorieren */ } }
        pending = false;
        break;
      }
    }
  } finally {
    saving = null;
  }
}

/** Wartet, bis alle laufenden Speichervorgänge fertig sind. */
export function flush() { return saving || Promise.resolve(); }

// ── Spiele ────────────────────────────────────────────────

export function isUnlocked(gameId) {
  const g = GAME_BY_ID[gameId];
  if (!g) return false;
  if (!g.unlock) return true;
  return !!state.user?.unlocked.includes(gameId);
}

/** Schaltet Spiele frei, sobald man insgesamt genug Punkte verdient hat. Gibt neu freigeschaltete zurück. */
export function checkAutoUnlock() {
  const u = state.user;
  if (!u) return [];
  const fresh = [];
  for (const g of GAMES) {
    if (g.unlock && !u.unlocked.includes(g.id) && u.totalPointsEver >= g.unlock) {
      u.unlocked.push(g.id);
      fresh.push(g);
    }
  }
  return fresh;
}

export async function buyGameUnlock(gameId) {
  const u = state.user;
  const g = GAME_BY_ID[gameId];
  if (!u || !g?.unlock) return { ok: false, msg: 'Nicht möglich.' };
  if (u.unlocked.includes(gameId)) return { ok: true };
  if (u.points < g.unlock) return { ok: false, msg: `Du brauchst ${g.unlock} Punkte (du hast ${u.points}).` };
  u.points -= g.unlock;
  u.unlocked.push(gameId);
  await save();
  return { ok: true };
}

/** Wird genau einmal pro Spielrunde aufgerufen. */
export function recordGameResult(gameId, score) {
  const u = state.user;
  score = int(score);
  const result = { points: 0, newRecord: false, unlocked: [] };
  if (!u || !GAME_BY_ID[gameId]) return result;
  result.points = pointsForScore(gameId, score);
  if (score > (u.highscores[gameId] || 0)) {
    u.highscores[gameId] = score;
    result.newRecord = true;
  }
  u.points += result.points;
  u.totalPointsEver += result.points;
  u.gamesPlayed += 1;
  result.unlocked = checkAutoUnlock();
  save();
  return result;
}

// ── Wirtschaft ────────────────────────────────────────────

/** Zieht Punkte ab (z. B. Casino-Einsatz). Gibt false zurück, wenn es nicht reicht. */
export function spendPoints(n) {
  const u = state.user;
  n = int(n);
  if (!u || n <= 0 || u.points < n) return false;
  u.points -= n;
  save();
  return true;
}

export function creditPoints(n) {
  const u = state.user;
  n = int(n);
  if (!u || n <= 0) return;
  u.points += n;
  save();
}

export async function convertToStars(points) {
  const u = state.user;
  if (!u) return { ok: false, msg: 'Bitte zuerst einloggen.' };
  const stars = Math.floor(int(points) / STAR_PRICE);
  if (stars < 1) return { ok: false, msg: `Mindestens ${STAR_PRICE} Punkte nötig.` };
  const cost = stars * STAR_PRICE;
  await flush(); // Umtausch immer als eigener Speichervorgang (die Server-Regeln prüfen den Kurs)
  if (u.points < cost) return { ok: false, msg: 'Nicht genug Punkte.' };
  u.points -= cost;
  u.stars += stars;
  await save();
  return { ok: true, stars, cost };
}

export async function buyItem(id) {
  const u = state.user;
  const item = ITEM_BY_ID[id];
  if (!u || !item || item.exclusive) return { ok: false, msg: 'Dieses Item gibt es nicht zu kaufen.' };
  if (u.inventory.includes(id)) return { ok: false, msg: 'Hast du schon.' };
  if (u.points < item.price) return { ok: false, msg: 'Nicht genug Punkte.' };
  u.points -= item.price;
  u.inventory.push(id);
  await save();
  return { ok: true };
}

export async function toggleEquip(id) {
  const u = state.user;
  const item = ITEM_BY_ID[id];
  if (!u || !item || !u.inventory.includes(id)) return false;
  if (u.equipped[item.slot] === id) delete u.equipped[item.slot];
  else u.equipped[item.slot] = id;
  await save();
  return true;
}

export async function redeemVoucher(rawCode) {
  const u = state.user;
  const code = String(rawCode || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!u) return { ok: false, msg: 'Bitte zuerst einloggen.' };
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) return { ok: false, msg: 'Ungültiger Code.' };
  if (u.usedVouchers.includes(code)) return { ok: false, msg: 'Diesen Code hast du schon eingelöst.' };
  let v;
  try { v = await state.backend.getVoucher(code); } catch (e) { return { ok: false, msg: friendlyError(e) }; }
  const item = v && ITEM_BY_ID[v.item];
  if (!item || item.role) return { ok: false, msg: 'Ungültiger Code.' };
  u.usedVouchers.push(code);
  const already = u.inventory.includes(item.id);
  if (!already) u.inventory.push(item.id);
  await save();
  return { ok: true, item, already };
}

export function dailyBonusInfo(now = new Date()) {
  const u = state.user;
  if (!u) return { available: false, amount: 0, streak: 0 };
  const today = todayKey(now);
  const yesterday = todayKey(new Date(now.getTime() - 86_400_000));
  const streak = u.lastDaily === yesterday ? u.dailyStreak + 1 : 1;
  const amount = Math.min(DAILY_MAX, DAILY_BASE + (streak - 1) * DAILY_STREAK_STEP);
  return { available: u.lastDaily !== today, amount, streak };
}

export async function claimDailyBonus() {
  const u = state.user;
  const info = dailyBonusInfo();
  if (!u || !info.available) return { ok: false };
  u.lastDaily = todayKey();
  u.dailyStreak = info.streak;
  u.points += info.amount;
  u.totalPointsEver += info.amount;
  const unlocked = checkAutoUnlock();
  await save();
  return { ok: true, amount: info.amount, streak: info.streak, unlocked };
}

// ── Konto ─────────────────────────────────────────────────

export async function setRoleLocal(role) {
  state.role = role;
  if (syncRoleItems()) await save();
  notify();
}

/** Für Admin-Änderungen am eigenen Konto: lokalen Stand übernehmen. */
export function applyServerUser(uid, data) {
  if (uid === state.uid && data) {
    state.user = sanitizeUser(data, state.user?.name);
    checkAutoUnlock();
    syncRoleItems();
    notify();
  }
}
