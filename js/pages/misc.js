// Einstellungen, Infos/Kontakt und Bewertung.
import * as store from '../store.js';
import { esc, friendlyError, validatePassword } from '../util.js';
import { getSetting, setSetting } from '../settings.js';
import { toast, openDialog, confirmDialog } from '../ui.js';
import { openAuthDialog } from '../auth-ui.js';
import { GAMES } from '../data/games.js';
import { play } from '../sound.js';

export function renderSettings(view) {
  function draw() {
    const u = store.user();
    view.innerHTML = `
      <h1 class="page-title">⚙️ Einstellungen</h1>
      <div class="card settings">
        <label class="setting"><span><b>Sounds</b><small>Soundeffekte in Spielen und im Casino</small></span>
          <input type="checkbox" class="switch" data-set="sound" ${getSetting('sound') ? 'checked' : ''}></label>
        <label class="setting"><span><b>Lautstärke</b><small>${Math.round(getSetting('volume') * 100)} %</small></span>
          <input type="range" min="0" max="1" step="0.05" value="${getSetting('volume')}" data-set="volume" aria-label="Lautstärke"></label>
        <label class="setting"><span><b>Weniger Animationen</b><small>Ruhigere Oberfläche</small></span>
          <input type="checkbox" class="switch" data-set="reduceMotion" ${getSetting('reduceMotion') ? 'checked' : ''}></label>
        <label class="setting"><span><b>Bildschirm-Tasten in Spielen</b><small>Für Handy und Tablet</small></span>
          <select class="input input-small" data-set="touchControls">
            ${[['auto', 'Automatisch'], ['on', 'Immer'], ['off', 'Nie']].map(([v, l]) => `<option value="${v}" ${getSetting('touchControls') === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
      </div>
      <div class="card">
        <h2 class="section-title">👤 Konto</h2>
        ${u ? `<p>Eingeloggt als <b>${esc(u.name)}</b>${store.getState().role ? ` · Rolle: <b>${esc(store.getState().role)}</b>` : ''}</p>
          <div class="row wrap">
            <button type="button" class="btn btn-ghost" data-act="pw">🔑 Passwort ändern</button>
            <button type="button" class="btn btn-danger" data-act="logout">🚪 Ausloggen</button>
          </div>`
        : '<button type="button" class="btn btn-primary" data-act="login">Login / Registrieren</button>'}
        <p class="muted small">Speicherort: ${store.getState().backend?.kind === 'firebase' ? '☁️ Firebase (online, auf allen Geräten)' : '💾 Nur dieses Gerät (Offline-Modus)'}</p>
      </div>`;
  }
  draw();
  view.addEventListener('change', (e) => {
    const k = e.target.dataset.set;
    if (!k) return;
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' ? +e.target.value : e.target.value;
    setSetting(k, v);
    if (k === 'reduceMotion') document.documentElement.classList.toggle('reduce-motion', v);
    if (k === 'sound' && v) play('coin');
    if (k === 'volume') { play('click'); draw(); }
  });
  view.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'login') openAuthDialog();
    if (act === 'logout' && (await confirmDialog('Ausloggen', 'Wirklich ausloggen?', { okText: 'Ausloggen' }))) {
      await store.flush();
      await store.getState().backend.logout();
      toast('Ausgeloggt. Bis bald! 👋');
    }
    if (act === 'pw') changePassword();
  });
  return store.subscribe(draw);
}

function changePassword() {
  openDialog({
    title: '🔑 Passwort ändern',
    content: `<form class="pw-form">
      <label class="field"><span>Aktuelles Passwort</span><input class="input" type="password" name="old" autocomplete="current-password"></label>
      <label class="field"><span>Neues Passwort</span><input class="input" type="password" name="new" autocomplete="new-password" placeholder="Mindestens 6 Zeichen"></label>
      <label class="field"><span>Neues Passwort wiederholen</span><input class="input" type="password" name="new2" autocomplete="new-password"></label>
      <p class="form-error" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit">Speichern</button></form>`,
    onOpen(root, close) {
      const f = root.querySelector('form');
      f.onsubmit = async (e) => {
        e.preventDefault();
        const err = f.querySelector('.form-error');
        const get = (n) => f.querySelector(`[name=${n}]`).value;
        const problem = validatePassword(get('new')) || (get('new') !== get('new2') ? 'Die neuen Passwörter stimmen nicht überein.' : '');
        if (problem) { err.textContent = problem; return; }
        try {
          await store.getState().backend.changePassword(get('old'), get('new'));
          close(); toast('✅ Passwort geändert', 'success');
        } catch (ex) { err.textContent = friendlyError(ex); }
      };
    },
  });
}

