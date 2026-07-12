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
  onChange: ((next: WardState, prev: WardState) => void) | null = null;

  shift(): ShiftResult {
    if (!this.canShift) return 'no-ability';

    const prev = this.state;
    if (prev === 'unmed') {
      if (this.pills <= 0) return 'no-pills';
      this.pills -= 1;
      this.state = 'lucid';
    } else {
      this.state = 'unmed';
    }

    this.onChange?.(this.state, prev);
    return 'ok';
  }

  // Sets state directly without touching the pill count (e.g. the tutorial's
  // scripted first pill). Fires onChange only if the state actually changed.
  forceState(s: WardState): void {
    const prev = this.state;
    if (prev === s) return;
    this.state = s;
    this.onChange?.(s, prev);
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
