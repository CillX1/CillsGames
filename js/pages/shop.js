// Shop mit Filter nach Slot und Seltenheit + Gutscheine.
import * as store from '../store.js';
import { esc, formatInt } from '../util.js';
import { SHOP_ITEMS, SLOTS, RARITY } from '../data/shop.js';
import { toast, confirmDialog } from '../ui.js';
import { openAuthDialog } from '../auth-ui.js';
import { play } from '../sound.js';

let slotFilter = 'all';
let hideOwned = false;

export function render(view) {
  view.innerHTML = `
    <h1 class="page-title">🛒 Shop</h1>
    <p class="page-sub">Alles kostet 🎯 Punkte – die verdienst du beim Spielen. Gekaufte Items rüstest du hier oder im Profil aus.</p>
    <div class="toolbar">
      <div class="chips" role="group" aria-label="Kategorie">
        ${[['all', 'Alle'], ...Object.entries(SLOTS)].map(([k, v]) => `<button type="button" class="chip-btn ${slotFilter === k ? 'active' : ''}" data-slot="${k}">${v}</button>`).join('')}
      </div>
      <label class="check"><input type="checkbox" data-hide ${hideOwned ? 'checked' : ''}> Gekaufte ausblenden</label>
    </div>
    <div class="shop-grid" data-grid></div>
    <div class="card voucher">
      <h2 class="section-title">🎟️ Gutschein einlösen</h2>
      <form class="row" data-voucher>
        <input class="input" name="code" placeholder="Code eingeben…" autocomplete="off" maxlength="40" aria-label="Gutscheincode">
        <button class="btn btn-primary" type="submit">Einlösen</button>
      </form>
    </div>`;
  const grid = view.querySelector('[data-grid]');

  function draw() {
    const u = store.user();
    const items = SHOP_ITEMS
      .filter((i) => slotFilter === 'all' || i.slot === slotFilter)
      .filter((i) => !(hideOwned && u?.inventory.includes(i.id)))
      .sort((a, b) => RARITY[a.rarity].order - RARITY[b.rarity].order || a.price - b.price);
    grid.innerHTML = items.map((it) => {
      const owned = !!u?.inventory.includes(it.id);
      const on = owned && u.equipped[it.slot] === it.id;
      const afford = (u?.points || 0) >= it.price;
      let btn;
      if (owned) btn = `<button type="button" class="btn btn-small ${on ? 'btn-success' : 'btn-ghost'}" data-equip="${it.id}">${on ? '✅ Ausgerüstet' : 'Ausrüsten'}</button>`;
      else btn = `<button type="button" class="btn btn-small btn-gold" data-buy="${it.id}" ${u && !afford ? 'disabled' : ''}>${u && !afford ? `Noch ${formatInt(it.price - u.points)}` : 'Kaufen'}</button>`;
      return `<div class="shop-item r-${it.rarity} ${on ? 'on' : ''}">
        <span class="rarity">${RARITY[it.rarity].label}</span>
        <div class="shop-icon">${it.icon}</div>
        <div class="shop-name">${esc(it.name)}</div>
        <div class="shop-slot">${SLOTS[it.slot]}</div>
        <div class="shop-price">🎯 ${formatInt(it.price)}</div>
        ${btn}
      </div>`;
    }).join('') || '<p class="empty">Nichts gefunden.</p>';
  }
  draw();

  view.querySelector('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-slot]');
    if (!b) return;
    slotFilter = b.dataset.slot;
    view.querySelectorAll('[data-slot]').forEach((x) => x.classList.toggle('active', x === b));
    draw();
  });
  view.querySelector('[data-hide]').addEventListener('change', (e) => { hideOwned = e.target.checked; draw(); });
  grid.addEventListener('click', async (e) => {
    const buy = e.target.closest('[data-buy]');
    const equip = e.target.closest('[data-equip]');
    if (!store.isLoggedIn() && (buy || equip)) { openAuthDialog(); return; }
    if (buy) {
      const it = SHOP_ITEMS.find((x) => x.id === buy.dataset.buy);
      if (!(await confirmDialog('Kaufen?', `${it.icon} ${it.name} für ${formatInt(it.price)} Punkte kaufen?`, { okText: 'Kaufen' }))) return;
      const r = await store.buyItem(it.id);
      if (r.ok) { play('coin'); toast(`✅ ${it.name} gekauft!`, 'success'); } else toast(r.msg, 'error');
    }
    if (equip) { equip.disabled = true; await store.toggleEquip(equip.dataset.equip); }
  });
  view.querySelector('[data-voucher]').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!store.isLoggedIn()) { openAuthDialog(); return; }
    const input = e.target.querySelector('input');
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const r = await store.redeemVoucher(input.value);
      if (r.ok) {
        play('win');
        toast(r.already ? `Code eingelöst – ${r.item.name} hattest du schon.` : `🎉 ${r.item.icon} ${r.item.name} freigeschaltet! Im Profil ausrüsten.`, 'success', 5000);
        input.value = '';
      } else toast(r.msg, 'error');
    } finally { btn.disabled = false; }
  });
  return store.subscribe(draw);
}
