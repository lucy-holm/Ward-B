import { RoomBuilder } from './build';
import type { ColliderDef, RoomDef, RoomScript } from './types';
import type { GameCtx } from '../game/context';
import { openKeypad } from '../ui/keypad';
import { randomCode4, codeClueText, isRandomizeCodesEnabled } from './kit';

// ROOM 9 — the Doctor's Office. A breather after the east ward: no orderly,
// nothing hunting. The coat on the rack holds a found pill — a small, calm
// beat with nothing chasing you so it actually registers (playtest 9 cut
// the room's old capacity-upgrade payoff along with two-pill carry; one
// pocket is enough at this level of complexity, so the coat is just a top-up
// now). The exit still asks for the established two things (a code, read
// raw; a keypad, worked calm) so the player leaves having felt the
// oscillation once while it's still free of consequence, right before room
// 10 makes it expensive.

const FIXED_CODE = '5216';
let code = FIXED_CODE;

function regenerateCode(ctx: GameCtx): void {
  if (!isRandomizeCodesEnabled()) return;
  code = randomCode4();
  ctx.updateScrawlText('codeScrawl', codeClueText(code));
}

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
  name: "the Doctor's Office",
  floor: { minX: -5, maxX: 5, minZ: -8, maxZ: 5 },
  spawn: { x: 0, z: 4.3, yaw: 0 },
  blocks: rb.blocks,
  colliders: rb.colliders,
  scrawls: [
    { text: "they dose you small\nso you stay small", size: 2.6, pos: [4.85, 1.7, -1], rotY: -Math.PI / 2 },
    { text: 'his coat still smells\nlike the ward', size: 2.4, pos: [-4.85, 1.7, -3.6], rotY: Math.PI / 2 },
    { id: 'codeScrawl', text: '5 2 1 6', size: 2.2, pos: [-4.85, 1.7, 1], rotY: Math.PI / 2, big: true },
  ],
  interactables: [
    {
      // Bespoke pickup, intercepted in onInteract below — a loose pill in
      // the coat pocket, guarded (like the dispenser) against granting one
      // when already full.
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
  // One-shot nudge toast for "you tried to skip the coat" — fires the first
  // time the player interacts with the gated keypad, or gets close to the
  // door, before taking the coat. Reset each time the room is (re-)entered.
  let gateNudged = false;

  const GATE_TOAST = "not yet. take what's hanging there.";
  // Door position (see interactables below) — used only for the proximity
  // nudge, not for collision/interaction (the door itself is never directly
  // interactable, same as every other room's exitdoor).
  const DOOR_POS = { x: 0, z: -6 };
  const NUDGE_RADIUS = 2.5;

  function nudgeIfGated(ctx: GameCtx): void {
    if (bottleTaken || gateNudged) return;
    gateNudged = true;
    ctx.hud.toast(GATE_TOAST);
    ctx.telemetry.event('coat_gate_nudge');
  }

  const script: RoomScript = {
    onEnter(ctx) {
      regenerateCode(ctx);
      bottleTaken = false;
      doorUnlocked = false;
      gateNudged = false;
      ctx.hud.setObjective("the doctor's office. gone quiet. there's a coat on the rack, heavier than it should be — take it before anything else.");
    },

    isAvailable(id) {
      if (id === 'exitdoor') return false;
      // Gated on the coat first, same as the existing door-unlocked gate —
      // the keypad doesn't do anything until you've taken it (playtest 7:
      // the coat read as skippable set dressing, not a pickup).
      if (id === 'keypad9') return bottleTaken && !doorUnlocked;
      return true;
    },

    onInteract(id, ctx) {
      if (id === 'bottle') {
        if (bottleTaken) return true;
        bottleTaken = true;
        ctx.removeInteractable('bottle');
        const wasFull = ctx.state.pills >= ctx.state.maxPills;
        if (!wasFull) {
          ctx.state.refill();
          ctx.hud.setPills(ctx.state.pills, ctx.state.maxPills, ctx.state.canShift);
          ctx.hud.pillPopup('+1 pill');
        }
        ctx.hud.toast(
          wasFull
            ? "someone's coat, one pocket lined with foil. already empty — you're carrying all it had."
            : "someone's coat, one pocket lined with foil. a pill, loose. pocketed."
        );
        ctx.telemetry.event('coat_pill_found');
        ctx.hud.setObjective("the code is written where you can't read it clean.");
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
          code,
          onDenied: () => ctx.telemetry.event('keypad_denied'),
          onSuccess: () => {
            doorUnlocked = true;
            ctx.telemetry.event('keypad_success');
            ctx.moveInteractable('exitdoor', [-1, 1.5, -6.85], Math.PI / 2);
            doorCollider.minX = 999;
            doorCollider.maxX = 999.2;
            ctx.hud.toast(`${code}. someone else needed reminding, once.`);
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

    // isAvailable(false) on keypad9 already hides it from the interact
    // raycast while the coat is unclaimed, so a click there does nothing —
    // this per-frame proximity check is what actually surfaces the pointed
    // toast when the player walks up to either the keypad or the door
    // without having taken the coat first, instead of silently doing nothing.
    update(_dt, _t, ctx) {
      if (bottleTaken || gateNudged) return;
      const p = ctx.playerPos();
      const nearKeypad = Math.hypot(p.x - 1.35, p.z - -5.75) < NUDGE_RADIUS;
      const nearDoor = Math.hypot(p.x - DOOR_POS.x, p.z - DOOR_POS.z) < NUDGE_RADIUS;
      if (nearKeypad || nearDoor) nudgeIfGated(ctx);
    },
  };

  return script;
})();
