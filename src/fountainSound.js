// A peaceful fountain, synthesized live with Web Audio (no sound files):
//   - a soft "rush" of filtered noise (falling water)
//   - a slow wobble on a lower band (gurgling basin)
//   - a faint high shimmer (splash)
//   - random little droplet plinks
// Volume follows how close the player is.

const MAX_VOLUME = 0.55;
const FULL_DIST = 56; // px from the basin: full volume when right next to it
const SILENT_DIST = 130; // px: silent beyond this

export class FountainSound {
  constructor() {
    this.ctx = null; // created on the first user gesture (browsers block audio until then)
    this.master = null;
    this.hearing = 0;
    this.nextDrop = 0;
  }

  /** Call from a user gesture (key press / click). Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) this.build();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  /** ctx: optional AudioContext to build into (e.g. an OfflineAudioContext for testing). */
  build(ctx) {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const tone = ctx.createBiquadFilter(); // round off harsh highs
    tone.type = 'lowpass';
    tone.frequency.value = 7000;
    this.master.connect(tone).connect(ctx.destination);

    const noise = ctx.createBufferSource();
    noise.buffer = brownishNoise(ctx, 4);
    noise.loop = true;

    // Falling water: broad mid band
    this.band(noise, 'bandpass', 1100, 0.5, 0.5);
    // Splash shimmer: quiet highs
    this.band(noise, 'highpass', 3500, 0.7, 0.06);
    // Gurgling basin: low band whose loudness wobbles slowly
    const gurgle = this.band(noise, 'bandpass', 380, 1.2, 0.35);
    for (const [rate, depth] of [[0.37, 0.12], [1.9, 0.08]]) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const amount = ctx.createGain();
      amount.gain.value = depth;
      lfo.connect(amount).connect(gurgle.gain);
      lfo.start();
    }
    noise.start();
  }

  band(source, type, freq, q, level) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = level;
    source.connect(f).connect(g).connect(this.master);
    return g;
  }

  /** One water droplet: a tiny sine "plink" whose pitch rises as it decays (like a bubble). */
  droplet(when) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const f0 = 700 + Math.random() * 1400;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.exponentialRampToValueAtTime(f0 * (1.4 + Math.random() * 0.6), when + 0.06);
    const peak = 0.03 + Math.random() * 0.05;
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    osc.connect(env).connect(this.master);
    osc.start(when);
    osc.stop(when + 0.1);
  }

  /** distance: px from the player to the fountain basin. */
  update(distance) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = Math.min(1, Math.max(0, (SILENT_DIST - distance) / (SILENT_DIST - FULL_DIST)));
    this.hearing = t * t * (3 - 2 * t); // smoothstep: gentle fade in/out
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.hearing * MAX_VOLUME, now, 0.15);

    // Only bother scheduling droplets while it can be heard
    if (this.hearing > 0.01 && now >= this.nextDrop) {
      this.droplet(now + 0.01);
      if (Math.random() < 0.3) this.droplet(now + 0.03 + Math.random() * 0.05); // little clusters
      this.nextDrop = now + 0.07 + Math.random() * 0.3;
    }
  }
}

/** Noise with more low end than white noise: sounds like water rather than static. */
function brownishNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const fade = Math.floor(ctx.sampleRate * 0.1);
  // Generate a bit extra, then crossfade that extra tail into the start: seamless loop, no click
  const raw = new Float32Array(len + fade);
  let last = 0;
  for (let i = 0; i < raw.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.06 * white) / 1.06; // gentle low-pass "brown" walk
    raw[i] = last * 3 + white * 0.15; // keep a little brightness
  }
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = raw[i];
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    data[i] = raw[i] * k + raw[len + i] * (1 - k);
  }
  return buf;
}
