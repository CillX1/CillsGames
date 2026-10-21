// Profil (eigenes mit Ausrüstung, fremdes nur ansehen).
import * as store from '../store.js';
import { esc, formatNum, formatInt } from '../util.js';
import { ITEM_BY_ID, SLOTS, resolveEquipped, nameStyle, avatarFrameStyle } from '../data/shop.js';
import { GAMES } from '../data/games.js';
import { openAuthDialog } from '../auth-ui.js';
import { navigate } from '../router.js';
import { toast } from '../ui.js';

function card(p, eq) {
  return `<div class="card profile-card">
    <div class="avatar" style="${avatarFrameStyle(eq.frame)}">${eq.badge ? eq.badge.icon : '🎮'}</div>
    <h1 class="profile-name" style="${nameStyle(eq)}">${esc(p.name)}</h1>
    <div class="profile-title ${eq.title?.role ? 'role-' + eq.title.role : ''}">${eq.title ? esc(eq.title.name) : '&nbsp;'}</div>
    <div class="profile-stats">
      <div><b>${formatNum(p.points)}</b><span>🎯 Punkte</span></div>
      <div><b>${formatNum(p.stars)}</b><span>⭐ Sterne</span></div>
      <div><b>${formatInt(p.gamesPlayed)}</b><span>🎮 Spiele</span></div>
      <div><b>${formatInt(p.topScore)}</b><span>🏆 Bester Score</span></div>
    </div>
  </div>`;
}

export function renderOwn(view) {
  function draw() {
    const u = store.user();
    if (!u) {
      view.innerHTML = `<h1 class="page-title">👤 Mein Profil</h1><div class="card"><p class="empty">Bitte einloggen.</p>
        <p class="center"><button type="button" class="btn btn-primary" data-login>Login</button></p></div>`;
      view.querySelector('[data-login]').onclick = () => openAuthDialog();
      return;
    }
    const eq = resolveEquipped(u.equipped, u.inventory);
    const top = Object.values(u.highscores).reduce((a, b) => Math.max(a, b), 0);
    const owned = u.inventory.map((id) => ITEM_BY_ID[id]).filter(Boolean);
    const bySlot = {};
    for (const it of owned) (bySlot[it.slot] ||= []).push(it);
    view.innerHTML = `
      ${card({ ...u, topScore: top }, eq)}
      <div class="card">
        <h2 class="section-title">🎨 Ausrüstung</h2>
        ${owned.length ? Object.keys(SLOTS).filter((s) => bySlot[s]).map((slot) => `
          <h3 class="slot-title">${SLOTS[slot]}</h3>
          <div class="equip-grid">${bySlot[slot].map((it) => {
            const on = u.equipped[slot] === it.id;
            return `<button type="button" class="equip-item ${on ? 'on' : ''}" data-equip="${it.id}" aria-pressed="${on}">
              ${it.slot === 'title' ? `<span class="equip-icon"><span class="title-preview">${esc(it.name)}</span></span>` : `<span class="equip-icon">${it.icon}</span><span class="equip-name">${esc(it.name)}</span>`}
              <span class="equip-state">${on ? '✅ Ausgerüstet' : 'Ausrüsten'}</span></button>`;
          }).join('')}</div>`).join('') : '<p class="empty">Noch keine Items. Schau im <a href="#/shop">Shop</a> vorbei!</p>'}
      </div>
      <div class="card">
        <h2 class="section-title">🏅 Deine Rekorde</h2>
        <div class="hs-list">${GAMES.map((g) => `<div class="hs-item"><span>${g.emoji} ${esc(g.name)}</span><b>${formatInt(u.highscores[g.id] || 0)}</b></div>`).join('')}</div>
      </div>`;
  }
  draw();
  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-equip]');
    if (!b) return;
    b.disabled = true;
    await store.toggleEquip(b.dataset.equip);
  });
  return store.subscribe(draw);
}

export function renderOther(view, { uid }) {
  if (uid === store.getState().uid) { navigate('/profil'); return; }
  view.innerHTML = '<div class="loading">Lade Profil…</div>';
  let alive = true;
  store.getState().backend.getPublicProfile(uid).then((p) => {
    if (!alive) return;
    if (!p) { view.innerHTML = '<p class="empty">Profil nicht gefunden.</p>'; return; }
    view.innerHTML = card(p, resolveEquipped(p.equipped)) + '<p class="center"><a class="btn btn-ghost" href="#/rangliste">← Zur Rangliste</a></p>';
  }).catch((e) => { console.error(e); if (alive) { view.innerHTML = '<p class="empty error">Profil konnte nicht geladen werden.</p>'; toast('Fehler beim Laden', 'error'); } });
  return () => { alive = false; };
}
