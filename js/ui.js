// Toasts und Dialoge – ersetzen alert()/confirm()/prompt(), die auf Handys hässlich sind und das Spiel blockieren.
import { esc } from './util.js';

let toastHost = null;

export function toast(message, type = 'info', ms = 3200) {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toast-host';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastHost);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  toastHost.appendChild(el);
  while (toastHost.children.length > 3) toastHost.firstElementChild.remove(); // höchstens 3 gleichzeitig
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

let openDialogs = 0;
let lastFocus = null;

/**
 * Öffnet einen Dialog. `content` ist HTML (vom Aufrufer bereits escaped).
 * Gibt { root, close, done } zurück; `done` ist ein Promise, das beim Schliessen mit dem Wert resolved.
 */
export function openDialog({ title = '', content = '', wide = false, closable = true, onOpen } = {}) {
  if (openDialogs === 0) lastFocus = document.activeElement;
  openDialogs++;
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `
    <div class="dialog ${wide ? 'dialog-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      ${closable ? '<button class="dialog-close" type="button" aria-label="Schliessen">✕</button>' : ''}
      ${title ? `<h2 class="dialog-title">${esc(title)}</h2>` : ''}
      <div class="dialog-body">${content}</div>
    </div>`;
  document.body.appendChild(backdrop);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => backdrop.classList.add('show'));

  let resolveFn;
  const done = new Promise((r) => (resolveFn = r));
  let closed = false;
  const onKey = (e) => {
    if (e.key === 'Escape' && closable) { e.stopPropagation(); close(undefined); }
  };
  function close(value) {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 200);
    openDialogs--;
    if (openDialogs === 0) {
      document.body.classList.remove('no-scroll');
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus?.();
    }
    resolveFn(value);
  }
  document.addEventListener('keydown', onKey, true);
  if (closable) {
    backdrop.querySelector('.dialog-close').onclick = () => close(undefined);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(undefined); });
  }
  const root = backdrop.querySelector('.dialog');
  onOpen?.(root, close);
  const firstInput = root.querySelector('input,textarea,select,button.btn-primary');
  setTimeout(() => firstInput?.focus(), 30);
  return { root, close, done };
}

export function confirmDialog(title, text, { okText = 'OK', cancelText = 'Abbrechen', danger = false } = {}) {
  const d = openDialog({
    title,
    content: `<p class="dialog-text">${esc(text).replace(/\n/g, '<br>')}</p>
      <div class="dialog-actions">
        <button type="button" class="btn btn-ghost" data-act="no">${esc(cancelText)}</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${esc(okText)}</button>
      </div>`,
    onOpen(root, close) {
      root.querySelector('[data-act=yes]').onclick = () => close(true);
      root.querySelector('[data-act=no]').onclick = () => close(false);
    },
  });
  return d.done.then((v) => v === true);
}

export function promptDialog(title, text, { placeholder = '', type = 'text', okText = 'OK', value = '' } = {}) {
  const d = openDialog({
    title,
    content: `<p class="dialog-text">${esc(text)}</p>
      <form class="dialog-form">
        <input class="input" type="${esc(type)}" placeholder="${esc(placeholder)}" value="${esc(value)}" autocomplete="off">
        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" data-act="no">Abbrechen</button>
          <button type="submit" class="btn btn-primary">${esc(okText)}</button>
        </div>
      </form>`,
    onOpen(root, close) {
      const input = root.querySelector('input');
      root.querySelector('form').onsubmit = (e) => { e.preventDefault(); close(input.value); };
      root.querySelector('[data-act=no]').onclick = () => close(null);
    },
  });
  return d.done.then((v) => (typeof v === 'string' ? v : null));
}

/** Setzt einen Button in den Ladezustand, solange `fn` läuft. Verhindert Doppelklicks. */
export async function withBusy(button, fn) {
  if (!button || button.dataset.busy === '1') return;
  button.dataset.busy = '1';
  button.disabled = true;
  button.classList.add('is-busy');
  try {
    return await fn();
  } finally {
    button.dataset.busy = '';
    button.disabled = false;
    button.classList.remove('is-busy');
  }
}
