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
    desc: 'Spring über Kakteen, sammle Münzen, Tag & Nacht.', div: 40, cap: 250,
    howto: `${k(['Leertaste', '↑', 'W'])} oder Tippen = springen – nochmal in der Luft = <b>Doppelsprung</b><br>${k(['↓', 'S'])} = ducken (in der Luft: schneller landen)<br>🪙 Münzen = Bonuspunkte. Es wird mit der Zeit schneller.` },
  { id: 'rocket', name: 'Space Rocket', emoji: '🚀', cat: 'arcade', bg: 'linear-gradient(180deg,#0a0a2e,#1a1a4e)',
    desc: 'Schiess Asteroiden und UFOs ab, sammle Powerups.', div: 35, cap: 250,
    howto: `${k(['↑', '↓', '←', '→'])} / ${k(['W', 'A', 'S', 'D'])} fliegen · ${k(['Leertaste'])} schiessen<br>Handy: Finger ziehen = fliegen + Dauerfeuer<br>🛡️ Schild · ⚡ Doppel-Laser · ❤️ Extraleben · UFOs schiessen zurück!` },
  { id: 'snake', name: 'Snake', emoji: '🐍', cat: 'arcade', bg: 'linear-gradient(135deg,#1a472a,#2d5a3f)',
    desc: 'Friss Äpfel, werde länger – mit oder ohne Wände.', div: 2, cap: 250,
    howto: `${k(['↑', '↓', '←', '→'])} / ${k(['W', 'A', 'S', 'D'])} oder Wischen.<br>🍎 = +10 · goldene Frucht = +50 · ❄ Eis = langsamer.<br>Modus <b>Hindernisse</b>: Jedes Level kommen Mauern dazu.` },
  { id: 'flappy', name: 'Flappy Bird', emoji: '🐦', cat: 'arcade', bg: 'linear-gradient(180deg,#87CEEB,#98FB98)',
    desc: 'Flieg durch die Röhren und hol dir Medaillen.', div: 0.6, cap: 250,
    howto: `${k(['Leertaste', '↑', 'W'])}, Klick oder Tippen = flattern.<br>⭐ in der Lücke = +2 · Röhren bewegen sich später.<br>🥉 10 · 🥈 20 · 🥇 40 Röhren.` },
  { id: 'pong', name: 'Pong', emoji: '🏓', cat: 'duel', bg: '#000',
    desc: 'Schlag die KI – wer zuerst 5 hat, gewinnt.', div: 8, cap: 150,
    howto: `${k(['↑', '↓'])} / ${k(['W', 'S'])} oder Maus/Finger bewegen.<br>Kante treffen = steiler · Schläger beim Treffen bewegen = <b>Spin</b>.` },
  { id: 'blockblast', name: 'Block Blast', emoji: '🟦', cat: 'puzzle', bg: 'linear-gradient(135deg,#1a1a3e,#3d0099,#ff006e)',
    desc: 'Leg Teile ab und räume Reihen – auch auf Zeit.', div: 20, cap: 250,
    howto: `Teil antippen, dann ins Feld tippen – oder ziehen.<br>Volle Reihen und Spalten verschwinden, mehrere auf einmal = Bonus.<br>Kombos hintereinander geben noch mehr. Leeres Feld = +500.` },
  { id: 'breakout', name: 'Breakout', emoji: '🧱', cat: 'arcade', bg: 'linear-gradient(180deg,#1a1a2e,#2d2d5a)',
    desc: 'Zerstöre alle Blöcke – 6 Level-Muster.', div: 20, cap: 250,
    howto: `${k(['←', '→'])} / ${k(['A', 'D'])} oder Maus/Finger · ${k(['Leertaste'])}/Klick = Start bzw. Laser<br>💥 Explosiv-Stein · grauer Metall-Stein braucht 5 Treffer<br>↔ grösser · − kleiner · ×3 Multiball · ⚡ Laser · 🐢 Zeitlupe · ♥ Leben` },
  { id: 'asteroids', name: 'Asteroids', emoji: '☄️', cat: 'arcade', bg: 'radial-gradient(#1a1a3e,#0a0a1e)',
    desc: 'Schiess die Asteroiden ab, weich UFOs aus.', div: 12, cap: 250,
    howto: `${k(['↑', 'W'])} Gas · ${k(['←', '→'])} drehen · ${k(['Leertaste'])} schiessen · ${k(['Shift'])} Hyperraum<br>Grosse Brocken zerfallen. Kleine lassen manchmal ⚡ oder 🛡️ fallen.` },
  { id: 'carracing', name: 'Car Racing', emoji: '🚗', cat: 'arcade', bg: 'linear-gradient(135deg,#1a1a1a,#3a3a3a)',
    desc: 'Weiche dem Verkehr aus – knapp vorbei gibt Bonus.', div: 30, cap: 250,
    howto: `${k(['←', '→'])} / ${k(['A', 'D'])} oder links/rechts tippen.<br>🪙 Münze · 🛡️ Schild · ⚡ Turbo · ⚫ Öl = Rutschen<br>Knapp an Autos vorbei = Kombo-Bonus!` },
  { id: 'bubbleshooter', name: 'Bubble Shooter', emoji: '🎯', cat: 'puzzle', bg: 'linear-gradient(135deg,#0a0a2e,#1a0a3e)',
    desc: 'Drei gleiche Farben platzen – mit Bomben.', div: 20, cap: 250,
    howto: `Zielen mit Maus/Finger, loslassen = Schuss · ${k(['Leertaste'])} schiesst.<br>${k(['X'])} oder Klick auf «Nächste» = Kugeln tauschen.<br>3+ gleiche platzen, hängende fallen ab. Alle 15 Schüsse kommt eine 💣.` },
  { id: 'wordle', name: 'Wordle', emoji: '📝', cat: 'brain', bg: 'linear-gradient(135deg,#1a1a1a,#2a2a3a)',
    desc: 'Errate das Wort – jeden Tag ein neues.', div: 10, cap: 150,
    howto: `Tippe ein deutsches Wort mit 5 Buchstaben und drücke Enter.<br>🟩 richtig · 🟨 falscher Platz · ⬛ nicht im Wort.<br>Tageswort: für alle gleich, Punkte einmal pro Tag. Ohne Umlaute.` },
  { id: 'tictactoe', name: 'Tic Tac Toe', emoji: '⭕', cat: 'duel', bg: 'linear-gradient(135deg,#0d1b2a,#1b263b)', unlock: 50,
    desc: 'Drei in einer Reihe – Serie über 3 Partien.', div: 4, cap: 50,
    howto: `Tippe ein Feld an (oder Tasten 1–9). Du bist ✕.<br>3 Partien, abwechselnd beginnt du oder die KI.<br>Sieg = 100 · Unentschieden = 30 (Unbesiegbar: doppelt).` },
  { id: 'typing', name: 'Typing Rush', emoji: '⌨️', cat: 'brain', bg: 'linear-gradient(135deg,#0a2a1a,#0a4a2a)', unlock: 80,
    desc: 'Tipp so schnell du kannst – mit WPM-Anzeige.', div: 40, cap: 250,
    howto: `Tippe das Wort ab – es zählt sofort, Enter ist nicht nötig.<br>Mehrere richtig in Folge = Multiplikator bis ×4.<br>3 Leben, die Wörter werden länger.` },
  { id: 'memory', name: 'Memory', emoji: '🃏', cat: 'brain', bg: 'linear-gradient(135deg,#1a0a2e,#3d0066)', unlock: 100,
    desc: 'Finde alle Paare – drei Grössen, fünf Themen.', div: 60, cap: 120,
    howto: `Decke zwei Karten auf. Gleiche bleiben offen.<br>Paare direkt hintereinander = Kombo-Bonus.<br>Weniger Züge und schneller = mehr Punkte.` },
  { id: 'connect4', name: 'Vier gewinnt', emoji: '🔴', cat: 'duel', bg: 'linear-gradient(135deg,#00008B,#00003d)', unlock: 120,
    desc: 'Vier in einer Reihe gegen eine starke KI.', div: 8, cap: 80,
    howto: `Tippe eine Spalte an (oder Tasten 1–7). Du bist 🔴.<br>Die Vorschau zeigt, wo dein Stein landet.<br>Schneller Sieg = mehr Punkte.` },
  { id: 'minesweeper', name: 'Minesweeper', emoji: '💣', cat: 'puzzle', bg: 'linear-gradient(135deg,#1a2a1a,#2a3a2a)', unlock: 150,
    desc: 'Finde alle sicheren Felder – 3 Feldgrössen.', div: 50, cap: 200,
    howto: `Klick = aufdecken · Rechtsklick/langes Drücken = Flagge (oder Flaggen-Modus).<br>Klick auf eine Zahl mit passenden Flaggen deckt die Nachbarn auf.<br>Der erste Klick ist immer sicher.` },
  { id: 'towerdefense', name: 'Tower Defense', emoji: '🏰', cat: 'puzzle', bg: 'linear-gradient(135deg,#0a2a0a,#1a3a0a)', unlock: 180,
    desc: 'Bau und rüste Türme auf, halte die Wellen auf.', div: 25, cap: 250,
    howto: `Turm unten wählen (oder 1–4), dann aufs Gras tippen.<br>Eigenen Turm antippen = <b>aufrüsten</b> (U, bis Stufe 3) oder verkaufen (V).<br>⏩ 2× Tempo (F) · «Welle jetzt» (N) gibt Bonus-Gold. Jede 5. Welle: Boss.` },
  { id: 'tetris', name: 'Tetris', emoji: '🧩', cat: 'puzzle', bg: 'linear-gradient(135deg,#0f0c29,#302b63)', unlock: 200,
    desc: 'Stapel die Blöcke – Marathon, Sprint oder Ultra.', div: 15, cap: 250,
    howto: `${k(['←', '→'])} bewegen · ${k(['↑'])} drehen · ${k(['↓'])} schneller · ${k(['Leertaste'])} fallen lassen · ${k(['C'])} halten.<br>4 Linien = TETRIS · zweimal hintereinander = Back-to-Back-Bonus.` },
  { id: 'quiz', name: 'Quiz Master', emoji: '❓', cat: 'brain', bg: 'linear-gradient(135deg,#2a0a0a,#4a0a0a)', unlock: 250,
    desc: 'Teste dein Wissen in 4 Kategorien.', div: 40, cap: 120,
    howto: `15 Fragen, je 15 Sekunden. Tasten 1–4 gehen auch.<br>Schnell antworten und Serien bringen Bonus.<br>Joker: ✂️ 50:50 und ⏳ +10 Sekunden – je einmal pro Runde.` },
  { id: 'pacman', name: 'Pac-Man', emoji: '👻', cat: 'arcade', bg: 'linear-gradient(135deg,#000,#1a1a00)', unlock: 300,
    desc: 'Friss alle Punkte, meide die Geister.', div: 60, cap: 250,
    howto: `${k(['↑', '↓', '←', '→'])} / ${k(['W', 'A', 'S', 'D'])} oder Wischen.<br>⚡ Kraftpillen machen Geister essbar · 🍒 Früchte = Bonus.<br>Ab 10'000 Punkten gibt es ein Extraleben.` },
];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

/** Wandelt einen Spiel-Score in CillsGames-Punkte um. */
export function pointsForScore(gameId, score) {
  const g = GAME_BY_ID[gameId];
  score = Math.max(0, Math.floor(Number(score) || 0));
  if (!g || score <= 0) return 0;
  return Math.min(g.cap, Math.max(1, Math.floor(score / g.div)));
}
