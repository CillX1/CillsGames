// ❓ Quiz Master – 15 zufällige Fragen, die Antworten werden zusätzlich gemischt.
import { shuffle } from '../util.js';

// Format: [Frage, richtige Antwort, falsch, falsch, falsch]
export const QUESTIONS = [
  ['Was ist die Hauptstadt der Schweiz (Bundesstadt)?', 'Bern', 'Zürich', 'Genf', 'Basel'],
  ['Was ist die Hauptstadt von Deutschland?', 'Berlin', 'München', 'Hamburg', 'Frankfurt'],
  ['Wie viele Kantone hat die Schweiz?', '26', '20', '23', '30'],
  ['Welcher ist der höchste Berg der Erde?', 'Mount Everest', 'K2', 'Mont Blanc', 'Kilimandscharo'],
  ['Wie viele Planeten hat unser Sonnensystem?', '8', '7', '9', '10'],
  ['Welcher Planet ist der Sonne am nächsten?', 'Merkur', 'Venus', 'Mars', 'Erde'],
  ['Welcher Planet ist der grösste?', 'Jupiter', 'Saturn', 'Neptun', 'Erde'],
  ['Was ist H₂O?', 'Wasser', 'Sauerstoff', 'Salz', 'Wasserstoff'],
  ['Welches chemische Symbol hat Gold?', 'Au', 'Go', 'Gd', 'Ag'],
  ['Welches Gas atmen Pflanzen bei der Fotosynthese ein?', 'Kohlendioxid', 'Sauerstoff', 'Stickstoff', 'Helium'],
  ['Wie viele Beine hat eine Spinne?', '8', '6', '10', '12'],
  ['Welches ist das grösste Tier der Welt?', 'Blauwal', 'Afrikanischer Elefant', 'Giraffe', 'Weisser Hai'],
  ['Welches Landtier ist am schnellsten?', 'Gepard', 'Löwe', 'Pferd', 'Antilope'],
  ['Wie viele Seiten hat ein Würfel?', '6', '4', '8', '12'],
  ['Was ist 12 × 12?', '144', '124', '134', '154'],
  ['Was ist 15 % von 200?', '30', '15', '20', '35'],
  ['Wie viele Minuten hat ein Tag?', '1440', '1200', '1240', '1640'],
  ['Wie viele Tage hat ein Schaltjahr?', '366', '365', '364', '367'],
  ['Wie viele Nullen hat eine Million?', '6', '5', '7', '9'],
  ['Was ist die Quadratwurzel von 81?', '9', '8', '7', '18'],
  ['Wer malte die Mona Lisa?', 'Leonardo da Vinci', 'Michelangelo', 'Picasso', 'Van Gogh'],
  ['Wer schrieb «Harry Potter»?', 'J. K. Rowling', 'J. R. R. Tolkien', 'Roald Dahl', 'Stephen King'],
  ['In welchem Land steht der Eiffelturm?', 'Frankreich', 'Italien', 'Belgien', 'Spanien'],
  ['Welche Sprache spricht man in Brasilien?', 'Portugiesisch', 'Spanisch', 'Englisch', 'Französisch'],
  ['In welchem Jahr endete der Zweite Weltkrieg?', '1945', '1944', '1946', '1939'],
  ['Welches ist der längste Fluss, der ganz in der Schweiz fliesst?', 'Aare', 'Rhein', 'Rhone', 'Inn'],
  ['Welcher Fluss fliesst durch Bern?', 'Aare', 'Limmat', 'Reuss', 'Rhone'],
  ['Welcher See ist der grösste ganz in der Schweiz liegende See?', 'Neuenburgersee', 'Zürichsee', 'Vierwaldstättersee', 'Thunersee'],
  ['Wie viele Landessprachen hat die Schweiz?', '4', '3', '2', '5'],
  ['Welcher Ozean ist der grösste?', 'Pazifik', 'Atlantik', 'Indischer Ozean', 'Arktischer Ozean'],
  ['Auf welchem Kontinent liegt Ägypten?', 'Afrika', 'Asien', 'Europa', 'Australien'],
  ['Wie viele Spieler hat ein Fussballteam auf dem Platz?', '11', '10', '9', '12'],
  ['Wie viele Felder hat ein Schachbrett?', '64', '48', '81', '100'],
  ['Welche Farbe entsteht aus Blau und Gelb?', 'Grün', 'Lila', 'Orange', 'Braun'],
  ['Wie viele Knochen hat ein erwachsener Mensch ungefähr?', '206', '150', '300', '412'],
  ['Welches Organ pumpt das Blut durch den Körper?', 'Herz', 'Lunge', 'Leber', 'Niere'],
  ['Bei wie viel Grad Celsius kocht Wasser auf Meereshöhe?', '100', '90', '80', '120'],
  ['Wofür steht «www» im Internet?', 'World Wide Web', 'World Wide Window', 'Web World Wide', 'Wide World Web'],
  ['Wie viele Bits hat ein Byte?', '8', '4', '10', '16'],
  ['Welches Tier ist das Wappentier von Bern?', 'Bär', 'Löwe', 'Adler', 'Steinbock'],
  ['Welcher Planet wird «Roter Planet» genannt?', 'Mars', 'Venus', 'Jupiter', 'Saturn'],
  ['Wie viele Stunden hat eine Woche?', '168', '144', '186', '120'],
  ['Was misst ein Thermometer?', 'Temperatur', 'Luftdruck', 'Geschwindigkeit', 'Feuchtigkeit'],
  ['Welche Form hat ein Stoppschild?', 'Achteck', 'Sechseck', 'Kreis', 'Dreieck'],
];

