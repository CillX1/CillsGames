// Spielseite: lädt das Spielmodul, zeigt Score/Highscore und den Endbildschirm.
import { GAME_BY_ID, pointsForScore } from '../data/games.js';
import { GameHost } from '../games/host.js';
import * as store from '../store.js';
import { esc, formatInt } from '../util.js';
import { openDialog, toast } from '../ui.js';
import { openAuthDialog } from '../auth-ui.js';
import { navigate } from '../router.js';

const loaders = {
  dino: () => import('../games/dino.js'),
  rocket: () => import('../games/rocket.js'),
  snake: () => import('../games/snake.js'),
  flappy: () => import('../games/flappy.js'),
  pong: () => import('../games/pong.js'),
  blockblast: () => import('../games/blockblast.js'),
  breakout: () => import('../games/breakout.js'),
  asteroids: () => import('../games/asteroids.js'),
  carracing: () => import('../games/carracing.js'),
  bubbleshooter: () => import('../games/bubbleshooter.js'),
  wordle: () => import('../games/wordle.js'),
  tictactoe: () => import('../games/tictactoe.js'),
  typing: () => import('../games/typing.js'),
  memory: () => import('../games/memory.js'),
  connect4: () => import('../games/connect4.js'),
  minesweeper: () => import('../games/minesweeper.js'),
  towerdefense: () => import('../games/towerdefense.js'),
  tetris: () => import('../games/tetris.js'),
  quiz: () => import('../games/quiz.js'),
  pacman: () => import('../games/pacman.js'),
};
export const GAME_IDS = Object.keys(loaders);

export function showHowTo(id) {
  const g = GAME_BY_ID[id];
  if (!g) return;
  openDialog({
    title: `${g.emoji} ${g.name}`,
    content: `<div class="howto">${g.howto}</div>
      <p class="howto-points">🎯 Punkte: Score ÷ ${g.div} (max. ${g.cap} pro Runde)</p>
      <p class="howto-points">Pause: Taste <kbd>P</kbd> · 🏁 „Beenden" kassiert die Punkte der laufenden Runde.</p>`,
  });
}

