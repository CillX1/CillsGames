// Einfacher Hash-Router (#/shop, #/spiel/snake …). Funktioniert auf GitHub Pages ohne Server-Konfiguration,
// und der Zurück-Knopf des Browsers geht wie erwartet.
const routes = [];
let cleanup = null;
let view = null;
let afterRender = () => {};

export function defineRoute(pattern, handler, { title } = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ re, keys, handler, title });
}

export function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

export function navigate(path) {
  if (currentPath() === path) render();
  else location.hash = path;
}

export function startRouter(viewEl, onAfterRender) {
  view = viewEl;
  if (onAfterRender) afterRender = onAfterRender;
  window.addEventListener('hashchange', render);
  render();
}

export function render() {
  if (!view) return;
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  const path = currentPath();
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    // Jede Seite bekommt ein frisches Element -> Event-Listener der alten Seite verschwinden mit ihr.
    const page = document.createElement('div');
    page.className = 'page';
    view.replaceChildren(page);
    document.title = r.title ? `${typeof r.title === 'function' ? r.title(params) : r.title} · CillsGames` : 'CillsGames';
    try {
      const c = r.handler(page, params);
      if (typeof c === 'function') cleanup = c;
    } catch (e) {
      console.error(e);
      page.innerHTML = '<p class="empty">Da ist etwas schiefgelaufen. Bitte lade die Seite neu.</p>';
    }
    window.scrollTo(0, 0);
    afterRender(path);
    return;
  }
  // Unbekannte Adresse: ersetzen statt neuen Verlaufseintrag anlegen (sonst hängt der Zurück-Knopf)
  location.replace(location.pathname + location.search + '#/');
}
