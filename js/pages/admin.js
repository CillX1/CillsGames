// Admin- und Leiter-Bereich.
// Admin: Passwort + Admin-Rolle in Firebase. Leiter: Leiter-Rolle in Firebase (vom Admin vergeben).
import * as store from '../store.js';
import { esc, formatInt, friendlyError, nameToEmail } from '../util.js';
import { GAMES, GAME_BY_ID } from '../data/games.js';
import { ITEMS, ITEM_BY_ID, ALL_ROLE_ITEM_IDS } from '../data/shop.js';
import { OWNER_USERNAMES } from '../firebase-config.js';
import { toast, confirmDialog, openDialog } from '../ui.js';
import { openAuthDialog } from '../auth-ui.js';
import { verifyAdminPassword, isAdminUnlocked } from '../admin-auth.js';

const LOCKABLE = GAMES.filter((g) => g.unlock);
const be = () => store.getState().backend;

function isOwner() {
  const u = store.user();
  return !!u && OWNER_USERNAMES.map(nameToEmail).includes(nameToEmail(u.name));
}

async function log(action) {
  try { await be().addStaffLog({ byUid: store.getState().uid, by: store.user().name, role: store.getState().role, action, ts: Date.now() }); }
  catch (e) { console.warn('Protokoll fehlgeschlagen', e); }
}

export function renderAdmin(view) {
  const gate = () => {
    if (!store.isLoggedIn()) {
      view.innerHTML = `<h1 class="page-title">🔐 Admin</h1><div class="card center"><p>Bitte zuerst mit deinem Admin-Konto einloggen.</p>
        <button type="button" class="btn btn-primary" data-login>Login</button></div>`;
      view.querySelector('[data-login]').onclick = () => openAuthDialog();
      return false;
    }
    const role = store.getState().role;
    if (role !== 'admin' && !isOwner()) {
      view.innerHTML = '<h1 class="page-title">🔐 Admin</h1><div class="card"><p class="empty">Dieses Konto hat keine Admin-Rechte.</p></div>';
      return false;
    }
    if (!isAdminUnlocked()) {
      view.innerHTML = `<h1 class="page-title">🔐 Admin</h1>
        <div class="card narrow"><form data-pw>
          <label class="field"><span>Admin-Passwort</span><input class="input" type="password" autocomplete="current-password" name="pw"></label>
          <p class="form-error" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit">Entsperren</button>
        </form></div>`;
      const f = view.querySelector('[data-pw]');
      f.querySelector('input').focus();
      f.onsubmit = async (e) => {
        e.preventDefault();
        const btn = f.querySelector('button');
        btn.disabled = true;
        try {
          if (!(await verifyAdminPassword(f.querySelector('input').value))) {
            f.querySelector('.form-error').textContent = '❌ Falsches Passwort.';
            return;
          }
          if (store.getState().role !== 'admin' && isOwner()) {
            await be().claimOwnerAdmin(store.getState().uid, store.user().name);
            await store.setRoleLocal('admin');
            toast('🛡️ Admin-Rechte für dein Konto aktiviert.', 'success');
          }
          panel(view, 'admin');
        } catch (ex) {
          f.querySelector('.form-error').textContent = friendlyError(ex);
        } finally { btn.disabled = false; }
      };
      return false;
    }
    return true;
  };
  if (gate()) panel(view, 'admin');
}

export function renderLeiter(view) {
  const role = store.getState().role;
  if (!store.isLoggedIn()) {
    view.innerHTML = `<h1 class="page-title">👔 Leiter</h1><div class="card center"><p>Bitte zuerst einloggen.</p>
      <button type="button" class="btn btn-primary" data-login>Login</button></div>`;
    view.querySelector('[data-login]').onclick = () => openAuthDialog();
    return;
  }
  if (role !== 'leiter' && role !== 'admin') {
    view.innerHTML = '<h1 class="page-title">👔 Leiter</h1><div class="card"><p class="empty">Du bist kein Leiter. Ein Admin kann dir die Leiter-Rolle geben.</p></div>';
    return;
  }
  panel(view, 'leiter');
}

