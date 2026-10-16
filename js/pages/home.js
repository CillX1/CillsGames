// Startseite: Tagesbonus, Suche/Filter und alle Spiele.
import { GAMES, CATEGORIES } from '../data/games.js';
import * as store from '../store.js';
import { esc, formatInt } from '../util.js';
import { toast, confirmDialog } from '../ui.js';
import { openAuthDialog } from '../auth-ui.js';
import { navigate } from '../router.js';
import { showHowTo } from './game.js';
import { play } from '../sound.js';

let filter = 'all';
let query = '';

export function render(view) {
  view.innerHTML = `
    <section class="hero">
      <h1 class="hero-title">🎮 <span class="grad">CillsGames</span></h1>
      <p class="hero-sub">Spiele, sammle Punkte, tausche sie gegen Sterne und kletter die Rangliste hoch!</p>
    </section>
    <div data-daily></div>
    <div class="toolbar">
      <input class="input search" type="search" placeholder="🔍 Spiel suchen…" aria-label="Spiel suchen" value="${esc(query)}">
      <div class="chips" role="group" aria-label="Kategorie">
        ${[['all', 'Alle'], ...Object.entries(CATEGORIES)].map(([k, v]) => `<button type="button" class="chip-btn ${filter === k ? 'active' : ''}" data-cat="${k}">${v}</button>`).join('')}
      </div>
    </div>
    <div class="games-grid" data-grid></div>
    <section class="stats-bar" data-stats></section>`;

  const grid = view.querySelector('[data-grid]');
  const daily = view.querySelector('[data-daily]');
  const statsEl = view.querySelector('[data-stats]');

  function renderGrid() {
    const q = query.trim().toLowerCase();
    const list = GAMES.filter((g) => (filter === 'all' || g.cat === filter) && (!q || g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q)));
    const u = store.user();
    grid.innerHTML = list.length ? list.map((g) => {
      const locked = g.unlock && !store.isUnlocked(g.id);
      const hs = u?.highscores[g.id] || 0;
      const progress = locked && u ? Math.min(100, Math.round((u.totalPointsEver / g.unlock) * 100)) : 0;
      return `<article class="game-card ${locked ? 'locked' : ''}" data-id="${g.id}">
        <button type="button" class="game-preview" style="background:${g.bg}" data-act="${locked ? 'unlock' : 'play'}" aria-label="${esc(g.name)} ${locked ? 'freischalten' : 'spielen'}">
          <span class="game-emoji">${g.emoji}</span>
          ${locked ? `<span class="lock-badge">🔒 ${g.unlock}</span>` : ''}
        </button>
        <div class="game-info">
          <h3>${esc(g.name)}</h3>
          <p>${esc(g.desc)}</p>
          ${locked && u ? `<div class="unlock-progress" title="Wird automatisch frei bei ${g.unlock} verdienten Punkten"><div style="width:${progress}%"></div></div>` : ''}
          <div class="game-bottom">
            ${hs ? `<span class="hs-badge" title="Dein Rekord">🏆 ${formatInt(hs)}</span>` : `<span class="cat-badge" title="${esc(CATEGORIES[g.cat])}">${CATEGORIES[g.cat].split(' ')[0]}</span>`}
            <span class="game-btns">
              <button type="button" class="icon-btn" data-act="help" aria-label="Anleitung ${esc(g.name)}">❓</button>
              ${locked
                ? `<button type="button" class="btn btn-gold btn-small" data-act="unlock">🔓 ${g.unlock}</button>`
                : '<button type="button" class="btn btn-primary btn-small" data-act="play">▶ Spielen</button>'}
            </span>
          </div>
        </div>
      </article>`;
    }).join('') : '<p class="empty">Kein Spiel gefunden.</p>';
  }

  function renderDaily() {
    if (!store.isLoggedIn()) {
      daily.innerHTML = `<div class="banner"><span>👋 Melde dich an, damit deine Punkte gespeichert werden und du in die Rangliste kommst.</span>
        <button type="button" class="btn btn-primary btn-small" data-act="login">Login / Registrieren</button></div>`;
      return;
    }
    const info = store.dailyBonusInfo();
    daily.innerHTML = info.available
      ? `<div class="banner banner-gold"><span>🎁 Tagesbonus bereit: <b>+${info.amount} Punkte</b>${info.streak > 1 ? ` · 🔥 ${info.streak} Tage in Folge` : ''}</span>
          <button type="button" class="btn btn-gold btn-small" data-act="daily">Abholen</button></div>`
      : `<div class="banner banner-muted"><span>✅ Tagesbonus abgeholt · 🔥 Serie: ${store.user().dailyStreak} ${store.user().dailyStreak === 1 ? 'Tag' : 'Tage'} – komm morgen wieder!</span></div>`;
  }

  function renderStats() {
    const u = store.user();
    statsEl.innerHTML = [
      [u ? formatInt(u.gamesPlayed) : 0, 'Gespielt'],
      [u ? formatInt(u.points) : 0, '🎯 Punkte'],
      [u ? formatInt(u.stars) : 0, '⭐ Sterne'],
      [GAMES.length, 'Spiele'],
    ].map(([v, l]) => `<div class="stat-item"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>`).join('');
  }

  function all() { renderDaily(); renderGrid(); renderStats(); }
  all();

  view.querySelector('.search').addEventListener('input', (e) => { query = e.target.value; renderGrid(); });
  view.querySelector('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    filter = b.dataset.cat;
    view.querySelectorAll('.chip-btn').forEach((x) => x.classList.toggle('active', x === b));
    renderGrid();
  });

  view.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const id = btn.closest('[data-id]')?.dataset.id;
    if (act === 'login') openAuthDialog('login');
    if (act === 'help' && id) showHowTo(id);
    if (act === 'play' && id) navigate('/spiel/' + id);
    if (act === 'unlock' && id) {
      if (!store.isLoggedIn()) { openAuthDialog('login'); return; }
      const g = GAMES.find((x) => x.id === id);
      const u = store.user();
      if (u.points < g.unlock) {
        toast(`Du brauchst ${g.unlock} Punkte (du hast ${u.points}). Es wird automatisch frei, sobald du insgesamt ${g.unlock} Punkte verdient hast.`, 'error', 5000);
        return;
      }
      if (!(await confirmDialog('Spiel freischalten', `${g.emoji} „${g.name}" für ${g.unlock} Punkte freischalten?`, { okText: 'Freischalten' }))) return;
      const r = await store.buyGameUnlock(id);
      if (r.ok) { play('win'); toast(`✅ ${g.name} freigeschaltet!`, 'success'); } else toast(r.msg, 'error');
    }
    if (act === 'daily') {
      btn.disabled = true;
      const r = await store.claimDailyBonus();
      if (r.ok) {
        play('coin');
        toast(`🎁 +${r.amount} Punkte! ${r.streak > 1 ? `🔥 ${r.streak} Tage Serie` : ''}`, 'success');
        if (r.unlocked.length) toast(`🎉 Freigeschaltet: ${r.unlocked.map((g) => g.name).join(', ')}`, 'success', 5000);
      }
    }
  });

  return store.subscribe(all);
}
