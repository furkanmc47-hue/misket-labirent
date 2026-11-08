// Ses: efektler, bölüme göre üretilen müzik, yuvarlanma sesi ve sesli ipucu okuma (TTS).
import { save } from './save.js';

let ctx = null, sfxGain = null, musicGain = null, rollGain = null, rollFilter = null;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
  applyVolumes();

  // Yuvarlanma sesi: döngüdeki gürültü, hıza göre filtre ve ses seviyesi değişir
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  rollFilter = ctx.createBiquadFilter(); rollFilter.type = 'lowpass'; rollFilter.frequency.value = 300;
  rollGain = ctx.createGain(); rollGain.gain.value = 0;
  src.connect(rollFilter).connect(rollGain).connect(sfxGain);
  src.start();
}

export function applyVolumes() {
  if (!ctx) return;
  sfxGain.gain.value = save.settings.sfx;
  musicGain.gain.value = save.settings.music * 0.35;
}

export function setRolling(speed, grounded) {
  if (!ctx) return;
  const t = ctx.currentTime, v = grounded ? Math.min(1, speed / 11) : 0;
  rollGain.gain.setTargetAtTime(v * 0.5, t, 0.05);
  rollFilter.frequency.setTargetAtTime(180 + speed * 70, t, 0.05);
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, slideTo = 0, delay = 0, out = sfxGain) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

function noise(dur, vol, freq, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(sfxGain);
  s.start(t0);
}

export const sfx = {
  clue: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.15, 'triangle', 0.1, 0, i * 0.08)),
  gem: () => [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.12, 'sine', 0.08, 0, i * 0.05)),
  wrong: () => tone(180, 0.35, 'sawtooth', 0.08, 90),
  open: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, 0, i * 0.1)); noise(0.8, 0.15, 200); },
  fall: () => tone(500, 0.8, 'sine', 0.12, 60),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'triangle', 0.09, 0, i * 0.12)),
  bump: v => { tone(90 + v * 6, 0.09, 'square', Math.min(0.07, v * 0.007)); noise(0.08, Math.min(0.3, v * 0.03), 900); },
  crack: () => { noise(0.25, 0.45, 2500); noise(0.18, 0.35, 600, 0.03); tone(70, 0.2, 'sine', 0.15, 40); },
  click: () => tone(900, 0.08, 'square', 0.06),
  jumpHole: () => tone(300, 1.0, 'sine', 0.13, 1200),
  hop: () => tone(420, 0.15, 'sine', 0.08, 820),
  land: v => noise(0.1, Math.min(0.4, v * 0.04), 300),
  hurt: () => { tone(220, 0.3, 'square', 0.09, 90); tone(160, 0.35, 'sawtooth', 0.06, 70, 0.05); },
  heart: () => [784, 988].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, 0, i * 0.09)),
  power: () => [523, 784, 1046, 1568].forEach((f, i) => tone(f, 0.14, 'square', 0.05, 0, i * 0.06)),
  shieldPop: () => { tone(1200, 0.3, 'sine', 0.1, 300); noise(0.2, 0.3, 3000); },
  crumble: () => { noise(0.5, 0.35, 250); tone(110, 0.4, 'sine', 0.08, 50); },
  boxPush: () => noise(0.25, 0.25, 180),
  mirror: () => { tone(1500, 0.08, 'triangle', 0.06); tone(2000, 0.1, 'triangle', 0.05, 0, 0.05); },
  laser: () => tone(1800, 0.4, 'sawtooth', 0.04, 600),
  beep: (n) => { for (let i = 0; i < n; i++) tone(1100, 0.12, 'square', 0.08, 0, 0.6 + i * 0.35); },
  alien: () => { for (let i = 0; i < 6; i++) tone(400 + (i % 2) * 300, 0.12, 'sine', 0.1, 0, i * 0.1); tone(200, 1.5, 'sine', 0.08, 1600, 0.6); },
  dash: () => { tone(300, 0.18, 'sawtooth', 0.06, 900); noise(0.15, 0.2, 1500); },
  freeze: () => { [2093, 1760, 1397, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.08, 0, i * 0.07)); noise(0.5, 0.2, 5000); },
  zap: () => { for (let i = 0; i < 7; i++) tone(120 + Math.random() * 900, 0.06, 'sawtooth', 0.09, 0, i * 0.05); noise(0.4, 0.3, 3500); },
  curse: () => { tone(110, 0.7, 'sawtooth', 0.07, 55); tone(330, 0.6, 'sine', 0.07, 660, 0.1); noise(0.4, 0.12, 700); },
  warp: () => { tone(160, 1.5, 'sine', 0.12, 1800); tone(240, 1.5, 'triangle', 0.06, 2600, 0.1); noise(1.4, 0.14, 1800); },
  warpIn: () => { tone(1500, 0.7, 'sine', 0.09, 180); noise(0.4, 0.22, 500, 0.65); },
  coin: () => [1320, 1760].forEach((f, i) => tone(f, 0.09, 'square', 0.05, 0, i * 0.06)),
  pad: i => tone([523, 659, 784, 988][i % 4], 0.35, 'triangle', 0.12),
  spring: () => tone(220, 0.35, 'triangle', 0.13, 1100),
  swing: () => { noise(0.16, 0.2, 2200); tone(500, 0.12, 'sawtooth', 0.03, 220); },
  smash: () => { noise(0.3, 0.45, 900); tone(90, 0.3, 'square', 0.1, 45); },
  hookShot: () => { tone(900, 0.18, 'sawtooth', 0.05, 2200); noise(0.12, 0.2, 4000); },
  heartbeat: () => { tone(58, 0.16, 'sine', 0.28); tone(50, 0.2, 'sine', 0.22, 0, 0.2); },
  tick: () => tone(2400, 0.02, 'square', 0.05),
  whisper: () => { noise(0.9, 0.09, 1400); noise(0.7, 0.06, 2600, 0.25); },
  scare: () => { for (const f of [233, 247, 262, 277, 466, 494]) tone(f, 1.1, 'sawtooth', 0.09, f * 0.7); noise(0.9, 0.5, 1800); },
  wahwah: () => [392, 370, 349, 330].forEach((f, i) => tone(f, i === 3 ? 0.9 : 0.35, 'sawtooth', 0.07, i === 3 ? 260 : 0, i * 0.38)),
};

