// Lightweight event queue, flushed to a webhook (or the console when no
// webhook is configured). Every row is stamped with room/position/pills so
// playtest logs can be reconstructed without extra joins.
import { BUILD_VERSION, TUNING } from '../tuning';

interface Snapshot {
  room: string;
  x: number;
  z: number;
  pills: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class Telemetry {
  private readonly getSnapshot: () => Snapshot;
  private readonly session: string = makeSessionId();
  private queue: Record<string, unknown>[] = [];
  private quitFired = false;

  constructor(getSnapshot: () => Snapshot) {
    this.getSnapshot = getSnapshot;
  }

  event(name: string, data?: Record<string, unknown>): void {
    const snap = this.getSnapshot();
    this.queue.push({
      name,
      t: Date.now(),
      room: snap.room,
      x: round2(snap.x),
      z: round2(snap.z),
      pills: snap.pills,
      ...data,
    });
  }

  flush(useBeacon = false): void {
    if (this.queue.length === 0) return;
    const events = this.queue;
    this.queue = [];

    const payload = { version: BUILD_VERSION, session: this.session, events };
    const url = import.meta.env.VITE_TELEMETRY_URL as string | undefined;

    if (!url) {
      console.log('[telemetry]', payload);
      return;
    }

    const body = JSON.stringify(payload);
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, body);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  start(): void {
    const touch = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
    this.event('session_start', {
      version: BUILD_VERSION,
      touch,
      ua: navigator.userAgent,
      screen: `${innerWidth}x${innerHeight}`,
    });

    setInterval(() => this.event('pos'), TUNING.telemetry.positionSampleMs);

    addEventListener('pagehide', () => {
      if (!this.quitFired) {
        this.quitFired = true;
        this.event('quit');
      }
      this.flush(true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });
  }
}
