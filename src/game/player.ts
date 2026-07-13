// First-person player body: movement, look, and camera sync. Movement feel
// (speed, yaw/pitch math, head-bob, unmed sway) is ported exactly from
// reference-v0.1.html so it keeps its handmade feel.
import type * as THREE from 'three';
import type { ColliderDef, WardState } from '../rooms/types';
import type { Input } from '../engine/input';
import { tryMove } from '../engine/collision';
import { TUNING } from '../tuning';

export class Player {
  x = 0;
  z = 0;
  // Verticality — the player's current floor height (see rooms/types.ts's
  // HeightZone/RampDef, game/world.ts's floorHeightAt). Set on spawn, then
  // smoothed toward floorHeightAt(x,z) each frame in main.ts; collision
  // itself stays 2D/XZ-only (tryMove never reads or writes this). Default 0
  // everywhere a room defines no verticality, so every existing room's eye
  // height is unchanged.
  y = 0;
  yaw = 0;
  pitch = 0;
  readonly r: number = TUNING.player.radius;
  readonly h: number = TUNING.player.eyeHeight;

  private wasMoving = false;

  spawn(at: { x: number; z: number; yaw: number; y?: number }): void {
    this.x = at.x;
    this.z = at.z;
    this.y = at.y ?? 0;
    this.yaw = at.yaw;
    this.pitch = 0;
  }

  update(dt: number, input: Input, colliders: ColliderDef[], state: WardState): void {
    // Look: pixel deltas already scaled for touch by the input layer.
    const look = input.consumeLook();
    this.yaw -= look.dx * TUNING.player.lookSensitivity;
    this.pitch = Math.max(
      -1.45,
      Math.min(1.45, this.pitch - look.dy * TUNING.player.lookSensitivity),
    );

    // Movement: yaw-relative, diagonal normalized — ported from v0.1's tryMove caller.
    const axes = input.moveAxes();
    let f = axes.f;
    let s = axes.s;
    const mag = Math.hypot(f, s);
    this.wasMoving = mag > 0;
    if (mag > 0) {
      f /= Math.max(1, mag);
      s /= Math.max(1, mag);
      const sp = TUNING.player.speed * dt;
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const dx = (s * cos - f * sin) * sp;
      const dz = (-f * cos - s * sin) * sp;
      tryMove(this, this.x + dx, this.z + dz, colliders, state);
    }
  }

  // Camera rotation order (YXZ) is set once by the Renderer.
  syncCamera(camera: THREE.PerspectiveCamera, t: number, state: WardState): void {
    const bob = this.wasMoving ? Math.sin(t * 9) * 0.035 : 0;
    const sway = state === 'unmed' ? Math.sin(t * 0.7) * 0.02 : 0;
    camera.position.set(this.x, this.y + this.h + bob, this.z);
    camera.rotation.set(this.pitch, this.yaw, sway);
  }

  get moving(): boolean {
    return this.wasMoving;
  }
}
