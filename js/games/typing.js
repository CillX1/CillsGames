// ⌨️ Typing Rush – mit echtem Eingabefeld, damit auch die Handy-Tastatur aufgeht.
export const WORDS = ['Apfel', 'Baum', 'Haus', 'Auto', 'Schule', 'Katze', 'Hund', 'Sonne', 'Mond', 'Stern', 'Blume', 'Wasser',
  'Feuer', 'Erde', 'König', 'Schloss', 'Ritter', 'Drache', 'Computer', 'Tastatur', 'Bildschirm', 'Maus', 'Netzwerk', 'Programm',
  'Internet', 'Browser', 'Spiel', 'Level', 'Punkte', 'Leben', 'Held', 'Schatz', 'Zauber', 'Schwert', 'Schild', 'Rüstung', 'Bogen',
  'Berg', 'Fluss', 'Brücke', 'Zug', 'Bahnhof', 'Käse', 'Schokolade', 'Uhr', 'Alpen', 'Bern', 'Zürich', 'Gletscher', 'Murmeltier',
  'Fondue', 'Velo', 'Rakete', 'Planet', 'Galaxie', 'Komet', 'Roboter', 'Pixel', 'Joystick', 'Highscore', 'Champion', 'Turnier',
  'Abenteuer', 'Geheimnis', 'Schnell', 'Blitz', 'Donner', 'Regenbogen', 'Schneeflocke', 'Eisbär', 'Pinguin', 'Delfin', 'Krokodil'];

export function wordTime(score) { return Math.max(3, 10 - Math.floor(score / 250)); }

export function start(host) {
  let score = 0, lives = 3, word = '', timeLeft = 10, maxTime = 10, done = false, streak = 0, last = '';
  const root = document.createElement('div');
  root.className = 'typing';
  root.innerHTML = `
    <div class="typ-stats"><span class="typ-score">🎯 0</span><span class="typ-lives">❤️❤️❤️</span><span class="typ-time">⏱️ 10s</span></div>
    <div class="typ-bar"><div class="typ-fill"></div></div>
    <div class="typ-word" aria-live="polite"></div>
    <input class="typ-input input" data-game-input="1" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Wort eintippen" placeholder="Hier tippen…">
    <div class="typ-hint">Enter ist nicht nötig – das Wort zählt, sobald es stimmt.</div>`;
  host.stage.appendChild(root);
  const input = root.querySelector('.typ-input');
  const wordEl = root.querySelector('.typ-word');
  host.timeout(() => input.focus(), 50);
  host.on(root, 'pointerdown', (e) => { if (e.target !== input) { e.preventDefault(); input.focus(); } });

  function next() {
    do { word = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (word === last);
    last = word;
    maxTime = timeLeft = wordTime(score);
    input.value = '';
    render();
  }
  function render() {
    const typed = input.value;
    wordEl.innerHTML = [...word].map((ch, i) => {
      const cls = i < typed.length ? (typed[i].toLowerCase() === ch.toLowerCase() ? 'ok' : 'bad') : i === typed.length ? 'cur' : '';
      return `<span class="${cls}">${ch}</span>`;
    }).join('');
    root.querySelector('.typ-score').textContent = `🎯 ${score}`;
    root.querySelector('.typ-lives').textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    root.querySelector('.typ-time').textContent = `⏱️ ${timeLeft}s`;
    const fill = root.querySelector('.typ-fill');
    fill.style.width = (timeLeft / maxTime) * 100 + '%';
    fill.classList.toggle('low', timeLeft <= 3);
  }
  host.on(input, 'input', () => {
    if (done) return;
    const typed = input.value;
    if (typed.toLowerCase() === word.toLowerCase()) {
      streak++;
      score += timeLeft * 10 + word.length * 5 + Math.min(10, streak) * 5;
      host.setScore(score);
      host.sound('point');
      next();
      return;
    }
    if (!word.toLowerCase().startsWith(typed.toLowerCase())) host.sound('error');
    render();
  });
  host.interval(() => {
    if (done) return;
    timeLeft--;
    if (timeLeft <= 0) {
      lives--;
      streak = 0;
      host.sound('lose');
      if (lives <= 0) { done = true; input.disabled = true; render(); host.end(score); return; }
      next();
      return;
    }
    render();
  }, 1000);
  next();
}
