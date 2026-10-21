// Game-Host: stellt jedem Spiel Canvas, Spielschleife, Eingaben und Aufräumen bereit.
// Wichtig: Alles, was ein Spiel über den Host registriert, wird beim Verlassen automatisch entfernt.
import { play } from '../sound.js';
import { wantsTouchControls, getSetting } from '../settings.js';

const STEP = 1000 / 60; // feste Logikrate: 60 Updates pro Sekunde auf jedem Bildschirm

const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export class GameHost {
  /**
   * @param {object} o
   * @param {HTMLElement} o.stage  Bereich, in dem das Spiel läuft
   * @param {(score:number)=>void} o.onScore
   * @param {(score:number)=>void} o.onEnd
   */
  constructor({ stage, onScore, onEnd }) {
    this.stage = stage;
    this._onScore = onScore;
    this._onEnd = onEnd;
    this._cleanups = [];
    this._keyHandlers = [];
    this.keys = new Set();
    this.score = 0;
    this.over = false;
    this.paused = false;
    this.destroyed = false;
    this._raf = 0;
    this.canvas = null;
    this.ctx = null;
    this.sound = play;
    this.reduceMotion = !!getSetting('reduceMotion');
    this.waiting = false;   // Start-Bildschirm aktiv?
    this._shake = 0;
    this._floats = [];
    this.mode = null;       // gewählter Schwierigkeitsgrad (falls das Spiel welche anbietet)

    this.on(document, 'keydown', (e) => {
      if (this.destroyed) return;
      if (e.target instanceof HTMLElement && e.target.matches('input,textarea,select') && !e.target.dataset.gameInput) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.code === 'KeyP' || (e.code === 'Escape' && this._loop)) {
        if (this._loop && !this.over) { this.togglePause(); e.preventDefault(); return; }
      }
      const first = !this.keys.has(e.code);
      this.keys.add(e.code);
      if (this.paused) return;
      if (this.waiting) { if (first && !e.metaKey && !e.ctrlKey && !e.altKey) this._begin(); return; }
      for (const h of this._keyHandlers) h(e, first);
    });
    this.on(document, 'keyup', (e) => this.keys.delete(e.code));
    this.on(window, 'blur', () => { this.keys.clear(); if (this._loop && !this.over) this.pause(); });
    this.on(document, 'visibilitychange', () => { if (document.hidden && this._loop && !this.over) this.pause(); });
  }

  // ── Aufräumen ───────────────────────────────
  on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._cleanups.push(() => target.removeEventListener(type, fn, opts));
    return fn;
  }
  onCleanup(fn) { this._cleanups.push(fn); }
  timeout(fn, ms) {
    const id = setTimeout(() => { if (!this.destroyed) fn(); }, ms);
    this._cleanups.push(() => clearTimeout(id));
    return id;
  }
  interval(fn, ms) {
    const id = setInterval(() => { if (!this.destroyed && !this.paused) fn(); }, ms);
    this._cleanups.push(() => clearInterval(id));
    return id;
  }
  /** Tastendruck-Handler (nur beim ersten Drücken ist `first` true; gehaltene Tasten wiederholen). */
  onKey(fn) { this._keyHandlers.push(fn); }

  isDown(...codes) { return codes.some((c) => this.keys.has(c)); }
  get left() { return this.isDown('ArrowLeft', 'KeyA'); }
  get right() { return this.isDown('ArrowRight', 'KeyD'); }
  get up() { return this.isDown('ArrowUp', 'KeyW'); }
  get down() { return this.isDown('ArrowDown', 'KeyS'); }

  // ── Canvas ──────────────────────────────────
  /** Erstellt ein Canvas mit logischer Grösse w×h, scharf auf Retina und skaliert auf die Bildschirmbreite. */
  createCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.aspectRatio = `${w} / ${h}`;
    // so breit wie möglich, aber nie höher als der Bildschirm (Seitenverhältnis bleibt erhalten)
    canvas.style.width = `min(100%, ${w}px, calc(max(100vh - 230px, 300px) * ${(w / h).toFixed(4)}))`;
    canvas.tabIndex = 0;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    this.width = w;
    this.height = h;
    this.canvas = canvas;
    this.ctx = ctx;
    this.stage.appendChild(canvas);
    this.on(canvas, 'contextmenu', (e) => e.preventDefault());
    return { canvas, ctx };
  }

  /** Wandelt Maus-/Touch-Koordinaten in Canvas-Koordinaten um (funktioniert auch bei verkleinertem Canvas). */
  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect();
    const p = e.touches?.[0] || e.changedTouches?.[0] || e;
    return {
      x: ((p.clientX - r.left) / r.width) * this.width,
      y: ((p.clientY - r.top) / r.height) * this.height,
    };
  }

  /** Pointer-Events (Maus + Touch + Stift) auf dem Canvas. */
  onPointer(type, fn) {
    return this.on(this.canvas, type, (e) => {
      if (this.paused || this.over || this.waiting) return;
      fn(this.toCanvas(e), e);
    });
  }

  /** Wisch-Gesten (für Snake & Pac-Man). fn('up'|'down'|'left'|'right') */
  onSwipe(fn, el = this.canvas) {
    let sx = 0, sy = 0, active = false;
    this.on(el, 'touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; active = true; }, { passive: true });
    this.on(el, 'touchmove', (e) => {
      if (!active) return;
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.hypot(dx, dy) < 24) return;
      active = false;
      if (!this.paused && !this.over && !this.waiting) fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      e.preventDefault();
    }, { passive: false });
    this.on(el, 'touchend', () => { active = false; });
  }

  /**
   * Bildschirm-Tasten fürs Handy. layout: Array von {code, label}. Drücken simuliert die Taste.
   */
  touchControls(buttons, { force = false } = {}) {
    if (!force && !wantsTouchControls()) return;
    const bar = document.createElement('div');
    bar.className = 'touch-controls';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'touch-btn' + (b.wide ? ' wide' : '');
      btn.textContent = b.label;
      btn.setAttribute('aria-label', b.aria || b.label);
      const down = (e) => {
        e.preventDefault();
        if (this.paused || this.over) return;
        if (this.waiting) { this._begin(); return; }
        const first = !this.keys.has(b.code);
        this.keys.add(b.code);
        const fake = { code: b.code, key: b.key || '', preventDefault() {}, repeat: !first };
        for (const h of this._keyHandlers) h(fake, first);
        btn.classList.add('active');
      };
      const up = (e) => { e.preventDefault(); this.keys.delete(b.code); btn.classList.remove('active'); };
      this.on(btn, 'pointerdown', down);
      this.on(btn, 'pointerup', up);
      this.on(btn, 'pointercancel', up);
      this.on(btn, 'pointerleave', up);
      bar.appendChild(btn);
    }
    this.stage.appendChild(bar);
  }

  // ── Spielschleife ───────────────────────────
  /** update() läuft genau 60×/s, draw() einmal pro Bildschirmbild. */
  loop(update, draw) {
    this._loop = { update, draw };
    let last = performance.now();
    let acc = 0;
    const frame = (now) => {
      if (this.destroyed) return;
      this._raf = requestAnimationFrame(frame);
      let dt = now - last;
      last = now;
      if (dt > 250) dt = 250; // nach Tab-Wechsel nicht "vorspulen"
      if (!this.paused && !this.over && !this.waiting) {
        acc += dt;
        let steps = 0;
        while (acc >= STEP && steps < 8) {
          update();
          acc -= STEP;
          steps++;
          if (this.over || this.destroyed) break;
        }
        if (steps === 8) acc = 0;
      }
      if (this.destroyed) return;
      const ctx = this.ctx;
      const shaking = ctx && this._shake > 0.3 && !this.reduceMotion;
      if (shaking) {
        ctx.save();
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.translate((Math.random() - 0.5) * this._shake * 2, (Math.random() - 0.5) * this._shake * 2);
      }
      draw();
      if (ctx) this._drawFloats(dt);
      if (shaking) ctx.restore();
      if (this._shake > 0) this._shake = Math.max(0, this._shake - dt * 0.04);
      if (this.waiting && !this.paused) this._drawStart();
      if (this.paused && !this.over) this._drawPause();
    };
    this._raf = requestAnimationFrame(frame);
    this._cleanups.push(() => cancelAnimationFrame(this._raf));
  }

  /** Zeigt "Bereit?" über dem Spiel; die Spielschleife steht, bis eine Taste oder ein Tipp kommt. */
  requireStart(text = 'Taste drücken oder tippen zum Starten') {
    this.waiting = true;
    this._startText = text;
    if (this.canvas) {
      const fn = (e) => { if (this.waiting && !this.paused) { e.preventDefault(); e.stopPropagation(); this._begin(); } };
      this.canvas.addEventListener('pointerdown', fn, { capture: true });
      this._cleanups.push(() => this.canvas?.removeEventListener('pointerdown', fn, { capture: true }));
    }
  }
  _begin() {
    if (!this.waiting) return;
    this.waiting = false;
    this.keys.clear();
    this.sound('click');
    this._onStart?.();
  }
  /** Wird aufgerufen, sobald der Start-Bildschirm verlassen wird. */
  onStart(fn) { this._onStart = fn; }

  _drawStart() {
    const { ctx, width: w, height: h } = this;
    if (!ctx) return;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,20,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.round(Math.min(w, h) / 9)}px system-ui, sans-serif`;
    ctx.fillText('BEREIT?', w / 2, h / 2 - 8);
    ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
    ctx.font = `600 ${Math.max(13, Math.round(Math.min(w, h) / 28))}px system-ui, sans-serif`;
    ctx.fillText(this._startText, w / 2, h / 2 + 30);
    ctx.restore();
  }

  /** Bildschirm kurz wackeln lassen (stärke in Pixeln). */
  shake(strength = 6) { this._shake = Math.max(this._shake, strength); }

  /** Schwebender Text (z. B. "+50") an Canvas-Position x/y. */
  floatText(x, y, text, color = '#ffd700', size = 22) {
    this._floats.push({ x, y, text, color, size, life: 1 });
    if (this._floats.length > 40) this._floats.shift();
  }
  _drawFloats(dt) {
    const ctx = this.ctx;
    if (!this._floats.length) return;
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = this._floats.length - 1; i >= 0; i--) {
      const f = this._floats[i];
      if (!this.paused) { f.life -= dt / 900; f.y -= dt * 0.045; }
      if (f.life <= 0) { this._floats.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      ctx.font = `900 ${f.size}px system-ui, sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  _drawPause() {
    const { ctx, width: w, height: h } = this;
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText('PAUSE', w / 2, h / 2 - 10);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('P drücken oder antippen zum Weiterspielen', w / 2, h / 2 + 22);
    ctx.restore();
  }

  pause() {
    if (this.paused || this.over) return;
    this.paused = true;
    this.keys.clear();
    this._pauseTapOff = this.canvas ? (() => {
      const fn = (e) => { e.preventDefault(); e.stopPropagation(); this.resume(); };
      this.canvas.addEventListener('pointerdown', fn, { capture: true, once: true });
      return () => this.canvas?.removeEventListener('pointerdown', fn, { capture: true });
    })() : null;
    this.stage.dispatchEvent(new CustomEvent('gamepause', { detail: true }));
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this._pauseTapOff?.();
    this._pauseTapOff = null;
    this.stage.dispatchEvent(new CustomEvent('gamepause', { detail: false }));
  }
  togglePause() { this.paused ? this.resume() : this.pause(); }

  // ── Punkte & Ende ───────────────────────────
  setScore(n) {
    this.score = Math.max(0, Math.floor(n));
    this._onScore?.(this.score);
  }
  addScore(n) { this.setScore(this.score + n); }

  /** Beendet die Runde. Mehrfache Aufrufe werden ignoriert -> Punkte gibt es garantiert nur einmal. */
  end(finalScore = this.score) {
    if (this.over || this.destroyed) return;
    this.over = true;
    this.setScore(finalScore);
    this.keys.clear();
    this._onEnd?.(this.score);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this._pauseTapOff?.();
    for (const fn of this._cleanups.splice(0).reverse()) {
      try { fn(); } catch (e) { console.error(e); }
    }
    this._keyHandlers = [];
    this.keys.clear();
    this.stage.replaceChildren();
  }
}

// ── Zeichen-Helfer, die mehrere Spiele benutzen ──
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function makeParticles() {
  const list = [];
  return {
    list,
    burst(x, y, color, n = 8, speed = 4) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
        list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color, size: 2 + Math.random() * 4 });
      }
      if (list.length > 400) list.splice(0, list.length - 400);
    },
    update(gravity = 0) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy = p.vy * 0.94 + gravity; p.life -= 0.035;
        if (p.life <= 0) list.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const p of list) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}
