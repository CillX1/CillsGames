// Kleine, reine Hilfsfunktionen (ohne DOM-Abhängigkeit, damit sie in Node testbar sind).

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

/** Macht beliebigen Text sicher für innerHTML (verhindert XSS durch Spielernamen, Feedback usw.). */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]);
}

/** 1234 -> "1.2k", 2000000 -> "2M" */
export function formatNum(n) {
  n = Math.floor(Number(n) || 0);
  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);
  const fmt = (v, suffix) => {
    const s = v.toFixed(1).replace(/\.0$/, '');
    return sign + s + suffix;
  };
  if (n >= 1_000_000) return fmt(Math.floor(n / 100_000) / 10, 'M');
  if (n >= 1_000) return fmt(Math.floor(n / 100) / 10, 'k');
  return sign + String(n);
}

/** Ganze Zahl mit Tausender-Apostroph (Schweizer Schreibweise): 12345 -> 12'345 */
export function formatInt(n) {
  n = Math.floor(Number(n) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function randInt(min, maxInclusive, rng = Math.random) {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

export function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Benutzername -> interne Login-E-Mail. Identisch zur alten Version,
 * damit bestehende Konten weiter funktionieren.
 */
export function nameToEmail(name) {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]/g, '_') + '@cillsgames.local';
}

/** Prüft einen neuen Benutzernamen. Gibt Fehlermeldung oder '' zurück. */
export function validateUsername(name) {
  const n = String(name ?? '').trim();
  if (n.length < 2) return 'Der Name braucht mindestens 2 Zeichen.';
  if (n.length > 20) return 'Der Name darf höchstens 20 Zeichen haben.';
  if (!/^[A-Za-z0-9ÄÖÜäöüß _.\-]+$/.test(n)) return 'Erlaubt sind Buchstaben, Zahlen, Leerzeichen und . _ -';
  if (/^[^A-Za-z0-9ÄÖÜäöüß]+$/.test(n)) return 'Der Name braucht mindestens einen Buchstaben oder eine Zahl.';
  return '';
}

export function validatePassword(pass) {
  if (String(pass ?? '').length < 6) return 'Das Passwort braucht mindestens 6 Zeichen.';
  return '';
}

/** Lokales Datum als JJJJ-MM-TT (für den Tagesbonus). */
export function todayKey(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function deepClone(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj));
}

/** Fehlercodes von Firebase in verständliches Deutsch übersetzen. */
export function friendlyError(e) {
  const code = e?.code || '';
  const map = {
    'auth/email-already-in-use': 'Dieser Benutzername ist schon vergeben.',
    'auth/invalid-credential': 'Benutzername oder Passwort ist falsch.',
    'auth/wrong-password': 'Benutzername oder Passwort ist falsch.',
    'auth/user-not-found': 'Benutzername oder Passwort ist falsch.',
    'auth/invalid-email': 'Dieser Benutzername ist ungültig.',
    'auth/weak-password': 'Das Passwort ist zu schwach (mindestens 6 Zeichen).',
    'auth/too-many-requests': 'Zu viele Versuche. Warte kurz und probiere es dann nochmal.',
    'auth/network-request-failed': 'Keine Verbindung zum Server. Prüfe dein Internet.',
    'auth/requires-recent-login': 'Bitte melde dich neu an und versuche es dann nochmal.',
    'auth/operation-not-allowed': 'Login mit Benutzername ist in Firebase noch nicht aktiviert (siehe docs/FIREBASE.md).',
    'permission-denied': 'Keine Berechtigung für diese Aktion.',
    'unavailable': 'Der Server ist gerade nicht erreichbar. Versuche es gleich nochmal.',
    'not-found': 'Nicht gefunden.',
  };
  if (map[code]) return map[code];
  if (e?.message && !code) return e.message;
  return 'Etwas ist schiefgelaufen' + (code ? ` (${code})` : '') + '.';
}