function panel(view, mode) {
  const admin = mode === 'admin';
  const tabs = admin
    ? [['users', '👥 Spieler'], ['vouchers', '🎟️ Gutscheine'], ['feedback', '⭐ Feedback'], ['log', '📜 Protokoll']]
    : [['users', '👥 Spieler']];
  view.innerHTML = `
    <h1 class="page-title">${admin ? '🔐 Admin-Panel' : '👔 Leiter-Panel'}</h1>
    ${admin ? '' : '<p class="page-sub">Alle deine Änderungen werden protokolliert und sind für den Admin sichtbar.</p>'}
    <div class="tabs">${tabs.map(([k, l], i) => `<button type="button" class="tab ${i === 0 ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div data-body></div>`;
  const body = view.querySelector('[data-body]');
  const show = (t) => {
    body.onclick = null;
    body.dataset.tab = t;
    view.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    ({ users: usersTab, vouchers: vouchersTab, feedback: feedbackTab, log: logTab })[t](body, admin);
  };
  view.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  show('users');
}

// ── Spieler ────────────────────────────────────────────────
async function usersTab(body, admin) {
  body.innerHTML = '<div class="loading">Lade Spieler…</div>';
  let users, roles;
  try {
    [users, roles] = await Promise.all([be().listUsers(), be().listRoles()]);
  } catch (e) { body.innerHTML = `<p class="empty error">${esc(friendlyError(e))}</p>`; return; }
  if (body.dataset.tab !== 'users') return;
  const roleOf = Object.fromEntries(roles.map((r) => [r.id, r.role]));
  users.sort((a, b) => (b.stars || 0) - (a.stars || 0) || String(a.name).localeCompare(String(b.name)));
  body.innerHTML = `
    <div class="toolbar"><input class="input search" type="search" placeholder="🔍 Spieler suchen…" data-q><span class="muted">${users.length} Spieler</span></div>
    <div class="admin-list" data-list></div>`;
  const list = body.querySelector('[data-list]');
  const draw = (q = '') => {
    const ql = q.trim().toLowerCase();
    list.innerHTML = users.filter((u) => !ql || String(u.name).toLowerCase().includes(ql)).map((u) => `
      <div class="admin-row" data-uid="${esc(u.id)}">
        <div class="admin-name">👤 ${esc(u.name)} ${roleOf[u.id] ? `<span class="role-tag ${esc(roleOf[u.id])}">${roleOf[u.id] === 'admin' ? '🛡️ Admin' : '👔 Leiter'}</span>` : ''}
          <small>${formatInt(u.gamesPlayed || 0)} Spiele · ${(u.unlocked || []).length}/${LOCKABLE.length} frei</small></div>
        <div class="admin-ctrl">
          <label>🎯 <input class="input input-small" type="number" min="0" value="${Math.floor(u.points || 0)}" data-f="points"></label>
          <label>⭐ <input class="input input-small" type="number" min="0" value="${Math.floor(u.stars || 0)}" data-f="stars"></label>
          <button type="button" class="btn btn-primary btn-small" data-a="save">💾</button>
          <button type="button" class="btn btn-ghost btn-small" data-a="games">🎮 Spiele</button>
          ${admin ? `<button type="button" class="btn btn-ghost btn-small" data-a="items">🎨 Items</button>
            <button type="button" class="btn btn-ghost btn-small" data-a="role">👔 Rolle</button>
            <button type="button" class="btn btn-danger btn-small" data-a="del" ${u.id === store.getState().uid ? 'disabled' : ''}>🗑️</button>` : ''}
        </div>
      </div>`).join('') || '<p class="empty">Keine Spieler gefunden.</p>';
  };
  draw();
  body.querySelector('[data-q]').addEventListener('input', (e) => draw(e.target.value));

  const updateUser = async (u, fields, action) => {
    const merged = await be().staffUpdateUser(u.id, fields);
    Object.assign(u, fields);
    store.applyServerUser(u.id, merged);
    await log(action);
  };

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-a]');
    if (!btn) return;
    const row = btn.closest('[data-uid]');
    const u = users.find((x) => x.id === row.dataset.uid);
    const a = btn.dataset.a;
    btn.disabled = true;
    try {
      if (a === 'save') {
        const points = Math.max(0, parseInt(row.querySelector('[data-f=points]').value, 10) || 0);
        const stars = Math.max(0, parseInt(row.querySelector('[data-f=stars]').value, 10) || 0);
        const dp = points - (u.points || 0), ds = stars - (u.stars || 0);
        if (!dp && !ds) { toast('Keine Änderung.'); return; }
        const fields = { points, stars, totalPointsEver: Math.max(u.totalPointsEver || 0, (u.totalPointsEver || 0) + Math.max(0, dp)) };
        await updateUser(u, fields, `„${u.name}": ${dp ? `${dp > 0 ? '+' : ''}${dp} 🎯` : ''} ${ds ? `${ds > 0 ? '+' : ''}${ds} ⭐` : ''} (neu ${points} 🎯 / ${stars} ⭐)`);
        toast(`✅ ${u.name} gespeichert`, 'success');
      }
      if (a === 'games') await gamesDialog(u, updateUser);
      if (a === 'items') await itemsDialog(u);
      if (a === 'role') {
        const current = roleOf[u.id] || '';
        const r = await choose('Rolle für ' + u.name, [['', 'Keine'], ['leiter', '👔 Leiter'], ['admin', '🛡️ Admin']], current);
        if (r === null || r === current) return;
        if (u.id === store.getState().uid && r !== 'admin') { toast('Du kannst dir die eigene Admin-Rolle nicht wegnehmen.', 'error'); return; }
        await be().setRole(u.id, r || null, u.name);
        if (r) roleOf[u.id] = r; else delete roleOf[u.id];
        // Rollen-Titel sofort vergeben/entfernen (auch wenn der Spieler offline ist)
        const copy = { inventory: [...(u.inventory || [])], equipped: { ...(u.equipped || {}) } };
        if (store.syncRoleItems(copy, r || null)) {
          const merged = await be().staffUpdateUser(u.id, copy);
          Object.assign(u, copy);
          store.applyServerUser(u.id, merged);
        }
        if (u.id === store.getState().uid) await store.setRoleLocal(r || null);
        await log(`Rolle von „${u.name}" → ${r || 'keine'}`);
        toast('✅ Rolle gespeichert', 'success');
        draw(body.querySelector('[data-q]').value);
      }
      if (a === 'del') {
        if (!(await confirmDialog('Spieler löschen', `Alle Daten von „${u.name}" endgültig löschen?\n(Der Login bleibt in Firebase bestehen und muss dort separat gelöscht werden.)`, { okText: 'Löschen', danger: true }))) return;
        await be().deleteUser(u.id);
        await log(`Spieler „${u.name}" gelöscht`);
        users.splice(users.indexOf(u), 1);
        draw(body.querySelector('[data-q]').value);
        toast('🗑️ Gelöscht');
      }
    } catch (ex) {
      toast(friendlyError(ex), 'error');
    } finally { btn.disabled = false; }
  });
}

