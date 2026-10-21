// ⌨️ Typing Rush – echtes Eingabefeld (Handy-Tastatur geht auf), Wörter werden länger, WPM-Anzeige.
export const modes = [
  { id: 'easy', label: 'Leicht', desc: 'Kurze Wörter, viel Zeit' },
  { id: 'normal', label: 'Normal', desc: 'Gemischte Wörter' },
  { id: 'hard', label: 'Profi', desc: 'Lange Wörter, wenig Zeit, Gross/Klein zählt – Punkte ×1.5' },
];
const CFG = {
  easy: { time: 12, min: 5, caseSensitive: false, mult: 1 },
  normal: { time: 10, min: 3, caseSensitive: false, mult: 1 },
  hard: { time: 8, min: 3, caseSensitive: true, mult: 1.5 },
};

export const WORDS = ['Apfel', 'Baum', 'Haus', 'Auto', 'Schule', 'Katze', 'Hund', 'Sonne', 'Mond', 'Stern', 'Blume', 'Wasser',
  'Feuer', 'Erde', 'König', 'Schloss', 'Ritter', 'Drache', 'Computer', 'Tastatur', 'Bildschirm', 'Maus', 'Netzwerk', 'Programm',
  'Internet', 'Browser', 'Spiel', 'Level', 'Punkte', 'Leben', 'Held', 'Schatz', 'Zauber', 'Schwert', 'Schild', 'Rüstung', 'Bogen',
  'Berg', 'Fluss', 'Brücke', 'Zug', 'Bahnhof', 'Käse', 'Schokolade', 'Uhr', 'Alpen', 'Bern', 'Zürich', 'Gletscher', 'Murmeltier',
  'Fondue', 'Velo', 'Rakete', 'Planet', 'Galaxie', 'Komet', 'Roboter', 'Pixel', 'Joystick', 'Highscore', 'Champion', 'Turnier',
  'Abenteuer', 'Geheimnis', 'Schnell', 'Blitz', 'Donner', 'Regenbogen', 'Schneeflocke', 'Eisbär', 'Pinguin', 'Delfin', 'Krokodil',
  'Ball', 'Tor', 'Kuh', 'Gras', 'Brot', 'Tee', 'Bus', 'Hut', 'Rad', 'Ski', 'See', 'Wind', 'Wolke', 'Insel', 'Ozean', 'Vulkan',
  'Lawine', 'Seilbahn', 'Taschenlampe', 'Fernbedienung', 'Kopfhörer', 'Mikrofon', 'Lautsprecher', 'Weltraum', 'Astronaut',
  'Schmetterling', 'Eichhörnchen', 'Feuerwerk', 'Geburtstag', 'Hausaufgaben', 'Pausenbrot', 'Wanderung', 'Sternschnuppe',
  'Zahnbürste', 'Kühlschrank', 'Waschmaschine', 'Staubsauger', 'Treppenhaus', 'Briefkasten', 'Sonnenbrille', 'Regenschirm'];

export function wordTime(score, base = 10) { return Math.max(3, base - Math.floor(score / 250)); }

/** Wortpool je nach Fortschritt: am Anfang kurz, später auch lange Wörter. */
export function poolFor(level, mode = 'normal') {
  const maxLen = mode === 'easy' ? 7 + level : 5 + level * 2;
  const minLen = mode === 'hard' ? Math.min(8, 4 + level) : 1;
  const pool = WORDS.filter((w) => w.length <= maxLen && w.length >= minLen);
  return pool.length >= 8 ? pool : WORDS;
}

export function start(host, mode = 'normal') {
  const C = CFG[mode] || CFG.normal;
  let score = 0, lives = 3, word = '', timeLeft = C.time, maxTime = C.time, done = false, streak = 0, last = '', typedChars = 0, level = 1;
  const t0 = Date.now();
  const root = document.createElement('div');
  root.className = 'typing';
  root.innerHTML = `
    <div class="typ-stats"><span class="typ-score">🎯 0</span><span class="typ-lives">❤️❤️❤️</span><span class="typ-wpm">⚡ 0 WPM</span><span class="typ-time">⏱️ ${C.time}s</span></div>
    <div class="typ-bar"><div class="typ-fill"></div></div>
    <div class="typ-combo"></div>
    <div class="typ-word" aria-live="polite"></div>
    <input class="typ-input input" data-game-input="1" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Wort eintippen" placeholder="Hier tippen…">
    <div class="typ-hint">${C.caseSensitive ? 'Profi: Gross-/Kleinschreibung zählt!' : 'Enter ist nicht nötig – das Wort zählt, sobald es stimmt.'}</div>`;
  host.stage.appendChild(root);
  const input = root.querySelector('.typ-input');
  const wordEl = root.querySelector('.typ-word');
  host.timeout(() => input.focus(), 50);
  host.on(root, 'pointerdown', (e) => { if (e.target !== input) { e.preventDefault(); input.focus(); } });

  const same = (a, b) => (C.caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase());
  const startsWith = (w, t) => (C.caseSensitive ? w.startsWith(t) : w.toLowerCase().startsWith(t.toLowerCase()));

  function next() {
    const pool = poolFor(level, mode);
    do { word = pool[Math.floor(Math.random() * pool.length)]; } while (word === last && pool.length > 1);
    last = word;
    maxTime = timeLeft = Math.max(3, wordTime(score, C.time) + Math.floor(word.length / 5));
    input.value = '';
    render();
  }
  function render() {
    const typed = input.value;
    wordEl.innerHTML = [...word].map((ch, i) => {
      const cls = i < typed.length ? (same(typed[i], ch) ? 'ok' : 'bad') : i === typed.length ? 'cur' : '';
      return `<span class="${cls}">${ch}</span>`;
    }).join('');
    const mins = Math.max(1 / 60, (Date.now() - t0) / 60000);
    root.querySelector('.typ-score').textContent = `🎯 ${score}`;
    root.querySelector('.typ-lives').textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    root.querySelector('.typ-wpm').textContent = `⚡ ${Math.round(typedChars / 5 / mins)} WPM`;
    root.querySelector('.typ-time').textContent = `⏱️ ${timeLeft}s`;
    root.querySelector('.typ-combo').textContent = streak >= 3 ? `🔥 ${streak} in Folge · ×${Math.min(4, 1 + Math.floor(streak / 3))}` : '';
    const fill = root.querySelector('.typ-fill');
    fill.style.width = (timeLeft / maxTime) * 100 + '%';
    fill.classList.toggle('low', timeLeft <= 3);
  }
  host.on(input, 'input', () => {
    if (done) return;
    const typed = input.value;
    if (same(typed, word)) {
      streak++;
      typedChars += word.length + 1;
      const mult = Math.min(4, 1 + Math.floor(streak / 3));
      score += Math.round((timeLeft * 10 + word.length * 5) * mult * C.mult);
      if (streak % 5 === 0) level++;
      host.setScore(score);
      host.sound(streak % 5 === 0 ? 'coin' : 'point');
      wordEl.classList.remove('pop'); void wordEl.offsetWidth; wordEl.classList.add('pop');
      next();
      return;
    }
    if (!startsWith(word, typed)) host.sound('error');
    render();
  });
  host.interval(() => {
    if (done) return;
    timeLeft--;
    if (timeLeft <= 0) {
      lives--;
      streak = 0;
      host.sound('lose');
      root.classList.remove('hurt'); void root.offsetWidth; root.classList.add('hurt');
      if (lives <= 0) { done = true; input.disabled = true; render(); host.end(score); return; }
      next();
      return;
    }
    render();
  }, 1000);
  next();
}
