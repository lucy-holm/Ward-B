// Lucid/unmedicated state machine + pill economy.
//
// Shifting UNMED -> LUCID costs one pill (lucidity is the safe-but-expensive
// state); LUCID -> UNMED is always free. Nothing can shift until a tutorial
// beat grants the ability (canShift).
import type { WardState } from '../rooms/types';
import { TUNING } from '../tuning';

export type ShiftResult = 'ok' | 'no-ability' | 'no-pills';

export class StateSystem {
  state: WardState = 'unmed';
  canShift = false;
  pills = 0;
  maxPills: number = TUNING.pills.max;
  // Medication meter, 1 (just took a pill) down to 0 (worn off). Only
  // meaningful while state === 'lucid': it's refilled to 1 on every
  // unmed->lucid transition (manual shift() or a scripted forceState) and
  // drained in real time by tickMedication. Left untouched while unmed —
  // nothing reads it, and re-entering lucid always refills it anyway.
  medication = 0;
  onChange: ((next: WardState, prev: WardState) => void) | null = null;

  shift(): ShiftResult {
    if (!this.canShift) return 'no-ability';

    const prev = this.state;
    if (prev === 'unmed') {
      if (this.pills <= 0) return 'no-pills';
      this.pills -= 1;
      this.state = 'lucid';
      this.medication = 1;
    } else {
      this.state = 'unmed';
    }

    this.onChange?.(this.state, prev);
    return 'ok';
  }

  // Sets state directly without touching the pill count (e.g. the tutorial's
  // scripted first pill, or a room's scripted lucid beat). Fires onChange
  // only if the state actually changed. Forcing to lucid starts the
  // medication meter fresh, same as a manual shift — a scripted pill is
  // still a pill.
  forceState(s: WardState): void {
    const prev = this.state;
    if (prev === s) return;
    this.state = s;
    if (s === 'lucid') this.medication = 1;
    this.onChange?.(s, prev);
  }

  // Drains the medication meter in real time; only has effect while lucid
  // and able to shift (room 1's pre-ability stretch never drains). Returns
  // true once the meter has hit empty — the caller (main.ts's loop) decides
  // whether it's safe to actually revert to unmed (see the geometry-trap
  // guard using collision.circleHitsSolidUnmed) since that's world/player
  // knowledge this class doesn't have. Pins at 0 rather than going negative
  // so repeated calls while a revert is held off keep reporting "empty".
  tickMedication(dt: number): boolean {
    if (this.state !== 'lucid' || !this.canShift) return false;
    this.medication = Math.max(0, this.medication - dt / TUNING.medication.durationSec);
    return this.medication <= 0;
  }

  refill(): number {
    this.pills = this.maxPills;
    return this.pills;
  }

  // Raises the pill capacity (e.g. room 9's coat-pocket find). Never lowers
  // it and never touches the current count — a later refill/dispenser tops
  // up to the new max on its own.
  upgradeCapacity(newMax: number): void {
    if (newMax > this.maxPills) this.maxPills = newMax;
  }
}
