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

  // Threat layer — persistent nodes for the chase whine (built lazily, once)
  // plus phase accumulators driving the periodic footstep / heartbeat
  // one-shots. setThreat is called every frame; nothing here allocates a
  // node per call — only when a scheduled step/beat actually fires.
  private threatChaseGain: GainNode | null = null;
  private threatLastTime: number | null = null;
  private threatFootstepPhase = 0;
  private threatHeartbeatPhase = 0;

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

  // Lazily builds the chase-whine chain once and leaves it running silently
  // (gain 0) between chases, so setThreat only ever touches params.
  private ensureThreatChaseNodes(): void {
    if (this.threatChaseGain || !this.actx) return;
    try {
      const ctx = this.actx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1650;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 1650;
      filt.Q.value = 9;
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(filt);
      filt.connect(g);
      g.connect(ctx.destination);
      osc.start();

      // Slight vibrato so the whine reads as tense/alive rather than a pure tone.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 6.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 18;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      this.threatChaseGain = g;
    } catch {
      this.threatChaseGain = null;
    }
  }

  // Short low thump (~0.11s) — one footstep. vol is 0..1 distance attenuation.
  private triggerFootstep(vol: number): void {
    if (!this.actx) return;
    try {
      const ctx = this.actx;
      const dur = 0.11;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(58, ctx.currentTime + dur);
      const g = ctx.createGain();
      const peak = 0.05 * vol;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), ctx.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // no-op
    }
  }

  // Low double-thump ("lub-dub", ~0.3s total). intensity is 0..1 (post the
  // 0.3 ramp floor), scaling loudness only — rate is handled by the caller.
  private triggerHeartbeat(intensity: number): void {
    if (!this.actx) return;
    try {
      const ctx = this.actx;
      const peak = 0.02 + 0.06 * intensity;
      const beat = (t0: number, f0: number, dur: number, gainMul: number) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.exponentialRampToValueAtTime(f0 * 0.6, t0 + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * gainMul), t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur);
      };
      const now = ctx.currentTime;
      beat(now, 62, 0.13, 1);
      beat(now + 0.16, 52, 0.15, 0.75);
    } catch {
      // no-op
    }
  }

  // Threat audio. Called every frame while a room has an active watcher:
  // ramp is the 0..1 sight-ramp, distance is watcher→player in world units
  // (drives footstep proximity), chasing is true during an active pursuit.
  // Call with (0, Infinity, false) to silence when the threat is gone or the
  // room is left.
  setThreat(ramp: number, distance: number, chasing: boolean): void {
    if (!this.actx) return;
    try {
      const ctx = this.actx;
      const now = ctx.currentTime;
      const dt = this.threatLastTime === null ? 0 : Math.max(0, Math.min(0.25, now - this.threatLastTime));
      this.threatLastTime = now;

      // --- footsteps: the only tracking tool while lucid (invisible orderly) ---
      const audible = Number.isFinite(distance) ? Math.max(0, Math.min(1, 1 - distance / 8)) : 0;
      if (audible <= 0.003) {
        this.threatFootstepPhase = 0;
      } else {
        const stepInterval = chasing ? 0.62 / 1.8 : 0.62;
        this.threatFootstepPhase += dt;
        if (this.threatFootstepPhase >= stepInterval) {
          this.threatFootstepPhase = this.threatFootstepPhase % stepInterval;
          this.triggerFootstep(audible);
        }
      }

      // --- heartbeat: fades in past the warn point, races with the ramp ---
      const hbIntensity = Math.max(0, Math.min(1, (ramp - 0.3) / 0.7));
      if (hbIntensity <= 0.003) {
        this.threatHeartbeatPhase = 0;
      } else {
        const beatInterval = 1.1 - 0.65 * hbIntensity;
        this.threatHeartbeatPhase += dt;
        if (this.threatHeartbeatPhase >= beatInterval) {
          this.threatHeartbeatPhase = this.threatHeartbeatPhase % beatInterval;
          this.triggerHeartbeat(hbIntensity);
        }
      }

      // --- chase layer: persistent whine, just ride its gain ---
      if (chasing) this.ensureThreatChaseNodes();
      if (this.threatChaseGain) {
        const target = chasing ? 0.032 : 0;
        this.threatChaseGain.gain.setTargetAtTime(target, now, chasing ? 0.1 : 0.22);
      }
    } catch {
      // no-op
    }
  }
}
