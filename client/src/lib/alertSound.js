/**
 * Booking-alert chime (no sound file needed: played with the Web Audio API) and the alert preferences.
 * Browsers only allow sound after someone has tapped/clicked the page once; the first tap anywhere
 * unlocks it (see unlockAudio). Preferences are per device.
 */
let ctx = null;
const KEY = 'aura.alerts';
const DEFAULTS = { sound: true, remind: true, volume: 0.8 };

export function alertPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
}
export function saveAlertPrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
  window.dispatchEvent(new Event('aura:alert-prefs'));
}

const audio = () => {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  return ctx;
};
export const audioReady = () => !!ctx && ctx.state === 'running';

/** Call from a click/tap: lets the page play sound from now on. */
export async function unlockAudio() {
  const a = audio();
  if (a && a.state !== 'running') { try { await a.resume(); } catch { /* still locked */ } }
  return audioReady();
}

function note(a, freq, start, dur, vol) {
  const o = a.createOscillator();
  const o2 = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine'; o2.type = 'triangle';
  o.frequency.value = freq; o2.frequency.value = freq * 2;
  const g2 = a.createGain(); g2.gain.value = 0.15;
  o.connect(g); o2.connect(g2); g2.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.start(start); o2.start(start); o.stop(start + dur + 0.05); o2.stop(start + dur + 0.05);
}

/** "Ding-ding-dong" twice for a new request; once, softer, for a reminder. */
export function playChime({ reminder = false } = {}) {
  const prefs = alertPrefs();
  if (!prefs.sound) return false;
  const a = audio();
  if (!a || a.state !== 'running') return false;
  const v = Math.max(0.05, Math.min(1, prefs.volume)) * (reminder ? 0.5 : 0.9);
  const t = a.currentTime + 0.02;
  const tune = [[659.25, 0], [783.99, 0.16], [1046.5, 0.32]]; // E5 G5 C6
  for (const rep of reminder ? [0] : [0, 0.9]) for (const [f, d] of tune) note(a, f, t + rep + d, 0.45, v);
  if (navigator.vibrate) navigator.vibrate(reminder ? 150 : [200, 100, 200]);
  return true;
}
