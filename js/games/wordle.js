// 📝 Wordle (Deutsch) – nur echte 5-Buchstaben-Wörter ohne Umlaute.
export const WORDS = [...new Set(`
APFEL BAUCH FEUER HABEN IMMER JETZT LADEN MACHT NACHT OFFEN PFERD SEHEN TIGER UNTER VOGEL WOCHE
DURCH ERSTE FRAGE HEUTE INSEL JUNGE KREIS LANGE MITTE PLATZ RAUCH SCHON TISCH WENIG BITTE DINGE
GRUND HILFE LICHT REGEN STURM MUSIK FARBE BLUME STERN TRAUM SPIEL BREIT NEBEL RIESE SEELE TOAST
BRAND ESSEN GLANZ KARTE LAGER MOTIV NATUR PREIS SAHNE VATER ZIELE ABEND BEERE ENGEL FISCH HAFEN
KOHLE MARKE PAKET RADIO SAUCE TAFEL VIDEO WAGEN ACHSE BIRKE CURRY DOLCH EBENE FOLIE GABEL HARFE
KABEL LINIE MIXER NUDEL OZEAN PUMPE ROLLE SAUNA TORTE ALARM BLOCK CHAOS DELTA JACKE KAMPF LIEBE
PROBE SPORT THEMA HEXEN PIANO SCHAF ZEBRA ADLER BIENE DACHS HONIG KATZE MAUER NAGEL ONKEL PILOT
QUARK TANTE WOLKE ZWERG BODEN BRIEF DAMPF DECKE DRAHT EIMER FEDER FLUSS GEIST HAGEL JAGEN KAKAO
KERZE KLANG KNOPF KRAFT LEDER MANGO MONAT MOTOR NADEL NOTEN ORGEL PERLE PIRAT SALAT SCHUH SEGEL
SONNE STAHL STAUB STEIN STOFF STROM STUHL TASSE TEICH TIERE TONNE VILLA WIESE ZANGE ZWEIG KNALL
OPFER TURBO UMWEG VIREN ZUNFT BLITZ BIRNE FALKE GRILL HERDE
`.trim().split(/\s+/).filter((w) => /^[A-Z]{5}$/.test(w)))];

/** Bewertet einen Tipp wie das Original: zuerst exakte Treffer, dann vorhandene Buchstaben (mit Anzahl). */
export function checkGuess(guess, secret) {
  const res = Array(5).fill('absent');
  const remaining = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) res[i] = 'correct';
    else remaining[secret[i]] = (remaining[secret[i]] || 0) + 1;
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === 'correct') continue;
    if (remaining[guess[i]] > 0) { res[i] = 'present'; remaining[guess[i]]--; }
  }
  return res;
}

const ROWS = [['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']];

export function start(host) {
  const secret = WORDS[Math.floor(Math.random() * WORDS.length)];
  const startedAt = Date.now();
  const guesses = [];
  let current = '', done = false, message = '', revealRow = -1;

  const root = document.createElement('div');
  root.className = 'wordle';
  host.stage.appendChild(root);

  function score() {
    const secs = (Date.now() - startedAt) / 1000;
    return (7 - guesses.length) * 100 + Math.max(0, Math.round(100 - secs / 3));
  }

  function submit() {
    if (done) return;
    if (current.length !== 5) { message = 'Zu kurz – 5 Buchstaben!'; host.sound('error'); shake(); render(); return; }
    guesses.push({ word: current, res: checkGuess(current, secret) });
    revealRow = guesses.length - 1;
    current = '';
    message = '';
    const won = guesses[guesses.length - 1].res.every((r) => r === 'correct');
    if (won || guesses.length >= 6) {
      done = true;
      const final = won ? score() : 0;
      host.setScore(final);
      host.sound(won ? 'win' : 'lose');
      message = won ? ['Genial!', 'Grossartig!', 'Sehr gut!', 'Gut!', 'Knapp!', 'Puh!'][guesses.length - 1] : `Das Wort war ${secret}`;
      host.timeout(() => host.end(final), 1600);
    } else host.sound('click');
    render();
  }
  function press(k) {
    if (done) return;
    if (k === 'ENTER') return submit();
    if (k === '⌫' || k === 'BACKSPACE') current = current.slice(0, -1);
    else if (/^[A-Z]$/.test(k) && current.length < 5) current += k;
    message = '';
    render();
  }
  function shake() {
    const row = root.querySelectorAll('.wl-row')[guesses.length];
    row?.classList.remove('shake'); void row?.offsetWidth; row?.classList.add('shake');
  }

  host.onKey((e) => {
    if (e.key === 'Enter') press('ENTER');
    else if (e.key === 'Backspace') press('⌫');
    else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
  });

  function keyState() {
    const st = {};
    const rank = { absent: 1, present: 2, correct: 3 };
    for (const g of guesses) [...g.word].forEach((ch, i) => { if (!st[ch] || rank[g.res[i]] > rank[st[ch]]) st[ch] = g.res[i]; });
    return st;
  }

  function render() {
    const ks = keyState();
    let html = '<div class="wl-grid">';
    for (let r = 0; r < 6; r++) {
      html += '<div class="wl-row">';
      for (let c = 0; c < 5; c++) {
        if (r < guesses.length) {
          const g = guesses[r];
          const anim = r === revealRow ? ` reveal" style="animation-delay:${c * 0.09}s` : '';
          html += `<div class="wl-cell ${g.res[c]}${anim}">${g.word[c]}</div>`;
        } else if (r === guesses.length && !done) {
          html += `<div class="wl-cell ${current[c] ? 'filled' : ''}">${current[c] || ''}</div>`;
        } else html += '<div class="wl-cell"></div>';
      }
      html += '</div>';
    }
    html += `</div><div class="wl-msg" aria-live="polite">${message}</div><div class="wl-kb">`;
    for (const row of ROWS) {
      html += '<div class="wl-kb-row">';
      for (const k of row) html += `<button type="button" class="wl-key ${ks[k] || ''} ${k.length > 1 ? 'wide' : ''}" data-k="${k}">${k}</button>`;
      html += '</div>';
    }
    html += '</div>';
    root.innerHTML = html;
    revealRow = -1; // nur einmal animieren
  }
  host.on(root, 'click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) press(b.dataset.k);
  });
  render();
}
