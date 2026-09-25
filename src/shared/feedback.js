// Centralizes sound + haptics so every game event goes through the same
// on/off checks instead of scattering settings reads across the code.
// Sounds are tiny synthesized beeps (Web Audio) — no audio files to
// bundle, and it keeps the app light.
import { getSoundEnabled, getHapticsEnabled } from './storage.js';

let audioCtx = null;

function ctx() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function beep(freq, duration, { type = 'sine', gain = 0.18 } = {}) {
  if (!getSoundEnabled()) return;
  try {
    const c = ctx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g).connect(c.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.stop(c.currentTime + duration);
  } catch {
    // Web Audio can refuse to start before a user gesture on some
    // browsers — silently skip the sound rather than crash the game.
  }
}

function vibrate(pattern) {
  if (getHapticsEnabled() && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export const Feedback = {
  tap() {
    beep(520, 0.06);
    vibrate(10);
  },
  /// Line clear, ball pop, piece lock — a light positive event.
  success() {
    beep(660, 0.09);
    vibrate(15);
  },
  /// Combo/cascade or level complete — a stronger positive event.
  celebrate() {
    beep(660, 0.08);
    setTimeout(() => beep(880, 0.12), 70);
    vibrate([10, 30, 10]);
  },
  /// Game over — always paired with icon + text on screen, never relies
  /// on sound/vibration alone to convey "bad".
  gameOver() {
    beep(220, 0.35, { type: 'sawtooth', gain: 0.14 });
    vibrate([30, 50, 30]);
  },
  /// A specific pitch for [freq] — lets a game (e.g. the color-sequence
  /// one) give each option its own distinct tone, an audio channel of
  /// redundancy on top of color+shape, same principle as the rest of the
  /// app's accessibility system.
  tone(freq, duration = 0.22) {
    beep(freq, duration, { type: 'triangle', gain: 0.2 });
  },
};
