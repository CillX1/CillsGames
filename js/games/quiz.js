// ❓ Quiz Master – Kategorien, 15 Fragen pro Runde, Joker (50:50 und +10 s).
import { shuffle } from '../util.js';

export const modes = [
  { id: 'mix', label: '🎲 Alles gemischt', desc: 'Fragen aus allen Kategorien' },
  { id: 'ch', label: '🇨🇭 Schweiz', desc: 'Kantone, Berge, Flüsse, Geschichte' },
  { id: 'natur', label: '🔬 Natur & Wissenschaft', desc: 'Tiere, Körper, Weltall, Chemie' },
  { id: 'welt', label: '🌍 Welt & Geschichte', desc: 'Länder, Hauptstädte, Ereignisse' },
];

// Format: [Kategorie, Frage, richtige Antwort, falsch, falsch, falsch]
export const QUESTIONS = [
  // Schweiz
  ['ch', 'Welche Stadt ist die Bundesstadt der Schweiz?', 'Bern', 'Zürich', 'Genf', 'Basel'],
  ['ch', 'Wie viele Kantone hat die Schweiz?', '26', '20', '23', '30'],
  ['ch', 'Wie viele Landessprachen hat die Schweiz?', '4', '3', '2', '5'],
  ['ch', 'Welcher Fluss fliesst durch Bern?', 'Aare', 'Limmat', 'Reuss', 'Rhone'],
  ['ch', 'Welcher Fluss fliesst aus dem Zürichsee durch Zürich?', 'Limmat', 'Aare', 'Rhone', 'Ticino'],
  ['ch', 'Welcher ist der höchste Berg der Schweiz?', 'Dufourspitze', 'Matterhorn', 'Eiger', 'Jungfrau'],
  ['ch', 'An welchem See liegt Genf?', 'Genfersee', 'Bodensee', 'Zürichsee', 'Lago Maggiore'],
  ['ch', 'Welches Tier ist das Wappentier von Bern?', 'Bär', 'Löwe', 'Adler', 'Steinbock'],
  ['ch', 'In welchem Jahr wurde die Eidgenossenschaft der Überlieferung nach gegründet?', '1291', '1315', '1848', '1515'],
  ['ch', 'Wann ist der Schweizer Nationalfeiertag?', '1. August', '1. Mai', '26. Oktober', '14. Juli'],
  ['ch', 'Welche Währung hat die Schweiz?', 'Franken', 'Euro', 'Mark', 'Krone'],
  ['ch', 'Welcher Kanton ist flächenmässig der grösste?', 'Graubünden', 'Bern', 'Wallis', 'Tessin'],
  ['ch', 'Welcher Kanton hat nur Italienisch als Amtssprache?', 'Tessin', 'Graubünden', 'Wallis', 'Uri'],
  ['ch', 'Welcher Schweizer Tennisspieler gewann 20 Grand-Slam-Titel?', 'Roger Federer', 'Stan Wawrinka', 'Marc Rosset', 'Dominic Stricker'],
  ['ch', 'Welcher Pass verbindet den Kanton Uri mit dem Tessin?', 'Gotthardpass', 'Simplonpass', 'Grimselpass', 'Julierpass'],
  ['ch', 'Wie viele Mitglieder hat der Schweizer Bundesrat?', '7', '5', '9', '12'],
  ['ch', 'Welche Schweizer Stadt hat am meisten Einwohner?', 'Zürich', 'Genf', 'Basel', 'Bern'],
  ['ch', 'Welches Käsegericht wird im Caquelon geschmolzen?', 'Fondue', 'Rösti', 'Birchermüesli', 'Zopf'],
  ['ch', 'Welcher Schweizer Fluss mündet ins Mittelmeer?', 'Rhone', 'Rhein', 'Aare', 'Inn'],
  ['ch', 'Wie heisst der längste Gletscher der Alpen?', 'Grosser Aletschgletscher', 'Rhonegletscher', 'Gornergletscher', 'Morteratschgletscher'],
  ['ch', 'In welchem Kanton liegt Zermatt?', 'Wallis', 'Bern', 'Graubünden', 'Tessin'],
  ['ch', 'Welche Farbe hat das Kreuz auf der Schweizer Flagge?', 'Weiss', 'Rot', 'Gold', 'Blau'],
  ['ch', 'Wofür steht die Abkürzung «CH»?', 'Confoederatio Helvetica', 'Canton Helvetia', 'Communitas Helvetica', 'Civitas Helvetiorum'],
  ['ch', 'Wie heisst der 57 km lange Eisenbahntunnel unter den Alpen, eröffnet 2016?', 'Gotthard-Basistunnel', 'Lötschberg-Basistunnel', 'Simplontunnel', 'Furka-Basistunnel'],
  ['ch', 'Wie heisst das Parlament der Schweiz?', 'Bundesversammlung', 'Bundestag', 'Landtag', 'Reichstag'],
  ['ch', 'Welcher Kanton wird mit «GR» abgekürzt?', 'Graubünden', 'Glarus', 'Genf', 'Grenchen'],
  ['ch', 'Welcher See ist der grösste, der ganz in der Schweiz liegt?', 'Neuenburgersee', 'Zürichsee', 'Vierwaldstättersee', 'Thunersee'],
  // Natur & Wissenschaft
  ['natur', 'Wie viele Planeten hat unser Sonnensystem?', '8', '7', '9', '10'],
  ['natur', 'Welcher Planet ist der Sonne am nächsten?', 'Merkur', 'Venus', 'Mars', 'Erde'],
  ['natur', 'Welcher Planet ist der grösste?', 'Jupiter', 'Saturn', 'Neptun', 'Erde'],
  ['natur', 'Was ist H₂O?', 'Wasser', 'Sauerstoff', 'Salz', 'Wasserstoff'],
  ['natur', 'Welches chemische Symbol hat Gold?', 'Au', 'Go', 'Gd', 'Ag'],
  ['natur', 'Welches Gas nehmen Pflanzen bei der Fotosynthese auf?', 'Kohlendioxid', 'Sauerstoff', 'Stickstoff', 'Helium'],
  ['natur', 'Wie viele Beine hat eine Spinne?', '8', '6', '10', '12'],
  ['natur', 'Welches ist das grösste Tier der Welt?', 'Blauwal', 'Afrikanischer Elefant', 'Giraffe', 'Weisser Hai'],
  ['natur', 'Welches Landtier ist am schnellsten?', 'Gepard', 'Löwe', 'Pferd', 'Antilope'],
  ['natur', 'Wie viele Knochen hat ein erwachsener Mensch ungefähr?', '206', '150', '300', '412'],
  ['natur', 'Welches Organ pumpt das Blut durch den Körper?', 'Herz', 'Lunge', 'Leber', 'Niere'],
  ['natur', 'Bei wie viel Grad Celsius kocht Wasser auf Meereshöhe?', '100', '90', '80', '120'],
  ['natur', 'Welcher Planet wird «Roter Planet» genannt?', 'Mars', 'Venus', 'Jupiter', 'Saturn'],
  ['natur', 'Was misst ein Thermometer?', 'Temperatur', 'Luftdruck', 'Geschwindigkeit', 'Feuchtigkeit'],
  ['natur', 'Um welchen Stern kreist die Erde?', 'Sonne', 'Polarstern', 'Sirius', 'Beteigeuze'],
  ['natur', 'Welches ist das härteste natürliche Material?', 'Diamant', 'Granit', 'Quarz', 'Marmor'],
  ['natur', 'Welches dieser Tiere ist ein Säugetier?', 'Delfin', 'Hai', 'Thunfisch', 'Pinguin'],
  ['natur', 'Was brauchen Pflanzen für die Fotosynthese ausser Wasser und CO₂?', 'Licht', 'Salz', 'Zucker', 'Sand'],
  ['natur', 'Welches ist das leichteste chemische Element?', 'Wasserstoff', 'Helium', 'Sauerstoff', 'Lithium'],
  ['natur', 'Wie lange braucht das Sonnenlicht ungefähr bis zur Erde?', '8 Minuten', '8 Sekunden', '8 Stunden', '8 Tage'],
  ['natur', 'Wie nennt man ein Tier, das nur Pflanzen frisst?', 'Pflanzenfresser', 'Fleischfresser', 'Allesfresser', 'Aasfresser'],
  ['natur', 'Was entsteht, wenn Sonnenlicht in Regentropfen gebrochen wird?', 'Regenbogen', 'Blitz', 'Nebel', 'Hagel'],
  ['natur', 'Wie viele Zähne hat ein Erwachsener mit Weisheitszähnen?', '32', '28', '24', '36'],
  ['natur', 'Welcher Planet hat die auffälligsten Ringe?', 'Saturn', 'Mars', 'Venus', 'Merkur'],
  ['natur', 'Welches ist das grösste Organ des Menschen?', 'Haut', 'Leber', 'Lunge', 'Gehirn'],
  ['natur', 'Wie heisst der natürliche Satellit der Erde?', 'Mond', 'Sonne', 'Venus', 'Phobos'],
  ['natur', 'Welches Tier legt Eier, obwohl es ein Säugetier ist?', 'Schnabeltier', 'Fledermaus', 'Wal', 'Känguru'],
  ['natur', 'Wie heisst die Wissenschaft von den Pflanzen?', 'Botanik', 'Zoologie', 'Geologie', 'Astronomie'],
  ['natur', 'Aus wie vielen Zellen besteht ein Bakterium?', 'Aus einer', 'Aus zwei', 'Aus hundert', 'Aus Millionen'],
  // Welt & Geschichte
  ['welt', 'Was ist die Hauptstadt von Deutschland?', 'Berlin', 'München', 'Hamburg', 'Frankfurt'],
  ['welt', 'Welcher ist der höchste Berg der Erde?', 'Mount Everest', 'K2', 'Mont Blanc', 'Kilimandscharo'],
  ['welt', 'Welcher Ozean ist der grösste?', 'Pazifik', 'Atlantik', 'Indischer Ozean', 'Arktischer Ozean'],
  ['welt', 'Auf welchem Kontinent liegt Ägypten?', 'Afrika', 'Asien', 'Europa', 'Australien'],
  ['welt', 'In welchem Land steht der Eiffelturm?', 'Frankreich', 'Italien', 'Belgien', 'Spanien'],
  ['welt', 'Welche Sprache spricht man in Brasilien?', 'Portugiesisch', 'Spanisch', 'Englisch', 'Französisch'],
  ['welt', 'In welchem Jahr endete der Zweite Weltkrieg?', '1945', '1944', '1946', '1939'],
  ['welt', 'Wer malte die Mona Lisa?', 'Leonardo da Vinci', 'Michelangelo', 'Picasso', 'Van Gogh'],
  ['welt', 'Was ist die Hauptstadt von Italien?', 'Rom', 'Mailand', 'Venedig', 'Neapel'],
  ['welt', 'Was ist die Hauptstadt von Österreich?', 'Wien', 'Salzburg', 'Graz', 'Innsbruck'],
  ['welt', 'Welcher ist der längste Fluss Europas?', 'Wolga', 'Donau', 'Rhein', 'Elbe'],
  ['welt', 'Welcher Kontinent ist der grösste?', 'Asien', 'Afrika', 'Europa', 'Nordamerika'],
  ['welt', 'In welchem Land liegt Tokio?', 'Japan', 'China', 'Südkorea', 'Thailand'],
  ['welt', 'Welche Stadt wird «Big Apple» genannt?', 'New York', 'Los Angeles', 'Chicago', 'London'],
  ['welt', 'Wer betrat 1969 als erster Mensch den Mond?', 'Neil Armstrong', 'Buzz Aldrin', 'Juri Gagarin', 'Michael Collins'],
  ['welt', 'In welchem Jahr fiel die Berliner Mauer?', '1989', '1990', '1961', '1979'],
  ['welt', 'Welches berühmte Bauwerk steht in China?', 'Chinesische Mauer', 'Kolosseum', 'Taj Mahal', 'Big Ben'],
  ['welt', 'Was ist die Hauptstadt von Spanien?', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia'],
  ['welt', 'Welcher Fluss fliesst durch Ägypten?', 'Nil', 'Amazonas', 'Kongo', 'Niger'],
  ['welt', 'Welches Land hat die Form eines Stiefels?', 'Italien', 'Griechenland', 'Portugal', 'Norwegen'],
  ['welt', 'Wer erfand in Europa den Buchdruck mit beweglichen Lettern?', 'Johannes Gutenberg', 'Martin Luther', 'Isaac Newton', 'Leonardo da Vinci'],
  ['welt', 'Was ist die Hauptstadt von Frankreich?', 'Paris', 'Lyon', 'Marseille', 'Nizza'],
  ['welt', 'Auf welchem Kontinent liegt Brasilien?', 'Südamerika', 'Afrika', 'Nordamerika', 'Asien'],
  ['welt', 'In welchem Land stehen die Pyramiden von Gizeh?', 'Ägypten', 'Mexiko', 'Peru', 'Griechenland'],
  ['welt', 'Was ist die Hauptstadt von Grossbritannien?', 'London', 'Manchester', 'Edinburgh', 'Liverpool'],
  ['welt', 'In welcher Stadt steht das Kolosseum?', 'Rom', 'Athen', 'Paris', 'Istanbul'],
  ['welt', 'Welches Land hat die meisten Einwohner?', 'Indien', 'USA', 'Indonesien', 'Brasilien'],
  ['welt', 'Wie heisst der grösste Regenwald der Erde?', 'Amazonas-Regenwald', 'Kongo-Regenwald', 'Schwarzwald', 'Borneo-Regenwald'],
  ['welt', 'Welches Land grenzt NICHT an die Schweiz?', 'Belgien', 'Österreich', 'Frankreich', 'Liechtenstein'],
  // Sport, Spiele & Mathe (nur im Mix)
  ['mix', 'Wie viele Seiten hat ein Würfel?', '6', '4', '8', '12'],
  ['mix', 'Was ist 12 × 12?', '144', '124', '134', '154'],
  ['mix', 'Was ist 15 % von 200?', '30', '15', '20', '35'],
  ['mix', 'Wie viele Minuten hat ein Tag?', '1440', '1200', '1240', '1640'],
  ['mix', 'Wie viele Tage hat ein Schaltjahr?', '366', '365', '364', '367'],
  ['mix', 'Wie viele Nullen hat eine Million?', '6', '5', '7', '9'],
  ['mix', 'Was ist die Quadratwurzel von 81?', '9', '8', '7', '18'],
  ['mix', 'Wer schrieb «Harry Potter»?', 'J. K. Rowling', 'J. R. R. Tolkien', 'Roald Dahl', 'Stephen King'],
  ['mix', 'Wie viele Spieler hat ein Fussballteam auf dem Platz?', '11', '10', '9', '12'],
  ['mix', 'Wie viele Felder hat ein Schachbrett?', '64', '48', '81', '100'],
  ['mix', 'Welche Farbe entsteht aus Blau und Gelb?', 'Grün', 'Lila', 'Orange', 'Braun'],
  ['mix', 'Wofür steht «www» im Internet?', 'World Wide Web', 'World Wide Window', 'Web World Wide', 'Wide World Web'],
  ['mix', 'Wie viele Bits hat ein Byte?', '8', '4', '10', '16'],
  ['mix', 'Wie viele Stunden hat eine Woche?', '168', '144', '186', '120'],
  ['mix', 'Welche Form hat ein Stoppschild?', 'Achteck', 'Sechseck', 'Kreis', 'Dreieck'],
  ['mix', 'Wie viele Ringe hat das olympische Symbol?', '5', '4', '6', '7'],
  ['mix', 'Wie lange dauert ein Fussballspiel ohne Nachspielzeit?', '90 Minuten', '60 Minuten', '80 Minuten', '100 Minuten'],
  ['mix', 'Was ist 7 × 8?', '56', '54', '64', '48'],
  ['mix', 'Wie viele Ecken hat ein Sechseck?', '6', '5', '7', '8'],
  ['mix', 'Wie viele Punkte gibt ein Touchdown im American Football?', '6', '3', '7', '2'],
  ['mix', 'Was ist die Hälfte von 3/4?', '3/8', '3/2', '1/4', '1/2'],
  ['mix', 'In welcher Sportart gibt es einen «Slam Dunk»?', 'Basketball', 'Volleyball', 'Tennis', 'Handball'],
  ['mix', 'Wie heisst der Spielstein, der im Schach nur diagonal zieht?', 'Läufer', 'Turm', 'Springer', 'Bauer'],
  ['mix', 'Wie viele Sekunden hat eine Stunde?', '3600', '600', '6000', '360'],
  ['mix', 'Was ist die nächste Primzahl nach 7?', '11', '9', '8', '13'],
];

export const QUESTION_TIME = 15;
export const ROUND_LENGTH = 15;

export function answerPoints(secondsLeft, streak) {
  return 100 + secondsLeft * 10 + (streak > 1 ? (streak - 1) * 25 : 0);
}

export function questionsFor(mode) {
  return mode === 'mix' || !mode ? QUESTIONS : QUESTIONS.filter((q) => q[0] === mode);
}

export function start(host, mode = 'mix') {
  const list = shuffle(questionsFor(mode)).slice(0, ROUND_LENGTH).map(([, q, right, ...wrong]) => {
    const answers = shuffle([right, ...wrong]);
    return { q, answers, correct: answers.indexOf(right) };
  });
  let idx = 0, score = 0, streak = 0, left = QUESTION_TIME, locked = false, correctCount = 0;
  const jokers = { half: true, time: true };
  let hidden = new Set();
  const root = document.createElement('div');
  root.className = 'quiz';
  host.stage.appendChild(root);

  function render(chosen = -1) {
    const q = list[idx];
    const isRight = chosen === q.correct;
    root.innerHTML = `
      <div class="quiz-top"><span>Frage ${idx + 1} / ${list.length}</span><span class="${streak > 1 ? 'hot' : ''}">🔥 Serie ${streak}</span><span class="quiz-left">⏱️ ${left}s</span></div>
      <div class="quiz-bar"><div class="quiz-fill ${left <= 5 ? 'low' : ''}" style="width:${(left / QUESTION_TIME) * 100}%"></div></div>
      <h3 class="quiz-q"></h3>
      <div class="quiz-answers">${q.answers.map((_, i) => `<button type="button" class="quiz-a" data-i="${i}"><b>${i + 1}</b><span></span></button>`).join('')}</div>
      <div class="quiz-jokers">
        <button type="button" class="btn btn-ghost btn-small" data-joker="half" ${jokers.half && !locked ? '' : 'disabled'}>✂️ 50:50</button>
        <button type="button" class="btn btn-ghost btn-small" data-joker="time" ${jokers.time && !locked ? '' : 'disabled'}>⏳ +10 Sekunden</button>
      </div>
      <div class="quiz-feedback" aria-live="polite"></div>`;
    root.querySelector('.quiz-q').textContent = q.q;
    root.querySelectorAll('.quiz-a').forEach((b, i) => {
      b.querySelector('span').textContent = q.answers[i];
      if (hidden.has(i) && chosen === -1 && !locked) { b.disabled = true; b.classList.add('gone'); }
      if (chosen !== -1 || locked) {
        b.disabled = true;
        if (i === q.correct) b.classList.add('right');
        else if (i === chosen) b.classList.add('wrong');
      }
    });
    if (locked) {
      const fb = root.querySelector('.quiz-feedback');
      fb.textContent = isRight ? `✅ Richtig! +${lastGain}` : chosen === -1 ? `⏰ Zeit abgelaufen! Richtig: ${q.answers[q.correct]}` : `❌ Leider falsch. Richtig: ${q.answers[q.correct]}`;
      fb.className = 'quiz-feedback ' + (isRight ? 'good' : 'bad');
    }
  }
  let lastGain = 0;
  function answer(i) {
    if (locked || hidden.has(i)) return;
    locked = true;
    const q = list[idx];
    if (i === q.correct) {
      streak++;
      correctCount++;
      lastGain = answerPoints(Math.min(left, QUESTION_TIME), streak);
      score += lastGain;
      host.setScore(score);
      host.sound(streak >= 3 ? 'win' : 'coin');
    } else {
      streak = 0;
      host.sound('error');
    }
    render(i);
    host.timeout(() => {
      idx++;
      if (idx >= list.length) {
        if (correctCount === list.length) score += 500;
        host.setScore(score);
        host.end(score);
        return;
      }
      locked = false;
      hidden = new Set();
      left = QUESTION_TIME;
      render();
    }, 1600);
  }
  function useJoker(kind) {
    if (locked || !jokers[kind]) return;
    jokers[kind] = false;
    if (kind === 'half') {
      const q = list[idx];
      const wrong = shuffle(q.answers.map((_, i) => i).filter((i) => i !== q.correct)).slice(0, 2);
      hidden = new Set(wrong);
    } else left += 10;
    host.sound('coin');
    render();
  }
  host.on(root, 'click', (e) => {
    if (host.paused) return;
    const j = e.target.closest('[data-joker]');
    if (j) { useJoker(j.dataset.joker); return; }
    const b = e.target.closest('.quiz-a');
    if (b) answer(+b.dataset.i);
  });
  host.onKey((e, first) => {
    const n = parseInt(e.key, 10);
    if (first && n >= 1 && n <= 4) answer(n - 1);
  });
  host.interval(() => {
    if (locked) return;
    left--;
    if (left <= 0) { left = 0; locked = false; answer(-1); return; }
    const t = root.querySelector('.quiz-left');
    if (t) t.textContent = `⏱️ ${left}s`;
    const f = root.querySelector('.quiz-fill');
    if (f) { f.style.width = Math.min(100, (left / QUESTION_TIME) * 100) + '%'; f.classList.toggle('low', left <= 5); }
  }, 1000);
  render();
}
