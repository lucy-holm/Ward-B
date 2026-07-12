// All gameplay numbers live here so playtest tuning never touches logic.
export const BUILD_VERSION = 'wardb-0.2.0-m1';

export const TUNING = {
  player: {
    speed: 3.4,          // m/s
    radius: 0.35,
    eyeHeight: 1.62,
    lookSensitivity: 0.0024,
    touchLookScale: 1.9,
  },
  pills: {
    max: 1,
  },
  camera: {
    fov: 72,
    shiftFovKick: 82,    // fov snaps here on shift, eases back in Renderer.update
  },
  interact: {
    maxDistance: 2.7,
  },
  telemetry: {
    positionSampleMs: 2000,
  },
  orderly: {
    speed: 1.5,          // m/s, patrol + walk-back speed
    // m/s while chasing. Player walk speed (TUNING.player.speed) is 3.4 —
    // deliberately faster than that so outrunning him on foot isn't viable;
    // shifting lucid (the escape) is the intended answer, not a footrace.
    chaseSpeed: 4.3,
    radius: 0.4,           // m, collision radius against room colliders
    catchRadius: 0.55,     // m, contact distance while chasing that triggers the catch
    escapePauseSec: 0.6,   // s, stands still after a chase ends before walking back to patrol
    sightRange: 6,        // m
    coneDeg: 55,           // total cone angle, degrees
    graceSec: 0.6,         // continuous sight required before the watch-ramp fills to a chase
    warnAt: 0.5,           // ramp fraction at which the "he is looking at you" toast fires
    pauseAtWaypoint: 0.8,  // s, brief pause at each waypoint
  },
} as const;
