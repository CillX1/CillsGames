// Tests für firestore.rules gegen den offiziellen Firestore-Emulator.
// Lokal:  npm install && npm run test:rules   (braucht Java)
// Läuft automatisch in GitHub Actions bei jedem Push.
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc, writeBatch, query, orderBy, limit } from 'firebase/firestore';

let env;
const OWNER = { uid: 'owner', email: 'cillx11@cillsgames.local' };
const ALICE = { uid: 'alice', email: 'alice@cillsgames.local' };
const LEITER = { uid: 'leiter', email: 'leiter@cillsgames.local' };

const baseUser = (name, extra = {}) => ({
  name, email: name.toLowerCase() + '@cillsgames.local', points: 0, stars: 0, gamesPlayed: 0, totalPointsEver: 0,
  highscores: {}, unlocked: [], adminUnlocked: [], inventory: [], equipped: {}, usedVouchers: [], lastDaily: '', dailyStreak: 0, createdAt: 1, ...extra,
});
const pub = (u) => ({ name: u.name, stars: u.stars, points: u.points, gamesPlayed: u.gamesPlayed, topScore: 0, equipped: u.equipped });
const db = (who) => env.authenticatedContext(who.uid, { email: who.email }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cillsgames',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'users/alice'), baseUser('Alice', { points: 1000, totalPointsEver: 1000 }));
    await setDoc(doc(f, 'leaderboard/alice'), pub(baseUser('Alice', { points: 1000 })));
    await setDoc(doc(f, 'users/bob'), baseUser('Bob', { points: 50 }));
    await setDoc(doc(f, 'users/leiter'), baseUser('Leiter'));
    await setDoc(doc(f, 'roles/leiter'), { role: 'leiter', name: 'Leiter' });
    await setDoc(doc(f, 'vouchers/CILLS-ABC'), { item: 'badge_crown', createdAt: 1 });
    await setDoc(doc(f, 'config/leiter'), { list: [{ name: 'x', pass: 'klartext' }] });
  });
});

async function saveOwn(who, data) {
  const f = db(who);
  const b = writeBatch(f);
  b.set(doc(f, 'users', who.uid), data, { merge: true });
  b.set(doc(f, 'leaderboard', who.uid), pub(data), { merge: true });
  return b.commit();
}

test('Neuer Spieler: nur eigener Spielstand bei null', async () => {
  const carl = { uid: 'carl', email: 'carl@cillsgames.local' };
  await assertSucceeds(saveOwn(carl, baseUser('Carl')));
  const cheat = { uid: 'dora', email: 'dora@cillsgames.local' };
  await assertFails(saveOwn(cheat, baseUser('Dora', { points: 999999 })));
  await assertFails(setDoc(doc(db(carl), 'users/someone'), baseUser('Fremd')));
});

test('Spieler liest nur eigenen Spielstand', async () => {
  await assertSucceeds(getDoc(doc(db(ALICE), 'users/alice')));
  await assertFails(getDoc(doc(db(ALICE), 'users/bob')));
  await assertFails(getDocs(collection(db(ALICE), 'users')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
});

test('Rangliste ist öffentlich lesbar', async () => {
  await assertSucceeds(getDocs(query(collection(env.unauthenticatedContext().firestore(), 'leaderboard'), orderBy('stars', 'desc'), limit(50))));
});

test('Normales Speichern nach einem Spiel', async () => {
  await assertSucceeds(saveOwn(ALICE, baseUser('Alice', { points: 1100, totalPointsEver: 1100, gamesPlayed: 1, highscores: { snake: 200 } })));
});

test('Punkte fälschen wird blockiert', async () => {
  await assertFails(saveOwn(ALICE, baseUser('Alice', { points: 1000 + 30001, totalPointsEver: 1000 })));
  await assertFails(saveOwn(ALICE, baseUser('Alice', { points: 1500, totalPointsEver: 2500 })), 'zu viel "verdient"');
  await assertFails(saveOwn(ALICE, baseUser('Alice', { points: 1000, totalPointsEver: 500 })), 'verdient sinkt');
  await assertFails(saveOwn(ALICE, baseUser('Alice', { points: -5, totalPointsEver: 1000 })));
});

test('Sterne nur im Tausch 100:1', async () => {
  await assertSucceeds(saveOwn(ALICE, baseUser('Alice', { points: 0, stars: 10, totalPointsEver: 1000 })));
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users/alice'), baseUser('Alice', { points: 1000, totalPointsEver: 1000 })));
  await assertFails(saveOwn(ALICE, baseUser('Alice', { points: 900, stars: 5, totalPointsEver: 1000 })));
  await assertFails(saveOwn(ALICE, baseUser('Alice', { points: 1000, stars: 1, totalPointsEver: 1000 })));
});

test('Namen ändern und fremde Felder hinzufügen ist verboten', async () => {
  await assertFails(saveOwn(ALICE, baseUser('Admin', { points: 1000, totalPointsEver: 1000 })));
  await assertFails(updateDoc(doc(db(ALICE), 'users/alice'), { isAdmin: true }));
});

test('Rangliste muss zum echten Spielstand passen', async () => {
  await assertFails(setDoc(doc(db(ALICE), 'leaderboard/alice'), { name: 'Alice', stars: 99999, points: 1000, gamesPlayed: 0, topScore: 0, equipped: {} }));
  await assertFails(setDoc(doc(db(ALICE), 'leaderboard/bob'), { name: 'Bob', stars: 0, points: 50, gamesPlayed: 0, topScore: 0, equipped: {} }));
});

test('Fremde Spielstände ändern ist verboten', async () => {
  await assertFails(updateDoc(doc(db(ALICE), 'users/bob'), { points: 0 }));
  await assertFails(deleteDoc(doc(db(ALICE), 'users/bob')));
});

test('Besitzer kann sich zum Admin machen, andere nicht', async () => {
  await assertFails(setDoc(doc(db(ALICE), 'roles/alice'), { role: 'admin', name: 'Alice' }));
  await assertSucceeds(setDoc(doc(db(OWNER), 'roles/owner'), { role: 'admin', name: 'CillX11' }));
  await assertFails(setDoc(doc(db(OWNER), 'roles/alice'), { role: 'superadmin', name: 'Alice' }));
});

test('Admin darf alles verwalten', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'roles/owner'), { role: 'admin', name: 'CillX11' }));
  const f = db(OWNER);
  await assertSucceeds(getDocs(collection(f, 'users')));
  const b = writeBatch(f);
  b.update(doc(f, 'users/bob'), { points: 5000, inventory: ['badge_crown'] });
  b.set(doc(f, 'leaderboard/bob'), pub(baseUser('Bob', { points: 5000 })), { merge: true });
  await assertSucceeds(b.commit());
  await assertSucceeds(setDoc(doc(f, 'roles/alice'), { role: 'leiter', name: 'Alice' }));
  await assertSucceeds(setDoc(doc(f, 'vouchers/NEU-123'), { item: 'badge_fire', createdAt: 2 }));
  await assertSucceeds(getDocs(collection(f, 'vouchers')));
  await assertFails(deleteDoc(doc(f, 'roles/owner')), 'eigene Admin-Rolle nicht löschbar');
  await assertSucceeds(deleteDoc(doc(f, 'users/bob')));
});

