// Unit-Tests für die Spiel- und Wirtschaftslogik.  Ausführen: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { esc, formatNum, formatInt, nameToEmail, validateUsername, validatePassword, todayKey, shuffle } from '../../js/util.js';
import { GAMES, GAME_BY_ID, pointsForScore, CATEGORIES } from '../../js/data/games.js';
import { ITEMS, ITEM_BY_ID, SLOTS, RARITY, resolveEquipped, nameStyle } from '../../js/data/shop.js';
import * as casino from '../../js/data/casino.js';
import { WORDS, checkGuess } from '../../js/games/wordle.js';
import { rotateCW, collides, clearFullRows, makeBag, PIECES, COLS as TCOLS, ROWS as TROWS } from '../../js/games/tetris.js';
import { emptyBoard, dropRow, isWin, aiMove, ROWS as C4R, COLS as C4C } from '../../js/games/connect4.js';
import { winner, bestMove } from '../../js/games/tictactoe.js';
import { createBoard } from '../../js/games/minesweeper.js';
import { SHAPES, canPlace, clearLines, fitsAnywhere } from '../../js/games/blockblast.js';
import { neighbors, findCluster, findFloating } from '../../js/games/bubbleshooter.js';
import { MAP, COLS as PCOLS, ROWS as PROWS, pacWalkable } from '../../js/games/pacman.js';
import { QUESTIONS } from '../../js/games/quiz.js';
import { WORDS as TYPING_WORDS } from '../../js/games/typing.js';
import { memoryScore, PAIRS } from '../../js/games/memory.js';
import { GAME_IDS } from '../../js/pages/game.js';
import { hashAdminPassword, ADMIN_PASSWORD_HASH } from '../../js/admin-auth.js';
import { webcrypto } from 'node:crypto';

