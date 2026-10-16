// Punkte -> Sterne tauschen.
import * as store from '../store.js';
import { formatInt } from '../util.js';
import { toast, confirmDialog } from '../ui.js';
import { openAuthDialog } from '../auth-ui.js';
import { play } from '../sound.js';

export function render(view) {
  view.innerHTML = `
    <h1 class="page-title">💱 Punkte tauschen</h1>
    <p class="page-sub">${store.STAR_PRICE} Punkte = 1 ⭐ Stern. Sterne bestimmen deinen Platz in der Rangliste – Tauschen ist endgültig.</p>
    <div class="two-col">
      <div class="card">
        <h2 class="section-title">🎯 → ⭐</h2>
        <form data-form>
          <label class="field"><span>Wie viele Punkte?</span>
            <input class="input" type="number" name="pts" min="${store.STAR_PRICE}" step="${store.STAR_PRICE}" placeholder="${store.STAR_PRICE}" inputmode="numeric"></label>
          <div class="quick">
            <button type="button" class="chip-btn" data-q="100">100</button>
            <button type="button" class="chip-btn" data-q="500">500</button>
            <button type="button" class="chip-btn" data-q="1000">1000</button>
            <button type="button" class="chip-btn" data-q="max">Alles</button>
          </div>
          <div class="convert-preview" data-preview>= 0 ⭐</div>
          <button class="btn btn-gold btn-block" type="submit">Jetzt tauschen</button>
        </form>
      </div>
      <div class="card">
        <h2 class="section-title">📊 Dein Stand</h2>
        <div class="balance"><span>🎯 Punkte</span><b data-pts>0</b></div>
        <div class="balance gold"><span>⭐ Sterne</span><b data-stars>0</b></div>
      </div>
    </div>`;
  const input = view.querySelector('[name=pts]');
  const preview = view.querySelector('[data-preview]');
  const upd = () => {
    const v = Math.max(0, parseInt(input.value, 10) || 0);
    const stars = Math.floor(v / store.STAR_PRICE);
    preview.textContent = `= ${formatInt(stars)} ⭐` + (v % store.STAR_PRICE && stars ? ` (es werden ${formatInt(stars * store.STAR_PRICE)} Punkte getauscht)` : '');
  };
  function draw() {
    const u = store.user();
    view.querySelector('[data-pts]').textContent = formatInt(u?.points || 0);
    view.querySelector('[data-stars]').textContent = formatInt(u?.stars || 0);
  }
  draw();
  input.addEventListener('input', upd);
  view.querySelector('.quick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const max = Math.floor((store.user()?.points || 0) / store.STAR_PRICE) * store.STAR_PRICE;
    input.value = b.dataset.q === 'max' ? max : b.dataset.q;
    upd();
  });
  view.querySelector('[data-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!store.isLoggedIn()) { openAuthDialog(); return; }
    const v = parseInt(input.value, 10) || 0;
    const stars = Math.floor(v / store.STAR_PRICE);
    if (stars < 1) { toast(`Mindestens ${store.STAR_PRICE} Punkte.`, 'error'); return; }
    if (store.user().points < stars * store.STAR_PRICE) { toast('Nicht genug Punkte.', 'error'); return; }
    if (!(await confirmDialog('Tauschen?', `${formatInt(stars * store.STAR_PRICE)} Punkte in ${formatInt(stars)} ⭐ tauschen?`, { okText: 'Tauschen' }))) return;
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const r = await store.convertToStars(v);
      if (r.ok) { play('win'); toast(`✅ ${formatInt(r.cost)} Punkte → ${formatInt(r.stars)} ⭐`, 'success'); input.value = ''; upd(); }
      else toast(r.msg, 'error');
    } finally { btn.disabled = false; }
  });
  return store.subscribe(draw);
}