function choose(title, options, current) {
  return openDialog({
    title,
    content: `<div class="choice-list">${options.map(([v, l]) => `<button type="button" class="btn ${v === current ? 'btn-primary' : 'btn-ghost'} btn-block" data-v="${esc(v)}">${l}</button>`).join('')}</div>`,
    onOpen(root, close) { root.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => close(b.dataset.v))); },
  }).done.then((v) => (typeof v === 'string' ? v : null));
}

function gamesDialog(u, updateUser) {
  const unlocked = new Set(u.unlocked || []);
  return openDialog({
    title: `🎮 Spiele von ${esc(u.name)}`,
    content: `<div class="check-list">${LOCKABLE.map((g) => `<label class="check"><input type="checkbox" value="${g.id}" ${unlocked.has(g.id) ? 'checked' : ''}> ${g.emoji} ${esc(g.name)} <small>(${g.unlock})</small></label>`).join('')}</div>
      <div class="dialog-actions"><button type="button" class="btn btn-primary" data-save>Speichern</button></div>`,
    onOpen(root, close) {
      root.querySelector('[data-save]').onclick = async (e) => {
        e.target.disabled = true;
        const next = [...root.querySelectorAll('input:checked')].map((i) => i.value);
        const added = next.filter((id) => !unlocked.has(id)), removed = [...unlocked].filter((id) => !next.includes(id));
        try {
          if (added.length || removed.length) {
            const adminUnlocked = [...new Set([...(u.adminUnlocked || []).filter((id) => !removed.includes(id)), ...added])];
            const names = (ids) => ids.map((id) => GAME_BY_ID[id]?.name).join(', ');
            await updateUser(u, { unlocked: next, adminUnlocked },
              `Spiele „${u.name}": ${added.length ? '🔓 ' + names(added) : ''} ${removed.length ? '🔒 ' + names(removed) : ''}`);
            toast('✅ Gespeichert', 'success');
          }
          close();
        } catch (ex) { toast(friendlyError(ex), 'error'); e.target.disabled = false; }
      };
    },
  }).done;
}

