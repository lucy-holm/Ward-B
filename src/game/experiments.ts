// A/B experiment assignment (Phase 3 of the telemetry design doc, §6).
//
// STATUS: mechanism only. The one registered experiment below ships with
// `active: false`. Per §6.4, the honest position on this game's traffic is
// that only early-funnel metrics (bounce, room1→room3 survival) can ever
// reach statistical significance — deep metrics like completion rate
// realistically never will. So this file does NOT wire any experiment into
// gameplay behaviour; it exists so the bucketing infrastructure is ready
// (§6.4: "build it now, it's cheap and awkward to retrofit") and so Tom can
// flip `active: true` on room1-tutorial-explicitness deliberately, once a
// room1 variant actually exists to assign players into.
//
// Design constraints, each tied to a spec requirement:
//
// - Stable, storage-free bucketing (§6.1): assignment is a pure hash of
//   `(playerId, experimentId)`, not a random roll persisted somewhere. The
//   same player always lands in the same arm of a given experiment without
//   this file (or telemetry.ts) needing to remember anything beyond the
//   playerId that already exists (telemetry.ts's `wardb-player-v1`).
//   Consequence: registering a brand-new experiment can never re-roll an
//   existing one — the hash input for experiment A never depends on
//   whether experiment B exists.
// - Exactly one active experiment (§6.3): concurrent experiments interact
//   and neither resolves at this game's traffic. `getAssignment` also
//   tolerates the registry accidentally holding more than one `active:
//   true` entry (picks the first, warns) rather than throwing — telemetry
//   must never throw into the frame path.
// - `?variant=<arm>` and `?experiment=<id>` overrides, for testing a
//   specific arm/experiment without waiting on the hash or flipping the
//   registry.
// - `?notrack=1` suppresses assignment too, but that's enforced by the
//   caller (telemetry.ts only resolves an assignment when not opted out),
//   not duplicated here — this module has no opinion on tracking consent.

// One arm of an experiment. Weights are relative, not required to sum to
// any particular total — pickArm normalizes.
export interface ExperimentArm {
  id: string;
  weight: number;
}

export interface ExperimentDef {
  id: string;
  // See the §6.3 note above: the registry should hold exactly one
  // `active: true` entry at a time. Not enforced at the type level because
  // "the registry" is just this array literal — enforced at read time in
  // resolveActiveExperiment instead.
  active: boolean;
  arms: ExperimentArm[];
}

export type Assignment = { experiment: string; variant: string } | null;

// The declarative registry (§6.2's priority list). Only #1 is defined so
// far — the rest of that list needs a concrete implementation (copy
// variants, tuning variants, ...) before it's worth registering here.
export const EXPERIMENTS: ExperimentDef[] = [
  {
    // §6.2 candidate #1: does a more direct teach of Q raise room1→room3
    // survival? Highest-traffic, highest-leverage, and per §6.4 the most
    // likely of any candidate to actually reach significance at prototype
    // traffic. Arms are named for what they'll eventually mean; nothing
    // in room1 reads this yet.
    id: 'room1-tutorial-explicitness',
    active: false,
    arms: [
      { id: 'control', weight: 1 },
      { id: 'explicit', weight: 1 },
    ],
  },
];

function safeSearchParams(): URLSearchParams {
  try {
    return new URLSearchParams(location.search);
  } catch {
    // Malformed/inaccessible location — behave as if no override was given.
    return new URLSearchParams();
  }
}

// Deterministic 32-bit string hash (FNV-1a). Not cryptographic — doesn't
// need to be, this is bucketing, not security. Chosen over Math.random()
// specifically because it's a pure function of its input: same
// (playerId, experimentId) always produces the same bucket, with no
// persisted "which arm did I already assign this player" state to manage
// or lose.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0; // unsigned 32-bit
}

// Maps a [0,1) fraction onto one arm, weighted. frac is expected to come
// from hashString()/2^32, but any [0,1) value works (the ?variant=
// override bypasses this entirely rather than routing a forced choice
// through it).
function pickArm(arms: ExperimentArm[], frac: number): string {
  const total = arms.reduce((sum, a) => sum + a.weight, 0);
  if (total <= 0) return arms[0]?.id ?? '';
  let remaining = frac * total;
  for (const arm of arms) {
    remaining -= arm.weight;
    if (remaining < 0) return arm.id;
  }
  return arms[arms.length - 1].id;
}

// `?experiment=<id>` forces which experiment is "live" for this session,
// overriding the registry's `active` flag entirely — the only way to test
// a candidate that's shipped inactive (like room1-tutorial-explicitness
// today) without flipping it on for real traffic.
function resolveActiveExperiment(params: URLSearchParams): ExperimentDef | undefined {
  const forcedId = params.get('experiment');
  if (forcedId) {
    const forced = EXPERIMENTS.find((e) => e.id === forcedId);
    if (forced) return forced;
    // Unknown id in the override — fall through to the registry's own
    // active flag rather than silently assigning nobody to anything.
  }
  const active = EXPERIMENTS.filter((e) => e.active);
  if (active.length > 1) {
    // §6.3 invariant violated — don't throw, just make it loud in dev and
    // fall back to a deterministic choice (first-registered) so telemetry
    // still stamps something consistent rather than nothing.
    console.warn(
      `[experiments] ${active.length} experiments marked active (want exactly one, §6.3) — using "${active[0].id}".`,
    );
  }
  return active[0];
}

// The one function callers need. Returns null when no experiment is live
// for this session (the default state, and the common case while
// room1-tutorial-explicitness sits inactive).
export function getAssignment(playerId: string): Assignment {
  const params = safeSearchParams();
  const experiment = resolveActiveExperiment(params);
  if (!experiment) return null;

  // `?variant=<arm>` forces the arm within whatever experiment resolved
  // above, for testing a specific arm without depending on the hash.
  // Ignored if it doesn't name a real arm of that experiment.
  const forcedVariant = params.get('variant');
  if (forcedVariant && experiment.arms.some((a) => a.id === forcedVariant)) {
    return { experiment: experiment.id, variant: forcedVariant };
  }

  const frac = hashString(`${playerId}:${experiment.id}`) / 0x100000000;
  return { experiment: experiment.id, variant: pickArm(experiment.arms, frac) };
}
