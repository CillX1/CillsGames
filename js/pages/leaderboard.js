// Rangliste (öffentlich, sortiert nach Sternen).
import * as store from '../store.js';
import { esc, formatNum } from '../util.js';
import { resolveEquipped, nameStyle, rowFrameStyle } from '../data/shop.js';
import { navigate } from '../router.js';

export function render(view) {
  view.innerHTML = `
    <h1 class="page-title">🏆 Rangliste</h1>
    <p class="page-sub">Die besten 50 Spieler – sortiert nach ⭐ Sternen. Tippe auf einen Namen für das Profil.</p>
    <div class="card" data-lb><div class="loading">Lade Rangliste…</div></div>`;
  const box = view.querySelector('[data-lb]');
  let alive = true;
  (async () => {
    try {
      const rows = await store.getState().backend.getLeaderboard(50);
      if (!alive) return;
      if (!rows.length) { box.innerHTML = '<p class="empty">Noch keine Einträge. Spiel, sammle Punkte und tausche sie gegen Sterne!</p>'; return; }
      const myUid = store.getState().uid;
      box.innerHTML = `<table class="lb-table">
        <thead><tr><th>#</th><th>Spieler</th><th class="num">⭐ Sterne</th><th class="num hide-sm">🎯 Punkte</th></tr></thead>
        <tbody>${rows.map((r, i) => {
          const eq = resolveEquipped(r.equipped);
          const rank = i + 1;
          return `<tr class="${r.id === myUid ? 'me' : ''} ${eq.frame ? 'framed' : ''}" style="${rowFrameStyle(eq.frame)}" data-uid="${esc(r.id)}" tabindex="0">
            <td><span class="rank rank-${rank <= 3 ? rank : 'n'}">${rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span></td>
            <td><span class="lb-name" style="${nameStyle(eq)}">${esc(r.name)}</span>${r.id === myUid ? ' <span class="you">(Du)</span>' : ''}
              ${eq.title ? `<span class="lb-title ${eq.title.role ? 'role-' + eq.title.role : ''}">「${esc(eq.title.name)}」</span>` : ''}${eq.badge ? `<span class="lb-badge">${eq.badge.icon}</span>` : ''}</td>
            <td class="num stars">${formatNum(r.stars)} ⭐</td>
            <td class="num hide-sm muted">${formatNum(r.points)}</td>
          </tr>`;
        }).join('')}</tbody></table>`;
    } catch (e) {
      console.error(e);
      if (alive) box.innerHTML = '<p class="empty error">Die Rangliste konnte nicht geladen werden.</p>';
    }
  })();
  box.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-uid]'); if (tr) navigate('/profil/' + encodeURIComponent(tr.dataset.uid)); });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-uid]'); if (tr) navigate('/profil/' + encodeURIComponent(tr.dataset.uid)); } });
  return () => { alive = false; };
}