function itemsDialog(u) {
  const inv = new Set(u.inventory || []);
  return openDialog({
    title: `🎨 Items von ${esc(u.name)}`,
    wide: true,
    content: `<p class="muted small">Haken = besitzt das Item. Exklusive Items (👑 VIP-Krone, 🐲 Ur-Drache) gibt es nur so oder per Gutschein. Admin-/Leiter-Titel kommen automatisch mit der Rolle.</p>
      <div class="check-list cols">${ITEMS.filter((it) => !it.role).map((it) => `<label class="check"><input type="checkbox" value="${it.id}" ${inv.has(it.id) ? 'checked' : ''}> ${it.icon} ${esc(it.name)}</label>`).join('')}</div>
      <div class="dialog-actions"><button type="button" class="btn btn-primary" data-save>Speichern</button></div>`,
    onOpen(root, close) {
      root.querySelector('[data-save]').onclick = async (e) => {
        e.target.disabled = true;
        // Rollen-Items bleiben unverändert – die hängen an der Rolle, nicht an diesem Dialog
        const inventory = [...root.querySelectorAll('input:checked')].map((i) => i.value)
          .concat((u.inventory || []).filter((id) => ALL_ROLE_ITEM_IDS.includes(id)));
        const equipped = Object.fromEntries(Object.entries(u.equipped || {}).filter(([, id]) => inventory.includes(id)));
        try {
          const merged = await be().staffUpdateUser(u.id, { inventory, equipped });
          Object.assign(u, { inventory, equipped });
          store.applyServerUser(u.id, merged);
          await log(`Items von „${u.name}" geändert (${inventory.length} Items)`);
          toast('✅ Gespeichert', 'success');
          close();
        } catch (ex) { toast(friendlyError(ex), 'error'); e.target.disabled = false; }
      };
    },
  }).done;
}

// ── Gutscheine ─────────────────────────────────────────────
async function vouchersTab(body) {
  body.innerHTML = '<div class="loading">Lade…</div>';
  let list;
  try { list = await be().listVouchers(); } catch (e) { body.innerHTML = `<p class="empty error">${esc(friendlyError(e))}</p>`; return; }
  if (body.dataset.tab !== 'vouchers') return;
  body.innerHTML = `
    <div class="card">
      <h2 class="section-title">Neuer Gutschein</h2>
      <form class="row wrap" data-new>
        <input class="input" name="code" placeholder="CODE (A–Z, 0–9, -)" maxlength="40" required>
        <select class="input" name="item">${ITEMS.filter((it) => !it.role).map((it) => `<option value="${it.id}">${it.icon} ${esc(it.name)}${it.exclusive ? ' (exklusiv)' : ''}</option>`).join('')}</select>
        <button type="button" class="btn btn-ghost" data-random>🎲 Zufall</button>
        <button class="btn btn-primary" type="submit">Erstellen</button>
      </form>
      <p class="muted small">Jeder Spieler kann einen Code einmal einlösen. Gutscheine liegen in Firebase – niemand kann sie im Quelltext nachlesen.</p>
    </div>
    <div class="admin-list">${list.length ? list.map((v) => `<div class="admin-row"><div class="admin-name"><code>${esc(v.id)}</code> → ${ITEM_BY_ID[v.item]?.icon || '❓'} ${esc(ITEM_BY_ID[v.item]?.name || v.item)}</div>
      <div class="admin-ctrl"><button type="button" class="btn btn-ghost btn-small" data-copy="${esc(v.id)}">📋</button><button type="button" class="btn btn-danger btn-small" data-del="${esc(v.id)}">🗑️</button></div></div>`).join('') : '<p class="empty">Noch keine Gutscheine.</p>'}</div>`;
  const form = body.querySelector('[data-new]');
  body.querySelector('[data-random]').onclick = () => {
    const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    form.querySelector('[name=code]').value = `CILLS-${part()}-${part()}`;
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const code = form.querySelector('[name=code]').value.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9-]{4,40}$/.test(code)) { toast('Code: 4–40 Zeichen, nur A–Z, 0–9 und -', 'error'); return; }
    try {
      await be().createVoucher(code, form.querySelector('[name=item]').value);
      await log(`Gutschein ${code} erstellt`);
      toast('✅ Gutschein erstellt', 'success');
      vouchersTab(body);
    } catch (ex) { toast(friendlyError(ex), 'error'); }
  };
  body.onclick = async (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => toast('📋 Kopiert'), () => toast(c.dataset.copy)); }
    const d = e.target.closest('[data-del]');
    if (d && (await confirmDialog('Gutschein löschen', `${d.dataset.del} löschen?`, { okText: 'Löschen', danger: true }))) {
      try { await be().deleteVoucher(d.dataset.del); await log(`Gutschein ${d.dataset.del} gelöscht`); vouchersTab(body); } catch (ex) { toast(friendlyError(ex), 'error'); }
    }
  };
}