// ------------------------------------------------------------------
// Müzik: her bölümün kendi gamı ve temposu olan basit bir sıralayıcı
// ------------------------------------------------------------------
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
};
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
let musicTimer = 0, step = 0, nextTime = 0, song = null;

export function playMusic(cfg) {
  stopMusic();
  if (!ctx || !cfg) return;
  const sc = SCALES[cfg.scale] || SCALES.major;
  const deg = d => cfg.root + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  // basit akor ilerleyişi: I - VI - IV - V (derece cinsinden)
  const prog = [0, 5, 3, 4];
  // tekrar eden arpej deseni, her çalışta küçük rastgelelik
  const arp = Array.from({ length: 16 }, (_, i) => [0, 2, 4, 7, 4, 2, 4, 9][i % 8] + (Math.random() < 0.15 ? 1 : 0));
  song = { deg, prog, arp, spb: 60 / cfg.tempo / 2 };
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  musicTimer = setInterval(schedule, 50);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = 0;
}

function schedule() {
  if (!song) return;
  while (nextTime < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 16) % 4, chord = song.prog[bar], s = step % 16;
    const d = nextTime - ctx.currentTime;
    if (s % 8 === 0) tone(midi(song.deg(chord) - 24), song.spb * 7, 'triangle', 0.22, 0, d, musicGain);
    if (s % 4 === 2) tone(midi(song.deg(chord + 2) - 12), song.spb * 2, 'sine', 0.06, 0, d, musicGain);
    tone(midi(song.deg(chord + song.arp[s])), song.spb * 0.9, 'square', 0.025, 0, d, musicGain);
    if (s % 2 === 1) {
      const len = Math.floor(ctx.sampleRate * 0.03), buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = 0.05;
      src.connect(f).connect(g).connect(musicGain); src.start(nextTime);
    }
    nextTime += song.spb;
    step++;
  }
}

// ------------------------------------------------------------------
// Sesli ipucu okuma (Windows'taki Türkçe ses ile)
// ------------------------------------------------------------------
let trVoice = null;
function pickVoice() {
  const vs = window.speechSynthesis?.getVoices() || [];
  trVoice = vs.find(v => v.lang?.toLowerCase().startsWith('tr')) || null;
}
if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

export function speak(text) {
  if (!save.settings.tts || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,:;!?'"()-]/gu, ''));
  u.lang = 'tr-TR';
  if (trVoice) u.voice = trVoice;
  u.rate = 1.0;
  speechSynthesis.speak(u);
}
export function stopSpeaking() { window.speechSynthesis?.cancel(); }
