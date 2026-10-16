// Login- und Registrierungsdialog.
import { openDialog, toast } from './ui.js';
import { getState, setPendingRegistration } from './store.js';
import { validateUsername, validatePassword, friendlyError } from './util.js';

export function openAuthDialog(tab = 'login') {
  const d = openDialog({
    title: '',
    content: `
      <div class="tabs" role="tablist">
        <button type="button" class="tab" data-tab="login" role="tab">Login</button>
        <button type="button" class="tab" data-tab="register" role="tab">Registrieren</button>
      </div>
      <form class="auth-form" data-form="login" novalidate>
        <h2 class="dialog-title">Willkommen zurück! 👋</h2>
        <label class="field"><span>Benutzername</span><input class="input" name="name" autocomplete="username" required maxlength="20"></label>
        <label class="field"><span>Passwort</span><input class="input" name="pass" type="password" autocomplete="current-password" required></label>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-primary btn-block" type="submit">Einloggen</button>
      </form>
      <form class="auth-form" data-form="register" novalidate hidden>
        <h2 class="dialog-title">Konto erstellen ✨</h2>
        <label class="field"><span>Benutzername</span><input class="input" name="name" autocomplete="username" required maxlength="20" placeholder="2–20 Zeichen"></label>
        <label class="field"><span>Passwort</span><input class="input" name="pass" type="password" autocomplete="new-password" required placeholder="Mindestens 6 Zeichen"></label>
        <label class="field"><span>Passwort wiederholen</span><input class="input" name="pass2" type="password" autocomplete="new-password" required></label>
        <p class="form-hint">Dein Benutzername ist öffentlich in der Rangliste sichtbar. Benutze kein Passwort, das du anderswo verwendest.</p>
        <p class="form-error" role="alert"></p>
        <button class="btn btn-primary btn-block" type="submit">Registrieren</button>
      </form>`,
    onOpen(root, close) {
      const tabs = root.querySelectorAll('.tab');
      const show = (t) => {
        tabs.forEach((b) => { b.classList.toggle('active', b.dataset.tab === t); b.setAttribute('aria-selected', String(b.dataset.tab === t)); });
        root.querySelectorAll('.auth-form').forEach((f) => { f.hidden = f.dataset.form !== t; });
        root.querySelector(`[data-form=${t}] input`)?.focus();
      };
      tabs.forEach((b) => (b.onclick = () => show(b.dataset.tab)));
      show(tab);

      root.querySelectorAll('.auth-form').forEach((form) => {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const err = form.querySelector('.form-error');
          const btn = form.querySelector('button[type=submit]');
          err.textContent = '';
          const field = (n) => form.querySelector(`[name=${n}]`);
          const name = field('name').value.trim();
          const pass = field('pass').value;
          const isReg = form.dataset.form === 'register';
          if (isReg) {
            const problem = validateUsername(name) || validatePassword(pass) || (pass !== field('pass2').value ? 'Die Passwörter stimmen nicht überein.' : '');
            if (problem) { err.textContent = problem; return; }
          } else if (!name || !pass) { err.textContent = 'Bitte Name und Passwort eingeben.'; return; }
          btn.disabled = true;
          btn.classList.add('is-busy');
          try {
            const { backend } = getState();
            if (isReg) { setPendingRegistration(name); await backend.register(name, pass); }
            else await backend.login(name, pass);
            close(true);
            toast(isReg ? `Willkommen, ${name}! 🎉` : `Hallo ${name}! 👋`, 'success');
          } catch (ex) {
            err.textContent = friendlyError(ex);
          } finally {
            btn.disabled = false;
            btn.classList.remove('is-busy');
          }
        };
      });
    },
  });
  return d.done;
}
