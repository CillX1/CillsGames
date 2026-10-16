// Spielkatalog. `div` teilt den Spiel-Score in Punkte um, `cap` begrenzt die Punkte pro Runde
// (damit niemand mit einem einzigen Bug-Run tausende Punkte farmen kann).
// Richtwert: normale Runde ≈ 20–40 Punkte, sehr gute Runde ≈ 80–150.

export const CATEGORIES = {
  arcade: '🕹️ Arcade',
  puzzle: '🧩 Puzzle',
  brain: '🧠 Denken',
  duel: '⚔️ Duell',
};

const k = (keys) => keys.map((x) => `<kbd>${x}</kbd>`).join(' ');

export const GAMES = [
  { id: 'dino', name: 'Dino Runner', emoji: '🦖', cat: 'arcade', bg: 'linear-gradient(180deg,#87CEEB,#90EE90 70%,#228B22)',
    desc: 'Spring über Kakteen, duck dich vor Flugsauriern!', div: 40, cap: 250,
    howto: `${k(['Leertaste', '↑', 'W'])} oder Tippen = springen<br>${k(['↓', 'S'])} = ducken<br>Es wird mit der Zeit schneller.` },
  { id: 'rocket', name: 'Space Rocket', emoji: '🚀', cat: 'arcade', bg: 'linear-gradient(180deg,#0a0a2e,#1a1a4e)',
    desc: 'Weiche Asteroiden aus und sammle Schilde.', div: 35, cap: 250,
    howto: `${k(['↑', '↓', '←', '→'])} oder ${k(['W', 'A', 'S', 'D'])} steuern.<br>🛡️ Schild sammeln = 7 Sekunden unverwundbar.` },
  { id: 'snake', name: 'Snake', emoji: '🐍', cat: 'arcade', bg: 'linear-gradient(135deg,#1a472a,#2d5a3f)',
    desc: 'Friss Äpfel und werde länger.', div: 2, cap: 250,
    howto: `${k(['↑', '↓', '←', '→'])} / ${k(['W', 'A', 'S', 'D'])} oder Wischen.<br>🍎 = +10, 🌟 goldener Apfel = +50.<br>Wand oder eigener Schwanz = Ende.` },
  { id: 'flappy', name: 'Flappy Bird', emoji: '🐦', cat: 'arcade', bg: 'linear-gradient(180deg,#87CEEB,#98FB98)',
    desc: 'Flieg durch die Röhren.', div: 0.6, cap: 250,
    howto: `${k(['Leertaste', '↑', 'W'])}, Klick oder Tippen = flattern.<br>Alle 5 Röhren wird es schneller.` },
  { id: 'pong', name: 'Pong', emoji: '🏓', cat: 'duel', bg: '#000',
    desc: 'Schlag die KI – wer zuerst 5 hat, gewinnt.', div: 8, cap: 150,
    howto: `${k(['↑', '↓'])} / ${k(['W', 'S'])} oder Maus/Finger bewegen.<br>Triffst du mit der Schlägerkante, fliegt der Ball steiler.` },
  { id: 'blockblast', name: 'Block Blast', emoji: '🟦', cat: 'puzzle', bg: 'linear-gradient(135deg,#1a1a3e,#3d0099,#ff006e)',
    desc: 'Leg Teile ab und räume Reihen.', div: 20, cap: 250,
    howto: 'Teil antippen, dann ins Feld tippen (oder ziehen).<br>Volle Reihen und Spalten verschwinden.<br>Mehrere auf einmal = Bonus.' },
  { id: 'breakout', name: 'Breakout', emoji: '🧱', cat: 'arcade', bg: 'linear-gradient(180deg,#1a1a2e,#2d2d5a)',
    desc: 'Zerstöre alle Blöcke – Level für Level.', div: 20, cap: 250,
    howto: `${k(['←', '→'])} / ${k(['A', 'D'])} oder Maus/Finger.<br>${k(['Leertaste'])} oder Klick startet den Ball.<br>🟢 grösser · 🔴 kleiner · 🔵 +2 Bälle · 3 Leben.` },
  { id: 'asteroids', name: 'Asteroids', emoji: '☄️', cat: 'arcade', bg: 'radial-gradient(#1a1a3e,#0a0a1e)',
    desc: 'Schiess die Asteroiden ab.', div: 12, cap: 250,
    howto: `${k(['↑', 'W'])} Gas · ${k(['←', '→'])} drehen · ${k(['Leertaste'])} schiessen.<br>Grosse Brocken zerfallen in kleine. 3 Leben.` },
  { id: 'carracing', name: 'Car Racing', emoji: '🚗', cat: 'arcade', bg: 'linear-gradient(135deg,#1a1a1a,#3a3a3a)',
    desc: 'Weiche dem Verkehr aus.', div: 30, cap: 250,
    howto: `${k(['←', '→'])} / ${k(['A', 'D'])} oder links/rechts tippen.<br>⭐ Bonus · 🛡️ Schild · ⚡ Turbo.` },
  { id: 'bubbleshooter', name: 'Bubble Shooter', emoji: '🎯', cat: 'puzzle', bg: 'linear-gradient(135deg,#0a0a2e,#1a0a3e)',
    desc: 'Drei gleiche Farben platzen.', div: 20, cap: 250,
    howto: 'Zielen mit Maus/Finger, Klick/Loslassen schiesst.<br>3+ gleiche Farben platzen, hängende Kugeln fallen ab.<br>Alle 6 Schüsse rückt die Decke nach.' },
  { id: 'wordle', name: 'Wordle', emoji: '📝', cat: 'brain', bg: 'linear-gradient(135deg,#1a1a1a,#2a2a3a)',
    desc: 'Errate das Wort in 6 Versuchen.', div: 10, cap: 150,
    howto: 'Tippe ein deutsches Wort mit 5 Buchstaben und drücke Enter.<br>🟩 richtig · 🟨 falscher Platz · ⬛ nicht im Wort.<br>Alle Lösungswörter sind ohne Umlaute.' },
  { id: 'tictactoe', name: 'Tic Tac Toe', emoji: '⭕', cat: 'duel', bg: 'linear-gradient(135deg,#0d1b2a,#1b263b)', unlock: 50,
    desc: 'Drei in einer Reihe gegen die KI.', div: 4, cap: 50,
    howto: 'Tippe ein Feld an. Du bist ✕, die KI ist ◯.<br>Sieg = 100, Unentschieden = 30.' },
  { id: 'typing', name: 'Typing Rush', emoji: '⌨️', cat: 'brain', bg: 'linear-gradient(135deg,#0a2a1a,#0a4a2a)', unlock: 80,
    desc: 'Tipp so schnell du kannst.', div: 40, cap: 250,
    howto: 'Tippe das Wort ab – Gross/Klein ist egal.<br>3 Leben, die Zeit pro Wort wird kürzer.' },
  { id: 'memory', name: 'Memory', emoji: '🃏', cat: 'brain', bg: 'linear-gradient(135deg,#1a0a2e,#3d0066)', unlock: 100,
    desc: 'Finde alle Paare.', div: 60, cap: 120,
    howto: 'Decke zwei Karten auf. Gleiche bleiben offen.<br>Weniger Züge = mehr Punkte.' },
  { id: 'connect4', name: 'Vier gewinnt', emoji: '🔴', cat: 'duel', bg: 'linear-gradient(135deg,#00008B,#00003d)', unlock: 120,
    desc: 'Vier in einer Reihe gegen die KI.', div: 8, cap: 80,
    howto: 'Tippe eine Spalte an. Du bist 🔴, die KI 🟡.<br>Schneller Sieg = mehr Punkte.' },
  { id: 'minesweeper', name: 'Minesweeper', emoji: '💣', cat: 'puzzle', bg: 'linear-gradient(135deg,#1a2a1a,#2a3a2a)', unlock: 150,
    desc: 'Finde alle sicheren Felder.', div: 50, cap: 200,
    howto: 'Klick = aufdecken · Rechtsklick/langes Drücken = Flagge.<br>Klick auf eine Zahl mit passenden Flaggen deckt die Nachbarn auf.<br>Der erste Klick ist immer sicher.' },
  { id: 'towerdefense', name: 'Tower Defense', emoji: '🏰', cat: 'puzzle', bg: 'linear-gradient(135deg,#0a2a0a,#1a3a0a)', unlock: 180,
    desc: 'Bau Türme und halte die Wellen auf.', div: 25, cap: 250,
    howto: 'Turm unten wählen (oder Taste 1–4), dann aufs Gras tippen.<br>Eigenen Turm antippen = verkaufen (60 %).<br>Alle 4 Wellen kommt ein Boss.' },
  { id: 'tetris', name: 'Tetris', emoji: '🧩', cat: 'puzzle', bg: 'linear-gradient(135deg,#0f0c29,#302b63)', unlock: 200,
    desc: 'Stapel die Blöcke, räume Reihen.', div: 15, cap: 250,
    howto: `${k(['←', '→'])} bewegen · ${k(['↑'])} drehen · ${k(['↓'])} schneller · ${k(['Leertaste'])} fallen lassen · ${k(['C'])} halten.` },
  { id: 'quiz', name: 'Quiz Master', emoji: '❓', cat: 'brain', bg: 'linear-gradient(135deg,#2a0a0a,#4a0a0a)', unlock: 250,
    desc: 'Teste dein Wissen.', div: 40, cap: 120,
    howto: '15 Fragen, je 15 Sekunden.<br>Schnell antworten und Serien bringen Bonus.<br>Tasten 1–4 gehen auch.' },
  { id: 'pacman', name: 'Pac-Man', emoji: '👻', cat: 'arcade', bg: 'linear-gradient(135deg,#000,#1a1a00)', unlock: 300,
    desc: 'Friss alle Punkte, meide die Geister.', div: 60, cap: 250,
    howto: `${k(['↑', '↓', '←', '→'])} / ${k(['W', 'A', 'S', 'D'])} oder Wischen.<br>⚡ Kraftpillen machen Geister essbar. 3 Leben.` },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

/** Wandelt einen Spiel-Score in CillsGames-Punkte um. */
export function pointsForScore(gameId, score) {
  const g = GAME_BY_ID[gameId];
  score = Math.max(0, Math.floor(Number(score) || 0));
  if (!g || score <= 0) return 0;
  return Math.min(g.cap, Math.max(1, Math.floor(score / g.div)));
}
