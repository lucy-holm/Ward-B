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
  medication: {
    // Seconds a fresh pill's lucidity lasts before it wears off and forces
    // an (unavoidable, free) revert to unmed. Long enough for any single
    // intended lucid action (cross a gate, walk to and use a keypad);
    // short enough that camping lucid across a big room isn't viable.
    durationSec: 45,
    // Seconds-remaining threshold at which the HUD/audio warning kicks in.
    warnSec: 12,
  },
  lastWard: {
    // Room 13's closing walls. The corridor's walkable gap starts at
    // startGapM and, while the player is lucid inside the squeeze stretch,
    // narrows at closePerSideMps per side (2x combined). It never widens
    // until the attempt resets. Reaching minGapM while lucid in the stretch
    // is a crush: forced unmed + teleport to the corridor mouth + full-width
    // reset, pills kept. Budget check: (5.0-1.0)/(2*0.25) = 8s of total
    // lucid per attempt — deliberately less than the ~11.8s a straight
    // lucid walk of the 32m stretch + approach would need at player speed
    // 3.4, so "shift once and coast" cannot clear it.
    startGapM: 5.0,
    minGapM: 1.0, // player diameter 0.7 + 0.3 buffer
    closePerSideMps: 0.25,
    // one-time warning toast thresholds (gap width, m)
    warnGapM: 3.5,
    tightGapM: 2.0,
    // Room 13's orderly sight overrides — wider cone + longer range than the
    // base orderly (coneDeg 55, sightRange 6) so a head-on pass CANNOT clear
    // the full corridor width by hugging the far wall. Worst-case lateral
    // offset: the orderly walks a fixed lane at x=1.5; at rest (full
    // startGapM width) the player can hug the opposite wall at
    // |x| = halfGap - player.radius = 2.5 - 0.35 = 2.15, so
    // L = 2.15 + 1.5 = 3.65m.
    //
    // (a) the cone has to actually reach that offset within range: at the
    // moment distance-to-player first drops under sightRange R, the bearing
    // is asin(L/R). asin(3.65/9) = 23.9°, comfortably under halfCone (40°
    // for coneDeg 80) — the cone catches him before raw range does, not the
    // other way around.
    //
    // (b) the in-cone window has to clear graceSec at worst-case closing
    // speed, and a chord guess isn't rigorous enough — model the pass as the
    // orderly's remaining forward approach distance f (along his own lane)
    // shrinking at player.speed + orderly.speed = 3.4 + 1.5 = 4.9 m/s
    // (head-on, patrol speed — this is the pre-chase encounter, not a
    // chase). He's in-cone while atan(L/f) <= halfCone, i.e. while
    // f > L/tan(halfCone) =: f_exit; in-range while f < sqrt(R^2-L^2) =:
    // f_reach. Exposure window = f_reach - f_exit, time = window / 4.9.
    //   OLD (coneDeg 55, sightRange 6): f_exit = 3.65/tan(27.5°) = 7.01,
    //   f_reach = sqrt(36-13.32) = 4.76 — f_exit > f_reach, window
    //   negative: the far-wall-hugger is NEVER in cone+range at once. Not
    //   "~0.3s of exposure" — zero. A fully provable, unwatched pass; the
    //   exact exploit the owner found.
    //   NEW (coneDeg 80, sightRange 9): f_exit = 3.65/tan(40°) = 4.35,
    //   f_reach = sqrt(81-13.32) = 8.23, window = 3.88m, exposure =
    //   3.88/4.9 = 0.79s > graceSec (0.6s), ~30% margin — a sprinting
    //   wall-hugger can no longer cross unseen.
    //
    // Flip side sanity check: does the wider cone reach back into the entry
    // hall (z>16, outside the squeeze stretch) and threaten someone who
    // hasn't chosen to enter yet? The one patrol pause where his forward
    // vector points straight up-corridor (toward the hall, instead of across
    // it or back down it) is at waypoint (1.5,14) — the north end of the
    // east lane, held for pauseAtWaypoint (0.8s each lap; with two orderlies
    // half a lap apart it recurs roughly twice as often, same spot). Distance
    // from there to spawn (0,20) is sqrt(1.5^2+6^2) = 6.18m — inside
    // sightRange 9, so in principle he can see all the way to spawn during
    // that pause. Accepted, not fixed: room13's onEnter always forces LUCID,
    // so nothing is at risk until the player *chooses* to shift unmed before
    // ever reaching the stretch; unmed is exactly when his cone mesh is
    // visible, so a beam reaching that far is telegraphed, not a surprise;
    // and even a catch there resets to MOUTH (z=18, just south of the
    // stretch) with pills kept — a minor stumble, not an unavoidable ambush.
    // Shrinking range enough to exclude spawn (<6.18m) reopens the
    // zero-exposure exploit above (would need coneDeg past ~120° to hold
    // both at once) — well outside any reasonable cone, so this is the
    // accepted trade.
    orderlySightRangeM: 9,
    orderlyConeDeg: 80,
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