export function render(view, id) {
  const g = GAME_BY_ID[id];
  if (!g || !loaders[id]) { navigate('/'); return; }
  if (g.unlock && !store.isUnlocked(id)) {
    toast(store.isLoggedIn() ? `🔒 ${g.name} ist noch gesperrt.` : 'Bitte zuerst einloggen.', 'error');
    navigate('/');
    return;
  }

  view.innerHTML = `
    <section class="game-page">
      <div class="game-head">
        <h1 class="game-title">${g.emoji} ${esc(g.name)}</h1>
        <div class="game-stats">
          <span class="chip">Score <b data-score>0</b></span>
          <span class="chip">Rekord <b data-hs>${formatInt(store.user()?.highscores[id] || 0)}</b></span>
        </div>
        <div class="game-actions">
          <button type="button" class="btn btn-ghost btn-small" data-act="help" title="Anleitung">❓</button>
          <button type="button" class="btn btn-ghost btn-small" data-act="pause" title="Pause (Taste P)">Pause</button>
          <button type="button" class="btn btn-ghost btn-small" data-act="finish" title="Runde beenden und Punkte kassieren">🏁 Beenden</button>
          <button type="button" class="btn btn-ghost btn-small" data-act="back">← Menü</button>
        </div>
      </div>
      ${store.isLoggedIn() ? '' : '<div class="guest-note">👤 Du spielst als Gast – Punkte werden nicht gespeichert. <button type="button" class="link" data-act="login">Jetzt einloggen</button></div>'}
      <div class="game-stage" data-stage tabindex="-1"></div>
    </section>`;

  const scoreEl = view.querySelector('[data-score]');
  const hsEl = view.querySelector('[data-hs]');
  const stage = view.querySelector('[data-stage]');
  const pauseBtn = view.querySelector('[data-act=pause]');
  let host = null;
  let endDialog = null;
  let disposed = false;
  let mode = null; // gewählter Schwierigkeitsgrad dieser Sitzung
  let modes = null;
  const MODE_KEY = 'cg_mode_' + id;

  async function begin() {
    host?.destroy();
    endDialog?.close();
    endDialog = null;
    scoreEl.textContent = '0';
    pauseBtn.textContent = 'Pause';
    host = new GameHost({
      stage,
      onScore: (s) => { scoreEl.textContent = formatInt(s); },
      onEnd: (s) => finished(s),
    });
    stage.addEventListener('gamepause', onPause);
    try {
      const mod = await loaders[id]();
      if (disposed || host.destroyed) return;
      modes = mod.modes || null;
      if (modes && !mode) {
        pauseBtn.hidden = true;
        mode = await pickMode(modes);
        if (!mode || disposed || host.destroyed) return;
      }
      host.mode = mode;
      mod.start(host, mode);
      pauseBtn.hidden = !host._loop;
      (host.canvas || stage.querySelector('input') || stage).focus?.({ preventScroll: true });
    } catch (e) {
      console.error(e);
      stage.innerHTML = '<p class="empty">Das Spiel konnte nicht geladen werden. Lade die Seite neu.</p>';
    }
  }
  /** Schwierigkeitsauswahl im Spielbereich. Gibt die gewählte Modus-ID zurück. */
  function pickMode(list) {
    let last = null;
    try { last = localStorage.getItem(MODE_KEY); } catch { /* egal */ }
    const g = GAME_BY_ID[id];
    const box = document.createElement('div');
    box.className = 'mode-picker';
    box.innerHTML = `<div class="mode-emoji">${g.emoji}</div><h2>Schwierigkeit wählen</h2>
      <div class="mode-list">${list.map((m) => `<button type="button" class="mode-btn ${m.id === last ? 'last' : ''}" data-mode="${esc(m.id)}">
        <b>${esc(m.label)}</b><span>${esc(m.desc || '')}</span>${m.id === last ? '<small>zuletzt gespielt</small>' : ''}</button>`).join('')}</div>`;
    stage.appendChild(box);
    (box.querySelector('.mode-btn.last') || box.querySelector('.mode-btn')).focus({ preventScroll: true });
    return new Promise((resolve) => {
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-mode]');
        if (!b) return;
        try { localStorage.setItem(MODE_KEY, b.dataset.mode); } catch { /* egal */ }
        box.remove();
        resolve(b.dataset.mode);
      });
      host.onCleanup(() => resolve(null));
    });
  }
  const modeLabel = () => modes?.find((m) => m.id === mode)?.label || '';

  function onPause(e) { pauseBtn.textContent = e.detail ? '▶ Weiter' : 'Pause'; }

  function finished(score) {
    const loggedIn = store.isLoggedIn();
    const res = loggedIn ? store.recordGameResult(id, score) : { points: pointsForScore(id, score), newRecord: false, unlocked: [] };
    if (loggedIn) hsEl.textContent = formatInt(store.user().highscores[id] || 0);
    const unlockedHtml = res.unlocked.length
      ? `<p class="go-unlock">🎉 Neu freigeschaltet: ${res.unlocked.map((u) => `${u.emoji} ${esc(u.name)}`).join(', ')}</p>` : '';
    host.timeout(() => {
      endDialog = openDialog({
        title: 'Spiel vorbei!',
        closable: false, // nur über "Nochmal" oder "Menü" – ein Fehlklick daneben schliesst nichts
        content: `
          <div class="game-over">
            <div class="go-score">${formatInt(score)}</div>
            <div class="go-label">Score</div>
            ${modes ? `<div class="go-mode">${esc(modeLabel())}</div>` : ''}
            ${res.newRecord ? '<div class="go-record">🏆 Neuer Rekord!</div>' : ''}
            <div class="go-points">${loggedIn ? `+${res.points} 🎯 Punkte` : `Als Gast: ${res.points} 🎯 (nicht gespeichert)`}</div>
            ${unlockedHtml}
            <div class="dialog-actions">
              <button type="button" class="btn btn-ghost" data-go="menu">🏠 Menü</button>
              ${modes ? '<button type="button" class="btn btn-ghost" data-go="mode">⚙️ Schwierigkeit</button>' : ''}
              <button type="button" class="btn btn-primary" data-go="retry">🔄 Nochmal</button>
            </div>
          </div>`,
        onOpen(root, close) {
          root.querySelector('[data-go=retry]').onclick = () => { close('retry'); };
          root.querySelector('[data-go=menu]').onclick = () => { close('menu'); };
          const mb = root.querySelector('[data-go=mode]');
          if (mb) mb.onclick = () => { mode = null; close('retry'); };
          if (res.newRecord && score > 0) confetti();
        },
      });
      endDialog.done.then((v) => {
        endDialog = null;
        if (disposed) return;
        if (v === 'retry') begin();
        else if (v === 'menu') navigate('/');
      });
    }, 350);
  }

  view.querySelector('.game-head').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'help') { host?.pause(); showHowTo(id); }
    if (act === 'pause') host?.togglePause();
    if (act === 'finish' && host && !host.over && !stage.querySelector('.mode-picker')) host.end(host.score);
    if (act === 'back') navigate('/');
  });
  view.querySelector('[data-act=login]')?.addEventListener('click', () => { host?.pause(); openAuthDialog('login'); });

  begin();
  return () => {
    disposed = true;
    endDialog?.close();
    host?.destroy();
  };
}

/** Kleines Konfetti-Feuerwerk bei einem neuen Rekord (ohne Bibliothek). */
function confetti() {
  try { if (document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch { /* egal */ }
  const layer = document.createElement('div');
  layer.className = 'confetti';
  const colors = ['#00d4ff', '#ff006e', '#ffd700', '#00e68a', '#a855f7', '#ff8800'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
    p.style.setProperty('--drift', (Math.random() - 0.5) * 240 + 'px');
    p.style.setProperty('--spin', (Math.random() * 1080 - 540) + 'deg');
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3800);
}
