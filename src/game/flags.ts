// Persistent cross-room flag store — the third leg of a three-way split the
// header comments elsewhere already argue for: state.ts's own header draws
// the line that StateSystem is specifically the lucid/unmed state machine +
// pill economy, nothing else; settings.ts's header gives the same reasoning
// for why *it* isn't part of state.ts either ("per-playthrough, not
// persisted" vs. settings' "persisted across playthroughs"). A generic
// room-flag bag — written by one room's script, read by another's, alive for
// exactly one playthrough — is a third, separate concern from both, so it
// gets a third file.
//
// Key naming convention (not enforced by the engine, just a house style):
// '<room-id>.<name>', e.g. 'room18.power' — namespacing by the writer's room
// id avoids collisions without needing a registry.

export type FlagValue = string | number | boolean;

// The narrow surface a RoomScript gets, via GameCtx.flags. No reset() here
// on purpose — matches GameCtx's existing philosophy ("scripts drive
// tutorial beats, they don't reach into the engine"); resetting the whole
// store is main.ts's job, not a room's.
export interface Flags {
  get<T extends FlagValue = FlagValue>(key: string): T | undefined;
  set(key: string, value: FlagValue): void;
  has(key: string): boolean;
}

export class FlagStore implements Flags {
  private readonly map = new Map<string, FlagValue>();

  get<T extends FlagValue = FlagValue>(key: string): T | undefined {
    return this.map.get(key) as T | undefined;
  }

  set(key: string, value: FlagValue): void {
    this.map.set(key, value);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  // Not called by any current game flow — there is no mid-playthrough
  // restart (the only reset is endOfBuild()'s READMIT button, which calls
  // location.reload() and throws away every module-level singleton,
  // including whatever FlagStore main.ts constructed). Kept for symmetry /
  // a future debug "restart wing" cheat.
  reset(): void {
    this.map.clear();
  }
}
