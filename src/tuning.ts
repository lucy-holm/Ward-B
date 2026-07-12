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
    max: 3,
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
    speed: 1.1,          // m/s
    sightRange: 6,        // m
    coneDeg: 55,           // total cone angle, degrees
    graceSec: 0.6,         // continuous sight required before a catch triggers
    warnAt: 0.5,           // ramp fraction at which the "he is looking at you" toast fires
    pauseAtWaypoint: 1.2,  // s, brief pause at each waypoint
  },
} as const;
