// Firebase-Backend (Auth + Firestore). Alle Datenbankzugriffe der App laufen über diese Datei.
// Die Firestore-Regeln (firestore.rules) prüfen auf dem Server, dass niemand fremde Daten ändert.
import { firebaseConfig } from '../firebase-config.js';
import { nameToEmail } from '../util.js';

const SDK = new URL('../../vendor/firebase/', import.meta.url).href;

export async function createFirebaseBackend({ emulator = null } = {}) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(SDK + 'firebase-app.js'),
    import(SDK + 'firebase-auth.js'),
    import(SDK + 'firebase-firestore.js'),
  ]);

  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  if (emulator) {
    A.connectAuthEmulator(auth, `http://${emulator.host}:${emulator.authPort}`, { disableWarnings: true });
    F.connectFirestoreEmulator(db, emulator.host, emulator.firestorePort);
  }

  const d = (...path) => F.doc(db, ...path);
  const col = (name) => F.collection(db, name);
  const docsOf = (snap) => snap.docs.map((s) => ({ id: s.id, ...s.data() }));

  function publicProfile(user) {
    const top = Object.values(user.highscores || {}).reduce((a, b) => Math.max(a, Number(b) || 0), 0);
    return {
      name: user.name,
      stars: user.stars || 0,
      points: user.points || 0,
      gamesPlayed: user.gamesPlayed || 0,
      topScore: top,
      equipped: user.equipped || {},
    };
  }

  return {
    kind: 'firebase',

    onAuthChange(cb) {
      return A.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, displayName: u.displayName, email: u.email } : null));
    },

    async register(name, password) {
      const cred = await A.createUserWithEmailAndPassword(auth, nameToEmail(name), password);
      try { await A.updateProfile(cred.user, { displayName: name }); } catch { /* nicht kritisch */ }
      return cred.user.uid;
    },

    async login(name, password) {
      const cred = await A.signInWithEmailAndPassword(auth, nameToEmail(name), password);
      return cred.user.uid;
    },

    logout: () => A.signOut(auth),

    async changePassword(oldPassword, newPassword) {
      const user = auth.currentUser;
      if (!user) throw new Error('Nicht eingeloggt');
      const cred = A.EmailAuthProvider.credential(user.email, oldPassword);
      await A.reauthenticateWithCredential(user, cred);
      await A.updatePassword(user, newPassword);
    },

    async getUser(uid) {
      const snap = await F.getDoc(d('users', uid));
      return snap.exists() ? snap.data() : null;
    },

    /** Speichert Benutzer + öffentliches Ranglisten-Profil atomar (beides oder nichts). */
    async saveUser(uid, user) {
      const batch = F.writeBatch(db);
      batch.set(d('users', uid), user, { merge: true });
      batch.set(d('leaderboard', uid), publicProfile(user), { merge: true });
      await batch.commit();
    },

    async getRole(uid) {
      try {
        const snap = await F.getDoc(d('roles', uid));
        return snap.exists() ? snap.data().role || null : null;
      } catch { return null; }
    },

    /** Nur die Besitzer-Konten (siehe firebase-config.js) dürfen das. Die Regeln prüfen es auf dem Server. */
    async claimOwnerAdmin(uid, name) {
      await F.setDoc(d('roles', uid), { role: 'admin', name });
    },

    async getLeaderboard(max = 50) {
      const snap = await F.getDocs(F.query(col('leaderboard'), F.orderBy('stars', 'desc'), F.limit(max)));
      return docsOf(snap);
    },

    async getPublicProfile(uid) {
      const snap = await F.getDoc(d('leaderboard', uid));
      return snap.exists() ? { id: uid, ...snap.data() } : null;
    },

    // ── Admin / Leiter ──
    async listUsers() {
      return docsOf(await F.getDocs(col('users')));
    },

    async staffUpdateUser(uid, fields) {
      const ref = d('users', uid);
      const current = (await F.getDoc(ref)).data();
      if (!current) throw Object.assign(new Error('Spieler nicht gefunden'), { code: 'not-found' });
      const merged = { ...current, ...fields };
      const batch = F.writeBatch(db);
      batch.update(ref, fields);
      batch.set(d('leaderboard', uid), publicProfile(merged), { merge: true });
      await batch.commit();
      return merged;
    },

    async deleteUser(uid) {
      const batch = F.writeBatch(db);
      batch.delete(d('users', uid));
      batch.delete(d('leaderboard', uid));
      batch.delete(d('roles', uid));
      await batch.commit();
    },

    async listRoles() {
      return docsOf(await F.getDocs(col('roles')));
    },

    async setRole(uid, role, name) {
      if (role) await F.setDoc(d('roles', uid), { role, name });
      else await F.deleteDoc(d('roles', uid));
    },

    async addFeedback(entry) {
      await F.addDoc(col('feedbacks'), entry);
    },
    async listFeedback() {
      const snap = await F.getDocs(F.query(col('feedbacks'), F.orderBy('ts', 'desc'), F.limit(100)));
      return docsOf(snap);
    },
    async deleteFeedback(id) {
      await F.deleteDoc(d('feedbacks', id));
    },

    async getVoucher(code) {
      const snap = await F.getDoc(d('vouchers', code));
      return snap.exists() ? snap.data() : null;
    },
    async listVouchers() {
      return docsOf(await F.getDocs(col('vouchers')));
    },
    async createVoucher(code, item) {
      await F.setDoc(d('vouchers', code), { item, createdAt: Date.now() });
    },
    async deleteVoucher(code) {
      await F.deleteDoc(d('vouchers', code));
    },

    async addStaffLog(entry) {
      await F.addDoc(col('staffLog'), entry);
    },
    async listStaffLog() {
      const snap = await F.getDocs(F.query(col('staffLog'), F.orderBy('ts', 'desc'), F.limit(100)));
      return docsOf(snap);
    },
    async deleteStaffLog(id) {
      await F.deleteDoc(d('staffLog', id));
    },
  };
}
