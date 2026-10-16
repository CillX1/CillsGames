// Casino-Logik als reine Funktionen (fair, nachvollziehbar und getestet).
// Alle Spiele haben einen kleinen Hausvorteil, der offen angezeigt wird.

export const BETS = [50, 100, 250, 500];

// ── Slots ────────────────────────────────────────────────
// Gewichtete Walzen: seltene Symbole kommen seltener.
export const SLOT_SYMBOLS = [
  { s: '🍒', w: 30, mult: 7 },
  { s: '🍋', w: 25, mult: 9 },
  { s: '🍊', w: 20, mult: 11 },
  { s: '🍇', w: 12, mult: 18 },
  { s: '🔔', w: 7, mult: 26 },
  { s: '7️⃣', w: 4, mult: 33 },
  { s: '💎', w: 2, mult: 50 },
];
const SLOT_TOTAL = SLOT_SYMBOLS.reduce((a, x) => a + x.w, 0);

export function spinReel(rng = Math.random) {
  let r = rng() * SLOT_TOTAL;
  for (const x of SLOT_SYMBOLS) {
    if ((r -= x.w) < 0) return x.s;
  }
  return SLOT_SYMBOLS[0].s;
}

/** Gibt die Auszahlung (inkl. Einsatz) zurück. 0 = verloren. */
export function slotPayout(reels, bet) {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    const sym = SLOT_SYMBOLS.find((x) => x.s === a);
    return Math.floor(bet * (sym ? sym.mult : 2));
  }
  if (a === b || b === c || a === c) return bet; // zwei Gleiche: Einsatz zurück
  return 0;
}

/** Exakter Erwartungswert pro eingesetztem Punkt (für Tests und die Info-Anzeige). */
export function slotExpectedReturn() {
  let ev = 0;
  for (const a of SLOT_SYMBOLS) for (const b of SLOT_SYMBOLS) for (const c of SLOT_SYMBOLS) {
    const p = (a.w / SLOT_TOTAL) * (b.w / SLOT_TOTAL) * (c.w / SLOT_TOTAL);
    ev += p * slotPayout([a.s, b.s, c.s], 1000) / 1000;
  }
  return ev;
}

// ── Roulette (europäisch, 0–36) ───────────────────────────
export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const ROULETTE_BETS = {
  red: { label: '🔴 Rot', mult: 2 },
  black: { label: '⚫ Schwarz', mult: 2 },
  even: { label: '✌️ Gerade', mult: 2 },
  odd: { label: '☝️ Ungerade', mult: 2 },
  low: { label: '⬇️ 1–18', mult: 2 },
  high: { label: '⬆️ 19–36', mult: 2 },
  zero: { label: '🟢 Null', mult: 36 },
};

export function rouletteColor(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export function rouletteWins(choice, n) {
  switch (choice) {
    case 'red': return n !== 0 && RED_NUMBERS.has(n);
    case 'black': return n !== 0 && !RED_NUMBERS.has(n);
    case 'even': return n !== 0 && n % 2 === 0;
    case 'odd': return n % 2 === 1;
    case 'low': return n >= 1 && n <= 18;
    case 'high': return n >= 19 && n <= 36;
    case 'zero': return n === 0;
    default: return false;
  }
}

export function roulettePayout(choice, n, bet) {
  return rouletteWins(choice, n) ? bet * ROULETTE_BETS[choice].mult : 0;
}

// ── Münzwurf ──────────────────────────────────────────────
// 1.9x Auszahlung bei echter 50/50-Chance (statt geheim gezinkter 45 %).
export const COIN_MULT = 1.9;
export function coinPayout(choice, outcome, bet) {
  return choice === outcome ? Math.floor(bet * COIN_MULT) : 0;
}

// ── Würfel-Duell ─────────────────────────────────────────
// Beide würfeln fair 1–6. Höher = 1.9x, Gleichstand = Einsatz zurück.
export const DICE_MULT = 1.9;
export function dicePayout(mine, ai, bet) {
  if (mine > ai) return Math.floor(bet * DICE_MULT);
  if (mine === ai) return bet;
  return 0;
}
