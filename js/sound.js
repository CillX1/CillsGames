// Kleine Soundeffekte per Web Audio – keine Audiodateien nötig.
import { getSetting } from './settings.js';

let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 1, delay = 0, slide = 0 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  const v = 0.18 * vol * (getSetting('volume') ?? 0.5);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  click: () => tone(660, 0.05, { type: 'square', vol: 0.4 }),
  point: () => tone(880, 0.08, { type: 'triangle' }),
  coin: () => { tone(988, 0.07, { type: 'square', vol: 0.5 }); tone(1319, 0.12, { type: 'square', vol: 0.5, delay: 0.07 }); },
  jump: () => tone(420, 0.12, { type: 'square', vol: 0.5, slide: 300 }),
  shoot: () => tone(900, 0.08, { type: 'sawtooth', vol: 0.35, slide: -600 }),
  hit: () => tone(180, 0.15, { type: 'sawtooth', vol: 0.6, slide: -100 }),
  pop: () => tone(520, 0.06, { type: 'triangle', slide: 400 }),
  lose: () => { tone(392, 0.15, { type: 'triangle' }); tone(330, 0.15, { type: 'triangle', delay: 0.15 }); tone(262, 0.3, { type: 'triangle', delay: 0.3 }); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { type: 'triangle', delay: i * 0.1 })); },
  error: () => tone(150, 0.2, { type: 'square', vol: 0.4 }),
};

export function play(name) {
  if (!getSetting('sound')) return;
  try { SOUNDS[name]?.(); } catch { /* Audio nicht verfügbar */ }
}
