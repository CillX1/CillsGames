// Geräte-Einstellungen (nur lokal gespeichert). Alle Zugriffe auf localStorage sind abgesichert,
// weil es im privaten Modus oder bei blockierten Cookies Fehler werfen kann.

const KEY = 'cg_settings_v3';
const DEFAULTS = { sound: true, volume: 0.5, reduceMotion: false, touchControls: 'auto' };

let current = { ...DEFAULTS };
const listeners = new Set();

try {
  const raw = localStorage.getItem(KEY);
  if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) };
} catch { /* ignorieren */ }

export function getSetting(key) {
  return current[key];
}

export function setSetting(key, value) {
  current[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* ignorieren */ }
  listeners.forEach((fn) => fn(key, value));
}

export function onSettingChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function wantsTouchControls() {
  const mode = current.touchControls;
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
}
