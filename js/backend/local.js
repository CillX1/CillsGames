// Lokales Backend: gleiche Schnittstelle wie firebase.js, speichert aber nur im Browser (localStorage).
// Wird benutzt, wenn Firebase nicht erreichbar ist (Offline-Modus) und für automatische Tests.
import { OWNER_USERNAMES } from '../firebase-config.js';
import { nameToEmail } from '../util.js';

const KEY = 'cg_localdb_v1';

function err(code, message) {
  return Object.assign(new Error(message || code), { code });
}

async function hash(text) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; // Fallback ohne WebCrypto
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return 'djb2-' + (h >>> 0).toString(16);
}

export function createLocalBackend(storage = globalThis.localStorage) {
  let mem = { accounts: {}, users: {}, leaderboard: {}, roles: {}, feedbacks: {}, vouchers: {}, staffLog: {}, session: null };
  try {
    const raw = storage?.getItem(KEY);
    if (raw) mem = { ...mem, ...JSON.parse(raw) };
  } catch { /* leer starten */ }

  const persist = () => { try { storage?.setItem(KEY, JSON.stringify(mem)); } catch { /* voll/blockiert */ } };
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const listeners = new Set();
  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const sessionInfo = () => {
    const uid = mem.session;
    if (!uid || !mem.accounts[uid]) return null;
    return { uid, displayName: mem.accounts[uid].name, email: mem.accounts[uid].email };
  };
  const emit = () => { const s = sessionInfo(); listeners.forEach((cb) => cb(s)); };
  const me = () => mem.session;
  const roleOf = (uid) => mem.roles[uid]?.role || null;
  const requireStaff = () => { if (!['admin', 'leiter'].includes(roleOf(me()))) throw err('permission-denied'); };
  const requireAdmin = () => { if (roleOf(me()) !== 'admin') throw err('permission-denied'); };

  function publicProfile(u) {
    const top = Object.values(u.highscores || {}).reduce((a, b) => Math.max(a, Number(b) || 0), 0);
    return { name: u.name, stars: u.stars || 0, points: u.points || 0, gamesPlayed: u.gamesPlayed || 0, topScore: top, equipped: u.equipped || {} };
  }

  return {
    kind: 'local',

    onAuthChange(cb) {
      listeners.add(cb);
      setTimeout(() => cb(sessionInfo()), 0);
      return () => listeners.delete(cb);
    },

    async register(name, password) {
      const email = nameToEmail(name);
      if (Object.values(mem.accounts).some((a) => a.email === email)) throw err('auth/email-already-in-use');
      if (String(password).length < 6) throw err('auth/weak-password');
      const uid = 'local_' + newId();
      mem.accounts[uid] = { name, email, pass: await hash(email + ':' + password) };
      mem.session = uid;
      persist();
      emit();
      return uid;
    },

    async login(name, password) {
      const email = nameToEmail(name);
      const entry = Object.entries(mem.accounts).find(([, a]) => a.email === email);
      if (!entry || entry[1].pass !== (await hash(email + ':' + password))) throw err('auth/invalid-credential');
      mem.session = entry[0];
      persist();
      emit();
      return entry[0];
    },

    async logout() {
      mem.session = null;
      persist();
      emit();
    },

    async changePassword(oldPassword, newPassword) {
      const acc = mem.accounts[me()];
      if (!acc) throw err('auth/requires-recent-login');
      if (acc.pass !== (await hash(acc.email + ':' + oldPassword))) throw err('auth/invalid-credential');
      if (String(newPassword).length < 6) throw err('auth/weak-password');
      acc.pass = await hash(acc.email + ':' + newPassword);
      persist();
    },

    async getUser(uid) {
      if (uid !== me() && !['admin', 'leiter'].includes(roleOf(me()))) throw err('permission-denied');
      return clone(mem.users[uid] || null);
    },

    async saveUser(uid, user) {
      if (uid !== me()) throw err('permission-denied');
      mem.users[uid] = { ...(mem.users[uid] || {}), ...clone(user) };
      mem.leaderboard[uid] = publicProfile(mem.users[uid]);
      persist();
    },

    async getRole(uid) { return roleOf(uid); },

    async claimOwnerAdmin(uid, name) {
      const acc = mem.accounts[uid];
      const owners = OWNER_USERNAMES.map(nameToEmail);
      if (uid !== me() || !acc || !owners.includes(acc.email)) throw err('permission-denied');
      mem.roles[uid] = { role: 'admin', name };
      persist();
    },

    async getLeaderboard(max = 50) {
      return Object.entries(mem.leaderboard)
        .map(([id, v]) => ({ id, ...clone(v) }))
        .sort((a, b) => (b.stars || 0) - (a.stars || 0))
        .slice(0, max);
    },

    async getPublicProfile(uid) {
      return mem.leaderboard[uid] ? { id: uid, ...clone(mem.leaderboard[uid]) } : null;
    },

    async listUsers() {
      requireStaff();
      return Object.entries(mem.users).map(([id, v]) => ({ id, ...clone(v) }));
    },

    async staffUpdateUser(uid, fields) {
      requireStaff();
      if (roleOf(me()) === 'leiter') {
        const allowed = ['points', 'stars', 'totalPointsEver', 'unlocked', 'adminUnlocked'];
        if (Object.keys(fields).some((f) => !allowed.includes(f))) throw err('permission-denied');
      }
      if (!mem.users[uid]) throw err('not-found', 'Spieler nicht gefunden');
      mem.users[uid] = { ...mem.users[uid], ...clone(fields) };
      mem.leaderboard[uid] = publicProfile(mem.users[uid]);
      persist();
      return clone(mem.users[uid]);
    },

    async deleteUser(uid) {
      requireAdmin();
      delete mem.users[uid];
      delete mem.leaderboard[uid];
      delete mem.roles[uid];
      persist();
    },

    async listRoles() {
      requireStaff();
      return Object.entries(mem.roles).map(([id, v]) => ({ id, ...clone(v) }));
    },

    async setRole(uid, role, name) {
      requireAdmin();
      if (role) mem.roles[uid] = { role, name };
      else delete mem.roles[uid];
      persist();
    },

    async addFeedback(entry) {
      if (!me()) throw err('permission-denied');
      mem.feedbacks[newId()] = clone(entry);
      persist();
    },
    async listFeedback() {
      requireAdmin();
      return Object.entries(mem.feedbacks).map(([id, v]) => ({ id, ...clone(v) })).sort((a, b) => b.ts - a.ts);
    },
    async deleteFeedback(id) { requireAdmin(); delete mem.feedbacks[id]; persist(); },

    async getVoucher(code) {
      if (!me()) throw err('permission-denied');
      return clone(mem.vouchers[code] || null);
    },
    async listVouchers() {
      requireAdmin();
      return Object.entries(mem.vouchers).map(([id, v]) => ({ id, ...clone(v) }));
    },
    async createVoucher(code, item) { requireAdmin(); mem.vouchers[code] = { item, createdAt: Date.now() }; persist(); },
    async deleteVoucher(code) { requireAdmin(); delete mem.vouchers[code]; persist(); },

    async addStaffLog(entry) { requireStaff(); mem.staffLog[newId()] = clone(entry); persist(); },
    async listStaffLog() {
      requireAdmin();
      return Object.entries(mem.staffLog).map(([id, v]) => ({ id, ...clone(v) })).sort((a, b) => b.ts - a.ts);
    },
    async deleteStaffLog(id) { requireAdmin(); delete mem.staffLog[id]; persist(); },
  };
}
