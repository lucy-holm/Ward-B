import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import { openKeypad } from '../ui/keypad';
import { TUNING } from '../tuning';

// ROOM 9 — the Doctor's Office. A breather after the east ward: no orderly,
// nothing hunting. The point of the room is the coat on the rack — search it
// and the capacity upgrade lands here, mid-room, with nothing chasing you so
// it actually registers. The exit still asks for the established two things
// (a code, read raw; a keypad, worked calm) so the player leaves having felt
// the oscillation once while it's still free of consequence, right before
// room 10 makes it expensive.

const CODE = '5216';

const rb = new RoomBuilder();

// shell, x [-5,5] z [-6,5]
rb.wallX(-5, 5, 5); // south cap, behind spawn
rb.wallZ(-6, 5, -5); // west wall
rb.wallZ(-6, 5, 5); // east wall
rb.wallX(-5, -1, -6); // north, west of the staff-door gap
rb.wallX(1, 5, -6); // north, east of the staff-door gap

// vestibule beyond the staff door, x [-1,1] z [-8,-6]
rb.wallZ(-8, -6, -1);
rb.wallZ(-8, -6, 1);
rb.wallX(-1, 1, -8);
rb.block([1.8, 2.6, 0.06], [0, 1.4, -7.8], 'glow'); // warm glow beyond the exit

// staff door collider — locked until the code is entered
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -6.13, maxZ: -5.87 };
rb.colliders.push(doorCollider);

// the doctor's desk, dead center — flavor and a collider, nothing more
rb.block([2.0, 0.9, 1.0], [1.0, 0.45, -2.5], 'prop');
rb.solid(0.0, 2.0, -3.0, -2.0);

// the coatrack against the west wall — the coat itself is a separate
// interactable ('bottle'), hung at chest height beside it
rb.block([0.16, 1.9, 0.16], [-4.4, 0.95, -3.6], 'prop');
rb.solid(-4.48, -4.32, -3.68, -3.52);

export const room9: RoomDef = {
  id: 'room9',
  floor: { minX: -5, maxX: 5, minZ: -8, maxZ: 5 },
  spawn: { x: 0, z: 4.3, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: "they dose you small\nso you stay small", size: 2.6, pos: [4.85, 1.7, -1], rotY: -Math.PI / 2 },
    { text: 'his coat still smells\nlike the ward', size: 2.4, pos: [-4.85, 1.7, -3.6], rotY: Math.PI / 2 },
    { text: '5 2 1 6', size: 2.2, pos: [-4.85, 1.7, 1], rotY: Math.PI / 2, big: true },
  ],
  interactables: [
    {
      // Bespoke pickup, intercepted in onInteract below — grants the
      // capacity upgrade instead of a pill.
      id: 'bottle',
      type: 'pill_pickup',
      size: [0.22, 0.28, 0.22],
      pos: [-4.4, 1.55, -3.4],
      mat: 'pill',
      states: 'both',
      label: 'search the coat',
    },
    {
      id: 'dispenser9',
      type: 'dispenser',
      size: [0.16, 0.75, 0.55],
      pos: [4.72, 1.45, 1.0],
      mat: 'dispenser',
      states: 'both',
      label: 'use the dispenser',
    },
    {
      id: 'keypad9',
      type: 'keypad',
      size: [0.4, 0.5, 0.14],
      pos: [1.35, 1.45, -5.75],
      mat: 'pad',
      states: 'both',
      label: 'use the keypad',
    },
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.2],
      pos: [0, 1.5, -6],
      mat: 'door',
      states: 'both',
      label: 'the exit door',
    },
  ],
  lights: [
    { pos: [0, 4] },
    { pos: [-3, 1] },
    { pos: [3, 1] },
    { pos: [0, -1.5] },
    { pos: [0, -4.5] },
  ],
  exits: [{ to: 'room10', minX: -1, maxX: 1, minZ: -7.9, maxZ: -6.8 }],
};

export const room9Script: RoomScript = (() => {
  let bottleTaken = false;
  let doorUnlocked = false;

  const script: RoomScript = {
    onEnter(ctx) {
      bottleTaken = false;
      doorUnlocked = false;
      ctx.hud.setObjective("the doctor's office. gone quiet. something's still hanging by the door.");
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      if (id === 'keypad9') return !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'bottle') {
        if (bottleTaken) return true;
        bottleTaken = true;
        ctx.state.upgradeCapacity(TUNING.pills.upgradedMax);
        ctx.removeInteractable('bottle');
        ctx.hud.setPills(ctx.state.pills, ctx.state.maxPills, ctx.state.canShift);
        ctx.hud.pillPopup('a second pocket');
        ctx.hud.toast("someone's coat. two pockets. both lined with foil.");
        ctx.telemetry.event('capacity_upgrade');
        ctx.hud.setObjective("two now. spend them like they're the last. the code is written where you can't read it clean.");
        return true;
      }
      if (id === 'keypad9') {
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
            ctx.moveInteractable('exitdoor', [-1, 1.5, -6.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast('5216. someone else needed two, once.');
            ctx.hud.setObjective('the door is open. go.');
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
  };

  return script;
})();
