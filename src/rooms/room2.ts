import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import { openKeypad } from '../ui/keypad';

// ROOM 2 — the Corridor. Teaches the second half of the pill economy: LUCID
// is the state that reads machinery (the keypad), UNMED is the state that
// reads the walls (the code). The player must burn a pill to act on what
// they saw for free.

const CODE = '4118';

const rb = new RoomBuilder();

// corridor shell, x [-1.6,1.6], z [-11,4.5] (south = entrance, north = staff door)
rb.wallX(-1.6, 1.6, 4.5); // south cap, behind spawn
rb.wallZ(-11, 4.5, -1.6); // west wall
rb.wallZ(-11, 4.5, 1.6); // east wall

// partition wall at z=-9 with a doorway gap x[-0.9,0.9] for the staff door
rb.wallX(-1.6, -0.9, -9);
rb.wallX(0.9, 1.6, -9);

// far cap beyond the door
rb.wallX(-1.6, 1.6, -11);
rb.block([1.6, 2.4, 0.06], [0, 1.35, -10.94], 'glow'); // warm glow beyond the door

// staff door collider — locked until the code is entered, reference kept so
// the room script can disable it in place.
const doorCollider: ColliderDef = { minX: -0.9, maxX: 0.9, minZ: -9.1, maxZ: -8.9 };
rb.colliders.push(doorCollider);

// glow strips overhead
rb.block([1.0, 0.06, 0.3], [0, 2.92, 1.2], 'glow');
rb.block([1.0, 0.06, 0.3], [0, 2.92, -3.8], 'glow');
rb.block([1.0, 0.06, 0.3], [0, 2.92, -7.4], 'glow');

// alcove A — a boarded-over doorway to a broken side room, west wall
rb.block([0.06, 2.2, 1.0], [-1.5, 1.4, 2.4], 'wall2');
rb.block([0.08, 0.3, 1.14], [-1.47, 2.55, 2.4], 'wall2');
rb.block([0.08, 0.3, 1.14], [-1.47, 0.32, 2.4], 'wall2');

// alcove B — same idea, east wall, further down
rb.block([0.06, 2.2, 1.0], [1.5, 1.4, -4.5], 'wall2');
rb.block([0.08, 0.3, 1.14], [1.47, 2.55, -4.5], 'wall2');
rb.block([0.08, 0.3, 1.14], [1.47, 0.32, -4.5], 'wall2');

export const room2: RoomDef = {
  id: 'room2',
  floor: { minX: -1.6, maxX: 1.6, minZ: -11, maxZ: 4.5 },
  spawn: { x: 0, z: 4, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: '4 1 1 8', size: 3.4, pos: [-1.45, 1.6, -5.5], rotY: Math.PI / 2, big: true },
    { text: 'they lock it\nfrom the inside', size: 2.6, pos: [1.45, 1.7, -6.5], rotY: -Math.PI / 2 },
  ],
  interactables: [
    {
      id: 'keypad1',
      type: 'keypad',
      size: [0.14, 0.5, 0.4],
      pos: [1.41, 1.45, -8.3],
      mat: 'pad',
      states: 'both',
      label: 'use the keypad',
    },
    {
      id: 'staffdoor',
      type: 'door',
      size: [1.8, 3, 0.2],
      pos: [0, 1.5, -9],
      mat: 'door',
      states: 'both',
      label: 'the staff door',
    },
    {
      // Rooms are one-way, so the corridor needs its own pill source — with
      // only the floor pickup, a player who skipped the cell dispenser can
      // strand themselves unmed with no way back to lucid for the keypad.
      id: 'dispenser2',
      type: 'dispenser',
      size: [0.55, 0.75, 0.16],
      pos: [-1.25, 1.45, -8.79],
      mat: 'dispenser',
      states: 'both',
      label: 'use the dispenser',
    },
    {
      id: 'pill1',
      type: 'pill_pickup',
      size: [0.16, 0.2, 0.16],
      pos: [-1.15, 0.9, -4.4],
      mat: 'pill',
      states: 'both',
      label: 'take the pill',
    },
  ],
  lights: [{ pos: [0, 2] }, { pos: [0, -3] }, { pos: [0, -7.5] }],
  exits: [{ to: 'room3', minX: -1, maxX: 1, minZ: -10.9, maxZ: -9.8 }],
};

export const room2Script: RoomScript = (() => {
  let doorUnlocked = false;
  let sawScrawlsToast = false;

  const script: RoomScript = {
    onEnter(ctx) {
      ctx.hud.setObjective('a staff door blocks the ward. it wants a code you don\'t have.');
    },

    isAvailable(id) {
      if (id === 'staffdoor') return false;
      if (id === 'keypad1') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'keypad1') {
        if (ctx.state.state === 'unmed') {
          ctx.hud.toast("the keypad is a smear of static. you can't read it like this.");
          return true;
        }
        ctx.telemetry.event('keypad_open');
        ctx.releasePointerLock();
        openKeypad({
          code: CODE,
          onDenied: () => ctx.telemetry.event('keypad_denied'),
          onSuccess: () => {
            doorUnlocked = true;
            ctx.telemetry.event('keypad_success');
            ctx.moveInteractable('staffdoor', [-0.9, 1.5, -9.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('it was written on the wall the whole time. by whom?');
            ctx.hud.setObjective('through the door. the ward opens up beyond it.');
            ctx.telemetry.event('door_opened');
          },
          onClose: () => {
            // player re-clicks the canvas to re-acquire pointer lock; nothing else to do.
          },
        });
        return true;
      }
      return false;
    },

    onStateChange(next, ctx) {
      if (next === 'unmed' && !sawScrawlsToast) {
        sawScrawlsToast = true;
        ctx.hud.toast('the wall is loud here.');
      }
    },
  };

  return script;
})();
