/**
 * SoundEngine — generates all game sounds via Web Audio API
 * No audio files needed — everything is synthesized
 */

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3, delay = 0) {
  try {
    const c   = getCtx();
    const osc = c.createOscillator();
    const gain= c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    gain.gain.setValueAtTime(0, c.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration);
  } catch {}
}

const SoundEngine = {
  // Gavel bang — SOLD!
  sold() {
    playTone(180, 0.15, 'sawtooth', 0.4);
    playTone(120, 0.4,  'sawtooth', 0.3, 0.1);
    playTone(90,  0.6,  'sine',     0.2, 0.2);
  },

  // Sad trombone — UNSOLD
  unsold() {
    playTone(400, 0.2, 'sawtooth', 0.2);
    playTone(350, 0.2, 'sawtooth', 0.2, 0.2);
    playTone(280, 0.4, 'sawtooth', 0.25, 0.4);
  },

  // Bid placed — quick tick
  bid() {
    playTone(800, 0.08, 'square', 0.15);
    playTone(1000, 0.08, 'square', 0.12, 0.08);
  },

  // Outbid — urgent alert
  outbid() {
    playTone(600, 0.1, 'square', 0.25);
    playTone(500, 0.1, 'square', 0.25, 0.12);
    playTone(400, 0.15, 'square', 0.3, 0.25);
  },

  // Win — fanfare
  win() {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.25, 'sine', 0.35, i * 0.12));
  },

  // Tick — last 5 seconds
  tick() {
    playTone(1200, 0.05, 'square', 0.2);
  },

  // Bid war — dramatic drums
  bidWar() {
    [0, 0.1, 0.2, 0.3].forEach(d => playTone(100, 0.08, 'sawtooth', 0.3, d));
  },

  // Auction start — fanfare
  start() {
    [392, 523, 659, 784].forEach((f, i) => playTone(f, 0.2, 'sine', 0.3, i * 0.1));
  },

  // Next player
  next() {
    playTone(523, 0.1, 'sine', 0.2);
    playTone(659, 0.15, 'sine', 0.2, 0.12);
  },
};

export default SoundEngine;