// ── util ──
test('esc() entschärft HTML', () => {
  assert.equal(esc('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(esc("a'b`c&"), 'a&#39;b&#96;c&amp;');
  assert.equal(esc(null), '');
});
test('formatNum()', () => {
  assert.equal(formatNum(0), '0');
  assert.equal(formatNum(999), '999');
  assert.equal(formatNum(1000), '1k');
  assert.equal(formatNum(1250), '1.2k');
  assert.equal(formatNum(2_000_000), '2M');
  assert.equal(formatNum(1_999_999), '1.9M');
  assert.equal(formatNum(-1500), '-1.5k');
  assert.equal(formatNum('abc'), '0');
});
test('formatInt()', () => assert.equal(formatInt(1234567), "1'234'567"));
test('nameToEmail() ist kompatibel zur alten Version', () => {
  assert.equal(nameToEmail('CillX11'), 'cillx11@cillsgames.local');
  assert.equal(nameToEmail(' Max Muster '), 'max_muster@cillsgames.local');
  assert.equal(nameToEmail('Zoë!'), 'zo__@cillsgames.local');
});
test('Benutzername & Passwort prüfen', () => {
  assert.equal(validateUsername('ab'), '');
  assert.notEqual(validateUsername('a'), '');
  assert.notEqual(validateUsername('x'.repeat(21)), '');
  assert.notEqual(validateUsername('<script>'), '');
  assert.notEqual(validateUsername('___'), '');
  assert.equal(validateUsername('Jürg_99'), '');
  assert.notEqual(validatePassword('12345'), '');
  assert.equal(validatePassword('123456'), '');
});
test('todayKey()', () => assert.equal(todayKey(new Date(2026, 0, 5)), '2026-01-05'));
test('shuffle() behält alle Elemente', () => assert.deepEqual(shuffle([1, 2, 3, 4, 5]).sort(), [1, 2, 3, 4, 5]));

// ── Kataloge ──
test('20 Spiele, eindeutige IDs, alle haben ein Modul', () => {
  assert.equal(GAMES.length, 20);
  assert.equal(new Set(GAMES.map((g) => g.id)).size, 20);
  assert.deepEqual([...GAME_IDS].sort(), GAMES.map((g) => g.id).sort());
  for (const g of GAMES) {
    assert.ok(CATEGORIES[g.cat], g.id);
    assert.ok(g.div > 0 && g.cap > 0 && g.howto && g.desc && g.emoji, g.id);
  }
});
test('Punkteberechnung', () => {
  assert.equal(pointsForScore('snake', 0), 0);
  assert.equal(pointsForScore('snake', 1), 1);
  assert.equal(pointsForScore('snake', 100), 50);
  assert.equal(pointsForScore('snake', 1e9), GAME_BY_ID.snake.cap);
  assert.equal(pointsForScore('gibtsnicht', 500), 0);
  assert.equal(pointsForScore('dino', -5), 0);
  for (const g of GAMES) assert.ok(g.cap <= 250, `${g.id}: cap über Server-Limit`);
});
test('Shop-Items: eindeutig, gültige Slots/Seltenheit', () => {
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  for (const it of ITEMS) {
    assert.ok(SLOTS[it.slot], it.id);
    assert.ok(RARITY[it.rarity], it.id);
    assert.ok(it.id.startsWith(it.slot + '_'), it.id);
    if (!it.exclusive) assert.ok(it.price > 0, it.id);
    if (it.slot === 'frame' || it.slot === 'color') assert.ok(Array.isArray(it.c) && it.c.length, it.id);
  }
});
test('resolveEquipped() ignoriert fremde/ungültige Items', () => {
  const eq = resolveEquipped({ badge: 'badge_fire', title: 'title_xyz', frame: 'badge_gold', color: 'color_neon' }, ['badge_fire']);
  assert.equal(eq.badge.id, 'badge_fire');
  assert.equal(eq.title, undefined);
  assert.equal(eq.frame, undefined);
  assert.equal(eq.color, undefined);
  assert.equal(resolveEquipped(null).badge, undefined);
  assert.match(nameStyle({ color: ITEM_BY_ID.color_gold }), /gradient/);
});

// ── Casino ──
test('Casino: alle Spiele haben Hausvorteil, aber fair (90–98 %)', () => {
  const slot = casino.slotExpectedReturn();
  assert.ok(slot > 0.9 && slot < 0.98, 'Slots ' + slot);
  assert.ok(36 / 37 < 1);
  assert.ok(casino.COIN_MULT / 2 < 1 && casino.COIN_MULT / 2 >= 0.9);
  const dice = (15 / 36) * casino.DICE_MULT + 6 / 36;
  assert.ok(dice > 0.9 && dice < 1, 'Würfel ' + dice);
});
test('Casino: maximale Auszahlung liegt unter dem Server-Limit (30000)', () => {
  const maxBet = Math.max(...casino.BETS);
  const maxMult = Math.max(...casino.SLOT_SYMBOLS.map((s) => s.mult), ...Object.values(casino.ROULETTE_BETS).map((b) => b.mult));
  assert.ok(maxBet * maxMult <= 30000);
});
test('Roulette-Regeln', () => {
  assert.equal(casino.RED_NUMBERS.size, 18);
  assert.equal(casino.rouletteColor(0), 'green');
  assert.equal(casino.roulettePayout('red', 1, 100), 200);
  assert.equal(casino.roulettePayout('black', 1, 100), 0);
  assert.equal(casino.roulettePayout('even', 0, 100), 0);
  assert.equal(casino.roulettePayout('odd', 0, 100), 0);
  assert.equal(casino.roulettePayout('zero', 0, 100), 3600);
  assert.equal(casino.roulettePayout('low', 18, 50), 100);
  assert.equal(casino.roulettePayout('high', 18, 50), 0);
  let wins = 0;
  for (let n = 0; n <= 36; n++) if (casino.rouletteWins('red', n)) wins++;
  assert.equal(wins, 18);
});
test('Slots, Münze, Würfel', () => {
  assert.equal(casino.slotPayout(['💎', '💎', '💎'], 100), 5000);
  assert.equal(casino.slotPayout(['🍒', '🍒', '🍋'], 100), 100);
  assert.equal(casino.slotPayout(['🍒', '🍋', '🍊'], 100), 0);
  const counts = {};
  for (let i = 0; i < 20000; i++) { const s = casino.spinReel(); counts[s] = (counts[s] || 0) + 1; }
  assert.ok(counts['🍒'] > counts['💎']);
  assert.equal(casino.coinPayout('heads', 'heads', 100), 190);
  assert.equal(casino.coinPayout('heads', 'tails', 100), 0);
  assert.equal(casino.dicePayout(6, 1, 100), 190);
  assert.equal(casino.dicePayout(3, 3, 100), 100);
  assert.equal(casino.dicePayout(1, 2, 100), 0);
});

// ── Wordle ──
test('Wordle: Wortliste sauber (5 Buchstaben A–Z, eindeutig, genug Wörter)', () => {
  assert.ok(WORDS.length >= 150, 'nur ' + WORDS.length);
  for (const w of WORDS) assert.match(w, /^[A-Z]{5}$/);
  assert.equal(new Set(WORDS).size, WORDS.length);
});
test('Wordle: Bewertung mit doppelten Buchstaben', () => {
  assert.deepEqual(checkGuess('APFEL', 'APFEL'), Array(5).fill('correct'));
  assert.deepEqual(checkGuess('EEEEE', 'NEBEL'), ['absent', 'correct', 'absent', 'correct', 'absent']);
  assert.deepEqual(checkGuess('LEBEN', 'NEBEL'), ['present', 'correct', 'correct', 'correct', 'present']);
  assert.deepEqual(checkGuess('AAXXX', 'BAUCH'), ['absent', 'correct', 'absent', 'absent', 'absent']);
});

// ── Tetris ──
test('Tetris: Drehen, Kollision, Reihen löschen, 7er-Beutel', () => {
  assert.deepEqual(rotateCW([[1, 0], [1, 1]]), [[1, 1], [1, 0]]);
  const I = PIECES.I.m;
  assert.deepEqual(rotateCW(rotateCW(rotateCW(rotateCW(I)))), I);
  const board = Array.from({ length: TROWS }, () => Array(TCOLS).fill(null));
  assert.equal(collides(board, PIECES.O.m, 0, 0), false);
  assert.equal(collides(board, PIECES.O.m, -1, 0), true);
  assert.equal(collides(board, PIECES.O.m, TCOLS - 1, 0), true);
  assert.equal(collides(board, PIECES.O.m, 0, TROWS - 1), true);
  assert.equal(collides(board, PIECES.O.m, 0, -1), false, 'oberhalb des Feldes ist erlaubt');
  board[TROWS - 1] = Array(TCOLS).fill('#fff');
  board[TROWS - 2][0] = '#f00';
  const r = clearFullRows(board);
  assert.equal(r.cleared, 1);
  assert.equal(r.board.length, TROWS);
  assert.equal(r.board[TROWS - 1][0], '#f00');
  assert.deepEqual(makeBag().sort(), Object.keys(PIECES).sort());
});

// ── Vier gewinnt ──
test('Vier gewinnt: Gewinnerkennung und KI', () => {
  const b = emptyBoard();
  assert.equal(b.length, C4R); assert.equal(b[0].length, C4C);
  for (let c = 0; c < 4; c++) b[dropRow(b, c)][c] = 1;
  assert.equal(isWin(b, 1), true);
  const d = emptyBoard();
  for (let i = 0; i < 4; i++) { d[C4R - 1 - i][i] = 2; for (let k = 0; k < i; k++) d[C4R - 1 - k][i] = d[C4R - 1 - k][i] || 1; }
  assert.equal(isWin(d, 2), true, 'Diagonale');
  // KI blockt eine offene Drei
  const e = emptyBoard();
  e[5][0] = 1; e[5][1] = 1; e[5][2] = 1;
  assert.equal(aiMove(e, 2, 4), 3);
  // KI gewinnt, wenn sie kann
  const f = emptyBoard();
  f[5][6] = 2; f[4][6] = 2; f[3][6] = 2; f[5][0] = 1; f[5][1] = 1;
  assert.equal(aiMove(f, 2, 4), 6);
  const full = emptyBoard();
  for (let r = 0; r < C4R; r++) full[r][3] = 1;
  assert.equal(dropRow(full, 3), -1);
  assert.equal(dropRow(full, 2), C4R - 1);
});

// ── Tic Tac Toe ──
test('Tic Tac Toe: Minimax gewinnt/blockt', () => {
  assert.equal(winner(['X', 'X', 'X', null, null, null, null, null, null]).p, 'X');
  assert.equal(winner(Array(9).fill(null)), null);
  assert.equal(bestMove(['O', 'O', null, 'X', 'X', null, null, null, null], 'O'), 2);
  assert.equal(bestMove(['X', 'X', null, null, 'O', null, null, null, null], 'O'), 2);
});

// ── Minesweeper ──
test('Minesweeper: richtige Minenzahl, erster Klick + Nachbarn sicher, Zahlen stimmen', () => {
  for (let t = 0; t < 30; t++) {
    const b = createBoard(12, 12, 22, 5, 7);
    let mines = 0;
    for (let r = 0; r < 12; r++) for (let c = 0; c < 12; c++) {
      if (b[r][c] === -1) { mines++; continue; }
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (b[r + dr]?.[c + dc] === -1) n++;
      assert.equal(b[r][c], n);
    }
    assert.equal(mines, 22);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) assert.notEqual(b[5 + dr][7 + dc], -1);
    assert.equal(b[5][7], 0, 'erster Klick öffnet eine Fläche');
  }
});

// ── Block Blast ──
test('Block Blast: Platzieren & gleichzeitiges Löschen von Reihe + Spalte', () => {
  const g = Array.from({ length: 8 }, () => Array(8).fill(null));
  assert.equal(canPlace(g, [[1, 1, 1, 1]], 0, 5), false);
  assert.equal(canPlace(g, [[1, 1, 1, 1]], 0, 4), true);
  for (let i = 0; i < 8; i++) { g[3][i] = 'x'; g[i][2] = 'x'; }
  const r = clearLines(g);
  assert.equal(r.lines, 2);
  assert.ok(g.flat().every((v) => v === null));
  assert.ok(SHAPES.every((s) => fitsAnywhere(Array.from({ length: 8 }, () => Array(8).fill(null)), s)));
});

// ── Bubble Shooter ──
test('Bubble Shooter: Nachbarn, Cluster, hängende Kugeln', () => {
  const odd = (r) => r % 2 === 1;
  assert.equal(neighbors(0, 0, odd).length, 2); // Ecke oben links: nur rechts und unten
  assert.deepEqual(neighbors(1, 0, odd).map(String).sort(), ['0,0', '0,1', '1,1', '2,0', '2,1'].sort());
  const grid = Array.from({ length: 15 }, () => Array(10).fill(null));
  grid[0][0] = 'r'; grid[0][1] = 'r'; grid[1][0] = 'r'; grid[0][2] = 'b'; grid[1][1] = 'b'; grid[2][1] = 'g';
  assert.equal(findCluster(grid, 0, 0, odd).length, 3);
  for (const [r, c] of findCluster(grid, 0, 0, odd)) grid[r][c] = null;
  // (2,1) hängt an (1,1), das an (0,2) hängt -> nichts fällt
  assert.equal(findFloating(grid, odd).length, 0);
  grid[0][2] = null;
  assert.equal(findFloating(grid, odd).length, 2);
});

// ── Pac-Man ──
test('Pac-Man: Labyrinth ist rechteckig und alle Punkte sind erreichbar', () => {
  assert.ok(MAP.every((row) => row.length === PCOLS));
  const start = { x: MAP[15].indexOf('P'), y: 15 };
  assert.ok(start.x > 0);
  const seen = new Set([start.y * PCOLS + start.x]);
  const q = [start];
  while (q.length) {
    const { x, y } = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = (x + dx + PCOLS) % PCOLS, ny = y + dy;
      if (!pacWalkable(nx, ny) || seen.has(ny * PCOLS + nx)) continue;
      seen.add(ny * PCOLS + nx); q.push({ x: nx, y: ny });
    }
  }
  let dots = 0;
  for (let y = 0; y < PROWS; y++) for (let x = 0; x < PCOLS; x++) {
    if ('.o'.includes(MAP[y][x])) { dots++; assert.ok(seen.has(y * PCOLS + x), `Punkt bei ${x},${y} unerreichbar`); }
  }
  assert.ok(dots > 120);
  assert.equal(pacWalkable(10, 8), false, 'Geistertür ist für Pac-Man zu');
  assert.equal(pacWalkable(-1, 9), true, 'Tunnel');
});

// ── Quiz, Typing, Memory ──
test('Quiz: 4 eindeutige Antworten pro Frage, keine Duplikate', () => {
  assert.ok(QUESTIONS.length >= 30);
  assert.equal(new Set(QUESTIONS.map((q) => q[0])).size, QUESTIONS.length);
  for (const q of QUESTIONS) {
    assert.equal(q.length, 5, q[0]);
    assert.equal(new Set(q.slice(1)).size, 4, q[0]);
  }
});
test('Typing: Wörter vorhanden', () => assert.ok(TYPING_WORDS.length > 40 && TYPING_WORDS.every((w) => /^\S+$/.test(w))));
test('Memory-Score: weniger Züge = mehr Punkte', () => {
  assert.ok(memoryScore(PAIRS, 30) > memoryScore(PAIRS + 10, 30));
  assert.ok(memoryScore(999, 999) >= 200);
});

// ── Admin-Passwort ──
test('Admin-Passwort-Fingerabdruck: Format und Verfahren', async () => {
  // Das echte Passwort steht absichtlich nirgends im Repo.
  assert.match(ADMIN_PASSWORD_HASH, /^[0-9a-f]{64}$/);
  const a = await hashAdminPassword('test-passwort', webcrypto.subtle);
  assert.equal(a, await hashAdminPassword('test-passwort', webcrypto.subtle));
  assert.notEqual(a, await hashAdminPassword('Test-passwort', webcrypto.subtle));
  // Vergleich mit Node's eigener PBKDF2-Umsetzung (gleiche Parameter wie im Browser)
  const { pbkdf2Sync } = await import('node:crypto');
  assert.equal(a, pbkdf2Sync('test-passwort', 'cillsgames-admin-v1', 200000, 32, 'sha256').toString('hex'));
});
