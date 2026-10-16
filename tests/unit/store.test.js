// Tests für store.js mit dem lokalen Backend (ohne Browser).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalBackend } from '../../js/backend/local.js';
import * as store from '../../js/store.js';
import { GAME_BY_ID } from '../../js/data/games.js';

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

let backend;
async function loginAs(name, pass = 'geheim123', register = true) {
  if (register) await backend.register(name, pass); else await backend.login(name, pass);
  const info = await new Promise((resolve) => { const off = backend.onAuthChange((i) => { off(); resolve(i); }); });
  await store.loadSession(info);
  await store.flush();
}

beforeEach(async () => {
  backend = createLocalBackend(memStorage());
  store.setBackend(backend);
  await store.loadSession(null);
});

test('Registrierung legt sauberen Spielstand an (Name mit Gross-/Kleinschreibung)', async () => {
  store.setPendingRegistration('CillX11');
  await loginAs('CillX11');
  const u = store.user();
  assert.equal(u.name, 'CillX11');
  assert.equal(u.points, 0);
  assert.deepEqual(u.inventory, []);
  const saved = await backend.getUser(store.getState().uid);
  assert.equal(saved.name, 'CillX11');
  const lb = await backend.getLeaderboard();
  assert.equal(lb.length, 1);
  assert.equal(lb[0].name, 'CillX11');
});

test('Doppelte Namen werden abgelehnt (auch andere Schreibweise)', async () => {
  await backend.register('Max', 'geheim123');
  await assert.rejects(backend.register('max', 'anders123'), { code: 'auth/email-already-in-use' });
});

test('Falsches Passwort', async () => {
  await backend.register('Lena', 'richtig123');
  await backend.logout();
  await assert.rejects(backend.login('Lena', 'falsch123'), { code: 'auth/invalid-credential' });
  assert.ok(await backend.login('lena', 'richtig123'));
});

test('Spielergebnis: Punkte, Rekord, Spielzähler, Auto-Freischaltung', async () => {
  await loginAs('Tester');
  const r = store.recordGameResult('snake', 120);
  assert.equal(r.points, 60);
  assert.equal(r.newRecord, true);
  assert.equal(store.user().highscores.snake, 120);
  assert.equal(store.user().gamesPlayed, 1);
  assert.deepEqual(r.unlocked.map((g) => g.id), ['tictactoe']);
  const r2 = store.recordGameResult('snake', 50);
  assert.equal(r2.newRecord, false);
  assert.equal(store.user().highscores.snake, 120);
  await store.flush();
  const saved = await backend.getUser(store.getState().uid);
  assert.equal(saved.points, 85);
  assert.ok(saved.unlocked.includes('tictactoe'));
});

test('Spiel früher freikaufen', async () => {
  await loginAs('Kaeufer');
  store.getState().user.points = 500;
  const r = await store.buyGameUnlock('pacman');
  assert.equal(r.ok, true);
  assert.equal(store.user().points, 500 - GAME_BY_ID.pacman.unlock);
  assert.equal(store.isUnlocked('pacman'), true);
  const r2 = await store.buyGameUnlock('quiz');
  assert.equal(r2.ok, false);
});

test('Punkte -> Sterne', async () => {
  await loginAs('Tauscher');
  store.getState().user.points = 1050;
  assert.equal((await store.convertToStars(50)).ok, false);
  const r = await store.convertToStars(1050);
  assert.deepEqual([r.ok, r.stars, r.cost], [true, 10, 1000]);
  assert.equal(store.user().points, 50);
  assert.equal(store.user().stars, 10);
  assert.equal((await store.convertToStars(100)).ok, false);
});

test('Shop: kaufen, ausrüsten, exklusive Items nicht kaufbar', async () => {
  await loginAs('Shopper');
  store.getState().user.points = 300;
  assert.equal((await store.buyItem('badge_fire')).ok, true);
  assert.equal((await store.buyItem('badge_fire')).ok, false, 'nicht doppelt');
  assert.equal((await store.buyItem('badge_gold')).ok, false, 'zu teuer');
  assert.equal((await store.buyItem('badge_crown')).ok, false, 'exklusiv');
  assert.equal(await store.toggleEquip('badge_fire'), true);
  assert.equal(store.user().equipped.badge, 'badge_fire');
  await store.toggleEquip('badge_fire');
  assert.equal(store.user().equipped.badge, undefined);
  assert.equal(await store.toggleEquip('badge_gold'), false, 'nicht im Besitz');
});

test('Casino-Einsatz und Gewinn', async () => {
  await loginAs('Zocker');
  store.getState().user.points = 100;
  assert.equal(store.spendPoints(250), false);
  assert.equal(store.spendPoints(100), true);
  assert.equal(store.user().points, 0);
  store.creditPoints(190);
  assert.equal(store.user().points, 190);
  assert.equal(store.user().totalPointsEver, 0, 'Casino zählt nicht als verdiente Punkte');
});

test('Tagesbonus: einmal pro Tag, Serie wächst', async () => {
  await loginAs('Daily');
  const r = await store.claimDailyBonus();
  assert.deepEqual([r.ok, r.amount, r.streak], [true, store.DAILY_BASE, 1]);
  assert.equal((await store.claimDailyBonus()).ok, false);
  // gestern abgeholt -> Serie 2
  const y = new Date(Date.now() - 86_400_000);
  store.getState().user.lastDaily = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const r2 = await store.claimDailyBonus();
  assert.deepEqual([r2.ok, r2.streak, r2.amount], [true, 2, store.DAILY_BASE + store.DAILY_STREAK_STEP]);
});

