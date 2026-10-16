// Zweite Sicherheitsstufe für den Admin-Bereich.
// Hier steht NICHT das Passwort, sondern nur ein PBKDF2-Fingerabdruck (200'000 Runden SHA-256).
// Die eigentliche Sicherheit kommt aus Firebase: Admin-Aktionen erlauben die Firestore-Regeln
// nur Konten, die in der Sammlung `roles` als Admin eingetragen sind.
//
// Passwort ändern: node scripts/admin-hash.mjs "neuesPasswort"  -> Ausgabe hier einfügen.
export const ADMIN_PASSWORD_HASH = '553c8d160c1a57333cdfcaad3127f6671af8ee40d0aa64d66025ad7f33dbb3d2';
export const ADMIN_SALT = 'cillsgames-admin-v1';
export const ADMIN_ITERATIONS = 200000;

let unlocked = false;

export async function hashAdminPassword(password, subtle = globalThis.crypto?.subtle) {
  if (!subtle) throw new Error('Dein Browser unterstützt keine sichere Verschlüsselung (nur über https:// oder localhost).');
  const enc = new TextEncoder();
  const key = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(ADMIN_SALT), iterations: ADMIN_ITERATIONS }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyAdminPassword(password) {
  const h = await hashAdminPassword(String(password));
  unlocked = h === ADMIN_PASSWORD_HASH;
  return unlocked;
}

export const isAdminUnlocked = () => unlocked;
export const lockAdmin = () => { unlocked = false; };
