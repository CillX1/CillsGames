// Casino: Slots, Roulette, Münzwurf, Würfel-Duell. Quoten werden offen angezeigt.
import * as store from '../store.js';
import { formatInt, randInt } from '../util.js';
import { openDialog } from '../ui.js';
import { openAuthDialog } from '../auth-ui.js';
import { play } from '../sound.js';
import {
  BETS, SLOT_SYMBOLS, spinReel, slotPayout, slotExpectedReturn,
  ROULETTE_BETS, rouletteColor, roulettePayout, COIN_MULT, coinPayout, DICE_MULT, dicePayout,
} from '../data/casino.js';

const GAMES = [
  { id: 'slots', icon: '🎰', name: 'Slot Machine', desc: `3 Gleiche = bis ×50 · 2 Gleiche = Einsatz zurück`, rtp: slotExpectedReturn() },
  { id: 'roulette', icon: '🎡', name: 'Roulette', desc: 'Rot/Schwarz/Gerade… ×2 · Null ×36', rtp: 36 / 37 },
  { id: 'coin', icon: '🪙', name: 'Münzwurf', desc: `Kopf oder Zahl – ×${COIN_MULT}`, rtp: COIN_MULT / 2 },
  { id: 'dice', icon: '🎲', name: 'Würfel-Duell', desc: `Höher als die KI – ×${DICE_MULT}, gleich = zurück`, rtp: (15 / 36) * DICE_MULT + 6 / 36 },
];

export function render(view) {
  view.innerHTML = `
    <h1 class="page-title">🎰 Casino</h1>
    <div class="banner"><span>Dein Guthaben: <b data-bal>0</b> 🎯</span><a class="btn btn-ghost btn-small" href="#/tauschen">💱 In Sterne tauschen</a></div>
    <p class="page-sub">Glücksspiel mit Spielpunkten – kein echtes Geld. Auf lange Sicht gewinnt immer das Casino; die Auszahlungsquote steht bei jedem Spiel.</p>
    <div class="casino-grid">${GAMES.map((g) => `
      <button type="button" class="casino-card" data-game="${g.id}">
        <span class="casino-icon">${g.icon}</span><span class="casino-name">${g.name}</span>
        <span class="casino-desc">${g.desc}</span><span class="casino-rtp">Auszahlung ≈ ${Math.round(g.rtp * 100)} %</span>
      </button>`).join('')}</div>`;
  const draw = () => { view.querySelector('[data-bal]').textContent = formatInt(store.user()?.points || 0); };
  draw();
  view.querySelector('.casino-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-game]');
    if (!b) return;
    if (!store.isLoggedIn()) { openAuthDialog(); return; }
    ({ slots: openSlots, roulette: openRoulette, coin: openCoin, dice: openDice })[b.dataset.game]();
  });
  return store.subscribe(draw);
}

// Gemeinsamer Rahmen für alle Casino-Dialoge
function casinoDialog(title, body, setup) {
  let unsub = () => {};
  const d = openDialog({
    title,
    content: `<div class="casino-game">
      <div class="casino-bal">🎯 <b data-bal></b> Punkte</div>
      ${body}
      <div class="bet-row"><span>Einsatz:</span>${BETS.map((b, i) => `<button type="button" class="chip-btn ${i === 1 ? 'active' : ''}" data-bet="${b}">${b}</button>`).join('')}</div>
      <div class="casino-result" aria-live="polite" data-result></div>
    </div>`,
    onOpen(root) {
      let bet = BETS[1];
      const bal = root.querySelector('[data-bal]');
      const upd = () => { bal.textContent = formatInt(store.user()?.points || 0); };
      upd();
      unsub = store.subscribe(upd);
      root.querySelector('.bet-row').addEventListener('click', (e) => {
        const b = e.target.closest('[data-bet]');
        if (!b) return;
        bet = +b.dataset.bet;
        root.querySelectorAll('[data-bet]').forEach((x) => x.classList.toggle('active', x === b));
      });
      const result = root.querySelector('[data-result]');
      setup(root, {
        getBet: () => bet,
        take() {
          if (!store.spendPoints(bet)) { result.className = 'casino-result lose'; result.textContent = 'Nicht genug Punkte!'; play('error'); return 0; }
          result.textContent = '';
          return bet;
        },
        payout(win, stake, text) {
          if (win > 0) store.creditPoints(win);
          const net = win - stake;
          result.className = 'casino-result ' + (net > 0 ? 'win' : net === 0 ? 'even' : 'lose');
          result.textContent = text + (net > 0 ? ` +${formatInt(net)} 🎯` : net === 0 ? ' Einsatz zurück' : ` −${formatInt(stake)} 🎯`);
          play(net > 0 ? 'win' : net === 0 ? 'point' : 'lose');
        },
      });
    },
  });
  d.done.then(() => unsub());
}

function lockButtons(root, on) { root.querySelectorAll('[data-play]').forEach((b) => { b.disabled = on; }); }

