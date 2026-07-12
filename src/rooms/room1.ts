import { RoomBuilder } from './build';
import type { RoomDef, RoomScript } from './types';

// ROOM 1 — the Cell. Tutorial: states change the world, and where pills come
// from. Player wakes unmedicated, cannot shift, and there is no door until
// the pill is taken.

const rb = new RoomBuilder();

// cell shell, x [-3,3] z [0,6]
rb.wallX(-3, 3, 6); // south
rb.wallZ(0, 6, -3); // west
rb.wallZ(0, 6, 3); // east
rb.wallX(-3, -1, 0); // north, west of doorway gap
rb.wallX(1, 3, 0); // north, east of doorway gap

// doorway blocker — exists only while unmedicated ("there is no door")
rb.block([2, 3, 0.26], [0, 1.5, 0], 'wall', 'unmed');
rb.solid(-1, 1, -0.13, 0.13, 'unmed');

// vestibule beyond the doorway, x [-1,1] z [-2,0]
rb.wallZ(-2, 0, -1);
rb.wallZ(-2, 0, 1);
rb.wallX(-1, 1, -2); // caps the vestibule so the player can't walk past the glow
rb.block([1.8, 2.6, 0.06], [0, 1.4, -1.84], 'glow'); // warm glow, proud of the cap wall face

// props
rb.block([2, 0.55, 1], [1.7, 0.28, 4.6], 'bed');
rb.solid(0.7, 2.7, 4.1, 5.1);
rb.block([1, 0.8, 0.7], [-2.2, 0.4, 4.7], 'prop');
rb.solid(-2.7, -1.7, 4.35, 5.05);

export const room1: RoomDef = {
  id: 'room1',
  floor: { minX: -3, maxX: 3, minZ: -2, maxZ: 6 },
  spawn: { x: 0, z: 4, yaw: Math.PI },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: "don't\nswallow", size: 2.2, pos: [-2.85, 1.8, 4.7], rotY: Math.PI / 2 },
    { text: 'there was a door\nhere once', size: 3, pos: [0, 1.9, 0.2], rotY: 0 },
  ],
  interactables: [
    {
      id: 'cup',
      type: 'pill_cup',
      size: [0.18, 0.22, 0.18],
      pos: [-2.2, 0.92, 4.7],
      mat: 'pill',
      states: 'both',
      label: 'take the pill',
    },
    {
      id: 'dispenser1',
      type: 'dispenser',
      size: [0.55, 0.75, 0.16],
      pos: [2.2, 1.45, 0.14],
      mat: 'dispenser',
      states: 'both',
      label: 'use the dispenser',
    },
  ],
  lights: [{ pos: [0, 2] }, { pos: [0, 5] }],
  exits: [{ to: 'room2', minX: -1, maxX: 1, minZ: -1.9, maxZ: -0.9 }],
};

export const room1Script: RoomScript = (() => {
  let tookPill = false;
  let usedDispenser = false;

  const script: RoomScript = {
    onEnter(ctx) {
      ctx.hud.setObjective("your head is loud. there's a paper cup on the table.");
      ctx.hud.toast('take the pill. everyone says so. even the walls.');
    },

    isAvailable(id) {
      if (id === 'cup') return !tookPill;
      if (id === 'dispenser1') return tookPill;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'cup') {
        tookPill = true;
        ctx.state.canShift = true;
        ctx.state.forceState('lucid');
        ctx.shiftFx();
        ctx.removeInteractable('cup');
        ctx.hud.toast('the wall remembers it was a door.');
        ctx.hud.setObjective(
          'leave the cell — the dispenser by the door hums. [Q / ⇌] shifts what\'s real.',
        );
        return true;
      }
      if (id === 'dispenser1') {
        if (!usedDispenser) {
          usedDispenser = true;
          ctx.hud.setObjective('walk out. count your pills.');
        }
        return false;
      }
      return false;
    },
  };

  return script;
})();
