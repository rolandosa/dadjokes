// Synthesised sound effects: no audio files to ship.
let ctx;
const audio = () => (ctx ??= new (window.AudioContext || window.webkitAudioContext)());

function noise(c, seconds) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function drum(c, at, freq) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq / 3, at + 0.15);
  gain.gain.setValueAtTime(0.6, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}

function cymbal(c, at) {
  const src = noise(c, 1);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.35, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.9);
  src.connect(hp).connect(gain).connect(c.destination);
  src.start(at);
}

export function drumroll(seconds = 1.2) {
  try {
    const c = audio();
    const t = c.currentTime;
    const src = noise(c, seconds);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.linearRampToValueAtTime(0.25, t + seconds);
    // Tremolo for the "rrrrr" of a snare roll.
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 28;
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(bp).connect(gain).connect(c.destination);
    lfo.start(t);
    src.start(t);
    lfo.stop(t + seconds);
  } catch {
    /* sound is a bonus */
  }
}

export function rimshot() {
  try {
    const c = audio();
    const t = c.currentTime;
    drum(c, t, 220); // ba
    drum(c, t + 0.16, 160); // dum
    cymbal(c, t + 0.36); // tss
  } catch {
    /* sound is a bonus */
  }
}

export function groan(score) {
  try {
    const c = audio();
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260 - score * 15, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.5 + score * 0.15);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6 + score * 0.15);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    osc.connect(lp).connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.8 + score * 0.15);
  } catch {
    /* sound is a bonus */
  }
}