test('Gutscheine: nur vom Admin erstellbar, einmal pro Spieler', async () => {
  await loginAs('CillX1');
  await backend.claimOwnerAdmin(store.getState().uid, 'CillX1');
  await backend.createVoucher('CILLS-TEST-1', 'badge_crown');
  await backend.logout();
  await store.loadSession(null);
  await loginAs('Normalo');
  await assert.rejects(backend.createVoucher('HACK-1', 'badge_admin'), { code: 'permission-denied' });
  assert.equal((await store.redeemVoucher('falsch-123')).ok, false);
  const r = await store.redeemVoucher(' cills-test-1 ');
  assert.equal(r.ok, true);
  assert.equal(r.item.id, 'badge_crown');
  assert.ok(store.user().inventory.includes('badge_crown'));
  assert.equal((await store.redeemVoucher('CILLS-TEST-1')).ok, false, 'nur einmal');
});

test('Nur Besitzer-Konten können sich zum Admin machen', async () => {
  await loginAs('Hacker');
  await assert.rejects(backend.claimOwnerAdmin(store.getState().uid, 'Hacker'), { code: 'permission-denied' });
  await assert.rejects(backend.listUsers(), { code: 'permission-denied' });
});

test('Leiter darf nur Punkte/Sterne/Spiele ändern', async () => {
  await loginAs('Spieler1');
  const victim = store.getState().uid;
  await backend.logout();
  await loginAs('CillX11');
  await backend.claimOwnerAdmin(store.getState().uid, 'CillX11');
  await backend.logout();
  await loginAs('Leiter1');
  const leiterUid = store.getState().uid;
  await backend.logout();
  await backend.login('CillX11', 'geheim123');
  await backend.setRole(leiterUid, 'leiter', 'Leiter1');
  await backend.logout();
  await backend.login('Leiter1', 'geheim123');
  await backend.staffUpdateUser(victim, { points: 999, unlocked: ['quiz'] });
  await assert.rejects(backend.staffUpdateUser(victim, { inventory: ['badge_admin'] }), { code: 'permission-denied' });
  await assert.rejects(backend.deleteUser(victim), { code: 'permission-denied' });
  const lb = await backend.getPublicProfile(victim);
  assert.equal(lb.points, 999, 'Rangliste wird mitgezogen');
});

test('Alte Spielstände werden repariert', () => {
  const u = store.sanitizeUser({ name: 'Alt', points: '12.7', stars: -3, unlocked: 'kaputt', highscores: { snake: 50, weg: 9 }, equipped: { badge: 'badge_fire', title: 'title_pro' }, inventory: ['badge_fire', 'badge_fire'], uid: 'x' });
  assert.equal(u.points, 12);
  assert.equal(u.stars, 0);
  assert.deepEqual(u.unlocked, []);
  assert.deepEqual(u.highscores, { snake: 50 });
  assert.deepEqual(u.equipped, { badge: 'badge_fire' });
  assert.deepEqual(u.inventory, ['badge_fire']);
  assert.equal('uid' in u, false);
});

test('Rollen-Titel: nicht kaufbar, automatisch mit der Rolle, verschwinden ohne Rolle', async () => {
  const { SHOP_ITEMS } = await import('../../js/data/shop.js');
  for (const id of ['title_admin', 'badge_admin', 'title_leiter']) {
    assert.ok(!SHOP_ITEMS.some((i) => i.id === id), id + ' darf nicht im Shop sein');
  }
  await loginAs('CillX1');
  store.getState().user.points = 99999;
  assert.equal((await store.buyItem('title_admin')).ok, false);
  await backend.claimOwnerAdmin(store.getState().uid, 'CillX1');
  await store.setRoleLocal('admin');
  await store.flush();
  const u = store.user();
  assert.ok(u.inventory.includes('title_admin') && u.inventory.includes('badge_admin'));
  assert.equal(u.equipped.title, 'title_admin', 'automatisch ausgerüstet');
  assert.equal(u.equipped.badge, 'badge_admin');
  assert.equal((await backend.getPublicProfile(store.getState().uid)).equipped.title, 'title_admin');
  // Rolle weg -> Titel weg
  await store.setRoleLocal(null);
  assert.ok(!store.user().inventory.includes('title_admin'));
  assert.equal(store.user().equipped.title, undefined);
});

test('Leiter-Titel und Schummel-Schutz', async () => {
  await loginAs('Schummler');
  store.getState().user.inventory.push('title_admin');
  await assert.rejects(backend.saveUser(store.getState().uid, store.user()), { code: 'permission-denied' });
  store.syncRoleItems();
  assert.ok(!store.user().inventory.includes('title_admin'), 'wird ohne Rolle entfernt');
  // Leiter-Rolle muss wirklich vom Admin vergeben sein
  const uid = store.getState().uid;
  await store.setRoleLocal('leiter');
  await store.flush();
  assert.deepEqual(store.user().inventory, [], 'ohne echte Rolle lehnt der Server den Titel ab');
  await backend.logout();
  await loginAs('CillX11');
  await backend.claimOwnerAdmin(store.getState().uid, 'CillX11');
  await backend.setRole(uid, 'leiter', 'Schummler');
  await backend.logout();
  await loginAs('Schummler', 'geheim123', false);
  assert.equal(store.getState().role, 'leiter');
  assert.deepEqual(store.user().inventory, ['title_leiter']);
  assert.equal(store.user().equipped.title, 'title_leiter');
});

test('Eigener Titel wird nicht überschrieben', () => {
  const u = store.sanitizeUser({ name: 'X', inventory: ['title_pro'], equipped: { title: 'title_pro' } });
  store.syncRoleItems(u, 'leiter');
  assert.ok(u.inventory.includes('title_leiter'));
  assert.equal(u.equipped.title, 'title_pro');
});
