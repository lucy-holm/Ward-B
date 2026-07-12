import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';

// ROOM 3 — the Common Room. Inverts Room 2's lesson: LUCID reads machinery,
// but here it's LUCID that lies. The exit is chained shut only while
// medicated — the chains are a symptom, not a fact. Trusting UNMED reality
// is the whole game, right at the end.

const rb = new RoomBuilder();

// common room shell, x [-5,5] z [-5,4]
rb.wallX(-5, 5, 4); // south cap, behind spawn
rb.wallZ(-5, 4, -5); // west wall
rb.wallZ(-5, 4, 5); // east wall
rb.wallX(-5, -1, -5); // north, west of the exit gap
rb.wallX(1, 5, -5); // north, east of the exit gap

// small vestibule beyond the exit door, x [-1,1] z [-7,-5]
rb.wallZ(-7, -5, -1);
rb.wallZ(-7, -5, 1);
rb.wallX(-1, 1, -7); // caps the vestibule
rb.block([1.8, 2.6, 0.06], [0, 1.4, -6.94], 'glow'); // warm glow beyond the exit

// exit door collider — always locked until the room script disables it
// (opening only works while UNMED; the chains never actually gate it).
const doorCollider: ColliderDef = { minX: -1, maxX: 1, minZ: -5.12, maxZ: -4.88 };
rb.colliders.push(doorCollider);

// chains + padlock — mesh only exists in the LUCID group, so it simply
// isn't there once the player shifts.
rb.block([0.06, 2.7, 0.06], [-0.7, 1.5, -4.95], 'chain', 'lucid');
rb.block([0.06, 2.7, 0.06], [-0.25, 1.5, -4.95], 'chain', 'lucid');
rb.block([0.06, 2.7, 0.06], [0.25, 1.5, -4.95], 'chain', 'lucid');
rb.block([0.06, 2.7, 0.06], [0.7, 1.5, -4.95], 'chain', 'lucid');
rb.block([0.22, 0.28, 0.14], [0, 1.05, -4.9], 'chain', 'lucid');

// props
rb.block([1.4, 0.5, 1.4], [-2.5, 0.25, -1], 'prop');
rb.solid(-3.2, -1.8, -1.7, -0.3);
rb.block([0.6, 0.9, 0.6], [-0.5, 0.45, 1.5], 'prop');
rb.solid(-0.8, -0.2, 1.2, 1.8);

export const room3: RoomDef = {
  id: 'room3',
  floor: { minX: -5, maxX: 5, minZ: -7, maxZ: 4 },
  spawn: { x: 0, z: 3, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: "you weren't supposed\nto make it this far", size: 3, pos: [-4.85, 1.7, 2], rotY: Math.PI / 2 },
    { text: 'it only holds\nif you believe it', size: 3.4, pos: [4.85, 1.7, -3], rotY: -Math.PI / 2, big: true },
  ],
  interactables: [
    {
      id: 'exitdoor',
      type: 'door',
      size: [2, 3, 0.24],
      pos: [0, 1.5, -5],
      mat: 'door',
      states: 'both',
      label: 'open the door',
    },
  ],
  lights: [{ pos: [0, 2] }, { pos: [-2.5, -1] }, { pos: [1.5, -3] }, { pos: [0, -6] }],
  exits: [{ to: 'END', minX: -1, maxX: 1, minZ: -6.9, maxZ: -5.8 }],
};

export const room3Script: RoomScript = (() => {
  let chainsSeenFired = false;

  const script: RoomScript = {
    onEnter(ctx) {
      ctx.hud.setObjective("the exit door, dead ahead. it doesn't look like it wants you lucid.");
    },

    onInteract(id, ctx) {
      if (id === 'exitdoor') {
        if (ctx.state.state === 'lucid') {
          ctx.hud.toast('chained shut. heavy padlock. it looks very, very real.');
          ctx.telemetry.event('door_refused');
          return true;
        }
        ctx.removeInteractable('exitdoor');
        doorCollider.minX = 999;
        doorCollider.maxX = 999.2;
        ctx.telemetry.event('door_opened');
        ctx.hud.toast('it was never locked. only you were.');
        ctx.hud.setObjective('walk through.');
        return true;
      }
      return false;
    },

    onStateChange(next, ctx) {
      if (next === 'lucid' && !chainsSeenFired) {
        chainsSeenFired = true;
        ctx.telemetry.event('chains_seen');
      }
      if (next === 'unmed') {
        ctx.hud.toast('the chains were never yours.');
      }
    },
  };

  return script;
})();
