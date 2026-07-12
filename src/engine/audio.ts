import type { WardState } from '../rooms/types';

// Tiny drone ported from v0.1's initAudio/setDrone, plus two short one-shots
// for state shifts and the dispenser. Every entry point is wrapped so a
// throwing WebAudio call (blocked autoplay, missing API, etc.) never breaks
// gameplay — audio is a mood layer, not a dependency.
export class AudioEngine {
  private actx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private filt: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;

  init(): void {
    if (this.actx) {
      if (this.actx.state === 'suspended') {
        this.actx.resume().catch(() => {});
      }
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.actx = new Ctx();
      this.osc = this.actx.createOscillator();
      this.filt = this.actx.createBiquadFilter();
      this.gain = this.actx.createGain();
      this.osc.type = 'sawtooth';
      this.osc.frequency.value = 55;
      this.filt.type = 'lowpass';
      this.filt.frequency.value = 180;
      this.gain.gain.value = 0;
      this.osc.connect(this.filt);
      this.filt.connect(this.gain);
      this.gain.connect(this.actx.destination);
      this.osc.start();
      if (this.actx.state === 'suspended') {
        this.actx.resume().catch(() => {});
      }
    } catch {
      this.actx = null;
      this.osc = null;
      this.filt = null;
      this.gain = null;
    }
  }

  setState(state: WardState): void {
    if (!this.actx || !this.gain || !this.osc) return;
    const g = state === 'unmed' ? 0.028 : 0.006;
    const f = state === 'unmed' ? 55 : 190;
    try {
      this.gain.gain.setTargetAtTime(g, this.actx.currentTime, 0.6);
      this.osc.frequency.setTargetAtTime(f, this.actx.currentTime, 0.6);
      this.osc.type = state === 'unmed' ? 'sawtooth' : 'sine';
    } catch {
      // no-op
    }
  }

  // Short filtered-noise accent (~0.3s) marking a state shift — quiet, meant
  // to be felt more than heard.
  shiftStinger(): void {
    if (!this.actx) return;
    try {
      const ctx = this.actx;
      const dur = 0.3;
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 700;
      filt.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      src.connect(filt);
      filt.connect(g);
      g.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + dur);
    } catch {
      // no-op
    }
  }

  // Short low mechanical thunk (~0.15s) for the pill dispenser.
  dispenserClunk(): void {
    if (!this.actx) return;
    try {
      const ctx = this.actx;
      const dur = 0.15;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.09, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // no-op
    }
  }
}
