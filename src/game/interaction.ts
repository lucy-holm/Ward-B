import * as THREE from 'three';
import { TUNING } from '../tuning';
import type { RoomScript, WardState } from '../rooms/types';
import type { GameCtx } from './context';
import type { World } from './world';

// Center-screen raycast against interactable meshes. Bespoke behaviour lives
// in the room script (asked first); generic behaviour (dispenser, pickups)
// lives here so every room gets it for free.
export class Interaction {
  focusedId: string | null = null;

  private readonly ray = new THREE.Raycaster();

  constructor(private readonly world: World) {}

  // Returns the prompt label to show (or null), and remembers the focused id.
  update(camera: THREE.Camera, state: WardState, script: RoomScript, ctx: GameCtx): string | null {
    this.focusedId = null;
    this.ray.setFromCamera(new THREE.Vector2(0, 0), camera);

    let bestLabel: string | null = null;
    let bestDist: number = TUNING.interact.maxDistance;
    for (const { def, mesh } of this.world.entries()) {
      const states = def.states ?? 'both';
      if (states !== 'both' && states !== state) continue;
      if (script.isAvailable && !script.isAvailable(def.id, ctx)) continue;
      const hit = this.ray.intersectObject(mesh);
      if (hit.length && hit[0].distance < bestDist) {
        bestDist = hit[0].distance;
        bestLabel = def.label;
        this.focusedId = def.id;
      }
    }
    return bestLabel;
  }

  interact(script: RoomScript, ctx: GameCtx): void {
    if (!this.focusedId) return;
    const id = this.focusedId;
    if (script.onInteract && script.onInteract(id, ctx)) return;

    const entry = this.world.entries().find((e) => e.def.id === id);
    if (!entry) return;
    const { state, hud, audio, telemetry } = ctx;

    switch (entry.def.type) {
      case 'dispenser': {
        if (state.pills >= state.maxPills) {
          hud.toast('the dispenser hums. you are already holding all it will give.');
          break;
        }
        const n = state.refill();
        audio.dispenserClunk();
        telemetry.event('dispenser_used');
        hud.setPills(n, state.maxPills, state.canShift);
        hud.toast(`pills rattle into your palm. (${n}/${state.maxPills})`);
        break;
      }
      case 'pill_pickup': {
        state.pills = Math.min(state.maxPills, state.pills + 1);
        this.world.removeInteractable(id);
        telemetry.event('pill_pickup');
        hud.setPills(state.pills, state.maxPills, state.canShift);
        hud.toast('a pill. pocketed.');
        break;
      }
      default:
        // pill_cup / keypad / door are bespoke — the room script owns them.
        break;
    }
  }
}