export const QUESTION_TIME = 15;

export function answerPoints(secondsLeft, streak) {
  return 100 + secondsLeft * 10 + (streak > 1 ? (streak - 1) * 25 : 0);
}

export function start(host) {
  const list = shuffle(QUESTIONS).slice(0, 15).map(([q, right, ...wrong]) => {
    const answers = shuffle([right, ...wrong]);
    return { q, answers, correct: answers.indexOf(right) };
  });
  let idx = 0, score = 0, streak = 0, left = QUESTION_TIME, locked = false, correctCount = 0;
  const root = document.createElement('div');
  root.className = 'quiz';
  host.stage.appendChild(root);

  function render(chosen = -1) {
    const q = list[idx];
    const isRight = chosen === q.correct;
    root.innerHTML = `
      <div class="quiz-top"><span>Frage ${idx + 1} / ${list.length}</span><span class="${streak > 1 ? 'hot' : ''}">🔥 Serie ${streak}</span><span>⏱️ ${left}s</span></div>
      <div class="quiz-bar"><div class="quiz-fill ${left <= 5 ? 'low' : ''}" style="width:${(left / QUESTION_TIME) * 100}%"></div></div>
      <h3 class="quiz-q"></h3>
      <div class="quiz-answers">${q.answers.map((_, i) => `<button type="button" class="quiz-a" data-i="${i}"><b>${i + 1}</b><span></span></button>`).join('')}</div>
      <div class="quiz-feedback" aria-live="polite"></div>`;
    root.querySelector('.quiz-q').textContent = q.q;
    root.querySelectorAll('.quiz-a').forEach((b, i) => {
      b.querySelector('span').textContent = q.answers[i];
      if (chosen !== -1 || locked) {
        b.disabled = true;
        if (i === q.correct) b.classList.add('right');
        else if (i === chosen) b.classList.add('wrong');
      }
    });
    if (locked) {
      const fb = root.querySelector('.quiz-feedback');
      fb.textContent = isRight ? `✅ Richtig! +${answerPoints(left, streak)}` : chosen === -1 ? '⏰ Zeit abgelaufen!' : '❌ Leider falsch.';
      fb.className = 'quiz-feedback ' + (isRight ? 'good' : 'bad');
    }
  }
  function answer(i) {
    if (locked) return;
    locked = true;
    const q = list[idx];
    if (i === q.correct) {
      streak++;
      correctCount++;
      score += answerPoints(left, streak);
      host.setScore(score);
      host.sound('coin');
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
      left = QUESTION_TIME;
      render();
    }, 1400);
  }
  host.on(root, 'click', (e) => {
    const b = e.target.closest('.quiz-a');
    if (b && !host.paused) answer(+b.dataset.i);
  });
  host.onKey((e, first) => {
    const n = parseInt(e.key, 10);
    if (first && n >= 1 && n <= 4) answer(n - 1);
  });
  host.interval(() => {
    if (locked) return;
    left--;
    if (left <= 0) { left = 0; answer(-1); return; }
    const t = root.querySelector('.quiz-top span:last-child');
    if (t) t.textContent = `⏱️ ${left}s`;
    const f = root.querySelector('.quiz-fill');
    if (f) { f.style.width = (left / QUESTION_TIME) * 100 + '%'; f.classList.toggle('low', left <= 5); }
  }, 1000);
  render();
}