function openSlots() {
  casinoDialog('🎰 Slot Machine', `
    <div class="reels">${[0, 1, 2].map(() => '<div class="reel">🍒</div>').join('')}</div>
    <details class="paytable"><summary>Gewinntabelle</summary>${SLOT_SYMBOLS.map((s) => `<span>${s.s}${s.s}${s.s} ×${s.mult}</span>`).join('')}<span>2 Gleiche: Einsatz zurück</span></details>
    <button type="button" class="btn btn-primary btn-block" data-play>🎰 Drehen</button>`, (root, api) => {
    const reels = [...root.querySelectorAll('.reel')];
    root.querySelector('[data-play]').onclick = () => {
      const stake = api.take();
      if (!stake) return;
      lockButtons(root, true);
      const final = [spinReel(), spinReel(), spinReel()];
      reels.forEach((r) => r.classList.add('spinning'));
      let ticks = 0;
      const iv = setInterval(() => {
        ticks++;
        reels.forEach((r, i) => {
          if (ticks > 10 + i * 5) { r.textContent = final[i]; r.classList.remove('spinning'); }
          else r.textContent = SLOT_SYMBOLS[randInt(0, SLOT_SYMBOLS.length - 1)].s;
        });
        if (ticks > 20) {
          clearInterval(iv);
          const win = slotPayout(final, stake);
          api.payout(win, stake, win > stake ? `🎉 ${final.join('')}!` : win === stake ? '😊 Zwei Gleiche –' : '💸 Kein Glück.');
          lockButtons(root, false);
        }
      }, 75);
    };
  });
}

function openRoulette() {
  let choice = 'red';
  casinoDialog('🎡 Roulette', `
    <div class="wheel" data-wheel>🎡</div>
    <div class="chips wrap">${Object.entries(ROULETTE_BETS).map(([k, v]) => `<button type="button" class="chip-btn ${k === choice ? 'active' : ''}" data-choice="${k}">${v.label} ×${v.mult}</button>`).join('')}</div>
    <button type="button" class="btn btn-primary btn-block" data-play>🎡 Drehen</button>`, (root, api) => {
    root.querySelector('.chips.wrap').addEventListener('click', (e) => {
      const b = e.target.closest('[data-choice]');
      if (!b) return;
      choice = b.dataset.choice;
      root.querySelectorAll('[data-choice]').forEach((x) => x.classList.toggle('active', x === b));
    });
    const wheel = root.querySelector('[data-wheel]');
    root.querySelector('[data-play]').onclick = () => {
      const stake = api.take();
      if (!stake) return;
      lockButtons(root, true);
      const n = randInt(0, 36);
      wheel.classList.remove('result'); wheel.classList.add('spin'); wheel.textContent = '🎡';
      setTimeout(() => {
        wheel.classList.remove('spin');
        const col = rouletteColor(n);
        wheel.innerHTML = `<span class="num ${col}">${n}</span>`;
        wheel.classList.add('result');
        api.payout(roulettePayout(choice, n, stake), stake, `Die Kugel fällt auf ${n} ${col === 'red' ? '🔴' : col === 'black' ? '⚫' : '🟢'}.`);
        lockButtons(root, false);
      }, 1300);
    };
  });
}

function openCoin() {
  casinoDialog('🪙 Münzwurf', `
    <div class="coin" data-coin>🪙</div>
    <div class="two-btn">
      <button type="button" class="btn btn-gold" data-play="heads">👑 Kopf</button>
      <button type="button" class="btn btn-ghost" data-play="tails">🔢 Zahl</button>
    </div>`, (root, api) => {
    const coin = root.querySelector('[data-coin]');
    root.querySelectorAll('[data-play]').forEach((btn) => {
      btn.onclick = () => {
        const stake = api.take();
        if (!stake) return;
        lockButtons(root, true);
        const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
        coin.classList.add('flip');
        setTimeout(() => {
          coin.classList.remove('flip');
          coin.textContent = outcome === 'heads' ? '👑' : '🔢';
          api.payout(coinPayout(btn.dataset.play, outcome, stake), stake, outcome === 'heads' ? 'Kopf!' : 'Zahl!');
          lockButtons(root, false);
        }, 900);
      };
    });
  });
}

function openDice() {
  const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  casinoDialog('🎲 Würfel-Duell', `
    <div class="dice-duel"><div><small>Du</small><span data-me>🎲</span></div><b>VS</b><div><small>KI</small><span data-ai>🎲</span></div></div>
    <button type="button" class="btn btn-primary btn-block" data-play>🎲 Würfeln</button>`, (root, api) => {
    const me = root.querySelector('[data-me]'), ai = root.querySelector('[data-ai]');
    root.querySelector('[data-play]').onclick = () => {
      const stake = api.take();
      if (!stake) return;
      lockButtons(root, true);
      const a = randInt(1, 6), b = randInt(1, 6);
      let t = 0;
      const iv = setInterval(() => {
        me.textContent = FACES[randInt(0, 5)]; ai.textContent = FACES[randInt(0, 5)];
        if (++t > 10) {
          clearInterval(iv);
          me.textContent = FACES[a - 1]; ai.textContent = FACES[b - 1];
          api.payout(dicePayout(a, b, stake), stake, a > b ? `${a} gegen ${b} – gewonnen!` : a === b ? `${a} gegen ${b} –` : `${a} gegen ${b} – verloren.`);
          lockButtons(root, false);
        }
      }, 70);
    };
  });
}

