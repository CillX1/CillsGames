// Startpunkt von CillsGames.
import * as store from './store.js';
import { defineRoute, startRouter, navigate, currentPath } from './router.js';
import { toast, confirmDialog } from './ui.js';
import { openAuthDialog } from './auth-ui.js';
import { formatNum, esc, nameToEmail } from './util.js';
import { getSetting } from './settings.js';
import { createLocalBackend } from './backend/local.js';
import { OWNER_USERNAMES } from './firebase-config.js';
import { GAME_BY_ID } from './data/games.js';
import { lockAdmin } from './admin-auth.js';
import * as home from './pages/home.js';
import * as game from './pages/game.js';
import * as leaderboard from './pages/leaderboard.js';
import * as profile from './pages/profile.js';
import * as shop from './pages/shop.js';
import * as casino from './pages/casino.js';
import * as exchange from './pages/exchange.js';
import * as misc from './pages/misc.js';
import * as admin from './pages/admin.js';

const $ = (s) => document.querySelector(s);

async function pickBackend() {
  const params = new URLSearchParams(location.search);
  if (params.get('backend') === 'local') return { backend: createLocalBackend(), offline: false };
  try {
    const { createFirebaseBackend } = await import('./backend/firebase.js');
    const emu = params.get('emulator'); // nur für automatische Tests, z. B. ?emulator=127.0.0.1:9099:8080
    const emulator = emu ? (([host, authPort, firestorePort]) => ({ host, authPort, firestorePort: +firestorePort }))(emu.split(':')) : null;
    const backend = await Promise.race([
      createFirebaseBackend({ emulator }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000)),
    ]);
    return { backend, offline: false };
  } catch (e) {
    console.warn('Firebase nicht verfügbar – Offline-Modus', e);
    return { backend: createLocalBackend(), offline: true };
  }
}

function updateHeader() {
  const s = store.getState();
  const u = s.user;
  $('#hdrPoints').textContent = formatNum(u?.points || 0);
  $('#hdrStars').textContent = formatNum(u?.stars || 0);
  $('#loginBtn').textContent = u ? `👤 ${u.name}` : '👤 Login';
  $('#loginBtn').setAttribute('aria-label', u ? `Profil von ${u.name}` : 'Login');
  $('#menuUser').textContent = u ? u.name : 'Nicht eingeloggt';
  $('#menuSub').textContent = u ? `⭐ ${formatNum(u.stars)} Sterne · 🎯 ${formatNum(u.points)} Punkte` : 'Melde dich an, um Punkte zu speichern';
  $('#logoutItem').hidden = !u;
  const isOwner = u && OWNER_USERNAMES.map(nameToEmail).includes(nameToEmail(u.name));
  $('#adminItem').hidden = !(s.role === 'admin' || isOwner);
  $('#leiterItem').hidden = !(s.role === 'leiter' || s.role === 'admin');
  $('#staffDivider').hidden = $('#adminItem').hidden && $('#leiterItem').hidden;
}

function setMenu(open) {
  $('#sideMenu').classList.toggle('open', open);
  $('#menuBackdrop').classList.toggle('show', open);
  $('#menuBtn').setAttribute('aria-expanded', String(open));
  $('#sideMenu').setAttribute('aria-hidden', String(!open));
  if (open) $('#sideMenu').querySelector('a,button')?.focus();
}

function wireChrome() {
  $('#menuBtn').addEventListener('click', () => setMenu(!$('#sideMenu').classList.contains('open')));
  $('#menuClose').addEventListener('click', () => setMenu(false));
  $('#menuBackdrop').addEventListener('click', () => setMenu(false));
  $('#sideMenu').addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#sideMenu').classList.contains('open')) setMenu(false); });
  $('#loginBtn').addEventListener('click', () => (store.isLoggedIn() ? navigate('/profil') : openAuthDialog('login')));
  $('#logoutItem').addEventListener('click', async () => {
    setMenu(false);
    if (!(await confirmDialog('Ausloggen', 'Wirklich ausloggen?', { okText: 'Ausloggen' }))) return;
    await store.flush();
    await store.getState().backend.logout();
    toast('Ausgeloggt. Bis bald! 👋');
  });
}

function markActiveNav(path) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const target = a.getAttribute('href').replace(/^#/, '');
    a.classList.toggle('active', target === '/' ? path === '/' : path.startsWith(target));
  });
}

function defineRoutes() {
  defineRoute('/', home.render, { title: 'Spiele' });
  defineRoute('/spiel/:id', (v, p) => game.render(v, p.id), { title: (p) => GAME_BY_ID[p.id]?.name || 'Spiel' });
  defineRoute('/rangliste', leaderboard.render, { title: 'Rangliste' });
  defineRoute('/profil', profile.renderOwn, { title: 'Mein Profil' });
  defineRoute('/profil/:uid', profile.renderOther, { title: 'Profil' });
  defineRoute('/shop', shop.render, { title: 'Shop' });
  defineRoute('/casino', casino.render, { title: 'Casino' });
  defineRoute('/tauschen', exchange.render, { title: 'Tauschen' });
  defineRoute('/einstellungen', misc.renderSettings, { title: 'Einstellungen' });
  defineRoute('/info', misc.renderInfo, { title: 'Infos' });
  defineRoute('/admin', admin.renderAdmin, { title: 'Admin' });
  defineRoute('/leiter', admin.renderLeiter, { title: 'Leiter' });
}

async function boot() {
  document.documentElement.classList.toggle('reduce-motion', !!getSetting('reduceMotion'));
  wireChrome();
  defineRoutes();
  store.setErrorHandler((msg) => toast(msg, 'error', 6000));
  store.subscribe(updateHeader);
  updateHeader();

  const { backend, offline } = await pickBackend();
  store.setBackend(backend);
  document.documentElement.dataset.backend = backend.kind;
  if (offline) {
    $('#offlineBanner').hidden = false;
  }

  // Login-Wechsel nacheinander abarbeiten (nie zwei gleichzeitig)
  let chain = Promise.resolve();
  let firstAuth = true;
  let lastUid = null;
  backend.onAuthChange((info) => {
    chain = chain.then(async () => {
      try {
        if ((info?.uid || null) !== lastUid) lockAdmin();
        lastUid = info?.uid || null;
        await store.loadSession(info);
      } catch (e) {
        console.error(e);
        toast('Dein Spielstand konnte nicht geladen werden. Lade die Seite neu.', 'error', 8000);
      }
      if (firstAuth) {
        firstAuth = false;
        $('#splash').classList.add('hide');
        setTimeout(() => $('#splash').remove(), 400);
        startRouter($('#view'), markActiveNav);
      } else {
        // Seiten, die vom Login abhängen, neu zeichnen (Spiele laufen ungestört weiter)
        const p = currentPath();
        if (p.startsWith('/admin') || p.startsWith('/leiter') || (p.startsWith('/profil') && p === '/profil')) navigate(p);
      }
    });
  });
}

window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
});

boot().catch((e) => {
  console.error(e);
  const s = document.getElementById('splash');
  if (s) s.innerHTML = `<p>CillsGames konnte nicht starten: ${esc(e.message || e)}</p>`;
});