test('Leiter darf nur Punkte, Sterne und Spiele ändern', async () => {
  const f = db(LEITER);
  await assertSucceeds(getDocs(collection(f, 'users')));
  const b = writeBatch(f);
  b.update(doc(f, 'users/bob'), { points: 777, unlocked: ['quiz'], adminUnlocked: ['quiz'] });
  b.set(doc(f, 'leaderboard/bob'), pub(baseUser('Bob', { points: 777 })), { merge: true });
  await assertSucceeds(b.commit());
  await assertFails(updateDoc(doc(f, 'users/bob'), { inventory: ['badge_admin'] }));
  await assertFails(deleteDoc(doc(f, 'users/bob')));
  await assertFails(setDoc(doc(f, 'roles/leiter'), { role: 'admin', name: 'Leiter' }));
  await assertSucceeds(addDoc(collection(f, 'staffLog'), { byUid: 'leiter', by: 'Leiter', role: 'leiter', action: 'Test', ts: 1 }));
  await assertFails(getDocs(collection(f, 'staffLog')));
});

test('Gutscheine: Code abrufbar, Liste geheim', async () => {
  await assertSucceeds(getDoc(doc(db(ALICE), 'vouchers/CILLS-ABC')));
  await assertFails(getDocs(collection(db(ALICE), 'vouchers')));
  await assertFails(setDoc(doc(db(ALICE), 'vouchers/HACK'), { item: 'badge_admin' }));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'vouchers/CILLS-ABC')));
});

test('Feedback: eingeloggt schreiben, nur Admin liest', async () => {
  await assertSucceeds(addDoc(collection(db(ALICE), 'feedbacks'), { uid: 'alice', user: 'Alice', rating: 5, text: 'Super!', ts: 1 }));
  await assertFails(addDoc(collection(db(ALICE), 'feedbacks'), { uid: 'bob', user: 'Bob', rating: 5, text: 'gefälscht', ts: 1 }));
  await assertFails(addDoc(collection(db(ALICE), 'feedbacks'), { uid: 'alice', user: 'Alice', rating: 9, text: '', ts: 1 }));
  await assertFails(addDoc(collection(db(ALICE), 'feedbacks'), { uid: 'alice', user: 'Alice', rating: 3, text: 'x'.repeat(501), ts: 1 }));
  await assertFails(addDoc(collection(env.unauthenticatedContext().firestore(), 'feedbacks'), { uid: 'x', user: 'x', rating: 3, text: '', ts: 1 }));
  await assertFails(getDocs(collection(db(ALICE), 'feedbacks')));
});

test('Alte Sammlung "config" (Klartext-Passwörter) ist komplett gesperrt', async () => {
  await assertFails(getDoc(doc(db(ALICE), 'config/leiter')));
  await assertFails(getDoc(doc(db(LEITER), 'config/leiter')));
});