// ── Feedback ──────────────────────────────────────────────
async function feedbackTab(body) {
  body.innerHTML = '<div class="loading">Lade…</div>';
  let list;
  try { list = await be().listFeedback(); } catch (e) { body.innerHTML = `<p class="empty error">${esc(friendlyError(e))}</p>`; return; }
  if (body.dataset.tab !== 'feedback') return;
  const avg = list.length ? (list.reduce((a, f) => a + (f.rating || 0), 0) / list.length).toFixed(1) : '–';
  body.innerHTML = `<p class="muted">${list.length} Bewertungen · Ø ${avg} ⭐</p>
    <div class="admin-list">${list.map((f) => `<div class="feedback">
      <div class="fb-head"><b>👤 ${esc(f.user)}</b><span class="gold">${'★'.repeat(f.rating || 0)}${'☆'.repeat(5 - (f.rating || 0))}</span>
        <small>${esc(new Date(f.ts).toLocaleString('de-CH'))}</small><button type="button" class="btn btn-danger btn-small" data-del="${esc(f.id)}">🗑️</button></div>
      <p>${esc(f.text || '—')}</p></div>`).join('') || '<p class="empty">Noch kein Feedback.</p>'}</div>`;
  body.onclick = async (e) => {
    const d = e.target.closest('[data-del]');
    if (!d) return;
    try { await be().deleteFeedback(d.dataset.del); feedbackTab(body); } catch (ex) { toast(friendlyError(ex), 'error'); }
  };
}

// ── Protokoll ─────────────────────────────────────────────
async function logTab(body) {
  body.innerHTML = '<div class="loading">Lade…</div>';
  let list;
  try { list = await be().listStaffLog(); } catch (e) { body.innerHTML = `<p class="empty error">${esc(friendlyError(e))}</p>`; return; }
  if (body.dataset.tab !== 'log') return;
  body.innerHTML = `<div class="admin-list">${list.map((n) => `<div class="log-row">
      <span class="role-tag ${esc(n.role || '')}">${n.role === 'admin' ? '🛡️' : '👔'} ${esc(n.by)}</span>
      <span>${esc(n.action)}</span><small>${esc(new Date(n.ts).toLocaleString('de-CH'))}</small>
      <button type="button" class="btn btn-ghost btn-small" data-del="${esc(n.id)}" aria-label="Eintrag löschen">✕</button></div>`).join('') || '<p class="empty">Noch keine Einträge.</p>'}</div>`;
  body.onclick = async (e) => {
    const d = e.target.closest('[data-del]');
    if (!d) return;
    try { await be().deleteStaffLog(d.dataset.del); logTab(body); } catch (ex) { toast(friendlyError(ex), 'error'); }
  };
}
