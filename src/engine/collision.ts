import type { ColliderDef, WardState } from '../rooms/types';

function isActive(c: ColliderDef, state: WardState): boolean {
  return c.states === undefined || c.states === 'both' || c.states === state;
}

// Axis-separated AABB move: resolve X and Z independently so sliding along a
// wall (rather than sticking) works exactly like v0.1's tryMove. Mutates
// body.x/body.z in place.
export function tryMove(
  body: { x: number; z: number; r: number },
  nx: number,
  nz: number,
  colliders: ColliderDef[],
  state: WardState,
): void {
  const r = body.r;

  let ok = true;
  for (const c of colliders) {
    if (!isActive(c, state)) continue;
    if (nx > c.minX - r && nx < c.maxX + r && body.z > c.minZ - r && body.z < c.maxZ + r) {
      ok = false;
      break;
    }
  }
  if (ok) body.x = nx;

  ok = true;
  for (const c of colliders) {
    if (!isActive(c, state)) continue;
    if (body.x > c.minX - r && body.x < c.maxX + r && nz > c.minZ - r && nz < c.maxZ + r) {
      ok = false;
      break;
    }
  }
  if (ok) body.z = nz;
}

// True if a circle at (x,z) radius r overlaps any collider that is solid
// only while unmedicated (states === 'unmed') — i.e. geometry that would
// materialize around the player if they were flipped to unmed right now.
// Same AABB-vs-circle test as tryMove's per-axis checks, just evaluated at a
// fixed point instead of a proposed move. Used by the medication auto-revert
// to avoid ever embedding the player in a wall/gate that only exists unmed.
export function circleHitsSolidUnmed(x: number, z: number, r: number, colliders: ColliderDef[]): boolean {
  for (const c of colliders) {
    if (c.states !== 'unmed') continue;
    if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
  }
  return false;
}