export function renderInfo(view) {
  view.innerHTML = `
    <h1 class="page-title">ℹ️ Über CillsGames</h1>
    <div class="card prose">
      <p><b>CillsGames</b> ist ein Browser-Spieleportal mit ${GAMES.length} Spielen – ohne Werbung, ohne Download.</p>
      <ul>
        <li>🎯 <b>Punkte</b> verdienst du beim Spielen. Je besser dein Score, desto mehr Punkte.</li>
        <li>🔓 Gesperrte Spiele werden automatisch frei, sobald du insgesamt genug Punkte verdient hast – oder du kaufst sie früher frei.</li>
        <li>⭐ <b>Sterne</b> bekommst du im Tausch: 100 Punkte = 1 Stern. Sterne zählen für die Rangliste.</li>
        <li>🎁 Jeden Tag gibt es einen <b>Tagesbonus</b> – und er wächst, wenn du mehrere Tage in Folge kommst.</li>
        <li>🛒 Im <b>Shop</b> gibt es Abzeichen, Titel, Namensfarben und Rahmen für dein Profil.</li>
        <li>⌨️ In allen Action-Spielen pausiert <kbd>P</kbd> das Spiel. Auf dem Handy erscheinen Bildschirm-Tasten.</li>
      </ul>
      <p class="muted small">Version 3.0 · engineered by Cillian Fontannaz · Quellcode auf <a href="https://github.com/CillX1/CillsGames" target="_blank" rel="noopener">GitHub</a></p>
    </div>
    <h2 class="page-title small">📬 Kontakt</h2>
    <div class="card prose">
      <p>Fragen, Bugs oder Ideen? Schreib an <a href="mailto:cillianfontannaz@hotmail.com">cillianfontannaz@hotmail.com</a> oder nutze die Bewertung unten.</p>
    </div>
    <h2 class="page-title small">⭐ Bewertung</h2>
    <div class="card">
      <form data-rate>
        <div class="rating" role="radiogroup" aria-label="Sterne">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="rate-star" data-n="${n}" aria-label="${n} Sterne">★</button>`).join('')}
        </div>
        <textarea class="input" name="text" maxlength="500" rows="3" placeholder="Dein Feedback (optional, max. 500 Zeichen)"></textarea>
        <button class="btn btn-primary" type="submit">📨 Absenden</button>
      </form>
    </div>`;
  let rating = 0;
  const stars = [...view.querySelectorAll('.rate-star')];
  const paint = (n) => stars.forEach((s, i) => s.classList.toggle('on', i < n));
  stars.forEach((s) => {
    s.onclick = () => { rating = +s.dataset.n; paint(rating); };
    s.onmouseenter = () => paint(+s.dataset.n);
    s.onmouseleave = () => paint(rating);
  });
  view.querySelector('[data-rate]').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!store.isLoggedIn()) { toast('Bitte zuerst einloggen, damit wir Spam verhindern können.', 'error'); openAuthDialog(); return; }
    if (!rating) { toast('Bitte wähle 1–5 Sterne.', 'error'); return; }
    const text = e.target.querySelector('textarea').value.trim().slice(0, 500);
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await store.getState().backend.addFeedback({ uid: store.getState().uid, user: store.user().name, rating, text, ts: Date.now() });
      toast('✅ Danke für dein Feedback!', 'success');
      e.target.reset(); rating = 0; paint(0);
    } catch (ex) { toast(friendlyError(ex), 'error'); } finally { btn.disabled = false; }
  });
}
