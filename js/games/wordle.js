// 📝 Wordle (Deutsch) – Tageswort oder Zufallswort, Statistik, Ergebnis teilen.
import { todayKey } from '../util.js';

export const modes = [
  { id: 'daily', label: 'Tageswort', desc: 'Jeden Tag ein neues Wort – für alle gleich' },
  { id: 'random', label: 'Zufallswort', desc: 'Beliebig oft spielen' },
];

// Nur echte, gängige Wörter mit 5 Buchstaben (ohne Umlaute; ss statt ß wie in der Schweiz).
export const WORDS = [...new Set(`
ABEND ACHSE ADLER AFFEN AGENT AKTIE ALARM ALBUM ALLES ALTER AMPEL ANGEL ANGST ANKER APFEL ARENA ATLAS AUGEN
BACKE BANDE BARON BASIS BAUCH BAUEN BAUER BEERE BERGE BESEN BETEN BETON BIBER BIENE BIRNE BITTE BLASS BLATT
BLECH BLICK BLIND BLITZ BLOCK BLUME BLUSE BODEN BOGEN BRAND BRAUT BREIT BRETT BRIEF BRISE BRUST BUCHE
CHAOS CHIPS COUCH CREME CURRY DACHS DAMEN DAMPF DATEN DAUER DECKE DEICH DELTA DICHT DINGE DISCO DOLCH DRAHT
DRAMA DUNST DURST EBENE ECHSE EIMER EISEN ELFEN ENGEL ENKEL ERBSE ERNTE ERSTE ESSEN ESSIG ETAGE EULEN
FABEL FADEN FAHNE FALKE FALLE FARBE FASER FAUST FEDER FEIER FELGE FERNE FERSE FEUER FIBEL FIRMA FISCH FLECK
FLOSS FLUCH FLUSS FOLIE FORUM FRAGE FRECH FRIST FUCHS FUNKE GABEL GASSE GEBET GEHEN GEIGE GEIST GENIE
GLANZ GLATT GLEIS GNADE GRAMM GRELL GRIFF GRILL GRIPS GROLL GROSS GRUFT GRUND GUMMI GURKE
HAFEN HAGEL HALLE HANDY HARFE HARKE HASEN HAUPT HEBEL HECKE HEIDE HEISS HENNE HERDE HEXEN HILFE HIRSE HIRTE
HITZE HOBBY HOBEL HOLEN HONIG HOTEL HUMOR HUNDE IDEAL IMKER INDEX INSEL JACKE JAGEN JAHRE JEANS JUBEL JUNGE
KABEL KAKAO KAMEL KAMIN KAMPF KANAL KANNE KANTE KARTE KASSE KATZE KEGEL KEHLE KELCH KELLE KERNE KERZE KETTE
KEULE KISTE KLANG KLAUE KLEID KLEIN KLIMA KLUFT KNABE KNALL KNETE KNOPF KOBRA KOHLE KOMET KONTO KOPIE KRAFT
KRANZ KRAUT KREBS KREIS KREUZ KRONE KUGEL KUNST KURVE LACHS LADEN LAGER LAMPE LANGE LANZE LASER LATTE LAUNE
LEBEN LEDER LEGEN LEHRE LEINE LEISE LESEN LICHT LIEBE LILIE LINIE LINSE LISTE LOCKE LOGIK LOTSE LUCHS LUNGE
MAGEN MAKEL MALEN MANGO MARKE MARKT MASKE MAUER MEILE MENGE MESSE MIENE MILCH MINZE MITTE MONAT MOTOR MOTTE
MUSIK MUTIG NABEL NACHT NADEL NAGEL NARBE NATUR NEBEL NEFFE NONNE NOTEN NUDEL OCHSE OFFEN ONKEL OPFER ORGEL
OSTEN OTTER OZEAN PALME PANDA PAPST PARTY PASTA PAUSE PERLE PFAHL PFAND PFEIL PFERD PFLUG PFOTE PFUND PHASE
PILLE PILOT PILZE PINIE PIRAT PISTE PIZZA PLATZ POKAL PREIS PRINZ PROBE PUDEL PULLI PUMPE PUPPE QUARK QUOTE
RABEN RADAR RADIO RASEN RATEN RATTE RAUCH RAUPE REDEN REGAL REGEL REGEN REISE RENTE RIESE RINDE RINGE ROBBE
ROLLE ROSEN RUDER RUFEN RUHIG RUINE SACHE SAGEN SAHNE SALAT SALBE SAMEN SANFT SAUCE SAUER SAUNA SCHAF SCHAL
SCHAR SCHUH SECHS SEELE SEGEL SEHEN SEIFE SEITE SENKE SIRUP SKALA SOCKE SONNE SORTE SOSSE SPATZ SPECK SPIEL
SPION SPORT STAAT STADT STAHL STALL STAMM STAND STARK STAUB STEIN STERN STIEL STILL STIRN STOCK STOFF STOLZ
STROM STUBE STUHL STUMM STURM SUPPE TAFEL TANNE TANTE TASSE TAUBE TEICH TEMPO THEMA TIGER TINTE TISCH TITEL
TOAST TONNE TORTE TRAUM TREUE TRICK TRIEB TRUHE TULPE TURBO UMWEG UNION VATER VENUS VIDEO VIELE VILLA VIREN
VOGEL WAAGE WACHE WAFFE WAGEN WALZE WANGE WANNE WAREN WATTE WEIDE WELLE WELPE WENIG WERFT WESPE WESTE WETTE
WIESE WOCHE WOLKE WOLLE WUNDE WURST ZANGE ZEBRA ZECKE ZEHEN ZIEGE ZIELE ZITAT ZUNGE ZWEIG ZWERG
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

/** Tageswort: gleiches Datum -> gleiches Wort (einfacher, stabiler Hash). */
export function dailyWord(dateKey) {
  let h = 2166136261;
  for (const ch of 'cillsgames-' + dateKey) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return WORDS[(h >>> 0) % WORDS.length];
}

const ROWS = [['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']];
const STATS_KEY = 'cg_wordle_stats_v1';
const EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' };

function loadStats() {
  try { return { played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], daily: {}, ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}') }; }
  catch { return { played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0], daily: {} }; }
}
function saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* egal */ } }

export function start(host, mode = 'random') {
  const day = todayKey();
  const daily = mode === 'daily';
  const secret = daily ? dailyWord(day) : WORDS[Math.floor(Math.random() * WORDS.length)];
  const stats = loadStats();
  const alreadyDaily = daily && stats.daily[day];
  const startedAt = Date.now();
  const guesses = [];
  let current = '', done = false, message = alreadyDaily ? 'Heute schon gespielt – Übungsrunde ohne Punkte' : '', revealRow = -1;

  const root = document.createElement('div');
  root.className = 'wordle';
  host.stage.appendChild(root);

  function score() {
    const secs = (Date.now() - startedAt) / 1000;
    return (7 - guesses.length) * 100 + Math.max(0, Math.round(100 - secs / 3)) + (daily ? 100 : 0);
  }

  function finish(won) {
    done = true;
    const final = won && !alreadyDaily ? score() : 0;
    if (!alreadyDaily) {
      stats.played++;
      if (won) { stats.won++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); stats.dist[guesses.length - 1]++; } else stats.streak = 0;
      if (daily) stats.daily[day] = won ? guesses.length : 'X';
      // nur die letzten 60 Tage behalten
      const keys = Object.keys(stats.daily).sort();
      while (keys.length > 60) delete stats.daily[keys.shift()];
      saveStats(stats);
    }
    host.setScore(final);
    host.sound(won ? 'win' : 'lose');
    message = won ? ['Genial!', 'Grossartig!', 'Sehr gut!', 'Gut!', 'Knapp!', 'Puh!'][guesses.length - 1] : `Das Wort war ${secret}`;
    render();
    host.timeout(() => showResult(won, final), 1300);
  }

  function shareText(won) {
    const head = `CillsGames Wordle ${daily ? day : ''} ${won ? guesses.length : 'X'}/6`.replace(/\s+/g, ' ');
    return head + '\n' + guesses.map((g) => g.res.map((r) => EMOJI[r]).join('')).join('\n');
  }

  function showResult(won, final) {
    const max = Math.max(1, ...stats.dist);
    const panel = document.createElement('div');
    panel.className = 'wl-result';
    panel.innerHTML = `
      <h3>${won ? '🎉 Gelöst!' : '😕 Nicht geschafft'}</h3>
      <div class="wl-stats">
        <div><b>${stats.played}</b><span>Gespielt</span></div>
        <div><b>${stats.played ? Math.round((stats.won / stats.played) * 100) : 0}%</b><span>Gewonnen</span></div>
        <div><b>${stats.streak}</b><span>Serie</span></div>
        <div><b>${stats.best}</b><span>Beste Serie</span></div>
      </div>
      <div class="wl-dist">${stats.dist.map((n, i) => `<div><span>${i + 1}</span><i style="width:${Math.max(8, (n / max) * 100)}%" class="${won && i === guesses.length - 1 ? 'hit' : ''}">${n}</i></div>`).join('')}</div>
      <div class="wl-actions">
        <button type="button" class="btn btn-ghost" data-share>📋 Ergebnis kopieren</button>
        <button type="button" class="btn btn-primary" data-next>Weiter →</button>
      </div>`;
    root.appendChild(panel);
    panel.querySelector('[data-share]').onclick = async (e) => {
      try { await navigator.clipboard.writeText(shareText(won)); e.target.textContent = '✅ Kopiert!'; }
      catch { e.target.textContent = 'Kopieren nicht möglich'; }
    };
    panel.querySelector('[data-next]').onclick = () => host.end(final);
    panel.querySelector('[data-next]').focus();
  }

  function submit() {
    if (done) return;
    if (current.length !== 5) { message = 'Zu kurz – 5 Buchstaben!'; host.sound('error'); render(); shake(); return; }
    guesses.push({ word: current, res: checkGuess(current, secret) });
    revealRow = guesses.length - 1;
    current = '';
    message = '';
    const won = guesses[guesses.length - 1].res.every((r) => r === 'correct');
    if (won || guesses.length >= 6) { finish(won); return; }
    host.sound('click');
    render();
  }
  function press(k) {
    if (done) return;
    if (k === 'ENTER') return submit();
    if (k === '⌫' || k === 'BACKSPACE') current = current.slice(0, -1);
    else if (/^[A-Z]$/.test(k) && current.length < 5) current += k;
    if (!alreadyDaily || guesses.length) message = '';
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
    let html = `<div class="wl-head">${daily ? `📅 Tageswort ${day.split('-').reverse().join('.')}` : '🎲 Zufallswort'} · Serie ${stats.streak}</div><div class="wl-grid">`;
    for (let r = 0; r < 6; r++) {
      const won = done && r === guesses.length - 1 && guesses[r]?.res.every((x) => x === 'correct');
      html += `<div class="wl-row ${won ? 'won' : ''}">`;
      for (let c = 0; c < 5; c++) {
        if (r < guesses.length) {
          const g = guesses[r];
          const anim = r === revealRow ? ` reveal" style="animation-delay:${c * 0.12}s` : '';
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
    root.querySelector('.wl-result')?.remove();
    root.innerHTML = html;
    revealRow = -1;
  }
  host.on(root, 'click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) press(b.dataset.k);
  });
  render();
}
