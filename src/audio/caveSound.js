// Echoey cave ambience, synthesized live with Web Audio (no sound files):
//   - a deep, slowly breathing rumble
//   - a faint hollow wind whistling through the rock
//   - water drips that echo off the walls
//   - now and then, distant bat squeaks
// Everything runs through a generated "big cave" reverb. Volume follows how far inside you are.
import { getAudioContext, unlockAudio } from './audioContext.js';

const MAX_VOLUME = 0.7;

export class CaveSound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.hearing = 0;
    this.nextDrip = 0;
    this.nextChirps = 0;
  }

  /** Call from a user gesture (key press / click). Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) this.build(getAudioContext());
    unlockAudio();
  }

  /** ctx: the AudioContext to build into (an OfflineAudioContext works too, for testing). */
  build(ctx) {
    if (!ctx) return;
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Reverb: a long, dark, diffuse tail
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = caveImpulse(ctx, 3);
    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    this.reverb.connect(wet).connect(this.master);

    // Echo: distinct repeats bouncing between the walls, getting duller each time
    this.echo = ctx.createDelay(1.5);
    this.echo.delayTime.value = 0.32;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.5;
    const dull = ctx.createBiquadFilter();
    dull.type = 'lowpass';
    dull.frequency.value = 2200;
    this.echo.connect(dull).connect(feedback).connect(this.echo);
    dull.connect(this.master);
    dull.connect(this.reverb);

    this.dry = ctx.createGain();
    this.dry.gain.value = 0.55;
    this.dry.connect(this.master);

    const noise = ctx.createBufferSource();
    noise.buffer = loopingNoise(ctx, 5);
    noise.loop = true;

    // Deep rumble that slowly swells and fades
    const rumbleF = ctx.createBiquadFilter();
    rumbleF.type = 'lowpass';
    rumbleF.frequency.value = 140;
    const rumble = ctx.createGain();
    rumble.gain.value = 0.3;
    noise.connect(rumbleF).connect(rumble);
    rumble.connect(this.master);
    rumble.connect(this.reverb);
    this.lfo(0.07, 0.15, rumble.gain);

    // Hollow wind: a narrow whistle whose pitch drifts
    const windF = ctx.createBiquadFilter();
    windF.type = 'bandpass';
    windF.frequency.value = 520;
    windF.Q.value = 9;
    const wind = ctx.createGain();
    wind.gain.value = 0.05;
    noise.connect(windF).connect(wind).connect(this.reverb);
    this.lfo(0.05, 160, windF.frequency);
    this.lfo(0.11, 0.03, wind.gain);

    noise.start();
  }

  /** A slow sine wobble added onto an AudioParam. */
  lfo(rate, depth, param) {
    const osc = this.ctx.createOscillator();
    osc.frequency.value = rate;
    const amt = this.ctx.createGain();
    amt.gain.value = depth;
    osc.connect(amt).connect(param);
    osc.start();
  }

  /** A single water drip: a quick "plip" whose pitch rises, sent into the echo + reverb. */
  drip(when) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const f0 = 900 + Math.random() * 900;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.exponentialRampToValueAtTime(f0 * 2.2, when + 0.05);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.24 + Math.random() * 0.12, when + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = (Math.random() - 0.5) * 1.4;
    osc.connect(env);
    const out = pan ? env.connect(pan) : env;
    out.connect(this.dry);
    out.connect(this.echo);
    out.connect(this.reverb);
    osc.start(when);
    osc.stop(when + 0.15);
  }

  /** A burst of faraway bat squeaks: high, fast chirps heard mostly through the reverb. */
  chirps(when) {
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5);
      pan.connect(this.reverb);
    }
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const t = when + i * (0.07 + Math.random() * 0.05);
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const f = 3800 + Math.random() * 1600;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.025);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.035, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(env).connect(pan ?? this.reverb);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  /** inside: 0..1, how far into the cave the player is (we use the cave's darkness fade). */
  update(inside) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.hearing = inside;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(inside * MAX_VOLUME, now, 0.3);
    if (inside < 0.05) return;

    // Drips every couple of seconds, sometimes a quick double drip
    if (now >= this.nextDrip) {
      this.drip(now + 0.02);
      if (Math.random() < 0.25) this.drip(now + 0.15 + Math.random() * 0.2);
      this.nextDrip = now + 1.2 + Math.random() * 3;
    }
    // Distant bats every so often
    if (now >= this.nextChirps) {
      if (this.nextChirps > 0) this.chirps(now + 0.02);
      this.nextChirps = now + 4 + Math.random() * 7;
    }
  }
}

/** Impulse response for a big stone cave: dark, slowly decaying stereo noise. */
function caveImpulse(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += 0.35 * ((Math.random() * 2 - 1) - lp); // soften the highs: stone absorbs them
      data[i] = lp * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1);
    }
  }
  return buf;
}

/** Seamlessly looping noise with extra low end. */
function loopingNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const fade = Math.floor(ctx.sampleRate * 0.1);
  const raw = new Float32Array(len + fade);
  let last = 0;
  for (let i = 0; i < raw.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.05 * white) / 1.05;
    raw[i] = last * 3.5 + white * 0.1;
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
